import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuditMessages } from '@/i18n/audit';
import { checkFreeQuota, clientIp, hashIp, resolveAccess } from '@/lib/access';
import { applyPlanGating, describeTargetError, InvalidTargetError, runAudit } from '@/lib/audit';
import { resolveOptions, ScanOptionsSchema } from '@/lib/audit/options';
import { getStore } from '@/lib/db';
import { randomId, readJson, requestLocale } from '@/lib/http';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BodySchema = z.object({
  url: z.string().min(1).max(2048),
  license: z.string().max(200).optional(),
  locale: z.string().max(5).optional(),
  options: ScanOptionsSchema,
});

/**
 * Scan endpoint used by the website.
 * Free visitors are limited per IP per day; license holders are not.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  const locale = requestLocale(request, body.data.locale);
  const t = getAuditMessages(locale);
  const access = await resolveAccess(body.data.license ?? request.headers.get('x-citable-license'));
  const ipHash = hashIp(clientIp(request.headers));

  if (access.plan === 'free') {
    const quota = await checkFreeQuota(ipHash);
    if (!quota.allowed) {
      return NextResponse.json({ error: 'quota_exceeded', limit: quota.limit }, { status: 429 });
    }
  }

  let report;
  try {
    report = await runAudit(body.data.url, access.plan, locale, resolveOptions(body.data.options, access.plan));
  } catch (error) {
    if (error instanceof InvalidTargetError) {
      return NextResponse.json({ error: 'invalid_target', message: describeTargetError(error, t) }, { status: 400 });
    }
    console.error('[scan] unexpected failure', error);
    return NextResponse.json({ error: 'scan_failed' }, { status: 500 });
  }

  // Store the complete report so it can be shared and reviewed later. A storage
  // failure must never cost the visitor their result.
  const id = randomId();
  let stored = false;
  try {
    await getStore().saveScan({
      id,
      url: report.url,
      finalUrl: report.finalUrl,
      score: report.score,
      grade: report.grade,
      plan: access.plan,
      locale,
      ipHash,
      report,
    });
    stored = true;
  } catch (error) {
    console.error('[scan] could not store report', error);
  }

  return NextResponse.json(
    { ...applyPlanGating({ ...report, id: stored ? id : undefined }), keyProblem: access.keyProblem },
    { headers: { 'cache-control': 'no-store' } },
  );
}
