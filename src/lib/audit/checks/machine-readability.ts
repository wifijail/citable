import type { CheckContext, CheckResult } from '../types';

/** Marker elements typical of a client-rendered shell with no server HTML. */
const SPA_MOUNT_SELECTORS = ['#root', '#app', '#__nuxt', '[data-reactroot]', 'app-root'];

export function machineReadabilityChecks(ctx: CheckContext): CheckResult[] {
  const { snapshot, $, text, wordCount, t } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];
  const html = snapshot.page.body;

  // --- Is the content actually in the server response? ----------------------
  // Most AI crawlers do not execute JavaScript. Whatever is not in this HTML
  // string effectively does not exist for them.
  results.push({
    id: 'server-rendered-content',
    title: m.serverRendered.title,
    category: 'machine-readability',
    status: wordCount >= 150 ? 'pass' : wordCount >= 50 ? 'warn' : 'fail',
    score: wordCount >= 300 ? 1 : wordCount >= 150 ? 0.75 : wordCount >= 50 ? 0.35 : 0,
    weight: 14,
    impact: 'critical',
    summary:
      wordCount >= 150
        ? m.serverRendered.ok(wordCount)
        : wordCount >= 50
          ? m.serverRendered.thin(wordCount)
          : m.serverRendered.empty(wordCount),
    evidence: [
      m.serverRendered.words(wordCount),
      m.serverRendered.size((html.length / 1024).toFixed(1)),
    ],
    fix: wordCount >= 150 ? undefined : m.serverRendered.fix,
  });

  // --- Empty SPA mount point -------------------------------------------------
  const emptyMounts = SPA_MOUNT_SELECTORS.filter((selector) => {
    const node = $(selector).first();
    return node.length > 0 && node.text().trim().length < 40;
  });

  results.push({
    id: 'client-side-rendering-risk',
    title: m.clientShell.title,
    category: 'machine-readability',
    status: emptyMounts.length > 0 ? 'fail' : 'pass',
    score: emptyMounts.length > 0 ? 0 : 1,
    weight: 6,
    impact: emptyMounts.length > 0 ? 'critical' : 'low',
    summary: emptyMounts.length > 0 ? m.clientShell.fail(emptyMounts.join(', ')) : m.clientShell.ok,
    evidence: [
      ...emptyMounts.map((selector) => m.clientShell.empty(selector)),
      m.clientShell.scripts($('script[src]').length),
    ],
    fix: emptyMounts.length > 0 ? m.clientShell.fix : undefined,
  });

  // --- llms.txt --------------------------------------------------------------
  const llms = snapshot.llmsTxt;
  const llmsBody = llms?.ok ? llms.body : '';
  const looksLikeHtml = /^\s*<(?:!doctype|html)/i.test(llmsBody);
  const hasLlms = Boolean(llms?.ok) && llmsBody.trim().length > 0 && !looksLikeHtml;
  const wellFormed = hasLlms && /^#\s+\S/m.test(llmsBody) && /\[[^\]]+\]\([^)]+\)/.test(llmsBody);

  results.push({
    id: 'llms-txt',
    title: m.llmsTxt.title,
    category: 'machine-readability',
    status: wellFormed ? 'pass' : 'warn',
    score: wellFormed ? 1 : hasLlms ? 0.6 : 0,
    weight: 5,
    impact: 'medium',
    summary: wellFormed ? m.llmsTxt.ok : hasLlms ? m.llmsTxt.malformed : m.llmsTxt.missing,
    evidence: [
      t.common.httpStatus(`${snapshot.origin}/llms.txt`, llms?.status ?? 0),
      ...(hasLlms ? [m.llmsTxt.lines(llmsBody.split(/\r?\n/).length)] : []),
    ],
    fix: wellFormed
      ? undefined
      : m.llmsTxt.fix(new URL(snapshot.finalUrl).hostname, snapshot.origin),
  });

  // --- Sitemap ---------------------------------------------------------------
  const sitemap = snapshot.sitemap;
  const sitemapOk = Boolean(sitemap?.ok) && /<(?:urlset|sitemapindex)/i.test(sitemap?.body ?? '');
  const urlCount = (sitemap?.body.match(/<loc>/gi) ?? []).length;

  results.push({
    id: 'sitemap-available',
    title: m.sitemap.title,
    category: 'machine-readability',
    status: sitemapOk ? 'pass' : 'warn',
    score: sitemapOk ? 1 : 0,
    weight: 4,
    impact: 'medium',
    summary: sitemapOk ? m.sitemap.ok(urlCount) : m.sitemap.missing,
    evidence: [t.common.httpStatus(sitemap?.url ?? 'sitemap.xml', sitemap?.status ?? 0)],
    fix: sitemapOk ? undefined : m.sitemap.fix(snapshot.origin),
  });

  // --- Signal-to-noise --------------------------------------------------------
  const ratio = html.length > 0 ? text.length / html.length : 0;
  results.push({
    id: 'text-to-html-ratio',
    title: m.textRatio.title,
    category: 'machine-readability',
    status: ratio >= 0.12 ? 'pass' : ratio >= 0.05 ? 'warn' : 'fail',
    score: ratio >= 0.12 ? 1 : ratio >= 0.05 ? 0.5 : 0.15,
    weight: 4,
    impact: 'medium',
    summary: m.textRatio.summary((ratio * 100).toFixed(1)),
    evidence: [m.textRatio.text(String(text.length)), m.textRatio.html(String(html.length))],
    fix: ratio >= 0.12 ? undefined : m.textRatio.fix,
  });

  return results;
}
