import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, hashIp } from '@/lib/access';
import { ConsentField, consentRecord } from '@/lib/consent';
import { getStore } from '@/lib/db';
import { readJson, requestLocale } from '@/lib/http';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  url: z.string().max(2048).optional(),
  score: z.number().int().min(0).max(100).optional(),
  source: z.enum(['report', 'pricing-waitlist', 'footer']).default('report'),
  locale: z.string().max(5).optional(),
  consent: ConsentField,
});

/**
 * "Tell me when paid plans / new checks are available" — stored in the leads
 * table with a record of the consent given. Nothing is emailed automatically.
 */
export async function POST(request: Request): Promise<Response> {
  if (!consumeQuota(`lead:${hashIp(clientIp(request.headers))}`, 10, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  try {
    await getStore().saveLead({
      email: body.data.email,
      source: body.data.source,
      scannedUrl: body.data.url ?? null,
      score: body.data.score ?? null,
      locale: requestLocale(request, body.data.locale),
      ...consentRecord(),
    });
  } catch (error) {
    console.error('[lead] could not store lead', error);
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
