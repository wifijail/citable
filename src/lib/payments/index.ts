import { licenseSecret } from '@/lib/license';
import type { PaidPlanId } from '@/lib/plans';
import { externalConfigured, externalPaymentLink, externalPlatformName } from './external';
import { gumroadConfigured, gumroadProductUrl } from './gumroad';
import { createLemonCheckout, lemonConfigured } from './lemonsqueezy';
import { createStripeCheckout, stripeConfigured } from './stripe';
import type { CheckoutRequest, ProviderName } from './types';

export { CheckoutError } from './types';
export type { CheckoutRequest, ProviderName } from './types';

/**
 * How the site takes payment:
 *
 * - gumroad:      buy on Gumroad, paste Gumroad's key — verified automatically.
 * - external:     pay on any platform (Boosty, Patreon…), submit a request,
 *                 the owner approves it in /admin.
 * - lemonsqueezy / stripe: hosted checkout with webhooks (kept for sellers in
 *                 regions those providers support).
 *
 * PAYMENT_PROVIDER forces one; otherwise the first fully configured mode wins.
 */
export type PaymentMode = 'gumroad' | 'external' | ProviderName;

function modeReady(mode: PaymentMode): boolean {
  switch (mode) {
    case 'gumroad':
      return gumroadConfigured();
    case 'external':
      // Approving a request issues one of our own signed keys.
      return externalConfigured() && Boolean(licenseSecret());
    case 'lemonsqueezy':
      return lemonConfigured() && Boolean(licenseSecret());
    case 'stripe':
      return stripeConfigured() && Boolean(licenseSecret());
  }
}

export function paymentMode(): PaymentMode | null {
  const forced = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  const order: PaymentMode[] = ['gumroad', 'external', 'lemonsqueezy', 'stripe'];
  if (forced && (order as string[]).includes(forced)) {
    return modeReady(forced as PaymentMode) ? (forced as PaymentMode) : null;
  }
  return order.find(modeReady) ?? null;
}

/** Hosted-checkout provider, when the active mode uses one. */
export function activeProvider(): ProviderName | null {
  const mode = paymentMode();
  return mode === 'lemonsqueezy' || mode === 'stripe' ? mode : null;
}

export async function createCheckout(provider: ProviderName, request: CheckoutRequest): Promise<string> {
  return provider === 'stripe' ? createStripeCheckout(request) : createLemonCheckout(request);
}

/** What the browser needs to render the pricing buttons. Contains only public links. */
export interface PublicPaymentConfig {
  mode: PaymentMode | null;
  platformName: string | null;
  links: Record<PaidPlanId, string | null>;
}

export function publicPaymentConfig(): PublicPaymentConfig {
  const mode = paymentMode();
  const products: PaidPlanId[] = ['pro', 'agency', 'lifetime'];
  const linkFor = (product: PaidPlanId) =>
    mode === 'gumroad' ? gumroadProductUrl(product) : mode === 'external' ? externalPaymentLink(product) : null;

  return {
    mode,
    platformName: mode === 'gumroad' ? 'Gumroad' : mode === 'external' ? externalPlatformName() : null,
    links: Object.fromEntries(products.map((product) => [product, linkFor(product)])) as Record<PaidPlanId, string | null>,
  };
}
