import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIdentifier, consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  email: z.string().email().max(200),
  /** What the visitor just scanned — the most valuable field for follow-up. */
  url: z.string().max(2048).optional(),
  score: z.number().min(0).max(100).optional(),
  source: z.string().max(60).optional(),
});

/**
 * Email capture.
 *
 * Leads are forwarded to LEAD_WEBHOOK_URL (Zapier, Make, n8n, Formspree, an ESP)
 * so there is no database to run, back up or secure on day one. Without that
 * variable the lead is logged and still acknowledged, which keeps local
 * development and demos working.
 */
export async function POST(request: Request): Promise<Response> {
  const quota = consumeQuota(`lead:${clientIdentifier(request.headers)}`, 10);
  if (!quota.allowed) {
    return NextResponse.json({ error: 'Too many submissions.' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  const lead = {
    type: 'lead',
    email: parsed.data.email,
    scannedUrl: parsed.data.url ?? null,
    score: parsed.data.score ?? null,
    source: parsed.data.source ?? 'landing',
    createdAt: new Date().toISOString(),
  };

  const webhook = process.env.LEAD_WEBHOOK_URL;
  if (webhook) {
    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(lead),
      });
      if (!response.ok) {
        console.error('[lead] webhook rejected the payload', response.status);
      }
    } catch (error) {
      console.error('[lead] webhook unreachable', error);
    }
  } else {
    console.info('[lead] captured (set LEAD_WEBHOOK_URL to forward these)', lead);
  }

  return NextResponse.json({ ok: true });
}
