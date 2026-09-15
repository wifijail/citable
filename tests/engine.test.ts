import * as cheerio from 'cheerio';
import { describe, expect, it } from 'vitest';
import { auditEn } from '@/i18n/audit/en';
import { applyPlanGating, runAudit } from '@/lib/audit';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import type { Fetcher } from '@/lib/audit/fetcher';
import { citableBotDisallowed } from '@/lib/audit/fetcher';
import { generateRobotsTxt } from '@/lib/audit/generators';
import { DEFAULT_OPTIONS, resolveOptions } from '@/lib/audit/options';
import { detectProfile } from '@/lib/audit/profile';
import { CHECKS } from '@/lib/audit/registry';
import { isAllowed, parseRobots } from '@/lib/audit/robots';
import { extractTopics } from '@/lib/audit/topics';
import type { FetchedResource, PageSnapshot, ScanOptions } from '@/lib/audit/types';

// A public IP literal skips DNS, so these tests never touch the network.
const ORIGIN = 'http://93.184.215.14';

function response(url: string, body: string, status = 200, headers: Record<string, string> = {}): FetchedResource {
  return {
    url,
    ok: status >= 200 && status < 300,
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', ...headers },
    body,
    elapsedMs: 50,
    redirects: 0,
  };
}

/** A fake web: path → [status, body, headers]. Unknown paths are 404. */
function fakeSite(routes: Record<string, [number, string, Record<string, string>?]>): Fetcher {
  return async (url) => {
    const path = new URL(url).pathname;
    const route = routes[path];
    if (!route) return response(url, 'not found', 404, { 'content-type': 'text/plain' });
    const [status, body, headers] = route;
    return response(url, body, status, headers);
  };
}

const page = (title: string, h1: string, body: string, head = '') =>
  `<!doctype html><html lang="en"><head><title>${title}</title><meta name="description" content="${title} description long enough to count as a real one for tests">${head}</head><body><main><h1>${h1}</h1>${body}</main></body></html>`;

const paragraph = (words: number, word = 'pricing') => `<p>${Array.from({ length: words }, (_, i) => `${word}${i % 7}`).join(' ')}</p>`;

const SAAS_HOME = page(
  'Acme Analytics – product analytics for teams',
  'Acme Analytics product analytics',
  `${paragraph(200, 'analytics')}<a href="/pricing">Pricing</a><a href="/about">About</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/signup">Start free trial</a><a href="/blog/launch">Blog</a>`,
);

describe('site profile detection', () => {
  const options: ScanOptions = { ...DEFAULT_OPTIONS };
  const detect = (html: string, url = `${ORIGIN}/`) => {
    const $ = cheerio.load(html.replace(/></g, '> <'));
    return detectProfile($, $('body').text().replace(/\s+/g, ' '), url, options);
  };

  it('recognises a SaaS site from wording and links', () => {
    const profile = detect(SAAS_HOME);
    expect(profile.type).toBe('saas');
    expect(profile.signals.length).toBeGreaterThan(0);
  });

  it('recognises an online store from Product markup', () => {
    const html = page(
      'Red shoes – Shop',
      'Red shoes',
      `<p>Add to cart. In stock. $49 $59 $69</p><a href="/cart">Cart</a><a href="/product/1">Shoe</a>`,
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Shoe","offers":{"@type":"Offer","price":"49","priceCurrency":"USD"}}</script>',
    );
    expect(detect(html).type).toBe('ecommerce');
  });

  it('recognises a local business, including Russian wording', () => {
    const html = page(
      'Стоматология Улыбка',
      'Стоматология',
      '<p>Часы работы: 9–18. Наш адрес: ул. Абая 10. Записаться на приём.</p><a href="tel:+77010000000">Позвонить</a>',
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"Dentist","name":"Улыбка"}</script>',
    );
    expect(detect(html).type).toBe('local');
  });

  it('falls back to general and honours an explicit override', () => {
    const html = page('Hello', 'Hello', '<p>Just a page.</p>');
    expect(detect(html).type).toBe('general');
    const $ = cheerio.load(html);
    const overridden = detectProfile($, 'Just a page.', `${ORIGIN}/`, { ...options, siteType: 'blog' });
    expect(overridden.type).toBe('blog');
    expect(overridden.detected).toBe('general');
    expect(overridden.overridden).toBe(true);
  });
});

describe('generated robots.txt', () => {
  const snapshot = (robots: string): PageSnapshot => ({
    requestedUrl: `${ORIGIN}/`,
    finalUrl: `${ORIGIN}/`,
    origin: ORIGIN,
    page: response(`${ORIGIN}/`, '<html></html>'),
    robots: response(`${ORIGIN}/robots.txt`, robots),
    llmsTxt: null,
    sitemap: null,
    redirectChainLength: 0,
  });

  it('opens selected agents while keeping private paths private', () => {
    const original = 'User-agent: *\nDisallow: /\nDisallow: /admin\n\nSitemap: http://93.184.215.14/sitemap.xml';
    const generated = generateRobotsTxt(snapshot(original), DEFAULT_OPTIONS, auditEn);
    const parsed = parseRobots(generated);

    for (const crawler of AI_CRAWLERS.filter((c) => c.purpose !== 'training')) {
      expect(isAllowed(parsed, crawler.name, '/').allowed, crawler.name).toBe(true);
      expect(isAllowed(parsed, crawler.name, '/admin/users').allowed, crawler.name).toBe(false);
    }
    // Unselected purposes (training) keep the original wildcard block.
    expect(isAllowed(parsed, 'GPTBot', '/').allowed).toBe(false);
    expect(generated).toContain('Sitemap: http://93.184.215.14/sitemap.xml');
  });

  it('closes training crawlers when the owner chose that policy', () => {
    const generated = generateRobotsTxt(snapshot('User-agent: *\nAllow: /'), { ...DEFAULT_OPTIONS, blockTraining: true }, auditEn);
    const parsed = parseRobots(generated);
    for (const crawler of AI_CRAWLERS.filter((c) => c.purpose === 'training')) {
      expect(isAllowed(parsed, crawler.name, '/').allowed, crawler.name).toBe(false);
    }
    expect(isAllowed(parsed, 'ChatGPT-User', '/').allowed).toBe(true);
  });

  it('does not duplicate a group that it replaces', () => {
    const original = 'User-agent: GPTBot\nUser-agent: PerplexityBot\nDisallow: /';
    const generated = generateRobotsTxt(snapshot(original), DEFAULT_OPTIONS, auditEn);
    const parsed = parseRobots(generated);
    expect(isAllowed(parsed, 'PerplexityBot', '/').allowed).toBe(true);
    // GPTBot is a training crawler and training was not selected for blocking or opening.
    expect(isAllowed(parsed, 'GPTBot', '/').allowed).toBe(false);
  });

  it('only includes selected engines', () => {
    const generated = generateRobotsTxt(snapshot('User-agent: *\nDisallow: /'), { ...DEFAULT_OPTIONS, engines: ['anthropic'] }, auditEn);
    expect(generated).toContain('Claude-User');
    expect(generated).not.toContain('PerplexityBot');
  });
});

describe('CitableBot opt-out', () => {
  it('respects an explicit CitableBot group but not a wildcard block', () => {
    expect(citableBotDisallowed('User-agent: CitableBot\nDisallow: /', '/')).toBe(true);
    expect(citableBotDisallowed('User-agent: *\nDisallow: /', '/')).toBe(false);
    expect(citableBotDisallowed('User-agent: CitableBot\nDisallow: /private', '/')).toBe(false);
  });

  it('refuses to scan a site that opted out', async () => {
    const fetcher = fakeSite({ '/robots.txt': [200, 'User-agent: CitableBot\nDisallow: /', { 'content-type': 'text/plain' }], '/': [200, SAAS_HOME] });
    await expect(runAudit(`${ORIGIN}/`, 'free', 'en', DEFAULT_OPTIONS, fetcher)).rejects.toMatchObject({ code: 'botDisallowed' });
  });
});

describe('site mode', () => {
  const routes: Record<string, [number, string, Record<string, string>?]> = {
    '/robots.txt': [200, 'User-agent: *\nDisallow: /blog/\n\nSitemap: http://93.184.215.14/sitemap.xml', { 'content-type': 'text/plain' }],
    '/sitemap.xml': [200, `<urlset><url><loc>${ORIGIN}/</loc></url><url><loc>${ORIGIN}/pricing</loc></url><url><loc>${ORIGIN}/about</loc></url></urlset>`, { 'content-type': 'application/xml' }],
    '/': [200, SAAS_HOME],
    '/pricing': [200, '<html><head><title>Acme</title></head><body><div id="root"></div></body></html>'],
    '/about': [200, page('Acme', 'About Acme', paragraph(300, 'team'))],
    '/contact': [500, 'error'],
    '/privacy': [200, page('Privacy', 'Privacy', paragraph(400, 'privacy'))],
    '/blog/launch': [200, page('Launch post', 'Launch', paragraph(400, 'launch'))],
  };
  const fetcher = fakeSite(routes);

  it('finds problems specific to this site', async () => {
    const options = resolveOptions({ mode: 'site', maxPages: 10 }, 'pro');
    const report = await runAudit(`${ORIGIN}/`, 'pro', 'en', options, fetcher);
    const byId = new Map(report.categories.flatMap((category) => category.checks).map((check) => [check.id, check]));

    expect(report.profile.type).toBe('saas');
    expect(report.pages.length).toBeGreaterThanOrEqual(4);

    // /blog/ is disallowed for every agent by the wildcard rule.
    expect(byId.get('site-blocked-pages')?.status).not.toBe('pass');
    expect(byId.get('site-blocked-pages')?.evidence?.some((line) => line.includes('/blog/launch'))).toBe(true);
    // /contact returns 500.
    expect(byId.get('site-unreachable-pages')?.evidence?.some((line) => line.includes('/contact'))).toBe(true);
    // /pricing is an empty JavaScript shell.
    expect(byId.get('pricing-page')?.status).toBe('fail');
    expect(byId.get('site-client-rendered')?.status).not.toBe('pass');
    // Two pages share the title "Acme".
    expect(byId.get('site-duplicate-titles')?.status).toBe('warn');
    // /privacy and /blog/launch are linked but not in the sitemap.
    expect(byId.get('site-sitemap-coverage')?.status).toBe('warn');

    expect(report.generated.llmsTxt).toContain(`${ORIGIN}/about`);
    expect(report.generated.jsonLd).toContain('SoftwareApplication');
    expect(report.topics.length).toBeGreaterThan(0);
  });

  it('keeps the page budget of the plan', async () => {
    const options = resolveOptions({ mode: 'site', maxPages: 50 }, 'free');
    expect(options.maxPages).toBe(5);
    const report = await runAudit(`${ORIGIN}/`, 'free', 'en', options, fetcher);
    expect(report.pages.length).toBeLessThanOrEqual(4);
  });

  it('locks the llms.txt and JSON-LD drafts on the free plan but keeps robots.txt', async () => {
    const report = applyPlanGating(await runAudit(`${ORIGIN}/`, 'free', 'en', DEFAULT_OPTIONS, fetcher));
    expect(report.generated.robotsTxt.length).toBeGreaterThan(0);
    expect(report.generated.llmsTxt).toBeNull();
    expect(report.generated.jsonLd).toBeNull();
    expect(report.truncated).toBe(true);
  });

  it('emits only check ids that are in the registry', async () => {
    const report = await runAudit(`${ORIGIN}/`, 'pro', 'en', resolveOptions({ mode: 'site' }, 'pro'), fetcher);
    const known = new Set(CHECKS.map((check) => check.id));
    for (const check of report.categories.flatMap((category) => category.checks)) {
      expect(known.has(check.id), check.id).toBe(true);
    }
  });
});

describe('redirect safety', () => {
  it('reports a blocked redirect instead of following it into a private network', async () => {
    const { fetchResource } = await import('@/lib/audit/fetcher');
    const original = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data/' } })) as typeof fetch;
    try {
      const result = await fetchResource(`${ORIGIN}/`, 'text/html');
      expect(result.ok).toBe(false);
      expect(result.error).toBe('blocked-redirect');
    } finally {
      globalThis.fetch = original;
    }
  });
});

describe('topics', () => {
  it('ignores stop words and weights headings', () => {
    const $ = cheerio.load(page('Kaspi payment integration guide', 'Kaspi payment integration', '<h2>Kaspi QR payments</h2><p>The and for with this that kaspi payment payment.</p>'));
    const terms = extractTopics($, $('body').text()).map((topic) => topic.term);
    expect(terms[0]).toBe('kaspi');
    expect(terms).toContain('payment');
    expect(terms).not.toContain('the');
  });
});

describe('check registry', () => {
  it('has unique ids and a message entry for every check', () => {
    const ids = CHECKS.map((check) => check.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const check of CHECKS) {
      const messages = auditEn.checks[check.key] as { title?: string; what?: string };
      expect(messages?.title, check.id).toBeTruthy();
      expect(messages?.what, check.id).toBeTruthy();
    }
  });
});
