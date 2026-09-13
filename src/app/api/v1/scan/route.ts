import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuditMessages } from '@/i18n/audit';
import { resolveAccess } from '@/lib/access';
import { describeTargetError, InvalidTargetError, runAudit } from '@/lib/audit';
import { readJson, requestLocale } from '@/lib/http';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const maxDuration = 30;

const BodySchema = z.object({
  url: z.string().min(1).max(2048),
  /** Optional CI gate: respond 422 when the score drops below this threshold. */
  minScore: z.number().min(0).max(100).optional(),
  /** Language of the findings: en, ru, es or de. */
  lang: z.string().max(5).optional(),
});

function bearer(request: Request): string | null {
  const match = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization')?.trim() ?? '');
  return match?.[1] ?? null;
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204 });
}

/**
 * Public API for CI pipelines.
 *
 *   curl -X POST https://<your-domain>/api/v1/scan \
 *     -H "Authorization: Bearer $CITABLE_KEY" \
 *     -H "Content-Type: application/json" \
 *     -d '{"url":"https://example.com","minScore":70}'
 */
export async function POST(request: Request): Promise<Response> {
  const access = await resolveAccess(bearer(request));
  if (access.plan === 'free') {
    return NextResponse.json(
      { error: access.keyProblem === 'inactive' ? 'license_inactive' : 'unauthorized' },
      { status: 401 },
    );
  }

  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  // Generous but finite, so one key cannot be shared across a whole agency.
  const quota = consumeQuota(
    `api:${access.license?.id ?? bearer(request)}`,
    access.plan === 'agency' ? 2000 : 500,
  );
  if (!quota.allowed) {
    return NextResponse.json({ error: 'quota_exceeded' }, { status: 429 });
  }

  const locale = requestLocale(request, body.data.lang ?? 'en');
  try {
    const report = await runAudit(body.data.url, access.plan, locale);
    const minScore = body.data.minScore;
    const failsGate = minScore !== undefined && report.score < minScore;

    return NextResponse.json(
      { ...report, gate: minScore === undefined ? undefined : { minScore, passed: !failsGate } },
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
      return NextResponse.json(
        { error: 'invalid_target', message: describeTargetError(error, getAuditMessages(locale)) },
        { status: 400 },
      );
    }
    console.error('[api/v1/scan] unexpected failure', error);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }
}
