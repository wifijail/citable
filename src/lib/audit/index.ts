import * as cheerio from 'cheerio';
import { getAuditMessages } from '@/i18n/audit';
import type { Locale } from '@/i18n/config';
import { answerabilityChecks } from './checks/answerability';
import { crawlerAccessChecks, evaluateCrawlers } from './checks/crawler-access';
import { identityChecks } from './checks/identity';
import { machineReadabilityChecks } from './checks/machine-readability';
import { structuredDataChecks } from './checks/structured-data';
import { technicalChecks } from './checks/technical';
import { fetchTarget, fetchTimeoutMs } from './fetcher';
import { scoreChecks } from './score';
import type { AuditReport, CheckContext, CheckResult, PageSnapshot } from './types';

export { describeTargetError, InvalidTargetError } from './fetcher';
export { applyPlanGating } from './score';
export type { AuditReport } from './types';

const CHECK_SUITES: Array<(ctx: CheckContext) => CheckResult[]> = [
  crawlerAccessChecks,
  machineReadabilityChecks,
  structuredDataChecks,
  answerabilityChecks,
  identityChecks,
  technicalChecks,
];

/** Everything a text-only crawler would read, with markup and scripts stripped. */
function extractText(html: string): string {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg, template, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

/**
 * Builds the complete, ungated report from an already-fetched snapshot.
 * Pure, so tests can drive it without the network.
 */
export function analyseSnapshot(
  snapshot: PageSnapshot,
  plan: AuditReport['plan'],
  locale: Locale = 'en',
): AuditReport {
  const t = getAuditMessages(locale);
  const html = snapshot.page.body || '<html></html>';
  const $ = cheerio.load(html);
  const text = extractText(html);
  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;

  const ctx: CheckContext = { snapshot, $, text, wordCount, t };

  const checks: CheckResult[] = [];
  const warnings: string[] = [];

  if (!snapshot.page.ok) {
    warnings.push(
      snapshot.page.error
        ? t.warnings.fetchFailed(
            snapshot.page.error === 'timeout' ? t.warnings.timeout(fetchTimeoutMs()) : snapshot.page.error,
          )
        : t.warnings.httpStatus(snapshot.page.status),
    );
  }

  for (const suite of CHECK_SUITES) {
    try {
      checks.push(...suite(ctx));
    } catch (error) {
      // One broken check must never take down the whole report.
      warnings.push(t.warnings.suiteFailed(error instanceof Error ? error.message : 'unknown'));
    }
  }

  const { score, grade, verdict, categories, priorityFixes } = scoreChecks(checks, t);

  return {
    locale,
    url: snapshot.requestedUrl,
    finalUrl: snapshot.finalUrl,
    scannedAt: new Date().toISOString(),
    durationMs: snapshot.page.elapsedMs,
    score,
    grade,
    verdict,
    categories,
    priorityFixes,
    crawlers: evaluateCrawlers(snapshot),
    plan,
    truncated: false,
    lockedCount: 0,
    warnings,
  };
}

/**
 * Full pipeline: validate, fetch, analyse, score.
 * Returns the FULL report; callers decide when to apply plan gating, so the
 * complete version can be stored while the gated one is sent to the browser.
 */
export async function runAudit(
  url: string,
  plan: AuditReport['plan'] = 'free',
  locale: Locale = 'en',
): Promise<AuditReport> {
  const startedAt = Date.now();
  const snapshot = await fetchTarget(url);
  const report = analyseSnapshot(snapshot, plan, locale);
  return { ...report, durationMs: Date.now() - startedAt };
}
