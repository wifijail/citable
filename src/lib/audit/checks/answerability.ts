import type { CheckContext, CheckResult } from '../types';

/** Question openers in every supported locale, so a Russian FAQ counts too. */
const QUESTION_STARTERS =
  /^(how|what|why|when|where|who|which|can|does|do|is|are|should|will|would|could|как|что|почему|зачем|когда|где|кто|какой|какая|какие|сколько|можно|cómo|qué|por qué|cuándo|dónde|quién|cuál|cuánto|puedo|wie|was|warum|wann|wo|wer|welche|kann|gibt)(\s|$)/i;

export function answerabilityChecks(ctx: CheckContext): CheckResult[] {
  const { $, text, wordCount, t } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];

  const headings = $('h1, h2, h3, h4')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((heading) => heading.length > 0);

  // --- Heading structure -------------------------------------------------------
  const h1Count = $('h1').length;
  const h2Count = $('h2').length;
  const structureOk = h1Count === 1 && h2Count >= 2;

  results.push({
    id: 'heading-structure',
    title: m.headings.title,
    category: 'answerability',
    status: structureOk ? 'pass' : h1Count !== 1 ? 'fail' : 'warn',
    score: structureOk ? 1 : h1Count === 1 ? 0.6 : 0.2,
    weight: 5,
    impact: 'high',
    summary:
      h1Count === 0
        ? m.headings.noH1
        : h1Count > 1
          ? m.headings.manyH1(h1Count)
          : h2Count < 2
            ? m.headings.fewH2
            : m.headings.ok(h2Count),
    evidence: [
      m.headings.counts(h1Count, h2Count, $('h3').length),
      ...headings.slice(0, 5).map((heading) => `"${heading.slice(0, 80)}"`),
    ],
    fix: structureOk ? undefined : m.headings.fix,
  });

  // --- Question-shaped headings -------------------------------------------------
  const questionHeadings = headings.filter(
    (heading) => heading.includes('?') || QUESTION_STARTERS.test(heading),
  );
  const questionRatio = headings.length > 0 ? questionHeadings.length / headings.length : 0;

  results.push({
    id: 'question-headings',
    title: m.questionHeadings.title,
    category: 'answerability',
    status: questionRatio >= 0.25 ? 'pass' : questionRatio > 0 ? 'warn' : 'fail',
    score: questionRatio >= 0.25 ? 1 : questionRatio > 0 ? 0.55 : 0.1,
    weight: 4,
    impact: 'high',
    summary:
      questionHeadings.length > 0
        ? m.questionHeadings.ok(questionHeadings.length, headings.length)
        : m.questionHeadings.none,
    evidence: questionHeadings.slice(0, 4).map((heading) => `"${heading.slice(0, 80)}"`),
    fix: questionRatio >= 0.25 ? undefined : m.questionHeadings.fix,
  });

  // --- Extractable formatting ----------------------------------------------------
  const listItems = $('ul li, ol li').length;
  const tables = $('table').length;
  const hasStructure = listItems >= 5 || tables >= 1;

  results.push({
    id: 'extractable-formatting',
    title: m.formatting.title,
    category: 'answerability',
    status: hasStructure ? 'pass' : 'warn',
    score: hasStructure ? 1 : 0.35,
    weight: 3,
    impact: 'medium',
    summary: hasStructure ? m.formatting.ok(listItems, tables) : m.formatting.prose,
    evidence: [m.formatting.items(listItems), m.formatting.tables(tables)],
    fix: hasStructure ? undefined : m.formatting.fix,
  });

  // --- Answer density --------------------------------------------------------------
  const paragraphs = $('p')
    .map((_, element) => $(element).text().trim())
    .get()
    .filter((paragraph) => paragraph.split(/\s+/).length > 8);
  const averageWords =
    paragraphs.length > 0
      ? paragraphs.reduce((sum, paragraph) => sum + paragraph.split(/\s+/).length, 0) /
        paragraphs.length
      : 0;
  const concise = averageWords > 0 && averageWords <= 90;

  results.push({
    id: 'paragraph-density',
    title: m.paragraphs.title,
    category: 'answerability',
    status: concise ? 'pass' : paragraphs.length === 0 ? 'fail' : 'warn',
    score: concise ? 1 : paragraphs.length === 0 ? 0 : 0.5,
    weight: 3,
    impact: 'medium',
    summary:
      paragraphs.length === 0
        ? m.paragraphs.none
        : m.paragraphs.summary(Math.round(averageWords), paragraphs.length),
    evidence: [m.paragraphs.analysed(paragraphs.length)],
    fix: concise ? undefined : m.paragraphs.fix,
  });

  // --- Depth --------------------------------------------------------------------
  const depthOk = wordCount >= 600;
  results.push({
    id: 'content-depth',
    title: m.depth.title,
    category: 'answerability',
    status: depthOk ? 'pass' : wordCount >= 300 ? 'warn' : 'fail',
    score: depthOk ? 1 : wordCount >= 300 ? 0.6 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: m.depth.summary(wordCount),
    evidence: [m.depth.words(wordCount), m.depth.sentences(text.split(/[.!?]+\s/).length)],
    fix: depthOk ? undefined : m.depth.fix,
  });

  // --- Semantic containers ---------------------------------------------------------
  const hasMain = $('main').length > 0 || $('article').length > 0 || $('[role="main"]').length > 0;
  results.push({
    id: 'semantic-html',
    title: m.semanticHtml.title,
    category: 'answerability',
    status: hasMain ? 'pass' : 'warn',
    score: hasMain ? 1 : 0.4,
    weight: 2,
    impact: 'low',
    summary: hasMain ? m.semanticHtml.ok : m.semanticHtml.missing,
    evidence: [
      `<main>: ${$('main').length}`,
      `<article>: ${$('article').length}`,
      `<nav>: ${$('nav').length}`,
    ],
    fix: hasMain ? undefined : m.semanticHtml.fix,
  });

  return results;
}
