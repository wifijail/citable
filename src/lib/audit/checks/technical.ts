import type { CheckContext, CheckResult } from '../types';

export function technicalChecks(ctx: CheckContext): CheckResult[] {
  const { $, snapshot } = ctx;
  const { page } = snapshot;
  const results: CheckResult[] = [];

  // --- Response status ------------------------------------------------------------
  results.push({
    id: 'http-status',
    title: 'The page returns a successful response',
    category: 'technical',
    status: page.ok ? 'pass' : 'fail',
    score: page.ok ? 1 : 0,
    weight: 6,
    impact: 'critical',
    summary: page.ok
      ? `HTTP ${page.status} from ${page.url}.`
      : page.error
        ? `Request failed: ${page.error}`
        : `HTTP ${page.status} — crawlers will drop this page.`,
    evidence: [
      `Status: ${page.status || 'no response'}`,
      `Content-Type: ${page.headers['content-type'] ?? 'unknown'}`,
    ],
    fix: page.ok
      ? undefined
      : 'Make sure the URL responds with 200 to an anonymous request. Bot-protection layers (Cloudflare "Under Attack", aggressive WAF rules) frequently return 403 to AI crawlers while a normal browser sees the page fine.',
  });

  // --- HTTPS -----------------------------------------------------------------------
  const isHttps = snapshot.finalUrl.startsWith('https://');
  results.push({
    id: 'https',
    title: 'Served over HTTPS',
    category: 'technical',
    status: isHttps ? 'pass' : 'fail',
    score: isHttps ? 1 : 0,
    weight: 4,
    impact: 'high',
    summary: isHttps ? 'The page is served over HTTPS.' : 'The page is served over plain HTTP.',
    evidence: [snapshot.finalUrl],
    fix: isHttps
      ? undefined
      : 'Serve the site over HTTPS and 301-redirect HTTP to it. Several crawlers skip insecure origins outright.',
  });

  // --- Time to first byte -------------------------------------------------------------
  const elapsed = page.elapsedMs;
  const fastEnough = elapsed <= 1500;
  results.push({
    id: 'response-time',
    title: 'Server responds quickly',
    category: 'technical',
    status: fastEnough ? 'pass' : elapsed <= 3500 ? 'warn' : 'fail',
    score: fastEnough ? 1 : elapsed <= 3500 ? 0.6 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: `Full response took ${elapsed} ms.`,
    evidence: [`${elapsed} ms measured from request to full body`],
    fix: fastEnough
      ? undefined
      : 'Live retrieval agents work under a hard latency budget while a user waits for an answer. Slow pages get dropped from the candidate set even when they are the best source. Cache the HTML at the edge and keep server work off the critical path.',
  });

  // --- Redirect chain ---------------------------------------------------------------
  const hops = snapshot.redirectChainLength;
  results.push({
    id: 'redirect-chain',
    title: 'Reaching the page takes few redirects',
    category: 'technical',
    status: hops <= 1 ? 'pass' : hops <= 2 ? 'warn' : 'fail',
    score: hops <= 1 ? 1 : hops <= 2 ? 0.6 : 0.2,
    weight: 2,
    impact: 'low',
    summary: hops === 0 ? 'No redirects.' : `${hops} redirect hop(s) before the final URL.`,
    evidence: [`${hops} hop(s)`, `Requested: ${snapshot.requestedUrl}`, `Final: ${snapshot.finalUrl}`],
    fix:
      hops <= 1
        ? undefined
        : 'Collapse redirect chains to a single hop. Some crawlers stop following after two, and every hop adds latency to a time-boxed fetch.',
  });

  // --- Page weight -----------------------------------------------------------------
  const kilobytes = page.body.length / 1024;
  const lean = kilobytes <= 500;
  results.push({
    id: 'html-weight',
    title: 'HTML payload is a reasonable size',
    category: 'technical',
    status: lean ? 'pass' : kilobytes <= 1500 ? 'warn' : 'fail',
    score: lean ? 1 : kilobytes <= 1500 ? 0.6 : 0.2,
    weight: 2,
    impact: 'low',
    summary: `${kilobytes.toFixed(0)} KB of HTML.`,
    evidence: [`${kilobytes.toFixed(1)} KB`],
    fix: lean
      ? undefined
      : 'Trim the document. Extraction pipelines truncate oversized pages, and the tail — often your conclusion — is what gets cut.',
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
    title: 'Images carry descriptive alt text',
    category: 'technical',
    status: coverage >= 0.9 ? 'pass' : coverage >= 0.6 ? 'warn' : 'fail',
    score: coverage,
    weight: 3,
    impact: 'low',
    summary:
      images.length === 0
        ? 'No images on the page.'
        : `${withAlt} of ${images.length} images have alt text (${Math.round(coverage * 100)}%).`,
    evidence: [`${images.length} images`, `${withAlt} with non-empty alt`],
    fix:
      coverage >= 0.9
        ? undefined
        : 'Describe what each informative image shows. Alt text is the only part of an image that reaches a text-only crawler, and charts or screenshots often carry the data worth citing.',
  });

  return results;
}
