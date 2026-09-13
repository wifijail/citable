import type { CheckContext, CheckResult } from '../types';

export function identityChecks(ctx: CheckContext): CheckResult[] {
  const { $, snapshot, t } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];

  // --- Title -------------------------------------------------------------------
  const title = $('head title').first().text().trim();
  const titleOk = title.length >= 15 && title.length <= 65;

  results.push({
    id: 'title-tag',
    title: m.titleTag.title,
    category: 'identity',
    status: title.length === 0 ? 'fail' : titleOk ? 'pass' : 'warn',
    score: title.length === 0 ? 0 : titleOk ? 1 : 0.6,
    weight: 4,
    impact: 'high',
    summary: title.length === 0 ? m.titleTag.missing : m.titleTag.summary(title.length, title.slice(0, 70)),
    evidence: [title || t.common.missing],
    fix: titleOk ? undefined : m.titleTag.fix,
  });

  // --- Meta description ----------------------------------------------------------
  const description = ($('meta[name="description"]').attr('content') ?? '').trim();
  const descriptionOk = description.length >= 70 && description.length <= 175;

  results.push({
    id: 'meta-description',
    title: m.metaDescription.title,
    category: 'identity',
    status: description.length === 0 ? 'fail' : descriptionOk ? 'pass' : 'warn',
    score: description.length === 0 ? 0 : descriptionOk ? 1 : 0.6,
    weight: 3,
    impact: 'medium',
    summary:
      description.length === 0
        ? m.metaDescription.missing
        : m.metaDescription.summary(description.length),
    evidence: [description || t.common.missing],
    fix: descriptionOk ? undefined : m.metaDescription.fix,
  });

  // --- Canonical --------------------------------------------------------------------
  const canonical = ($('link[rel="canonical"]').attr('href') ?? '').trim();
  let canonicalValid = false;
  if (canonical) {
    try {
      canonicalValid =
        new URL(canonical, snapshot.finalUrl).origin === new URL(snapshot.finalUrl).origin;
    } catch {
      canonicalValid = false;
    }
  }

  results.push({
    id: 'canonical-url',
    title: m.canonical.title,
    category: 'identity',
    status: canonicalValid ? 'pass' : 'warn',
    score: canonicalValid ? 1 : canonical ? 0.5 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: canonicalValid
      ? m.canonical.ok
      : canonical
        ? m.canonical.crossOrigin(canonical)
        : m.canonical.missing,
    evidence: [canonical || t.common.missing, m.canonical.finalUrl(snapshot.finalUrl)],
    fix: canonicalValid ? undefined : m.canonical.fix(snapshot.finalUrl),
  });

  // --- Open Graph ---------------------------------------------------------------------
  const ogTags = ['og:title', 'og:description', 'og:url', 'og:image'];
  const presentOg = ogTags.filter((tag) =>
    ($(`meta[property="${tag}"]`).attr('content') ?? '').trim(),
  );
  const ogRatio = presentOg.length / ogTags.length;

  results.push({
    id: 'open-graph',
    title: m.openGraph.title,
    category: 'identity',
    status: ogRatio === 1 ? 'pass' : ogRatio >= 0.5 ? 'warn' : 'fail',
    score: ogRatio,
    weight: 2,
    impact: 'low',
    summary: m.openGraph.summary(presentOg.length, ogTags.length),
    evidence: ogTags.map((tag) => m.openGraph.tag(tag, presentOg.includes(tag))),
    fix: ogRatio === 1 ? undefined : m.openGraph.fix,
  });

  // --- Language ---------------------------------------------------------------------
  const lang = ($('html').attr('lang') ?? '').trim();
  results.push({
    id: 'language-declared',
    title: m.language.title,
    category: 'identity',
    status: lang ? 'pass' : 'warn',
    score: lang ? 1 : 0.3,
    weight: 2,
    impact: 'low',
    summary: lang ? m.language.ok(lang) : m.language.missing,
    evidence: [lang ? `<html lang="${lang}">` : t.common.missing],
    fix: lang ? undefined : m.language.fix,
  });

  return results;
}
