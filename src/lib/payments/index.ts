import { createLemonCheckout, lemonConfigured } from './lemonsqueezy';
import { createStripeCheckout, stripeConfigured } from './stripe';
import type { CheckoutRequest, ProviderName } from './types';

export { CheckoutError } from './types';
export type { CheckoutRequest, ProviderName } from './types';

/**
 * The provider used for new checkouts. Set PAYMENT_PROVIDER to force one;
 * otherwise whichever is fully configured wins, Lemon Squeezy first.
 */
export function activeProvider(): ProviderName | null {
  const forced = process.env.PAYMENT_PROVIDER?.trim().toLowerCase();
  if (forced === 'stripe') return stripeConfigured() ? 'stripe' : null;
  if (forced === 'lemonsqueezy') return lemonConfigured() ? 'lemonsqueezy' : null;
  if (lemonConfigured()) return 'lemonsqueezy';
  if (stripeConfigured()) return 'stripe';
  return null;
}

export async function createCheckout(provider: ProviderName, request: CheckoutRequest): Promise<string> {
  return provider === 'stripe' ? createStripeCheckout(request) : createLemonCheckout(request);
}
