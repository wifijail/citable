import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { grantLicense } from '@/lib/fulfillment';
import { isPaidPlan } from '@/lib/plans';
import {
  stripeSubscriptionState,
  verifyStripeSignature,
  type StripeSubscription,
} from '@/lib/payments/stripe';

export const runtime = 'nodejs';

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

interface CheckoutSession {
  id: string;
  mode?: string;
  payment_status?: string;
  client_reference_id?: string | null;
  customer?: string | null;
  subscription?: string | null;
  payment_intent?: string | null;
  customer_details?: { email?: string | null } | null;
  customer_email?: string | null;
  metadata?: Record<string, string> | null;
}

/**
 * Stripe → license lifecycle.
 *
 * Subscribe the endpoint to: checkout.session.completed,
 * checkout.session.async_payment_succeeded, customer.subscription.updated,
 * customer.subscription.deleted, charge.refunded.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'malformed' }, { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    // 500 makes Stripe retry later, which is what we want for transient DB errors.
    console.error('[webhooks/stripe] handling failed', event.type, error);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handle(event: StripeEvent): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as unknown as CheckoutSession;
      // Delayed payment methods complete with "unpaid" and succeed later.
      if (session.payment_status !== 'paid' && session.payment_status !== 'no_payment_required') return;

      const product = session.metadata?.product;
      if (!product || !isPaidPlan(product)) {
        console.warn('[webhooks/stripe] session without a known product', session.id);
        return;
      }

      await grantLicense({
        provider: 'stripe',
        product,
        email: session.customer_details?.email ?? session.customer_email ?? null,
        customerRef: session.customer ?? null,
        subscriptionRef: session.subscription ?? session.payment_intent ?? null,
        claimToken: session.metadata?.claim ?? session.client_reference_id ?? null,
        fallbackRef: session.id,
      });
      return;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as StripeSubscription;
      const state =
        event.type === 'customer.subscription.deleted'
          ? { status: 'expired' as const, periodEnd: null }
          : stripeSubscriptionState(subscription);
      await getStore().updateLicenseStatus({
        provider: 'stripe',
        subscriptionRef: subscription.id,
        status: state.status,
        periodEnd: state.periodEnd,
      });
      return;
    }

    case 'charge.refunded': {
      const charge = event.data.object as { payment_intent?: string | null; refunded?: boolean };
      // Only a full refund revokes a one-time purchase.
      if (charge.refunded && charge.payment_intent) {
        await getStore().updateLicenseStatus({
          provider: 'stripe',
          subscriptionRef: charge.payment_intent,
          status: 'expired',
        });
      }
      return;
    }

    default:
      // Acknowledge everything else so Stripe stops retrying.
      return;
  }
}
