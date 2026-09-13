import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, hashIp } from '@/lib/access';
import { getStore } from '@/lib/db';
import { sendContactNotification } from '@/lib/email';
import { readJson, requestLocale } from '@/lib/http';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email().max(200),
  topic: z.enum(['sales', 'support', 'billing', 'partnership', 'other']),
  message: z.string().trim().min(10).max(5000),
  locale: z.string().max(5).optional(),
  /** Honeypot: humans never see or fill this field. */
  company: z.string().max(0).optional(),
});

/**
 * Contact form. The message is always saved to the database (so nothing is lost
 * even without email), and forwarded to the owner when Resend is configured.
 */
export async function POST(request: Request): Promise<Response> {
  if (!consumeQuota(`contact:${hashIp(clientIp(request.headers))}`, 5, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  const { name, email, topic, message } = body.data;
  try {
    await getStore().saveContact({
      name,
      email,
      topic,
      message,
      locale: requestLocale(request, body.data.locale),
    });
  } catch (error) {
    console.error('[contact] could not store message', error);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  await sendContactNotification({ name, email, topic, message });
  return NextResponse.json({ ok: true });
}
