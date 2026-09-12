import { NextResponse } from 'next/server';
import { z } from 'zod';
import { InvalidTargetError, runAudit } from '@/lib/audit';
import { planFromKey } from '@/lib/license';
import { clientIdentifier, consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  url: z.string().min(3).max(2048),
  license: z.string().max(200).optional(),
});

/** Scan endpoint used by the landing page. Free callers are rate limited by IP. */
export async function POST(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide a "url" to scan.' }, { status: 400 });
  }

  const licenseKey =
    parsed.data.license ?? request.headers.get('x-citable-license') ?? undefined;
  const plan = planFromKey(licenseKey);

  if (plan === 'free') {
    const quota = consumeQuota(clientIdentifier(request.headers));
    if (!quota.allowed) {
      return NextResponse.json(
        {
          error: `Free plan allows ${quota.limit} scans per day. Upgrade for unlimited scans.`,
          code: 'quota_exceeded',
          resetAt: new Date(quota.resetAt).toISOString(),
        },
        { status: 429 },
      );
    }
  }

  try {
    const report = await runAudit(parsed.data.url, plan);
    return NextResponse.json(report, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof InvalidTargetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[scan] unexpected failure', error);
    return NextResponse.json(
      { error: 'The scan failed unexpectedly. Please try again.' },
      { status: 500 },
    );
  }
}
