import { isLocale, type Locale } from '@/i18n/config';
import { getStore, type LicenseRecord, type LicenseStatus, type PaymentProvider } from '@/lib/db';
import { sendLicenseEmail } from '@/lib/email';
import { issueLicense } from '@/lib/license';
import { findPlan, type PaidPlanId } from '@/lib/plans';

export interface GrantInput {
  provider: PaymentProvider;
  product: PaidPlanId;
  email: string | null;
  customerRef: string | null;
  /** Subscription id, or the order/payment id for one-time purchases. */
  subscriptionRef: string | null;
  status?: LicenseStatus;
  periodEnd?: string | null;
  claimToken: string | null;
  /** Used for deduplication when the purchase did not start on our site. */
  fallbackRef: string;
  locale?: Locale | string | null;
  note?: string | null;
}

/**
 * Turns a confirmed payment into a license — exactly once.
 *
 * Providers retry webhooks and often send several events for one purchase, so the
 * license row is keyed by the checkout's claim token (or a provider reference).
 * The key is emailed only when the row is genuinely new.
 */
export async function grantLicense(input: GrantInput): Promise<{ license: LicenseRecord; inserted: boolean }> {
  const plan = findPlan(input.product);
  if (!plan || plan.grants === 'free') throw new Error(`Unknown paid product: ${input.product}`);

  const store = getStore();
  const checkout = input.claimToken ? await store.getCheckout(input.claimToken) : null;
  const locale: Locale = isLocale(input.locale) ? input.locale : (checkout?.locale ?? 'en');

  const result = await store.upsertLicense({
    licenseKey: issueLicense(plan.grants),
    idempotencyKey: input.claimToken ? `claim:${input.claimToken}` : `${input.provider}:${input.fallbackRef}`,
    email: input.email ?? checkout?.email ?? null,
    plan: plan.grants,
    product: input.product,
    provider: input.provider,
    customerRef: input.customerRef,
    subscriptionRef: input.subscriptionRef,
    status: input.status ?? 'active',
    periodEnd: input.periodEnd ?? null,
    claimToken: input.claimToken,
    locale,
    note: input.note ?? null,
  });

  if (result.inserted && result.license.email) {
    const planName = input.product.charAt(0).toUpperCase() + input.product.slice(1);
    await sendLicenseEmail({
      to: result.license.email,
      locale,
      licenseKey: result.license.licenseKey,
      plan: planName,
    });
  }

  return result;
}
