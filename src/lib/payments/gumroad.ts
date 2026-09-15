import type { LicenseStatus } from '@/lib/db/types';
import type { PaidPlanId } from '@/lib/plans';

/**
 * Gumroad as a payment method, with no webhooks and no API token.
 *
 * Gumroad is the merchant of record (it charges the buyer, handles their sales
 * tax and pays the seller out), and it pays out to Kazakhstan. With "Generate a
 * unique license key per sale" enabled on a product, every buyer receives a key
 * from Gumroad. The buyer pastes that key into the site; we confirm it with
 * Gumroad's public endpoint:
 *
 *   POST https://api.gumroad.com/v2/licenses/verify  (product_id, license_key)
 *
 * The response says whether the sale was refunded, disputed, or whether the
 * membership failed or ended, so access follows the real state of the purchase.
 */

const VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';
const PRODUCTS: readonly PaidPlanId[] = ['pro', 'agency', 'lifetime'];
const KEY_PATTERN = /^[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}-[0-9A-F]{8}$/;

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function gumroadProductId(product: PaidPlanId): string | null {
  return env(`GUMROAD_PRODUCT_ID_${product.toUpperCase()}`);
}

/** Public product page, e.g. https://yourname.gumroad.com/l/citable-pro */
export function gumroadProductUrl(product: PaidPlanId): string | null {
  const value = env(`GUMROAD_URL_${product.toUpperCase()}`);
  return value && /^https:\/\//i.test(value) ? value : null;
}

/** At least one plan can be bought and verified. */
export function gumroadConfigured(): boolean {
  return PRODUCTS.some((product) => gumroadProductId(product) && gumroadProductUrl(product));
}

/** Gumroad keys look like `A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6`. */
export function isGumroadKey(key: string): boolean {
  return KEY_PATTERN.test(key);
}

interface GumroadPurchase {
  product_id?: string;
  sale_id?: string;
  id?: string;
  license_key?: string;
  subscription_id?: string | null;
  refunded?: boolean;
  disputed?: boolean;
  dispute_won?: boolean;
  chargebacked?: boolean;
  subscription_ended_at?: string | null;
  subscription_failed_at?: string | null;
}

interface GumroadResponse {
  success?: boolean;
  message?: string;
  purchase?: GumroadPurchase;
}

export type GumroadVerdict =
  | { kind: 'ok'; product: PaidPlanId; status: LicenseStatus; saleId: string; subscriptionId: string | null }
  | { kind: 'invalid' }
  | { kind: 'unreachable' };

/** Maps a verified purchase to our license status. Exported for tests. */
export function purchaseStatus(purchase: GumroadPurchase): LicenseStatus {
  if (purchase.refunded || purchase.chargebacked) return 'expired';
  if (purchase.disputed && !purchase.dispute_won) return 'expired';
  if (purchase.subscription_ended_at) return 'expired';
  if (purchase.subscription_failed_at) return 'past_due';
  // A cancelled membership keeps working until Gumroad sets subscription_ended_at.
  return 'active';
}

/**
 * Checks a key against every configured product. Gumroad answers 404 with
 * `success: false` for a key that belongs to another product.
 */
export async function verifyGumroadKey(key: string, fetchImpl: typeof fetch = fetch): Promise<GumroadVerdict> {
  let reachedGumroad = false;

  for (const product of PRODUCTS) {
    const productId = gumroadProductId(product);
    if (!productId) continue;

    let data: GumroadResponse;
    try {
      const response = await fetchImpl(VERIFY_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        // Never count our own checks as "uses" of the buyer's key.
        body: new URLSearchParams({ product_id: productId, license_key: key, increment_uses_count: 'false' }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      if (response.status >= 500) continue;
      data = (await response.json()) as GumroadResponse;
      reachedGumroad = true;
    } catch {
      continue;
    }

    const purchase = data.purchase;
    if (!data.success || !purchase) continue;
    // Defensive: the answer must be about this exact product and key.
    if (purchase.product_id && purchase.product_id !== productId) continue;
    if (purchase.license_key && purchase.license_key.toUpperCase() !== key) continue;

    return {
      kind: 'ok',
      product,
      status: purchaseStatus(purchase),
      saleId: purchase.sale_id ?? purchase.id ?? key,
      subscriptionId: purchase.subscription_id ?? null,
    };
  }

  return reachedGumroad ? { kind: 'invalid' } : { kind: 'unreachable' };
}
