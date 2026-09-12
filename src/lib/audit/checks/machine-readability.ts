import type { CheckContext, CheckResult } from '../types';

/** Marker elements typical of a client-rendered shell with no server HTML. */
const SPA_MOUNT_SELECTORS = ['#root', '#app', '#__nuxt', '[data-reactroot]', 'app-root'];

export function machineReadabilityChecks(ctx: CheckContext): CheckResult[] {
  const { snapshot, $, text, wordCount } = ctx;
  const results: CheckResult[] = [];
  const html = snapshot.page.body;

  // --- Is the content actually in the server response? ----------------------
  // Most AI crawlers do not execute JavaScript. Whatever is not in this HTML
  // string effectively does not exist for them.
  const ssrScore = wordCount >= 300 ? 1 : wordCount >= 150 ? 0.75 : wordCount >= 50 ? 0.35 : 0;
  results.push({
    id: 'server-rendered-content',
    title: 'Content is present without running JavaScript',
    category: 'machine-readability',
    status: wordCount >= 150 ? 'pass' : wordCount >= 50 ? 'warn' : 'fail',
    score: ssrScore,
    weight: 14,
    impact: 'critical',
    summary:
      wordCount >= 150
        ? `${wordCount} words are readable directly from the HTML response.`
        : wordCount >= 50
          ? `Only ${wordCount} words are server-rendered. Thin pages rarely get quoted.`
          : `Almost nothing is server-rendered (${wordCount} words). AI crawlers see an empty page.`,
    evidence: [
      `${wordCount} words of visible text in the raw HTML`,
      `${(html.length / 1024).toFixed(1)} KB of HTML returned`,
    ],
    fix:
      wordCount >= 150
        ? undefined
        : 'Render the main content on the server. In Next.js keep the content in a Server Component (no `use client` above it) or use `generateStaticParams`; in Vue/Nuxt use SSR or `nuxt generate`; in a pure SPA add prerendering for crawler user-agents. Verify with `curl -s <url> | rg -o "<p>.*</p>" | head` — whatever you cannot see there, no AI crawler can either.',
  });

  // --- Empty SPA mount point -------------------------------------------------
  const emptyMounts = SPA_MOUNT_SELECTORS.filter((selector) => {
    const node = $(selector).first();
    return node.length > 0 && node.text().trim().length < 40;
  });
  const scriptCount = $('script[src]').length;

  results.push({
    id: 'client-side-rendering-risk',
    title: 'No empty client-rendered shell',
    category: 'machine-readability',
    status: emptyMounts.length > 0 ? 'fail' : 'pass',
    score: emptyMounts.length > 0 ? 0 : 1,
    weight: 6,
    impact: emptyMounts.length > 0 ? 'critical' : 'low',
    summary:
      emptyMounts.length > 0
        ? `Found an empty mount point (${emptyMounts.join(', ')}) that is filled in by JavaScript at runtime.`
        : 'No empty client-side mount point detected.',
    evidence: [
      ...emptyMounts.map((selector) => `${selector} is present but contains no text`),
      `${scriptCount} external script tag(s) on the page`,
    ],
    fix:
      emptyMounts.length > 0
        ? 'This is the single most expensive AI-visibility bug: the crawler receives an empty container and moves on. Move rendering to the server, or prerender each route to static HTML at build time.'
        : undefined,
  });

  // --- llms.txt --------------------------------------------------------------
  const llms = snapshot.llmsTxt;
  const llmsBody = llms?.ok ? llms.body : '';
  const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(llmsBody);
  const hasLlms = Boolean(llms?.ok) && llmsBody.trim().length > 0 && !looksLikeHtml;
  const wellFormed = hasLlms && /^#\s+\S/m.test(llmsBody) && /\[[^\]]+\]\([^)]+\)/.test(llmsBody);

  results.push({
    id: 'llms-txt',
    title: 'llms.txt gives assistants a curated map of the site',
    category: 'machine-readability',
    status: wellFormed ? 'pass' : hasLlms ? 'warn' : 'warn',
    score: wellFormed ? 1 : hasLlms ? 0.6 : 0,
    weight: 5,
    impact: 'medium',
    summary: wellFormed
      ? 'A well-formed /llms.txt is published.'
      : hasLlms
        ? '/llms.txt exists but does not follow the expected Markdown structure.'
        : 'No /llms.txt. Assistants have to guess which pages matter.',
    evidence: [
      `${snapshot.origin}/llms.txt returned HTTP ${llms?.status ?? 0}`,
      ...(hasLlms ? [`${llmsBody.split(/\r?\n/).length} lines`] : []),
    ],
    fix: wellFormed
      ? undefined
      : `Publish /llms.txt as static Markdown pointing at the pages you want quoted:\n\n# ${new URL(snapshot.finalUrl).hostname}\n\n> One-sentence description of what this site is.\n\n## Docs\n- [Getting started](${snapshot.origin}/docs/start): what it covers\n- [Pricing](${snapshot.origin}/pricing): plans and limits\n\n## Optional\n- [Changelog](${snapshot.origin}/changelog)`,
  });

  // --- Sitemap ---------------------------------------------------------------
  const sitemap = snapshot.sitemap;
  const sitemapOk = Boolean(sitemap?.ok) && /<(?:urlset|sitemapindex)/i.test(sitemap?.body ?? '');
  const urlCount = (sitemap?.body.match(/<loc>/gi) ?? []).length;

  results.push({
    id: 'sitemap-available',
    title: 'A valid XML sitemap is reachable',
    category: 'machine-readability',
    status: sitemapOk ? 'pass' : 'warn',
    score: sitemapOk ? 1 : 0,
    weight: 4,
    impact: 'medium',
    summary: sitemapOk
      ? `Sitemap found with ${urlCount} URL entries.`
      : 'No valid XML sitemap was found, so indexers must discover pages by following links.',
    evidence: [`${sitemap?.url ?? 'sitemap.xml'} returned HTTP ${sitemap?.status ?? 0}`],
    fix: sitemapOk
      ? undefined
      : `Generate /sitemap.xml with <lastmod> dates and declare it in robots.txt:\n\nSitemap: ${snapshot.origin}/sitemap.xml\n\nFreshness signals from <lastmod> directly influence which version of a page answer engines cache.`,
  });

  // --- Signal-to-noise --------------------------------------------------------
  const ratio = html.length > 0 ? text.length / html.length : 0;
  results.push({
    id: 'text-to-html-ratio',
    title: 'HTML is mostly content, not markup noise',
    category: 'machine-readability',
    status: ratio >= 0.12 ? 'pass' : ratio >= 0.05 ? 'warn' : 'fail',
    score: ratio >= 0.12 ? 1 : ratio >= 0.05 ? 0.5 : 0.15,
    weight: 4,
    impact: 'medium',
    summary: `${(ratio * 100).toFixed(1)}% of the response is readable text.`,
    evidence: [
      `${text.length.toLocaleString('en-US')} characters of text`,
      `${html.length.toLocaleString('en-US')} characters of HTML`,
    ],
    fix:
      ratio >= 0.12
        ? undefined
        : 'Extraction pipelines truncate long documents before the model sees them, so heavy markup pushes your actual content out of the window. Move inline styles and large JSON blobs out of the document and trim wrapper divs.',
  });

  return results;
}
