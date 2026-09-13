import { createHmac, timingSafeEqual } from 'node:crypto';
import type { LicenseStatus } from '@/lib/db/types';
import { findPlan, type PaidPlanId } from '@/lib/plans';
import { CheckoutError, type CheckoutRequest } from './types';

/**
 * Stripe over plain REST: the checkout payload is a handful of form fields and the
 * webhook signature is a documented HMAC, so the SDK is not worth the bundle.
 */

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_WEBHOOK_SECRET?.trim());
}

export function stripePriceFor(product: PaidPlanId): string | null {
  const envName = findPlan(product)?.stripePriceEnv;
  return (envName && process.env[envName]?.trim()) || null;
}

export async function createStripeCheckout(request: CheckoutRequest): Promise<string> {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const price = stripePriceFor(request.product);
  if (!secretKey || !price) throw new CheckoutError('not_configured');

  const subscription = request.product !== 'lifetime';
  const form = new URLSearchParams({
    mode: subscription ? 'subscription' : 'payment',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    success_url: request.successUrl,
    cancel_url: request.cancelUrl,
    client_reference_id: request.claimToken,
    allow_promotion_codes: 'true',
    // en, ru, es and de are all valid Stripe Checkout locales.
    locale: request.locale,
    'metadata[claim]': request.claimToken,
    'metadata[product]': request.product,
  });
  if (subscription) {
    form.set('subscription_data[metadata][claim]', request.claimToken);
    form.set('subscription_data[metadata][product]', request.product);
  } else {
    form.set('customer_creation', 'always');
    form.set('payment_intent_data[metadata][claim]', request.claimToken);
  }
  if (request.email) form.set('customer_email', request.email);

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${secretKey}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  });
  const data = (await response.json().catch(() => ({}))) as { url?: string; error?: { message?: string } };

  if (!response.ok || !data.url) {
    console.error('[stripe] checkout rejected', response.status, data.error?.message);
    throw new CheckoutError('provider_rejected');
  }
  return data.url;
}

/** Verifies the `Stripe-Signature: t=…,v1=…` header against the raw body. */
export function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  nowSeconds = Date.now() / 1000,
): boolean {
  if (!header) return false;

  let timestamp: string | undefined;
  const signatures: string[] = [];
  for (const piece of header.split(',')) {
    const [key, value] = piece.split('=').map((part) => part.trim());
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) return false;

  // Reject replays older than five minutes.
  const age = Math.abs(nowSeconds - Number.parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = Buffer.from(
    createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex'),
  );
  return signatures.some((signature) => {
    const candidate = Buffer.from(signature);
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  });
}

export interface StripeSubscription {
  id: string;
  customer?: string;
  status: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  items?: { data?: Array<{ current_period_end?: number }> };
}

/** Maps a Stripe subscription object onto our license lifecycle. */
export function stripeSubscriptionState(subscription: StripeSubscription): {
  status: LicenseStatus;
  periodEnd: string | null;
} {
  // Newer API versions moved current_period_end onto the subscription items.
  const endSeconds =
    subscription.current_period_end ?? subscription.items?.data?.[0]?.current_period_end ?? null;
  const periodEnd = endSeconds ? new Date(endSeconds * 1000).toISOString() : null;

  switch (subscription.status) {
    case 'active':
    case 'trialing':
      return { status: subscription.cancel_at_period_end ? 'cancelled' : 'active', periodEnd };
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
    case 'paused':
      return { status: 'past_due', periodEnd };
    default:
      return { status: 'expired', periodEnd };
  }
}
