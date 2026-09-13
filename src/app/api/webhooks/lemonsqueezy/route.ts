import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { grantLicense } from '@/lib/fulfillment';
import {
  lemonSubscriptionState,
  productForLemonVariant,
  verifyLemonSignature,
} from '@/lib/payments/lemonsqueezy';

export const runtime = 'nodejs';

interface LemonEvent {
  meta: {
    event_name: string;
    custom_data?: { claim?: string; locale?: string } | null;
  };
  data: {
    type: string;
    id: string;
    attributes: {
      user_email?: string | null;
      customer_id?: number | string | null;
      variant_id?: number | string | null;
      status?: string;
      renews_at?: string | null;
      ends_at?: string | null;
      refunded?: boolean;
      first_order_item?: { variant_id?: number | string | null } | null;
    };
  };
}

/**
 * Lemon Squeezy → license lifecycle.
 *
 * Subscribe the webhook to: order_created, order_refunded, subscription_created,
 * subscription_updated, subscription_cancelled, subscription_resumed,
 * subscription_expired, subscription_paused, subscription_unpaused.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET?.trim();
  if (!secret) return NextResponse.json({ error: 'not_configured' }, { status: 503 });

  const rawBody = await request.text();
  if (!verifyLemonSignature(rawBody, request.headers.get('x-signature'), secret)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 });
  }

  let event: LemonEvent;
  try {
    event = JSON.parse(rawBody) as LemonEvent;
  } catch {
    return NextResponse.json({ error: 'malformed' }, { status: 400 });
  }

  try {
    await handle(event);
  } catch (error) {
    console.error('[webhooks/lemonsqueezy] handling failed', event.meta?.event_name, error);
    return NextResponse.json({ error: 'handler_failed' }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}

async function handle(event: LemonEvent): Promise<void> {
  const { attributes } = event.data;
  const claimToken = event.meta.custom_data?.claim ?? null;
  const customerRef = attributes.customer_id ? String(attributes.customer_id) : null;

  switch (event.meta.event_name) {
    case 'order_created': {
      // Subscription purchases also emit order_created; those are fulfilled from
      // subscription_created so each purchase yields exactly one license.
      const product = productForLemonVariant(attributes.first_order_item?.variant_id);
      if (product !== 'lifetime' || attributes.status !== 'paid') return;

      await grantLicense({
        provider: 'lemonsqueezy',
        product,
        email: attributes.user_email ?? null,
        customerRef,
        subscriptionRef: `order_${event.data.id}`,
        claimToken,
        fallbackRef: `order_${event.data.id}`,
        locale: event.meta.custom_data?.locale,
      });
      return;
    }

    case 'order_refunded': {
      await getStore().updateLicenseStatus({
        provider: 'lemonsqueezy',
        subscriptionRef: `order_${event.data.id}`,
        status: 'expired',
      });
      return;
    }

    case 'subscription_created': {
      const product = productForLemonVariant(attributes.variant_id);
      if (!product || product === 'lifetime') {
        console.warn('[webhooks/lemonsqueezy] unknown subscription variant', attributes.variant_id);
        return;
      }
      const state = lemonSubscriptionState(attributes);
      await grantLicense({
        provider: 'lemonsqueezy',
        product,
        email: attributes.user_email ?? null,
        customerRef,
        subscriptionRef: event.data.id,
        status: state.status,
        periodEnd: state.periodEnd,
        claimToken,
        fallbackRef: `sub_${event.data.id}`,
        locale: event.meta.custom_data?.locale,
      });
      return;
    }

    case 'subscription_updated':
    case 'subscription_cancelled':
    case 'subscription_resumed':
    case 'subscription_expired':
    case 'subscription_paused':
    case 'subscription_unpaused': {
      const state = lemonSubscriptionState(attributes);
      await getStore().updateLicenseStatus({
        provider: 'lemonsqueezy',
        subscriptionRef: event.data.id,
        status: state.status,
        periodEnd: state.periodEnd,
      });
      return;
    }

    default:
      return;
  }
}
