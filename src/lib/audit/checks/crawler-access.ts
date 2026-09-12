import { AI_CRAWLERS } from '../crawlers';
import { isAllowed, parseRobots } from '../robots';
import type { CheckContext, CheckResult, CrawlerVerdict, PageSnapshot } from '../types';

/** Runs every registered AI agent through the site's robots.txt. */
export function evaluateCrawlers(snapshot: PageSnapshot): CrawlerVerdict[] {
  const robotsBody = snapshot.robots?.ok ? snapshot.robots.body : '';
  const parsed = parseRobots(robotsBody);
  const path = new URL(snapshot.finalUrl).pathname || '/';

  return AI_CRAWLERS.map((crawler) => {
    const decision = isAllowed(parsed, crawler.name, path);
    return {
      id: crawler.id,
      name: crawler.name,
      vendor: crawler.vendor,
      purpose: crawler.purpose,
      allowed: decision.allowed,
      rule: decision.rule,
      matchedGroup: decision.matchedGroup,
    };
  });
}

function weightOf(id: string): number {
  return AI_CRAWLERS.find((crawler) => crawler.id === id)?.weight ?? 1;
}

function allowSnippet(names: string[]): string {
  return names.map((name) => `User-agent: ${name}\nAllow: /\n`).join('\n');
}

export function crawlerAccessChecks(ctx: CheckContext): CheckResult[] {
  const { snapshot, $ } = ctx;
  const results: CheckResult[] = [];
  const verdicts = evaluateCrawlers(snapshot);

  // --- robots.txt exists and parses -----------------------------------------
  const robots = snapshot.robots;
  const robotsOk = Boolean(robots?.ok && robots.body.trim().length > 0);
  const parsed = parseRobots(robotsOk ? (robots?.body ?? '') : '');

  results.push({
    id: 'robots-txt-present',
    title: 'robots.txt is reachable',
    category: 'crawler-access',
    status: robotsOk ? 'pass' : 'warn',
    score: robotsOk ? 1 : 0.5,
    weight: 6,
    impact: 'medium',
    summary: robotsOk
      ? `robots.txt found with ${parsed.groups.length} user-agent group(s).`
      : 'No usable robots.txt. Crawlers fall back to "allow everything", which works but leaves you no control.',
    evidence: [
      `${snapshot.origin}/robots.txt returned HTTP ${robots?.status ?? 0}`,
      ...(parsed.sitemaps.length > 0 ? [`Declares ${parsed.sitemaps.length} sitemap(s)`] : []),
    ],
    fix: robotsOk
      ? undefined
      : `Publish /robots.txt so AI access is an explicit decision rather than a default:\n\nUser-agent: *\nAllow: /\n\nSitemap: ${snapshot.origin}/sitemap.xml`,
  });

  // --- Retrieval bots: the ones that decide whether you can be cited live ----
  const retrieval = verdicts.filter((v) => v.purpose === 'retrieval');
  const retrievalBlocked = retrieval.filter((v) => !v.allowed);
  const retrievalWeight = retrieval.reduce((sum, v) => sum + weightOf(v.id), 0);
  const retrievalLost = retrievalBlocked.reduce((sum, v) => sum + weightOf(v.id), 0);
  const retrievalRatio = retrievalWeight === 0 ? 0 : retrievalLost / retrievalWeight;

  results.push({
    id: 'retrieval-bots-allowed',
    title: 'Live retrieval agents can fetch this page',
    category: 'crawler-access',
    status: retrievalBlocked.length === 0 ? 'pass' : retrievalRatio > 0.4 ? 'fail' : 'warn',
    score: 1 - retrievalRatio,
    weight: 12,
    impact: 'critical',
    summary:
      retrievalBlocked.length === 0
        ? `All ${retrieval.length} live-retrieval agents (ChatGPT-User, Claude-User, Perplexity-User and friends) are allowed.`
        : `${retrievalBlocked.length} of ${retrieval.length} live-retrieval agents are blocked: ${retrievalBlocked
            .map((v) => v.name)
            .join(', ')}. This page cannot appear in their answers.`,
    evidence: retrievalBlocked.map(
      (v) => `${v.name} blocked by "${v.rule}" in group "User-agent: ${v.matchedGroup}"`,
    ),
    fix:
      retrievalBlocked.length === 0
        ? undefined
        : `Add explicit allow groups above your wildcard rules in /robots.txt. Retrieval agents fetch a page only because a user asked something it answers, so blocking them removes you from the answer, not from training:\n\n${allowSnippet(
            retrievalBlocked.map((v) => v.name),
          )}`,
  });

  // --- Indexing bots ---------------------------------------------------------
  const indexing = verdicts.filter((v) => v.purpose === 'indexing');
  const indexingBlocked = indexing.filter((v) => !v.allowed);
  const indexingWeight = indexing.reduce((sum, v) => sum + weightOf(v.id), 0);
  const indexingLost = indexingBlocked.reduce((sum, v) => sum + weightOf(v.id), 0);
  const indexingRatio = indexingWeight === 0 ? 0 : indexingLost / indexingWeight;

  results.push({
    id: 'indexing-bots-allowed',
    title: 'AI search indexers can crawl this page',
    category: 'crawler-access',
    status: indexingBlocked.length === 0 ? 'pass' : indexingRatio > 0.4 ? 'fail' : 'warn',
    score: 1 - indexingRatio,
    weight: 10,
    impact: 'critical',
    summary:
      indexingBlocked.length === 0
        ? `All ${indexing.length} answer-engine indexers are allowed.`
        : `Blocked indexers: ${indexingBlocked.map((v) => v.name).join(', ')}. You will not show up in their sources list.`,
    evidence: indexingBlocked.map((v) => `${v.name} blocked by "${v.rule}"`),
    fix:
      indexingBlocked.length === 0
        ? undefined
        : `These crawlers build the index answer engines cite from. Allow them explicitly:\n\n${allowSnippet(
            indexingBlocked.map((v) => v.name),
          )}`,
  });

  // --- Training bots: informational, blocking them is a valid choice ---------
  const training = verdicts.filter((v) => v.purpose === 'training');
  const trainingBlocked = training.filter((v) => !v.allowed);

  results.push({
    id: 'training-bots-policy',
    title: 'Training-crawler policy is deliberate',
    category: 'crawler-access',
    status: trainingBlocked.length === 0 ? 'pass' : 'info',
    score: trainingBlocked.length === 0 ? 1 : 0.7,
    weight: 3,
    impact: 'low',
    summary:
      trainingBlocked.length === 0
        ? 'All training crawlers are allowed, which maximises long-term brand presence inside the models themselves.'
        : `${trainingBlocked.length} training crawler(s) blocked (${trainingBlocked
            .map((v) => v.name)
            .join(', ')}). That is a legitimate licensing stance as long as it is intentional.`,
    evidence: training.map((v) => `${v.name}: ${v.allowed ? 'allowed' : 'blocked'}`),
    fix:
      trainingBlocked.length === 0
        ? undefined
        : 'If this block was accidental, it usually comes from a broad wildcard group. Note that it also keeps you out of the model weights that answer questions offline, where no citation opportunity exists at all.',
  });

  // --- Page-level opt-out signals -------------------------------------------
  const metaRobots = ($('meta[name="robots"]').attr('content') ?? '').toLowerCase();
  const xRobots = (snapshot.page.headers['x-robots-tag'] ?? '').toLowerCase();
  const combined = `${metaRobots} ${xRobots}`;
  const hasNoindex = /\bnoindex\b/.test(combined);
  const hasNoai = /\bnoai\b|\bnoimageai\b/.test(combined);

  results.push({
    id: 'page-level-opt-out',
    title: 'No page-level noindex or noai directive',
    category: 'crawler-access',
    status: hasNoindex ? 'fail' : hasNoai ? 'warn' : 'pass',
    score: hasNoindex ? 0 : hasNoai ? 0.5 : 1,
    weight: 8,
    impact: hasNoindex ? 'critical' : 'medium',
    summary: hasNoindex
      ? 'This page carries a noindex directive, so it is invisible to every search and answer engine.'
      : hasNoai
        ? 'A noai/noimageai directive asks AI systems not to use this content.'
        : 'No directive is suppressing this page.',
    evidence: [
      metaRobots ? `meta robots: ${metaRobots}` : 'No meta robots tag',
      xRobots ? `X-Robots-Tag: ${xRobots}` : 'No X-Robots-Tag header',
    ],
    fix: hasNoindex
      ? 'Remove `noindex` from both the meta robots tag and the X-Robots-Tag response header. This one directive cancels every other optimisation on the page.'
      : hasNoai
        ? 'Drop `noai` if you want assistants to quote this page; keep it if the opt-out is deliberate.'
        : undefined,
  });

  return results;
}
