import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, hashIp } from '@/lib/access';
import { ConsentField, consentRecord } from '@/lib/consent';
import { getStore } from '@/lib/db';
import { sendPaymentRequestNotification } from '@/lib/email';
import { randomId, readJson, requestLocale } from '@/lib/http';
import { paymentMode } from '@/lib/payments';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  plan: z.enum(['pro', 'agency', 'lifetime']),
  email: z.string().trim().toLowerCase().email().max(200),
  /** Name, username or order number the payment was made under. */
  reference: z.string().trim().min(2).max(200),
  message: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((value) => value || null),
  locale: z.string().max(5).optional(),
  consent: ConsentField,
  company: z.string().max(0).optional(),
});

/**
 * "I have paid" notice for payments taken on an external platform. Returns a
 * claim token; the status page polls /api/license/claim with it until the owner
 * approves or rejects the request in /admin.
 */
export async function POST(request: Request): Promise<Response> {
  if (!consumeQuota(`payment-request:${hashIp(clientIp(request.headers))}`, 5, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  if (paymentMode() !== 'external') {
    return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 });
  }

  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  const locale = requestLocale(request, body.data.locale);
  const claimToken = randomId(32);

  try {
    const saved = await getStore().createPaymentRequest({
      claimToken,
      product: body.data.plan,
      email: body.data.email,
      reference: body.data.reference,
      message: body.data.message,
      locale,
      ...consentRecord(),
    });
    await sendPaymentRequestNotification(saved);
  } catch (error) {
    console.error('[payment-requests] could not store request', error);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  return NextResponse.json({ claimToken });
}
