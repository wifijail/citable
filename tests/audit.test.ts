import { beforeAll, describe, expect, it } from 'vitest';
import { analyseSnapshot, applyPlanGating } from '@/lib/audit';
import { auditEn } from '@/i18n/audit/en';
import { LOCALES } from '@/i18n/config';
import { findCheck } from '@/lib/audit/registry';
import { gradeFor, scoreChecks } from '@/lib/audit/score';
import type { CheckResult, FetchedResource, PageSnapshot } from '@/lib/audit/types';

function resource(body: string, overrides: Partial<FetchedResource> = {}): FetchedResource {
  return {
    url: 'https://example.com/',
    ok: true,
    status: 200,
    headers: { 'content-type': 'text/html' },
    body,
    elapsedMs: 120,
    redirects: 0,
    ...overrides,
  };
}

function snapshot(options: {
  html: string;
  robots?: string;
  llms?: string;
  sitemap?: string;
}): PageSnapshot {
  return {
    requestedUrl: 'https://example.com/',
    finalUrl: 'https://example.com/',
    origin: 'https://example.com',
    page: resource(options.html),
    robots:
      options.robots === undefined
        ? null
        : resource(options.robots, { url: 'https://example.com/robots.txt' }),
    llmsTxt:
      options.llms === undefined
        ? resource('', { ok: false, status: 404 })
        : resource(options.llms),
    sitemap:
      options.sitemap === undefined
        ? resource('', { ok: false, status: 404 })
        : resource(options.sitemap),
    redirectChainLength: 0,
  };
}

const GOOD_HTML = `<!doctype html>
<html lang="en">
<head>
  <title>How much does a CDN cost in 2026?</title>
  <meta name="description" content="A detailed breakdown of CDN pricing in 2026, comparing per-GB rates, request fees and commitment discounts across the major providers.">
  <link rel="canonical" href="https://example.com/">
  <meta property="og:title" content="CDN pricing 2026">
  <meta property="og:description" content="Detailed CDN pricing breakdown.">
  <meta property="og:url" content="https://example.com/">
  <meta property="og:image" content="https://example.com/og.png">
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"Article","headline":"CDN pricing",
   "author":{"@type":"Person","name":"Jane Roe"},
   "datePublished":"2026-01-10","dateModified":"2026-08-30"}
  </script>
  <script type="application/ld+json">
  {"@context":"https://schema.org","@type":"FAQPage","mainEntity":[
   {"@type":"Question","name":"How much does a CDN cost?",
    "acceptedAnswer":{"@type":"Answer","text":"Between $0.02 and $0.09 per GB."}}]}
  </script>
</head>
<body>
  <main>
    <h1>How much does a CDN cost in 2026?</h1>
    <p>${'Most providers charge between two and nine cents per gigabyte of egress. '.repeat(12)}</p>
    <h2>What drives the price up?</h2>
    <ul><li>Egress region</li><li>Request volume</li><li>TLS termination</li><li>Log delivery</li><li>Support tier</li></ul>
    <p>${'Commitment discounts typically start at one hundred terabytes per month. '.repeat(12)}</p>
    <h2>Which provider is cheapest?</h2>
    <p>${'For small workloads the flat-rate providers win on simplicity alone. '.repeat(12)}</p>
    <img src="/chart.png" alt="CDN price comparison chart">
  </main>
</body>
</html>`;

const SPA_HTML = `<!doctype html>
<html>
<head><title>App</title></head>
<body><div id="root"></div><script src="/bundle.js"></script></body>
</html>`;

describe('analyseSnapshot', () => {
  it('scores a well-optimised page highly', () => {
    const report = analyseSnapshot(
      snapshot({
        html: GOOD_HTML,
        robots: 'User-agent: *\nAllow: /\nSitemap: https://example.com/sitemap.xml',
        llms: '# Example\n\n- [Docs](https://example.com/docs): the docs',
        sitemap: '<urlset><url><loc>https://example.com/</loc></url></urlset>',
      }),
      'pro',
    );

    expect(report.score).toBeGreaterThan(80);
    expect(report.grade === 'A' || report.grade === 'B').toBe(true);
    expect(report.crawlers.every((crawler) => crawler.allowed)).toBe(true);
  });

  it('flags an empty client-rendered shell as critical', () => {
    const report = analyseSnapshot(snapshot({ html: SPA_HTML, robots: '' }), 'pro');

    const ssr = report.categories
      .flatMap((category) => category.checks)
      .find((check) => check.id === 'server-rendered-content');
    const shell = report.categories
      .flatMap((category) => category.checks)
      .find((check) => check.id === 'client-side-rendering-risk');

    expect(ssr?.status).toBe('fail');
    expect(shell?.status).toBe('fail');
    expect(report.score).toBeLessThan(60);
  });

  it('detects retrieval agents blocked by a wildcard rule', () => {
    const report = analyseSnapshot(
      snapshot({ html: GOOD_HTML, robots: 'User-agent: *\nDisallow: /' }),
      'pro',
    );

    const blocked = report.crawlers.filter((crawler) => !crawler.allowed);
    expect(blocked.length).toBe(report.crawlers.length);

    const retrieval = report.categories
      .flatMap((category) => category.checks)
      .find((check) => check.id === 'retrieval-bots-allowed');
    expect(retrieval?.status).toBe('fail');
    expect(retrieval?.impact).toBe('critical');
  });

  it('treats a noindex directive as a critical failure', () => {
    const html = GOOD_HTML.replace('<head>', '<head><meta name="robots" content="noindex">');
    const report = analyseSnapshot(snapshot({ html, robots: 'User-agent: *\nAllow: /' }), 'pro');

    const optOut = report.categories
      .flatMap((category) => category.checks)
      .find((check) => check.id === 'page-level-opt-out');
    expect(optOut?.status).toBe('fail');
  });

  it('never throws on malformed HTML or JSON-LD', () => {
    const html = '<html><head><script type="application/ld+json">{not json}</script></head><body><p>hi';
    expect(() => analyseSnapshot(snapshot({ html }), 'pro')).not.toThrow();
  });
});

describe('plan gating', () => {
  let freeReport: ReturnType<typeof analyseSnapshot>;

  beforeAll(() => {
    freeReport = applyPlanGating(
      analyseSnapshot(snapshot({ html: SPA_HTML, robots: 'User-agent: *\nDisallow: /' }), 'free'),
    );
  });

  it('keeps the score and crawler matrix visible on the free plan', () => {
    expect(freeReport.score).toBeGreaterThanOrEqual(0);
    expect(freeReport.crawlers.length).toBeGreaterThan(0);
    expect(freeReport.categories.length).toBe(6);
  });

  it('reveals exactly three fixes and locks the rest', () => {
    const withFix = freeReport.priorityFixes.filter((check) => check.fix);
    expect(withFix).toHaveLength(3);
    expect(freeReport.truncated).toBe(true);
    expect(freeReport.priorityFixes.some((check) => check.locked)).toBe(true);
  });

  it('counts each locked fix exactly once', () => {
    // Regression: checks appear both in categories and in priorityFixes and
    // used to be counted twice.
    const lockedIds = new Set(
      freeReport.categories.flatMap((category) => category.checks).filter((check) => check.locked).map((check) => check.id),
    );
    expect(freeReport.lockedCount).toBe(lockedIds.size);
  });

  it('never sends locked fix text to the client', () => {
    const everyCheck = [...freeReport.priorityFixes, ...freeReport.categories.flatMap((category) => category.checks)];
    expect(everyCheck.filter((check) => check.locked).every((check) => !check.fix && !check.evidence)).toBe(true);
  });

  it('unlocks everything on a paid plan', () => {
    const pro = applyPlanGating(
      analyseSnapshot(snapshot({ html: SPA_HTML, robots: 'User-agent: *\nDisallow: /' }), 'pro'),
    );
    expect(pro.truncated).toBe(false);
    expect(pro.lockedCount).toBe(0);
    expect(pro.priorityFixes.every((check) => !check.locked)).toBe(true);
  });
});

describe('scoring', () => {
  it('maps scores onto grades', () => {
    expect(gradeFor(95)).toBe('A');
    expect(gradeFor(80)).toBe('B');
    expect(gradeFor(65)).toBe('C');
    expect(gradeFor(45)).toBe('D');
    expect(gradeFor(10)).toBe('F');
  });

  it('gives a perfect score when every check passes', () => {
    const checks: CheckResult[] = [
      {
        id: 'a',
        title: 'A',
        category: 'crawler-access',
        status: 'pass',
        score: 1,
        weight: 5,
        summary: '',
        impact: 'low',
      },
    ];
    expect(scoreChecks(checks, auditEn).score).toBe(100);
  });

  it('sorts critical failures to the top of the fix list', () => {
    const checks: CheckResult[] = [
      {
        id: 'minor',
        title: 'Minor',
        category: 'identity',
        status: 'warn',
        score: 0.5,
        weight: 2,
        summary: '',
        impact: 'low',
      },
      {
        id: 'major',
        title: 'Major',
        category: 'crawler-access',
        status: 'fail',
        score: 0,
        weight: 12,
        summary: '',
        impact: 'critical',
      },
    ];
    expect(scoreChecks(checks, auditEn).priorityFixes[0]?.id).toBe('major');
  });
});

describe('localisation of findings', () => {
  it.each(LOCALES)('produces a complete report in %s', (locale) => {
    const report = analyseSnapshot(snapshot({ html: SPA_HTML, robots: 'User-agent: *\nDisallow: /' }), 'pro', locale);
    const checks = report.categories.flatMap((category) => category.checks);

    expect(report.locale).toBe(locale);
    // Page checks plus the checks for the detected site profile, all from the registry.
    expect(checks.length).toBeGreaterThanOrEqual(31);
    expect(checks.every((check) => findCheck(check.id))).toBe(true);
    expect(report.verdict.length).toBeGreaterThan(10);
    for (const check of checks) {
      expect(check.title.trim()).not.toBe('');
      expect(check.summary.trim()).not.toBe('');
      expect(check.summary).not.toContain('undefined');
    }
    expect(report.categories.every((category) => category.label.trim().length > 0)).toBe(true);
  });

  it('actually translates instead of silently falling back to English', () => {
    const html = SPA_HTML;
    const english = analyseSnapshot(snapshot({ html }), 'pro', 'en');
    for (const locale of LOCALES.filter((code) => code !== 'en')) {
      const translated = analyseSnapshot(snapshot({ html }), 'pro', locale);
      expect(translated.verdict).not.toBe(english.verdict);
      expect(translated.categories[0]?.label).not.toBe(english.categories[0]?.label);
    }
  });

  it('keeps check ids and scores identical across languages', () => {
    const scores = LOCALES.map((locale) => analyseSnapshot(snapshot({ html: GOOD_HTML }), 'pro', locale).score);
    expect(new Set(scores).size).toBe(1);
  });
});
