import type { CheckContext, CheckResult } from '../types';

const QUESTION_STARTERS =
  /^(how|what|why|when|where|who|which|can|does|do|is|are|should|will|would|could)\b/i;

export function answerabilityChecks(ctx: CheckContext): CheckResult[] {
  const { $, text, wordCount } = ctx;
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
    title: 'Headings form a clean, chunkable outline',
    category: 'answerability',
    status: structureOk ? 'pass' : h1Count === 0 || h1Count > 1 ? 'fail' : 'warn',
    score: structureOk ? 1 : h1Count === 1 ? 0.6 : 0.2,
    weight: 5,
    impact: 'high',
    summary:
      h1Count === 0
        ? 'No H1 at all, so there is no unambiguous title for the page.'
        : h1Count > 1
          ? `${h1Count} H1 elements compete for the page topic.`
          : h2Count < 2
            ? 'One H1 but almost no H2 sections, so the page is a single undifferentiated block.'
            : `Clean outline: 1 H1 and ${h2Count} H2 sections.`,
    evidence: [
      `H1: ${h1Count}, H2: ${h2Count}, H3: ${$('h3').length}`,
      ...headings.slice(0, 5).map((heading) => `"${heading.slice(0, 80)}"`),
    ],
    fix: structureOk
      ? undefined
      : 'Retrieval pipelines split pages into chunks at heading boundaries before embedding them. Use exactly one H1 for the page topic and an H2 per self-contained sub-answer, so each chunk stays meaningful on its own.',
  });

  // --- Question-shaped headings -------------------------------------------------
  const questionHeadings = headings.filter(
    (heading) => heading.includes('?') || QUESTION_STARTERS.test(heading),
  );
  const questionRatio = headings.length > 0 ? questionHeadings.length / headings.length : 0;

  results.push({
    id: 'question-headings',
    title: 'Headings match how people actually ask',
    category: 'answerability',
    status: questionRatio >= 0.25 ? 'pass' : questionRatio > 0 ? 'warn' : 'fail',
    score: questionRatio >= 0.25 ? 1 : questionRatio > 0 ? 0.55 : 0.1,
    weight: 4,
    impact: 'high',
    summary:
      questionHeadings.length > 0
        ? `${questionHeadings.length} of ${headings.length} headings are phrased as questions or direct queries.`
        : 'No question-shaped headings. Nothing on the page lines up with a natural-language prompt.',
    evidence: questionHeadings.slice(0, 4).map((heading) => `"${heading.slice(0, 80)}"`),
    fix:
      questionRatio >= 0.25
        ? undefined
        : 'Rewrite section headings as the question a user would type, then answer it in the first two sentences below. "Pricing" becomes "How much does X cost?" — semantic match against the prompt is what gets the chunk retrieved.',
  });

  // --- Extractable formatting ----------------------------------------------------
  const listItems = $('ul li, ol li').length;
  const tables = $('table').length;
  const hasStructure = listItems >= 5 || tables >= 1;

  results.push({
    id: 'extractable-formatting',
    title: 'Facts are formatted as lists or tables',
    category: 'answerability',
    status: hasStructure ? 'pass' : 'warn',
    score: hasStructure ? 1 : 0.35,
    weight: 3,
    impact: 'medium',
    summary: hasStructure
      ? `${listItems} list items and ${tables} table(s) give models something to lift directly.`
      : 'Content is almost entirely prose, which is harder to quote accurately.',
    evidence: [`${listItems} list items`, `${tables} tables`],
    fix: hasStructure
      ? undefined
      : 'Convert comparisons, steps and specifications into real <ul>/<ol>/<table> markup. Structured fragments survive chunking intact and are reproduced with far fewer hallucinated details than paragraphs.',
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
    title: 'Paragraphs are short enough to quote',
    category: 'answerability',
    status: concise ? 'pass' : paragraphs.length === 0 ? 'fail' : 'warn',
    score: concise ? 1 : paragraphs.length === 0 ? 0 : 0.5,
    weight: 3,
    impact: 'medium',
    summary:
      paragraphs.length === 0
        ? 'No substantive paragraphs were found in the server HTML.'
        : `Average paragraph length is ${Math.round(averageWords)} words across ${paragraphs.length} paragraphs.`,
    evidence: [`${paragraphs.length} paragraphs analysed`],
    fix: concise
      ? undefined
      : 'Keep paragraphs under roughly 80 words and put the claim in the first sentence. Long paragraphs get split mid-argument during chunking, and the half that gets retrieved often loses the conclusion.',
  });

  // --- Depth --------------------------------------------------------------------
  const depthOk = wordCount >= 600;
  results.push({
    id: 'content-depth',
    title: 'The page has enough substance to be a source',
    category: 'answerability',
    status: depthOk ? 'pass' : wordCount >= 300 ? 'warn' : 'fail',
    score: depthOk ? 1 : wordCount >= 300 ? 0.6 : 0.2,
    weight: 3,
    impact: 'medium',
    summary: `${wordCount} words of readable content.`,
    evidence: [`${wordCount} words`, `${text.split(/[.!?]+\s/).length} sentences (approx.)`],
    fix: depthOk
      ? undefined
      : 'Thin pages are rarely selected as citations because they offer no unique facts. Add original data, examples or numbers a model cannot get from three other sources.',
  });

  // --- Semantic containers ---------------------------------------------------------
  const hasMain = $('main').length > 0 || $('article').length > 0 || $('[role="main"]').length > 0;
  results.push({
    id: 'semantic-html',
    title: 'Main content sits in semantic containers',
    category: 'answerability',
    status: hasMain ? 'pass' : 'warn',
    score: hasMain ? 1 : 0.4,
    weight: 2,
    impact: 'low',
    summary: hasMain
      ? 'Content is wrapped in <main> or <article>.'
      : 'No <main> or <article> element, so boilerplate and content are indistinguishable.',
    evidence: [
      `<main>: ${$('main').length}`,
      `<article>: ${$('article').length}`,
      `<nav>: ${$('nav').length}`,
    ],
    fix: hasMain
      ? undefined
      : 'Wrap the body copy in <main> or <article> and keep navigation inside <nav>/<footer>. Readability extractors use these landmarks to strip boilerplate — without them, your menu can end up in the extracted "content".',
  });

  return results;
}
