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

/** Share of a crawler group's weight that is blocked, 0..1. */
function blockedRatio(verdicts: CrawlerVerdict[]): number {
  const total = verdicts.reduce((sum, v) => sum + weightOf(v.id), 0);
  const lost = verdicts.filter((v) => !v.allowed).reduce((sum, v) => sum + weightOf(v.id), 0);
  return total === 0 ? 0 : lost / total;
}

export function crawlerAccessChecks(ctx: CheckContext): CheckResult[] {
  const { snapshot, $, t } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];
  const verdicts = evaluateCrawlers(snapshot);

  // --- robots.txt exists and parses -----------------------------------------
  const robots = snapshot.robots;
  const robotsOk = Boolean(robots?.ok && robots.body.trim().length > 0);
  const parsed = parseRobots(robotsOk ? (robots?.body ?? '') : '');

  results.push({
    id: 'robots-txt-present',
    title: m.robotsPresent.title,
    category: 'crawler-access',
    status: robotsOk ? 'pass' : 'warn',
    score: robotsOk ? 1 : 0.5,
    weight: 6,
    impact: 'medium',
    summary: robotsOk ? m.robotsPresent.ok(parsed.groups.length) : m.robotsPresent.missing,
    evidence: [
      t.common.httpStatus(`${snapshot.origin}/robots.txt`, robots?.status ?? 0),
      ...(parsed.sitemaps.length > 0 ? [m.robotsPresent.sitemaps(parsed.sitemaps.length)] : []),
    ],
    fix: robotsOk ? undefined : m.robotsPresent.fix(snapshot.origin),
  });

  // --- Retrieval bots: the ones that decide whether you can be cited live ----
  const retrieval = verdicts.filter((v) => v.purpose === 'retrieval');
  const retrievalBlocked = retrieval.filter((v) => !v.allowed);
  const retrievalRatio = blockedRatio(retrieval);

  results.push({
    id: 'retrieval-bots-allowed',
    title: m.retrievalBots.title,
    category: 'crawler-access',
    status: retrievalBlocked.length === 0 ? 'pass' : retrievalRatio > 0.4 ? 'fail' : 'warn',
    score: 1 - retrievalRatio,
    weight: 12,
    impact: 'critical',
    summary:
      retrievalBlocked.length === 0
        ? m.retrievalBots.ok(retrieval.length)
        : m.retrievalBots.blocked(
            retrievalBlocked.length,
            retrieval.length,
            retrievalBlocked.map((v) => v.name).join(', '),
          ),
    evidence: retrievalBlocked.map((v) =>
      m.retrievalBots.evidence(v.name, v.rule ?? '', v.matchedGroup ?? '*'),
    ),
    fix:
      retrievalBlocked.length === 0
        ? undefined
        : m.retrievalBots.fix(retrievalBlocked.map((v) => v.name)),
  });

  // --- Indexing bots ---------------------------------------------------------
  const indexing = verdicts.filter((v) => v.purpose === 'indexing');
  const indexingBlocked = indexing.filter((v) => !v.allowed);
  const indexingRatio = blockedRatio(indexing);

  results.push({
    id: 'indexing-bots-allowed',
    title: m.indexingBots.title,
    category: 'crawler-access',
    status: indexingBlocked.length === 0 ? 'pass' : indexingRatio > 0.4 ? 'fail' : 'warn',
    score: 1 - indexingRatio,
    weight: 10,
    impact: 'critical',
    summary:
      indexingBlocked.length === 0
        ? m.indexingBots.ok(indexing.length)
        : m.indexingBots.blocked(indexingBlocked.map((v) => v.name).join(', ')),
    evidence: indexingBlocked.map((v) => m.indexingBots.evidence(v.name, v.rule ?? '')),
    fix:
      indexingBlocked.length === 0 ? undefined : m.indexingBots.fix(indexingBlocked.map((v) => v.name)),
  });

  // --- Training bots: informational, blocking them is a valid choice ---------
  const training = verdicts.filter((v) => v.purpose === 'training');
  const trainingBlocked = training.filter((v) => !v.allowed);

  results.push({
    id: 'training-bots-policy',
    title: m.trainingBots.title,
    category: 'crawler-access',
    status: trainingBlocked.length === 0 ? 'pass' : 'info',
    score: trainingBlocked.length === 0 ? 1 : 0.7,
    weight: 3,
    impact: 'low',
    summary:
      trainingBlocked.length === 0
        ? m.trainingBots.ok
        : m.trainingBots.blocked(trainingBlocked.length, trainingBlocked.map((v) => v.name).join(', ')),
    evidence: training.map((v) => m.trainingBots.state(v.name, v.allowed)),
    fix: trainingBlocked.length === 0 ? undefined : m.trainingBots.fix,
  });

  // --- Page-level opt-out signals -------------------------------------------
  const metaRobots = ($('meta[name="robots"]').attr('content') ?? '').toLowerCase();
  const xRobots = (snapshot.page.headers['x-robots-tag'] ?? '').toLowerCase();
  const combined = `${metaRobots} ${xRobots}`;
  const hasNoindex = /\bnoindex\b/.test(combined);
  const hasNoai = /\bnoai\b|\bnoimageai\b/.test(combined);

  results.push({
    id: 'page-level-opt-out',
    title: m.pageOptOut.title,
    category: 'crawler-access',
    status: hasNoindex ? 'fail' : hasNoai ? 'warn' : 'pass',
    score: hasNoindex ? 0 : hasNoai ? 0.5 : 1,
    weight: 8,
    impact: hasNoindex ? 'critical' : 'medium',
    summary: hasNoindex ? m.pageOptOut.noindex : hasNoai ? m.pageOptOut.noai : m.pageOptOut.ok,
    evidence: [
      metaRobots ? m.pageOptOut.meta(metaRobots) : m.pageOptOut.noMeta,
      xRobots ? m.pageOptOut.header(xRobots) : m.pageOptOut.noHeader,
    ],
    fix: hasNoindex ? m.pageOptOut.fixNoindex : hasNoai ? m.pageOptOut.fixNoai : undefined,
  });

  return results;
}
