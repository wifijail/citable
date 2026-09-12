import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { issueLicense } from '@/lib/license';

export const runtime = 'nodejs';

/** Verifies Stripe's `t=…,v1=…` signature header against the raw request body. */
function verifyStripeSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(',').map((piece) => {
      const [key, value] = piece.split('=');
      return [key?.trim() ?? '', value?.trim() ?? ''];
    }),
  );

  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  // Reject replays older than five minutes.
  const age = Math.abs(Date.now() / 1000 - Number.parseInt(timestamp, 10));
  if (!Number.isFinite(age) || age > 300) return false;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

interface StripeEvent {
  type: string;
  data: {
    object: {
      id?: string;
      customer?: string;
      customer_email?: string;
      customer_details?: { email?: string };
      metadata?: Record<string, string>;
    };
  };
}

/**
 * Turns a completed payment into a license key.
 *
 * Delivery is deliberately pluggable: the key is pushed to LEAD_WEBHOOK_URL
 * (Zapier / Make / n8n / your ESP) so the product needs no mail infrastructure
 * of its own on day one.
 */
export async function POST(request: Request): Promise<Response> {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook is not configured.' }, { status: 503 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'), webhookSecret)) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  let event: StripeEvent;
  try {
    event = JSON.parse(rawBody) as StripeEvent;
  } catch {
    return NextResponse.json({ error: 'Malformed payload.' }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    // Acknowledge everything else so Stripe stops retrying.
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  const email = session.customer_details?.email ?? session.customer_email ?? null;
  const reference = session.customer ?? session.id ?? email ?? 'unknown';
  const grants = session.metadata?.['grants'] === 'agency' ? 'agency' : 'pro';

  let licenseKey: string;
  try {
    licenseKey = issueLicense(grants, reference);
  } catch (error) {
    console.error('[stripe] could not issue license', error);
    return NextResponse.json({ error: 'Licensing is not configured.' }, { status: 500 });
  }

  const deliveryUrl = process.env.LEAD_WEBHOOK_URL;
  if (deliveryUrl) {
    try {
      await fetch(deliveryUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'license_issued', email, plan: grants, licenseKey }),
      });
    } catch (error) {
      // Never fail the webhook over delivery — Stripe would retry the whole payment event.
      console.error('[stripe] license delivery failed', error);
    }
  } else {
    console.info('[stripe] license issued (configure LEAD_WEBHOOK_URL to auto-deliver)', {
      email,
      plan: grants,
    });
  }

  return NextResponse.json({ received: true });
}
