import * as cheerio from 'cheerio';
import { answerabilityChecks } from './checks/answerability';
import { crawlerAccessChecks, evaluateCrawlers } from './checks/crawler-access';
import { identityChecks } from './checks/identity';
import { machineReadabilityChecks } from './checks/machine-readability';
import { structuredDataChecks } from './checks/structured-data';
import { technicalChecks } from './checks/technical';
import { fetchTarget } from './fetcher';
import { applyPlanGating, scoreChecks } from './score';
import type { AuditReport, CheckContext, CheckResult, PageSnapshot } from './types';

export { InvalidTargetError } from './fetcher';
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
function extractText($: cheerio.CheerioAPI): string {
  const clone = cheerio.load($.html());
  clone('script, style, noscript, svg, template, iframe').remove();
  return clone('body').text().replace(/\s+/g, ' ').trim();
}

/** Builds the report from an already-fetched snapshot. Pure, so tests can drive it. */
export function analyseSnapshot(snapshot: PageSnapshot, plan: AuditReport['plan']): AuditReport {
  const $ = cheerio.load(snapshot.page.body || '<html></html>');
  const text = extractText($);
  const wordCount = text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length;

  const ctx: CheckContext = { snapshot, $, text, wordCount };

  const checks: CheckResult[] = [];
  const warnings = [...snapshot.warnings];

  for (const suite of CHECK_SUITES) {
    try {
      checks.push(...suite(ctx));
    } catch (error) {
      // One broken check must never take down the whole report.
      warnings.push(
        `A check suite failed and was skipped: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  const { score, grade, verdict, categories, priorityFixes } = scoreChecks(checks);

  const report: AuditReport = {
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

  return applyPlanGating(report);
}

/** Full pipeline: validate, fetch, analyse, score, gate. */
export async function runAudit(url: string, plan: AuditReport['plan'] = 'free'): Promise<AuditReport> {
  const startedAt = Date.now();
  const snapshot = await fetchTarget(url);
  const report = analyseSnapshot(snapshot, plan);
  return { ...report, durationMs: Date.now() - startedAt };
}
