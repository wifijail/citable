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

const ANSWER_TYPES = ['FAQPage', 'HowTo', 'QAPage', 'Question'];

export function structuredDataChecks(ctx: CheckContext): CheckResult[] {
  const { $, snapshot, t } = ctx;
  const m = t.checks;
  const results: CheckResult[] = [];

  const entities: JsonObject[] = [];
  const parseErrors: string[] = [];

  $('script[type="application/ld+json"]').each((index, element) => {
    const raw = $(element).text().trim();
    if (!raw) return;
    try {
      entities.push(...flattenEntities(JSON.parse(raw) as JsonValue));
    } catch {
      parseErrors.push(m.jsonLd.invalidBlock(index + 1));
    }
  });

  const foundTypes = [...new Set(entities.flatMap(typeNames))];
  const valuableTypes = foundTypes.filter((type) => HIGH_VALUE_TYPES.includes(type));

  // --- JSON-LD present and parseable ----------------------------------------
  const jsonLdOk = parseErrors.length === 0 && valuableTypes.length > 0;
  results.push({
    id: 'jsonld-present',
    title: m.jsonLd.title,
    category: 'structured-data',
    status: jsonLdOk ? 'pass' : 'fail',
    score:
      parseErrors.length > 0 ? 0.2 : valuableTypes.length >= 2 ? 1 : valuableTypes.length === 1 ? 0.7 : 0,
    weight: 10,
    impact: 'high',
    summary:
      parseErrors.length > 0
        ? m.jsonLd.parseError(parseErrors.length)
        : valuableTypes.length > 0
          ? m.jsonLd.ok(valuableTypes.join(', '))
          : m.jsonLd.missing,
    evidence: [
      m.jsonLd.entities(entities.length),
      ...(foundTypes.length > 0 ? [m.jsonLd.types(foundTypes.join(', '))] : []),
      ...parseErrors,
    ],
    fix: jsonLdOk ? undefined : m.jsonLd.fix,
  });

  // --- Authorship -------------------------------------------------------------
  const hasAuthorEntity = entities.some((entity) => entity['author'] !== undefined);
  const hasAuthorMeta =
    $('meta[name="author"]').length > 0 ||
    $('[rel="author"]').length > 0 ||
    $('[itemprop="author"]').length > 0;

  results.push({
    id: 'authorship-signals',
    title: m.authorship.title,
    category: 'structured-data',
    status: hasAuthorEntity ? 'pass' : hasAuthorMeta ? 'warn' : 'fail',
    score: hasAuthorEntity ? 1 : hasAuthorMeta ? 0.6 : 0,
    weight: 6,
    impact: 'high',
    summary: hasAuthorEntity
      ? m.authorship.ok
      : hasAuthorMeta
        ? m.authorship.metaOnly
        : m.authorship.missing,
    evidence: [
      m.authorship.jsonLd(hasAuthorEntity ? t.common.yes : t.common.no),
      m.authorship.meta(hasAuthorMeta ? t.common.yes : t.common.no),
    ],
    fix: hasAuthorEntity ? undefined : m.authorship.fix,
  });

  // --- Freshness ---------------------------------------------------------------
  const published = entities.find((entity) => typeof entity['datePublished'] === 'string');
  const modified = entities.find((entity) => typeof entity['dateModified'] === 'string');
  const lastModifiedHeader = snapshot.page.headers['last-modified'];
  const hasDates = Boolean(published || modified);

  results.push({
    id: 'freshness-signals',
    title: m.freshness.title,
    category: 'structured-data',
    status: published && modified ? 'pass' : hasDates || lastModifiedHeader ? 'warn' : 'fail',
    score: published && modified ? 1 : hasDates ? 0.6 : lastModifiedHeader ? 0.3 : 0,
    weight: 5,
    impact: 'medium',
    summary: published && modified ? m.freshness.ok : hasDates ? m.freshness.partial : m.freshness.missing,
    evidence: [
      m.freshness.published(published ? String(published['datePublished']) : t.common.missing),
      m.freshness.modified(modified ? String(modified['dateModified']) : t.common.missing),
      m.freshness.header(lastModifiedHeader ?? t.common.missing),
    ],
    fix: published && modified ? undefined : m.freshness.fix,
  });

  // --- Answer-shaped schema ----------------------------------------------------
  const answerTypes = foundTypes.filter((type) => ANSWER_TYPES.includes(type));

  results.push({
    id: 'faq-schema',
    title: m.faqSchema.title,
    category: 'structured-data',
    status: answerTypes.length > 0 ? 'pass' : 'warn',
    score: answerTypes.length > 0 ? 1 : 0.4,
    weight: 4,
    impact: 'medium',
    summary: answerTypes.length > 0 ? m.faqSchema.ok(answerTypes.join(', ')) : m.faqSchema.missing,
    evidence: [m.faqSchema.detected(foundTypes.join(', ') || t.common.none)],
    fix: answerTypes.length > 0 ? undefined : m.faqSchema.fix,
  });

  return results;
}
