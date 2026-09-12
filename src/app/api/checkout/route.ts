import { NextResponse } from 'next/server';
import { z } from 'zod';
import { findPlan, siteUrl } from '@/lib/plans';

export const runtime = 'nodejs';

const BodySchema = z.object({
  plan: z.enum(['pro', 'agency', 'lifetime']),
  email: z.string().email().optional(),
});

/**
 * Creates a Stripe Checkout session.
 *
 * Stripe is called over its REST API with `fetch` rather than the SDK: the payload
 * is three form fields, and skipping the dependency keeps the serverless bundle
 * small and the build reproducible.
 *
 * When Stripe is not configured the endpoint answers 503 with a machine-readable
 * code, and the UI degrades to a waitlist capture instead of showing an error.
 */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  const plan = findPlan(parsed.data.plan);
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = plan?.priceEnv ? process.env[plan.priceEnv] : undefined;

  if (!plan || !secretKey || !priceId) {
    return NextResponse.json(
      {
        error: 'Checkout is not live yet. Leave your email and we will send an early-access link.',
        code: 'checkout_unavailable',
      },
      { status: 503 },
    );
  }

  const form = new URLSearchParams({
    mode: plan.id === 'lifetime' ? 'payment' : 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    success_url: `${siteUrl()}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/?checkout=cancelled`,
    allow_promotion_codes: 'true',
    'metadata[plan]': plan.id,
    'metadata[grants]': plan.grants ?? 'pro',
  });
  if (parsed.data.email) form.set('customer_email', parsed.data.email);

  try {
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${secretKey}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    });

    const data = (await response.json()) as { url?: string; error?: { message?: string } };

    if (!response.ok || !data.url) {
      console.error('[checkout] stripe rejected the session', data.error?.message);
      return NextResponse.json(
        { error: 'Could not start checkout. Please try again.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error('[checkout] network failure', error);
    return NextResponse.json({ error: 'Could not reach the payment provider.' }, { status: 502 });
  }
}
