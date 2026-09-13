import { fetchTimeoutMs } from '../fetcher';
import type { CheckContext, CheckResult } from '../types';

export function technicalChecks(ctx: CheckContext): CheckResult[] {
  const { $, snapshot, t } = ctx;
  const m = t.checks;
  const { page } = snapshot;
  const results: CheckResult[] = [];

  // --- Response status ------------------------------------------------------------
  const errorText =
    page.error === 'timeout' ? t.warnings.timeout(fetchTimeoutMs()) : (page.error ?? '');

  results.push({
    id: 'http-status',
    title: m.httpStatus.title,
    category: 'technical',
    status: page.ok ? 'pass' : 'fail',
    score: page.ok ? 1 : 0,
    weight: 6,
    impact: 'critical',
    summary: page.ok
      ? m.httpStatus.ok(page.status, page.url)
      : page.error
        ? m.httpStatus.error(errorText)
        : m.httpStatus.bad(page.status),
    evidence: [
      m.httpStatus.status(page.status ? String(page.status) : m.httpStatus.noResponse),
      m.httpStatus.contentType(page.headers['content-type'] ?? m.httpStatus.unknown),
    ],
    fix: page.ok ? undefined : m.httpStatus.fix,
  });

  // --- HTTPS -----------------------------------------------------------------------
  const isHttps = snapshot.finalUrl.startsWith('https://');
  results.push({
    id: 'https',
    title: m.https.title,
    category: 'technical',
    status: isHttps ? 'pass' : 'fail',
    score: isHttps ? 1 : 0,
    weight: 4,
    impact: 'high',
    summary: isHttps ? m.https.ok : m.https.fail,
    evidence: [snapshot.finalUrl],
    fix: isHttps ? undefined : m.https.fix,
  });

  // --- Time to full response ---------------------------------------------------------
  const elapsed = page.elapsedMs;
  const fastEnough = elapsed <= 1500;
  results.push({
    id: 'response-time',
    title: m.responseTime.title,
    category: 'technical',
    status: fastEnough ? 'pass' : elapsed <= 3500 ? 'warn' : 'fail',
    score: fastEnough ? 1 : elapsed <= 3500 ? 0.6 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: m.responseTime.summary(elapsed),
    evidence: [m.responseTime.evidence(elapsed)],
    fix: fastEnough ? undefined : m.responseTime.fix,
  });

  // --- Redirect chain ---------------------------------------------------------------
  const hops = snapshot.redirectChainLength;
  results.push({
    id: 'redirect-chain',
    title: m.redirects.title,
    category: 'technical',
    status: hops <= 1 ? 'pass' : hops <= 2 ? 'warn' : 'fail',
    score: hops <= 1 ? 1 : hops <= 2 ? 0.6 : 0.2,
    weight: 2,
    impact: 'low',
    summary: hops === 0 ? m.redirects.none : m.redirects.summary(hops),
    evidence: [
      m.redirects.hops(hops),
      m.redirects.requested(snapshot.requestedUrl),
      m.redirects.final(snapshot.finalUrl),
    ],
    fix: hops <= 1 ? undefined : m.redirects.fix,
  });

  // --- Page weight -----------------------------------------------------------------
  const kilobytes = page.body.length / 1024;
  const lean = kilobytes <= 500;
  results.push({
    id: 'html-weight',
    title: m.htmlWeight.title,
    category: 'technical',
    status: lean ? 'pass' : kilobytes <= 1500 ? 'warn' : 'fail',
    score: lean ? 1 : kilobytes <= 1500 ? 0.6 : 0.2,
    weight: 2,
    impact: 'low',
    summary: m.htmlWeight.summary(kilobytes.toFixed(0)),
    evidence: [`${kilobytes.toFixed(1)} KB`],
    fix: lean ? undefined : m.htmlWeight.fix,
  });

  // --- Image alt coverage --------------------------------------------------------------
  const images = $('img');
  const withAlt = images.filter((_, element) => {
    const alt = $(element).attr('alt');
    return typeof alt === 'string' && alt.trim().length > 0;
  }).length;
  const coverage = images.length === 0 ? 1 : withAlt / images.length;

  results.push({
    id: 'image-alt-coverage',
    title: m.imageAlt.title,
    category: 'technical',
    status: coverage >= 0.9 ? 'pass' : coverage >= 0.6 ? 'warn' : 'fail',
    score: coverage,
    weight: 3,
    impact: 'low',
    summary:
      images.length === 0
        ? m.imageAlt.noImages
        : m.imageAlt.summary(withAlt, images.length, Math.round(coverage * 100)),
    evidence: [m.imageAlt.images(images.length), m.imageAlt.withAlt(withAlt)],
    fix: coverage >= 0.9 ? undefined : m.imageAlt.fix,
  });

  return results;
}
