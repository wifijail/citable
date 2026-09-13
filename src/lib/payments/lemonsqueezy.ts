import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LicenseStatus } from '@/lib/db/types';
import { PLANS, type PaidPlanId } from '@/lib/plans';
import { CheckoutError, type CheckoutRequest } from './types';

/**
 * Lemon Squeezy is a "merchant of record": it is the legal seller, collects and
 * remits VAT/sales tax worldwide and pays you out. For a solo founder that removes
 * the hardest part of selling software internationally.
 */

const API = 'https://api.lemonsqueezy.com/v1';

export function lemonConfigured(): boolean {
  return Boolean(
    process.env.LEMONSQUEEZY_API_KEY?.trim() &&
      process.env.LEMONSQUEEZY_STORE_ID?.trim() &&
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim(),
  );
}

export function lemonVariantFor(product: PaidPlanId): string | null {
  const envName = PLANS.find((plan) => plan.id === product)?.lemonVariantEnv;
  return (envName && process.env[envName]?.trim()) || null;
}

/**
 * Resolves which product a variant id belongs to. Webhooks trust this mapping,
 * never the buyer-controllable custom data, to decide what access to grant.
 */
export function productForLemonVariant(variantId: string | number | null | undefined): PaidPlanId | null {
  if (variantId === null || variantId === undefined) return null;
  const wanted = String(variantId);
  for (const product of ['pro', 'agency', 'lifetime'] as const) {
    if (lemonVariantFor(product) === wanted) return product;
  }
  return null;
}

export async function createLemonCheckout(request: CheckoutRequest): Promise<string> {
  const apiKey = process.env.LEMONSQUEEZY_API_KEY?.trim();
  const storeId = process.env.LEMONSQUEEZY_STORE_ID?.trim();
  const variantId = lemonVariantFor(request.product);
  if (!apiKey || !storeId || !variantId) throw new CheckoutError('not_configured');

  const body = {
    data: {
      type: 'checkouts',
      attributes: {
        checkout_data: {
          ...(request.email ? { email: request.email } : {}),
          custom: { claim: request.claimToken, locale: request.locale },
        },
        product_options: { redirect_url: request.successUrl },
      },
      relationships: {
        store: { data: { type: 'stores', id: storeId } },
        variant: { data: { type: 'variants', id: variantId } },
      },
    },
  };

  const response = await fetch(`${API}/checkouts`, {
    method: 'POST',
    headers: {
      accept: 'application/vnd.api+json',
      'content-type': 'application/vnd.api+json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as {
    data?: { attributes?: { url?: string } };
    errors?: Array<{ detail?: string }>;
  };

  const url = data.data?.attributes?.url;
  if (!response.ok || !url) {
    console.error('[lemonsqueezy] checkout rejected', response.status, data.errors?.[0]?.detail);
    throw new CheckoutError('provider_rejected');
  }
  return url;
}

/** `X-Signature` is a hex HMAC-SHA256 of the raw body under the webhook secret. */
export function verifyLemonSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = Buffer.from(createHmac('sha256', secret).update(rawBody).digest('hex'));
  const received = Buffer.from(signature.trim());
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/** Maps a Lemon Squeezy subscription status onto our license lifecycle. */
export function lemonSubscriptionState(attributes: {
  status?: string;
  renews_at?: string | null;
  ends_at?: string | null;
}): { status: LicenseStatus; periodEnd: string | null } {
  switch (attributes.status) {
    case 'active':
    case 'on_trial':
      return { status: 'active', periodEnd: attributes.renews_at ?? null };
    case 'cancelled':
      // Cancelled in Lemon Squeezy means "won't renew": access runs until ends_at.
      return { status: 'cancelled', periodEnd: attributes.ends_at ?? attributes.renews_at ?? null };
    case 'past_due':
    case 'unpaid':
    case 'paused':
      return { status: 'past_due', periodEnd: attributes.renews_at ?? null };
    default:
      return { status: 'expired', periodEnd: attributes.ends_at ?? null };
  }
}
