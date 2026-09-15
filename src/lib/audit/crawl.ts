import * as cheerio from 'cheerio';
import { citableBotDisallowed, fetchResource, type Fetcher } from './fetcher';
import type { FetchedResource, PageSnapshot } from './types';

const SKIP_EXTENSIONS =
  /\.(pdf|jpe?g|png|gif|webp|avif|svg|ico|css|js|mjs|json|xml|txt|zip|rar|gz|mp4|mp3|webm|woff2?|ttf|eot|docx?|xlsx?|pptx?)$/i;
const SKIP_PATHS = /\/(cart|basket|checkout|login|logout|signin|sign-in|signup|sign-up|register|account|wp-admin|wp-login|admin|cdn-cgi)(\/|$)/i;
const KEY_PAGES =
  /\/(pricing|plans|price|prices|tarif\w*|ceny|about|about-us|company|o-nas|o-kompanii|contact\w*|kontakt\w*|faq|help|blog|news|docs|documentation|product\w*|catalog\w*|shop|services?|uslugi)(\/|$)/i;

const PAGE_TIMEOUT_MS = 7_000;
const CRAWL_BUDGET_MS = 20_000;
const CONCURRENCY = 4;

function normalise(href: string, base: string, host: string): string | null {
  try {
    const url = new URL(href, base);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (url.hostname.replace(/^www\./, '') !== host.replace(/^www\./, '')) return null;
    url.hash = '';
    url.search = '';
    if (SKIP_EXTENSIONS.test(url.pathname) || SKIP_PATHS.test(url.pathname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

/** Every <loc> in a sitemap body (urlset or sitemapindex). */
export function sitemapLocations(body: string): string[] {
  return [...body.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((match) => (match[1] ?? '').replace(/&amp;/g, '&'));
}

export interface DiscoveredPages {
  /** Candidate URLs, most important first, excluding the start page. */
  urls: string[];
  /** Normalised URLs listed in the sitemap, or null if no sitemap was readable. */
  sitemapUrls: Set<string> | null;
}

/**
 * Picks the pages worth sampling: links from the start page and sitemap
 * entries, with pricing/about/contact/docs-style pages first and shallow paths
 * before deep ones.
 */
export async function discoverPages(snapshot: PageSnapshot, fetcher: Fetcher = fetchResource): Promise<DiscoveredPages> {
  const start = new URL(snapshot.finalUrl);
  const host = start.hostname;
  const $ = cheerio.load(snapshot.page.body || '');

  const linked = new Set<string>();
  $('a[href]').each((_, element) => {
    const url = normalise($(element).attr('href') ?? '', snapshot.finalUrl, host);
    if (url) linked.add(url);
  });

  let sitemapUrls: Set<string> | null = null;
  const sitemapBody = snapshot.sitemap?.ok ? snapshot.sitemap.body : '';
  if (/<(urlset|sitemapindex)/i.test(sitemapBody)) {
    let locations = sitemapLocations(sitemapBody);
    if (/<sitemapindex/i.test(sitemapBody) && locations[0]) {
      // Follow the first child sitemap only: enough to sample, cheap on time.
      let childUrl: URL | null = null;
      try {
        childUrl = new URL(locations[0], snapshot.finalUrl);
      } catch {
        childUrl = null;
      }
      const sameHost = childUrl && childUrl.hostname.replace(/^www\./, '') === host.replace(/^www\./, '');
      const childResource =
        childUrl && sameHost ? await fetcher(childUrl.toString(), 'application/xml,text/xml', PAGE_TIMEOUT_MS) : null;
      locations = childResource?.ok ? sitemapLocations(childResource.body) : [];
    }
    sitemapUrls = new Set(
      locations.map((loc) => normalise(loc, snapshot.finalUrl, host)).filter((url): url is string => Boolean(url)),
    );
  }

  const startKey = normalise(snapshot.finalUrl, snapshot.finalUrl, host);
  const candidates = new Set<string>([...linked, ...(sitemapUrls ?? [])]);
  if (startKey) candidates.delete(startKey);

  const rank = (url: string) => {
    const path = new URL(url).pathname;
    let score = 0;
    if (KEY_PAGES.test(path)) score += 5;
    if (linked.has(url)) score += 2;
    if (sitemapUrls?.has(url)) score += 1;
    score -= path.split('/').filter(Boolean).length;
    return score;
  };

  return {
    urls: [...candidates].sort((a, b) => rank(b) - rank(a)),
    sitemapUrls,
  };
}

/**
 * Fetches up to `maxPages - 1` additional pages concurrently, within a fixed
 * time budget. Pages whose robots.txt group explicitly names CitableBot are
 * skipped.
 */
export async function crawlSite(
  snapshot: PageSnapshot,
  maxPages: number,
  fetcher: Fetcher = fetchResource,
): Promise<{ resources: FetchedResource[]; sitemapUrls: Set<string> | null; skippedForTime: number }> {
  const { urls, sitemapUrls } = await discoverPages(snapshot, fetcher);
  const robotsBody = snapshot.robots?.ok ? snapshot.robots.body : '';
  const queue = urls
    .filter((url) => !citableBotDisallowed(robotsBody, new URL(url).pathname))
    .slice(0, Math.max(0, maxPages - 1));

  const startedAt = Date.now();
  const fetched: Array<{ order: number; resource: FetchedResource }> = [];
  let next = 0;
  let skippedForTime = 0;

  const worker = async () => {
    while (next < queue.length) {
      const order = next++;
      const url = queue[order];
      if (!url) break;
      if (Date.now() - startedAt > CRAWL_BUDGET_MS) {
        skippedForTime++;
        continue;
      }
      const resource = await fetcher(url, 'text/html,application/xhtml+xml', PAGE_TIMEOUT_MS);
      const type = resource.headers['content-type'] ?? '';
      if (resource.status > 0 && type && !/html/i.test(type)) continue;
      fetched.push({ order, resource });
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
  // Keep discovery order regardless of which request finished first.
  const resources = fetched.sort((a, b) => a.order - b.order).map((entry) => entry.resource);
  return { resources, sitemapUrls, skippedForTime };
}
