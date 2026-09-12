import type { CheckContext, CheckResult } from '../types';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };
type JsonObject = { [key: string]: JsonValue };

function isObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Flattens @graph containers and arrays into a single list of entities. */
function flattenEntities(value: JsonValue): JsonObject[] {
  if (Array.isArray(value)) return value.flatMap(flattenEntities);
  if (!isObject(value)) return [];
  const graph = value['@graph'];
  if (graph !== undefined) return flattenEntities(graph);
  return [value];
}

function typeNames(entity: JsonObject): string[] {
  const raw = entity['@type'];
  if (typeof raw === 'string') return [raw];
  if (Array.isArray(raw)) return raw.filter((item): item is string => typeof item === 'string');
  return [];
}

/** Entity types that materially improve how confidently a model cites a page. */
const HIGH_VALUE_TYPES = [
  'Organization',
  'Article',
  'NewsArticle',
  'BlogPosting',
  'TechArticle',
  'Product',
  'SoftwareApplication',
  'FAQPage',
  'HowTo',
  'Person',
  'LocalBusiness',
  'WebSite',
  'Course',
  'Recipe',
];

export function structuredDataChecks(ctx: CheckContext): CheckResult[] {
  const { $ } = ctx;
  const results: CheckResult[] = [];

  const entities: JsonObject[] = [];
  const parseErrors: string[] = [];

  $('script[type="application/ld+json"]').each((index, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      entities.push(...flattenEntities(JSON.parse(raw) as JsonValue));
    } catch {
      parseErrors.push(`Block #${index + 1} is not valid JSON`);
    }
  });

  const foundTypes = [...new Set(entities.flatMap(typeNames))];
  const valuableTypes = foundTypes.filter((type) => HIGH_VALUE_TYPES.includes(type));

  // --- JSON-LD present and parseable ----------------------------------------
  results.push({
    id: 'jsonld-present',
    title: 'JSON-LD structured data is present and valid',
    category: 'structured-data',
    status: parseErrors.length > 0 ? 'fail' : valuableTypes.length > 0 ? 'pass' : 'fail',
    score: parseErrors.length > 0 ? 0.2 : valuableTypes.length >= 2 ? 1 : valuableTypes.length === 1 ? 0.7 : 0,
    weight: 10,
    impact: 'high',
    summary:
      parseErrors.length > 0
        ? `Structured data is present but ${parseErrors.length} block(s) failed to parse, so it is ignored entirely.`
        : valuableTypes.length > 0
          ? `Declares ${valuableTypes.join(', ')}.`
          : 'No meaningful JSON-LD found. Models have to infer what this page is about from prose alone.',
    evidence: [
      `${entities.length} schema.org entities found`,
      ...(foundTypes.length > 0 ? [`Types: ${foundTypes.join(', ')}`] : []),
      ...parseErrors,
    ],
    fix:
      parseErrors.length === 0 && valuableTypes.length > 0
        ? undefined
        : `Add a JSON-LD block in <head>. This is the cheapest way to tell a model exactly who you are:\n\n<script type="application/ld+json">\n{\n  "@context": "https://schema.org",\n  "@type": "Article",\n  "headline": "Page title",\n  "author": { "@type": "Person", "name": "Author name" },\n  "datePublished": "2026-01-15",\n  "dateModified": "2026-09-01",\n  "publisher": { "@type": "Organization", "name": "Your company" }\n}\n</script>`,
  });

  // --- Authorship -------------------------------------------------------------
  const hasAuthorEntity = entities.some((entity) => entity['author'] !== undefined);
  const hasAuthorMeta =
    $('meta[name="author"]').length > 0 ||
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0;
  const hasAuthor = hasAuthorEntity || hasAuthorMeta;

  results.push({
    id: 'authorship-signals',
    title: 'Authorship is machine-readable',
    category: 'structured-data',
    status: hasAuthorEntity ? 'pass' : hasAuthorMeta ? 'warn' : 'fail',
    score: hasAuthorEntity ? 1 : hasAuthorMeta ? 0.6 : 0,
    weight: 6,
    impact: 'high',
    summary: hasAuthorEntity
      ? 'An author is declared in structured data.'
      : hasAuthorMeta
        ? 'Author information exists only in meta tags, which is a weaker signal.'
        : 'No author information. Anonymous content is systematically deprioritised as a citation source.',
    evidence: [
      `JSON-LD author property: ${hasAuthorEntity ? 'yes' : 'no'}`,
      `Author meta tag or microdata: ${hasAuthorMeta ? 'yes' : 'no'}`,
    ],
    fix: hasAuthor && hasAuthorEntity
      ? undefined
      : 'Add an `author` property to your Article/BlogPosting JSON-LD, pointing at a Person entity with a `url` to a real bio page. Answer engines weigh identifiable expertise heavily when choosing between two equally relevant sources.',
  });

  // --- Freshness ---------------------------------------------------------------
  const published = entities.find((entity) => typeof entity['datePublished'] === 'string');
  const modified = entities.find((entity) => typeof entity['dateModified'] === 'string');
  const lastModifiedHeader = ctx.snapshot.page.headers['last-modified'];
  const hasDates = Boolean(published || modified);

  results.push({
    id: 'freshness-signals',
    title: 'Publication and update dates are exposed',
    category: 'structured-data',
    status: published && modified ? 'pass' : hasDates || lastModifiedHeader ? 'warn' : 'fail',
    score: published && modified ? 1 : hasDates ? 0.6 : lastModifiedHeader ? 0.3 : 0,
    weight: 5,
    impact: 'medium',
    summary:
      published && modified
        ? 'Both datePublished and dateModified are declared.'
        : hasDates
          ? 'Only one of datePublished / dateModified is present.'
          : 'No machine-readable dates. For any time-sensitive query, undated content loses to dated content.',
    evidence: [
      `datePublished: ${published ? String(published['datePublished']) : 'missing'}`,
      `dateModified: ${modified ? String(modified['dateModified']) : 'missing'}`,
      `Last-Modified header: ${lastModifiedHeader ?? 'missing'}`,
    ],
    fix:
      published && modified
        ? undefined
        : 'Emit ISO-8601 `datePublished` and `dateModified` in JSON-LD and keep `dateModified` honest on every content edit. Assistants routinely filter for recency when a question implies "current".',
  });

  // --- Answer-shaped schema ----------------------------------------------------
  const hasAnswerSchema = foundTypes.some((type) =>
    ['FAQPage', 'HowTo', 'QAPage', 'Question'].includes(type),
  );

  results.push({
    id: 'faq-schema',
    title: 'Question-and-answer schema is used where it fits',
    category: 'structured-data',
    status: hasAnswerSchema ? 'pass' : 'warn',
    score: hasAnswerSchema ? 1 : 0.4,
    weight: 4,
    impact: 'medium',
    summary: hasAnswerSchema
      ? `Answer-shaped schema present: ${foundTypes.filter((t) => ['FAQPage', 'HowTo', 'QAPage', 'Question'].includes(t)).join(', ')}.`
      : 'No FAQPage or HowTo schema. Q&A markup is the format answer engines lift most directly.',
    evidence: [`Detected types: ${foundTypes.join(', ') || 'none'}`],
    fix: hasAnswerSchema
      ? undefined
      : 'Where the page answers discrete questions, wrap them in FAQPage markup so each question/answer pair can be extracted verbatim:\n\n{\n  "@context": "https://schema.org",\n  "@type": "FAQPage",\n  "mainEntity": [{\n    "@type": "Question",\n    "name": "How much does it cost?",\n    "acceptedAnswer": { "@type": "Answer", "text": "Plans start at $19/month." }\n  }]\n}',
  });

  return results;
}
