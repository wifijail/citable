import type { CheckContext, CheckResult, PageSummary } from '../types';

function listEvidence(pages: PageSummary[], limit = 8): string[] {
  const shown = pages.slice(0, limit).map((page) => page.url);
  return pages.length > limit ? [...shown, `+${pages.length - limit}`] : shown;
}

/**
 * Site-wide findings, computed from the pages sampled in site mode. The start
 * page is included so a problem on it counts towards the site picture too.
 */
export function siteChecks(ctx: CheckContext, start: PageSummary, sitemapKnown: boolean): CheckResult[] {
  const { t, pages } = ctx;
  if (pages.length === 0) return [];
  const m = t.checks;
  const all = [start, ...pages];
  const total = all.length;
  const reachable = all.filter((page) => page.status === 200);
  const results: CheckResult[] = [];

  const ratioStatus = (bad: number, failAt: number): CheckResult['status'] =>
    bad === 0 ? 'pass' : bad / Math.max(1, reachable.length) >= failAt ? 'fail' : 'warn';

  // --- Unreachable pages ---------------------------------------------------------
  const broken = all.filter((page) => page.status !== 200);
  results.push({
    id: 'site-unreachable-pages',
    title: m.siteUnreachable.title,
    category: 'technical',
    status: broken.length === 0 ? 'pass' : broken.length / total >= 0.3 ? 'fail' : 'warn',
    score: 1 - broken.length / total,
    weight: 4,
    impact: 'high',
    summary: broken.length === 0 ? m.siteUnreachable.ok : m.siteUnreachable.found(broken.length, total),
    evidence: broken.length ? broken.slice(0, 8).map((page) => `${page.status || '—'} ${page.url}`) : undefined,
    fix: broken.length ? m.siteUnreachable.fix : undefined,
  });

  // --- Pages disallowed for selected agents ---------------------------------------
  const blocked = reachable.filter((page) => page.blockedFor.length > 0);
  results.push({
    id: 'site-blocked-pages',
    title: m.siteBlocked.title,
    category: 'crawler-access',
    status: ratioStatus(blocked.length, 0.3),
    score: reachable.length ? 1 - blocked.length / reachable.length : 1,
    weight: 8,
    impact: 'critical',
    summary: blocked.length === 0 ? m.siteBlocked.ok : m.siteBlocked.found(blocked.length, reachable.length),
    evidence: blocked.slice(0, 8).map((page) => `${page.url} — ${page.blockedFor.join(', ')}`),
    fix: blocked.length ? m.siteBlocked.fix : undefined,
  });

  // --- noindex ---------------------------------------------------------------------
  const noindex = reachable.filter((page) => page.noindex);
  results.push({
    id: 'site-noindex-pages',
    title: m.siteNoindex.title,
    category: 'crawler-access',
    status: noindex.length === 0 ? 'pass' : 'warn',
    score: reachable.length ? 1 - noindex.length / reachable.length : 1,
    weight: 4,
    impact: 'high',
    summary: noindex.length === 0 ? m.siteNoindex.ok : m.siteNoindex.found(noindex.length, reachable.length),
    evidence: noindex.length ? listEvidence(noindex) : undefined,
    fix: noindex.length ? m.siteNoindex.fix : undefined,
  });

  // --- Client-rendered pages --------------------------------------------------------
  const empty = reachable.filter((page) => page.wordCount < 50);
  results.push({
    id: 'site-client-rendered',
    title: m.siteClientRendered.title,
    category: 'machine-readability',
    status: ratioStatus(empty.length, 0.3),
    score: reachable.length ? 1 - empty.length / reachable.length : 1,
    weight: 6,
    impact: 'critical',
    summary: empty.length === 0 ? m.siteClientRendered.ok : m.siteClientRendered.found(empty.length, reachable.length),
    evidence: empty.length ? listEvidence(empty) : undefined,
    fix: empty.length ? m.siteClientRendered.fix : undefined,
  });

  // --- Sitemap coverage --------------------------------------------------------------
  if (sitemapKnown) {
    const missing = reachable.filter((page) => page.inSitemap === false);
    results.push({
      id: 'site-sitemap-coverage',
      title: m.siteSitemapCoverage.title,
      category: 'machine-readability',
      status: missing.length === 0 ? 'pass' : 'warn',
      score: reachable.length ? 1 - missing.length / reachable.length : 1,
      weight: 3,
      impact: 'medium',
      summary: missing.length === 0 ? m.siteSitemapCoverage.ok : m.siteSitemapCoverage.found(missing.length, reachable.length),
      evidence: missing.length ? listEvidence(missing) : undefined,
      fix: missing.length ? m.siteSitemapCoverage.fix : undefined,
    });
  }

  // --- JSON-LD coverage --------------------------------------------------------------
  const noSchema = reachable.filter((page) => page.jsonLdTypes.length === 0);
  const coverage = reachable.length ? Math.round(((reachable.length - noSchema.length) / reachable.length) * 100) : 100;
  results.push({
    id: 'site-schema-coverage',
    title: m.siteSchemaCoverage.title,
    category: 'structured-data',
    status: noSchema.length === 0 ? 'pass' : coverage < 50 ? 'fail' : 'warn',
    score: coverage / 100,
    weight: 5,
    impact: 'medium',
    summary: noSchema.length === 0 ? m.siteSchemaCoverage.ok(coverage) : m.siteSchemaCoverage.low(noSchema.length, reachable.length),
    evidence: noSchema.length ? listEvidence(noSchema) : undefined,
    fix: noSchema.length ? m.siteSchemaCoverage.fix : undefined,
  });

  // --- Thin pages -----------------------------------------------------------------------
  const thin = reachable.filter((page) => page.wordCount >= 50 && page.wordCount < 150);
  results.push({
    id: 'site-thin-pages',
    title: m.siteThinPages.title,
    category: 'answerability',
    status: thin.length === 0 ? 'pass' : 'warn',
    score: reachable.length ? 1 - thin.length / reachable.length / 2 : 1,
    weight: 3,
    impact: 'low',
    summary: thin.length === 0 ? m.siteThinPages.ok : m.siteThinPages.found(thin.length, reachable.length),
    evidence: thin.length ? listEvidence(thin) : undefined,
    fix: thin.length ? m.siteThinPages.fix : undefined,
  });

  // --- Duplicate titles -----------------------------------------------------------------
  const byTitle = new Map<string, PageSummary[]>();
  for (const page of reachable) {
    const key = page.title.trim().toLowerCase();
    if (!key) continue;
    byTitle.set(key, [...(byTitle.get(key) ?? []), page]);
  }
  const duplicates = [...byTitle.values()].filter((group) => group.length > 1);
  results.push({
    id: 'site-duplicate-titles',
    title: m.siteDuplicateTitles.title,
    category: 'identity',
    status: duplicates.length === 0 ? 'pass' : 'warn',
    score: duplicates.length === 0 ? 1 : 0.5,
    weight: 3,
    impact: 'medium',
    summary: duplicates.length === 0 ? m.siteDuplicateTitles.ok : m.siteDuplicateTitles.found(duplicates.length),
    evidence: duplicates.slice(0, 4).map((group) => `"${group[0]?.title.slice(0, 60)}" — ${group.map((page) => new URL(page.url).pathname).join(', ')}`),
    fix: duplicates.length ? m.siteDuplicateTitles.fix : undefined,
  });

  // --- Missing descriptions -------------------------------------------------------------
  const noDescription = reachable.filter((page) => !page.description);
  results.push({
    id: 'site-missing-descriptions',
    title: m.siteMissingDescriptions.title,
    category: 'identity',
    status: noDescription.length === 0 ? 'pass' : 'warn',
    score: reachable.length ? 1 - noDescription.length / reachable.length : 1,
    weight: 2,
    impact: 'low',
    summary: noDescription.length === 0 ? m.siteMissingDescriptions.ok : m.siteMissingDescriptions.found(noDescription.length, reachable.length),
    evidence: noDescription.length ? listEvidence(noDescription) : undefined,
    fix: noDescription.length ? m.siteMissingDescriptions.fix : undefined,
  });

  return results;
}
