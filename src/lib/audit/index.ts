import * as cheerio from 'cheerio';
import { getAuditMessages } from '@/i18n/audit';
import type { AuditMessages } from '@/i18n/audit/en';
import type { Locale } from '@/i18n/config';
import { answerabilityChecks } from './checks/answerability';
import { crawlerAccessChecks, evaluateCrawlers } from './checks/crawler-access';
import { identityChecks } from './checks/identity';
import { detectCdn, insightChecks } from './checks/insights';
import { machineReadabilityChecks } from './checks/machine-readability';
import { profileChecks } from './checks/profile';
import { siteChecks } from './checks/site';
import { structuredDataChecks } from './checks/structured-data';
import { technicalChecks } from './checks/technical';
import { crawlSite } from './crawl';
import { fetchResource, fetchTarget, fetchTimeoutMs, type Fetcher } from './fetcher';
import { generateJsonLd, generateLlmsTxt, generateRobotsTxt } from './generators';
import { DEFAULT_OPTIONS } from './options';
import { detectProfile, jsonLdTypes } from './profile';
import { PAGE_LEVEL_IDS } from './registry';
import { scoreChecks } from './score';
import { extractTopics } from './topics';
import type {
  AuditReport,
  CheckContext,
  CheckResult,
  FetchedResource,
  PageSnapshot,
  PageSummary,
  ScanOptions,
  SiteProfile,
} from './types';

export { describeTargetError, InvalidTargetError } from './fetcher';
export { applyPlanGating } from './score';
export type { AuditReport } from './types';

const PAGE_SUITES: Array<(ctx: CheckContext) => CheckResult[]> = [
  crawlerAccessChecks,
  machineReadabilityChecks,
  structuredDataChecks,
  answerabilityChecks,
  identityChecks,
  technicalChecks,
];

/** Everything a text-only reader would see, with markup and scripts stripped. */
function extractText(html: string): string {
  // Separate adjacent tags so "<a>Pricing</a><a>Blog</a>" does not read as one word.
  const $ = cheerio.load(html.replace(/></g, '> <'));
  $('script, style, noscript, svg, template, iframe').remove();
  return $('body').text().replace(/\s+/g, ' ').trim();
}

const countWords = (text: string) => (text.length === 0 ? 0 : text.split(/\s+/).filter(Boolean).length);

function normaliseUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function runSuites(
  suites: Array<(ctx: CheckContext) => CheckResult[]>,
  ctx: CheckContext,
  warnings: string[],
): CheckResult[] {
  const checks: CheckResult[] = [];
  for (const suite of suites) {
    try {
      checks.push(...suite(ctx));
    } catch (error) {
      // One broken check group must never take down the whole report.
      warnings.push(ctx.t.warnings.suiteFailed(error instanceof Error ? error.message : 'unknown'));
    }
  }
  return checks;
}

const PLACEHOLDER_PROFILE: SiteProfile = {
  type: 'general',
  detected: 'general',
  confidence: 'low',
  signals: [],
  overridden: false,
};

/** Summarises one fetched page using only page-level checks. */
export function summarisePage(
  resource: FetchedResource,
  base: PageSnapshot,
  options: ScanOptions,
  t: AuditMessages,
  sitemapUrls: Set<string> | null,
): PageSummary {
  const html = resource.body || '<html></html>';
  const $ = cheerio.load(html);
  const text = extractText(html);
  const snapshot: PageSnapshot = { ...base, page: resource, finalUrl: resource.url, redirectChainLength: resource.redirects };
  const ctx: CheckContext = {
    snapshot,
    $,
    text,
    wordCount: countWords(text),
    t,
    options,
    profile: PLACEHOLDER_PROFILE,
    pages: [],
  };

  const checks = runSuites(PAGE_SUITES, ctx, []).filter((check) => PAGE_LEVEL_IDS.has(check.id));
  const path = (() => {
    try {
      return new URL(resource.url).pathname || '/';
    } catch {
      return '/';
    }
  })();
  const directives = `${$('meta[name="robots"]').attr('content') ?? ''} ${resource.headers['x-robots-tag'] ?? ''}`;

  return {
    url: resource.url,
    status: resource.status,
    score: resource.ok ? scoreChecks(checks, t).score : 0,
    title: $('head title').first().text().trim(),
    wordCount: ctx.wordCount,
    issues: checks.filter((check) => check.status === 'fail' || check.status === 'warn').map((check) => check.id),
    jsonLdTypes: jsonLdTypes($),
    blockedFor: evaluateCrawlers(base, options, path)
      .filter((verdict) => verdict.selected && verdict.purpose !== 'training' && !verdict.allowed)
      .map((verdict) => verdict.name),
    inSitemap: sitemapUrls ? sitemapUrls.has(normaliseUrl(resource.url)) : null,
    noindex: /\bnoindex\b/i.test(directives),
    description: ($('meta[name="description"]').attr('content') ?? '').trim(),
  };
}

export interface SiteSample {
  resources: FetchedResource[];
  sitemapUrls: Set<string> | null;
  skippedForTime: number;
}

/**
 * Builds the complete, ungated report from already-fetched data.
 * Pure, so tests can drive it without the network.
 */
export function analyseSnapshot(
  snapshot: PageSnapshot,
  plan: AuditReport['plan'],
  locale: Locale = 'en',
  options: ScanOptions = DEFAULT_OPTIONS,
  sample: SiteSample = { resources: [], sitemapUrls: null, skippedForTime: 0 },
): AuditReport {
  const t = getAuditMessages(locale);
  const html = snapshot.page.body || '<html></html>';
  const $ = cheerio.load(html);
  const text = extractText(html);
  const warnings: string[] = [];

  if (!snapshot.page.ok) {
    const reason = snapshot.page.error;
    warnings.push(
      reason === 'blocked-redirect'
        ? t.warnings.blockedRedirect
        : reason
          ? t.warnings.fetchFailed(reason === 'timeout' ? t.warnings.timeout(fetchTimeoutMs()) : reason)
          : t.warnings.httpStatus(snapshot.page.status),
    );
  }
  if (sample.skippedForTime > 0) warnings.push(t.warnings.crawlSkipped(sample.skippedForTime));
  if (options.mode === 'site' && sample.resources.length === 0) warnings.push(t.warnings.noPagesFound);

  const detected = detectProfile($, text, snapshot.finalUrl, options);
  const profile = {
    ...detected,
    label: t.profiles[detected.type],
    detectedLabel: t.profiles[detected.detected],
    signalLabels: detected.signals.map((signal) => t.signals[signal] ?? signal),
  };
  const pages = sample.resources.map((resource) => summarisePage(resource, snapshot, options, t, sample.sitemapUrls));
  const start = summarisePage(snapshot.page, snapshot, options, t, sample.sitemapUrls);

  const ctx: CheckContext = { snapshot, $, text, wordCount: countWords(text), t, options, profile, pages };
  const checks = [
    ...runSuites([...PAGE_SUITES, insightChecks, profileChecks], ctx, warnings),
    ...siteChecks(ctx, start, sample.sitemapUrls !== null),
  ];

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
    crawlers: evaluateCrawlers(snapshot, options),
    plan,
    options,
    profile,
    pages,
    generated: {
      robotsTxt: generateRobotsTxt(snapshot, options, t),
      llmsTxt: generateLlmsTxt($, snapshot, start, pages, t),
      jsonLd: generateJsonLd($, snapshot, profile, t),
    },
    topics: extractTopics($, text),
    cdn: detectCdn(snapshot.page.headers),
    truncated: false,
    lockedCount: 0,
    warnings,
  };
}

/**
 * Full pipeline: validate, fetch, optionally sample the site, analyse, score.
 * Returns the FULL report; callers apply plan gating, so the complete version
 * can be stored while the gated one is sent to the browser.
 */
export async function runAudit(
  url: string,
  plan: AuditReport['plan'] = 'free',
  locale: Locale = 'en',
  options: ScanOptions = DEFAULT_OPTIONS,
  fetcher: Fetcher = fetchResource,
): Promise<AuditReport> {
  const startedAt = Date.now();
  const snapshot = await fetchTarget(url, fetcher);
  const sample: SiteSample =
    options.mode === 'site' && snapshot.page.ok
      ? await crawlSite(snapshot, options.maxPages, fetcher)
      : { resources: [], sitemapUrls: null, skippedForTime: 0 };
  const report = analyseSnapshot(snapshot, plan, locale, options, sample);
  return { ...report, durationMs: Date.now() - startedAt };
}
