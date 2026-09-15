import type { CheerioAPI } from 'cheerio';
import type { AuditMessages } from '@/i18n/audit/en';
import { AI_CRAWLERS } from './crawlers';
import { isAllowed, parseRobots, ruleMatches, selectRules, type RobotsGroup } from './robots';
import type { PageSnapshot, PageSummary, ScanOptions, SiteProfile } from './types';

/**
 * Proposes a robots.txt for this site:
 *  - selected retrieval/indexing agents that are blocked from the scanned path
 *    get their own group, carrying over every rule that applied to them except
 *    the ones blocking the scanned path — so private areas stay private;
 *  - training crawlers are disallowed when the owner chose that policy;
 *  - everything else in the original file is kept.
 */
export function generateRobotsTxt(
  snapshot: PageSnapshot,
  options: ScanOptions,
  t: AuditMessages,
): string {
  const original = snapshot.robots?.ok ? snapshot.robots.body : '';
  const parsed = parseRobots(original);
  const path = new URL(snapshot.finalUrl).pathname || '/';

  const toOpen = AI_CRAWLERS.filter(
    (crawler) =>
      crawler.purpose !== 'training' &&
      options.engines.includes(crawler.engine) &&
      !isAllowed(parsed, crawler.name, path).allowed,
  );
  const toClose = options.blockTraining
    ? AI_CRAWLERS.filter((crawler) => crawler.purpose === 'training' && isAllowed(parsed, crawler.name, '/').allowed)
    : [];

  const overridden = new Set([...toOpen, ...toClose].map((crawler) => crawler.name.toLowerCase()));
  const kept: RobotsGroup[] = parsed.groups
    .map((group) => ({ ...group, agents: group.agents.filter((agent) => !overridden.has(agent)) }))
    .filter((group) => group.agents.length > 0);

  const blocks: string[] = [`# ${t.generated.robotsHeader}`];

  for (const crawler of toOpen) {
    const inherited = selectRules(parsed, crawler.name)?.rules ?? [];
    const rules = inherited.filter((rule) => !(rule.type === 'disallow' && ruleMatches(rule, path)));
    blocks.push([`User-agent: ${crawler.name}`, ...(rules.length ? rules.map((rule) => rule.raw) : ['Allow: /'])].join('\n'));
  }
  for (const crawler of toClose) {
    blocks.push(`User-agent: ${crawler.name}\nDisallow: /`);
  }
  for (const group of kept) {
    const lines = [...group.agents.map((agent) => `User-agent: ${agent === '*' ? '*' : displayName(agent)}`)];
    lines.push(...(group.rules.length ? group.rules.map((rule) => rule.raw) : ['Disallow:']), ...group.extras);
    blocks.push(lines.join('\n'));
  }
  // No user-agent groups at all (missing file, or only Sitemap lines): state the default explicitly.
  if (parsed.groups.length === 0) blocks.push('User-agent: *\nAllow: /');

  const sitemaps = parsed.sitemaps.length ? parsed.sitemaps : [`${snapshot.origin}/sitemap.xml`];
  blocks.push(sitemaps.map((url) => `Sitemap: ${url}`).join('\n'));
  return `${blocks.join('\n\n')}\n`;
}

/** Restores the documented capitalisation of known agents. */
function displayName(agent: string): string {
  return AI_CRAWLERS.find((crawler) => crawler.name.toLowerCase() === agent)?.name ?? agent;
}

function siteName($: CheerioAPI, hostname: string): string {
  const og = $('meta[property="og:site_name"]').attr('content')?.trim();
  if (og) return og;
  const title = $('head title').first().text().trim();
  const first = title.split(/\s[|–—·-]\s/)[0]?.trim();
  return first && first.length <= 60 ? first : hostname;
}

function describe(text: string, max = 140): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length <= max ? clean : `${clean.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
}

/** A llms.txt draft built from the pages actually fetched. */
export function generateLlmsTxt(
  $: CheerioAPI,
  snapshot: PageSnapshot,
  start: PageSummary,
  pages: PageSummary[],
  t: AuditMessages,
): string {
  const hostname = new URL(snapshot.finalUrl).hostname;
  const name = siteName($, hostname);
  const description = describe(start.description || $('h1').first().text() || name, 220);
  const readable = [start, ...pages].filter((page) => page.status === 200 && !page.noindex);
  const line = (page: PageSummary) =>
    `- [${describe(page.title || new URL(page.url).pathname, 80)}](${page.url})${page.description ? `: ${describe(page.description)}` : ''}`;

  const main = readable.slice(0, 8);
  const other = readable.slice(8, 30);
  return [
    `# ${name}`,
    '',
    `> ${description}`,
    '',
    `## ${t.generated.llmsMainSection}`,
    ...main.map(line),
    ...(other.length ? ['', `## ${t.generated.llmsOtherSection}`, ...other.map(line)] : []),
    '',
  ].join('\n');
}

const SOCIAL_HOSTS = /(^|\.)(x\.com|twitter\.com|facebook\.com|instagram\.com|linkedin\.com|youtube\.com|t\.me|github\.com|tiktok\.com|vk\.com)$/i;

/** JSON-LD draft for the detected site type, pre-filled from the page. */
export function generateJsonLd($: CheerioAPI, snapshot: PageSnapshot, profile: SiteProfile, t: AuditMessages): string {
  const url = new URL(snapshot.finalUrl);
  const origin = url.origin;
  const name = siteName($, url.hostname);
  const description = $('meta[name="description"]').attr('content')?.trim() || t.generated.todo;
  const image = $('meta[property="og:image"]').attr('content')?.trim();
  const icon = $('link[rel="icon"], link[rel="apple-touch-icon"]').first().attr('href');
  const logo = image || (icon ? new URL(icon, origin).toString() : `${t.generated.todo}: logo URL`);
  const sameAs = [
    ...new Set(
      $('a[href]')
        .map((_, element) => $(element).attr('href') ?? '')
        .get()
        .filter((href) => {
          try {
            return SOCIAL_HOSTS.test(new URL(href).hostname);
          } catch {
            return false;
          }
        }),
    ),
  ].slice(0, 6);
  const lang = $('html').attr('lang') || undefined;

  const organization = {
    '@type': profile.type === 'local' ? 'LocalBusiness' : 'Organization',
    '@id': `${origin}/#organization`,
    name,
    url: `${origin}/`,
    logo,
    ...(sameAs.length ? { sameAs } : {}),
    ...(profile.type === 'local'
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: t.generated.todo,
            addressLocality: t.generated.todo,
            addressCountry: t.generated.todo,
          },
          telephone: $('a[href^="tel:"]').first().attr('href')?.replace(/^tel:/, '') || t.generated.todo,
          openingHours: t.generated.todo,
        }
      : {}),
  };

  const website = {
    '@type': 'WebSite',
    '@id': `${origin}/#website`,
    name,
    url: `${origin}/`,
    ...(lang ? { inLanguage: lang } : {}),
    publisher: { '@id': `${origin}/#organization` },
  };

  const extra: Record<string, unknown>[] = [];
  if (profile.type === 'saas') {
    extra.push({
      '@type': 'SoftwareApplication',
      name,
      url: `${origin}/`,
      description,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: t.generated.todo, priceCurrency: t.generated.todo },
    });
  } else if (profile.type === 'ecommerce') {
    extra.push({
      '@type': 'Product',
      name: $('h1').first().text().trim() || t.generated.todo,
      image: image || t.generated.todo,
      description,
      offers: {
        '@type': 'Offer',
        price: t.generated.todo,
        priceCurrency: t.generated.todo,
        availability: 'https://schema.org/InStock',
        url: snapshot.finalUrl,
      },
    });
  } else if (profile.type === 'blog' || profile.type === 'docs') {
    extra.push({
      '@type': profile.type === 'docs' ? 'TechArticle' : 'BlogPosting',
      headline: $('h1').first().text().trim() || name,
      description,
      author: { '@type': 'Person', name: t.generated.todo, url: t.generated.todo },
      datePublished: t.generated.todo,
      dateModified: t.generated.todo,
      mainEntityOfPage: snapshot.finalUrl,
      publisher: { '@id': `${origin}/#organization` },
    });
  }

  const document = { '@context': 'https://schema.org', '@graph': [organization, website, ...extra] };
  return `<script type="application/ld+json">\n${JSON.stringify(document, null, 2)}\n</script>\n`;
}
