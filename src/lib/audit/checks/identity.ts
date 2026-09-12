import type { CheckContext, CheckResult } from '../types';

export function identityChecks(ctx: CheckContext): CheckResult[] {
  const { $, snapshot } = ctx;
  const results: CheckResult[] = [];

  // --- Title -------------------------------------------------------------------
  const title = $('head title').first().text().trim();
  const titleOk = title.length >= 15 && title.length <= 65;

  results.push({
    id: 'title-tag',
    title: 'Title tag is descriptive and well-sized',
    category: 'identity',
    status: title.length === 0 ? 'fail' : titleOk ? 'pass' : 'warn',
    score: title.length === 0 ? 0 : titleOk ? 1 : 0.6,
    weight: 4,
    impact: 'high',
    summary:
      title.length === 0
        ? 'No title tag. The page has no name to be cited under.'
        : `Title is ${title.length} characters: "${title.slice(0, 70)}".`,
    evidence: [title || 'missing'],
    fix: titleOk
      ? undefined
      : 'Write a 15-65 character title that states the specific claim of the page, front-loading the entity name. This string is what an assistant prints as the link text when it cites you.',
  });

  // --- Meta description ----------------------------------------------------------
  const description = ($('meta[name="description"]').attr('content') ?? '').trim();
  const descriptionOk = description.length >= 70 && description.length <= 175;

  results.push({
    id: 'meta-description',
    title: 'Meta description summarises the answer',
    category: 'identity',
    status: description.length === 0 ? 'fail' : descriptionOk ? 'pass' : 'warn',
    score: description.length === 0 ? 0 : descriptionOk ? 1 : 0.6,
    weight: 3,
    impact: 'medium',
    summary:
      description.length === 0
        ? 'No meta description.'
        : `Description is ${description.length} characters.`,
    evidence: [description || 'missing'],
    fix: descriptionOk
      ? undefined
      : 'Write a 70-175 character description that answers the page question in one sentence. Retrieval systems frequently use it as the page-level summary when ranking candidate sources.',
  });

  // --- Canonical --------------------------------------------------------------------
  const canonical = ($('link[rel="canonical"]').attr('href') ?? '').trim();
  let canonicalValid = false;
  if (canonical) {
    try {
      canonicalValid = new URL(canonical, snapshot.finalUrl).origin === new URL(snapshot.finalUrl).origin;
    } catch {
      canonicalValid = false;
    }
  }

  results.push({
    id: 'canonical-url',
    title: 'Canonical URL is present and consistent',
    category: 'identity',
    status: canonicalValid ? 'pass' : canonical ? 'warn' : 'warn',
    score: canonicalValid ? 1 : canonical ? 0.5 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: canonicalValid
      ? 'A same-origin canonical URL is declared.'
      : canonical
        ? `Canonical points to a different origin: ${canonical}`
        : 'No canonical URL, so duplicate variants of this page compete with each other.',
    evidence: [canonical || 'missing', `Final URL: ${snapshot.finalUrl}`],
    fix: canonicalValid
      ? undefined
      : `Add <link rel="canonical" href="${snapshot.finalUrl}"> so citation authority consolidates on one address instead of splitting across parameter and trailing-slash variants.`,
  });

  // --- Open Graph ---------------------------------------------------------------------
  const ogTags = ['og:title', 'og:description', 'og:url', 'og:image'];
  const presentOg = ogTags.filter((tag) => ($('meta[property="' + tag + '"]').attr('content') ?? '').trim());
  const ogRatio = presentOg.length / ogTags.length;

  results.push({
    id: 'open-graph',
    title: 'Open Graph metadata is complete',
    category: 'identity',
    status: ogRatio === 1 ? 'pass' : ogRatio >= 0.5 ? 'warn' : 'fail',
    score: ogRatio,
    weight: 2,
    impact: 'low',
    summary: `${presentOg.length} of ${ogTags.length} core Open Graph tags present.`,
    evidence: ogTags.map(
      (tag) => `${tag}: ${presentOg.includes(tag) ? 'present' : 'missing'}`,
    ),
    fix:
      ogRatio === 1
        ? undefined
        : 'Add og:title, og:description, og:url and og:image. Several assistants render link cards from these tags when they surface a source, and a bare URL gets clicked far less.',
  });

  // --- Language ---------------------------------------------------------------------
  const lang = ($('html').attr('lang') ?? '').trim();
  results.push({
    id: 'language-declared',
    title: 'Document language is declared',
    category: 'identity',
    status: lang ? 'pass' : 'warn',
    score: lang ? 1 : 0.3,
    weight: 2,
    impact: 'low',
    summary: lang ? `Declared language: ${lang}.` : 'No lang attribute on <html>.',
    evidence: [lang ? `<html lang="${lang}">` : 'missing'],
    fix: lang
      ? undefined
      : 'Set <html lang="en"> (or your actual locale). Language routing decides whether your page is even considered for a query in that language.',
  });

  return results;
}
