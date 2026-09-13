import type { Locale } from '@/i18n/config';
import type { PaidPlanId } from '@/lib/plans';

export type ProviderName = 'lemonsqueezy' | 'stripe';

export interface CheckoutRequest {
  product: PaidPlanId;
  /** Random secret that links the payment to the page the buyer returns to. */
  claimToken: string;
  locale: Locale;
  email: string | null;
  successUrl: string;
  cancelUrl: string;
}

export class CheckoutError extends Error {
  constructor(readonly code: 'not_configured' | 'provider_rejected') {
    super(code);
    this.name = 'CheckoutError';
  }
}
