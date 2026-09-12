import { NextResponse } from 'next/server';
import { z } from 'zod';
import { InvalidTargetError, runAudit } from '@/lib/audit';
import { verifyLicense } from '@/lib/license';
import { clientIdentifier, consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  url: z.string().min(3).max(2048),
  /** Optional CI gate: respond 422 when the score drops below this threshold. */
  minScore: z.number().min(0).max(100).optional(),
});

function bearer(request: Request): string | null {
  const header = request.headers.get('authorization');
  if (!header) return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1] ?? null;
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Public API for CI pipelines.
 *
 *   curl -X POST https://citable.dev/api/v1/scan \
 *     -H "Authorization: Bearer $CITABLE_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://example.com","minScore":70}'
 */
export async function POST(request: Request): Promise<Response> {
  const key = bearer(request);
  const license = verifyLicense(key);

  if (!license) {
    return NextResponse.json(
      {
        error: 'A valid API key is required. Get one at /pricing.',
        code: 'unauthorized',
      },
      { status: 401 },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Provide a "url" and an optional numeric "minScore".' },
      { status: 400 },
    );
  }

  // Generous but non-zero ceiling so one key cannot be shared across a whole agency.
  const quota = consumeQuota(
    `api:${license.reference}:${clientIdentifier(request.headers)}`,
    license.plan === 'agency' ? 2000 : 500,
  );
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'Daily API quota exceeded.', code: 'quota_exceeded' },
      { status: 429 },
    );
  }

  try {
    const report = await runAudit(parsed.data.url, license.plan);
    const failsGate =
      parsed.data.minScore !== undefined && report.score < parsed.data.minScore;

    return NextResponse.json(
      {
        ...report,
        gate:
          parsed.data.minScore === undefined
            ? undefined
            : { minScore: parsed.data.minScore, passed: !failsGate },
      },
      {
        status: failsGate ? 422 : 200,
        headers: {
          'cache-control': 'no-store',
          'x-citable-score': String(report.score),
          'x-citable-quota-remaining': String(quota.remaining),
        },
      },
    );
  } catch (error) {
    if (error instanceof InvalidTargetError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('[api/v1/scan] unexpected failure', error);
    return NextResponse.json({ error: 'Scan failed.' }, { status: 500 });
  }
}
