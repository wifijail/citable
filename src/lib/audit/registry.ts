import type { AuditMessages } from '@/i18n/audit/en';
import type { CategoryId, SiteType } from './types';

export type CheckScope = 'page' | 'site' | 'multi-page';

export interface CheckDefinition {
  id: string;
  /** Key into `AuditMessages['checks']`. */
  key: keyof AuditMessages['checks'];
  category: CategoryId;
  /** page: judged on one page · site: once per site · multi-page: needs site mode. */
  scope: CheckScope;
  /** Only runs for this site type (null = every site). */
  profile: SiteType | null;
}

/**
 * Every check the engine can emit. Tests assert that emitted ids match this
 * list, and the methodology page is rendered from it, so the public description
 * of the audit cannot drift from the code.
 */
export const CHECKS: readonly CheckDefinition[] = [
  { id: 'robots-txt-present', key: 'robotsPresent', category: 'crawler-access', scope: 'site', profile: null },
  { id: 'retrieval-bots-allowed', key: 'retrievalBots', category: 'crawler-access', scope: 'page', profile: null },
  { id: 'indexing-bots-allowed', key: 'indexingBots', category: 'crawler-access', scope: 'page', profile: null },
  { id: 'training-bots-policy', key: 'trainingBots', category: 'crawler-access', scope: 'site', profile: null },
  { id: 'page-level-opt-out', key: 'pageOptOut', category: 'crawler-access', scope: 'page', profile: null },
  { id: 'site-blocked-pages', key: 'siteBlocked', category: 'crawler-access', scope: 'multi-page', profile: null },
  { id: 'site-noindex-pages', key: 'siteNoindex', category: 'crawler-access', scope: 'multi-page', profile: null },

  { id: 'server-rendered-content', key: 'serverRendered', category: 'machine-readability', scope: 'page', profile: null },
  { id: 'client-side-rendering-risk', key: 'clientShell', category: 'machine-readability', scope: 'page', profile: null },
  { id: 'llms-txt', key: 'llmsTxt', category: 'machine-readability', scope: 'site', profile: null },
  { id: 'sitemap-available', key: 'sitemap', category: 'machine-readability', scope: 'site', profile: null },
  { id: 'text-to-html-ratio', key: 'textRatio', category: 'machine-readability', scope: 'page', profile: null },
  { id: 'site-client-rendered', key: 'siteClientRendered', category: 'machine-readability', scope: 'multi-page', profile: null },
  { id: 'site-sitemap-coverage', key: 'siteSitemapCoverage', category: 'machine-readability', scope: 'multi-page', profile: null },
  { id: 'feed-link', key: 'feedLink', category: 'machine-readability', scope: 'site', profile: 'blog' },

  { id: 'jsonld-present', key: 'jsonLd', category: 'structured-data', scope: 'page', profile: null },
  { id: 'authorship-signals', key: 'authorship', category: 'structured-data', scope: 'page', profile: null },
  { id: 'freshness-signals', key: 'freshness', category: 'structured-data', scope: 'page', profile: null },
  { id: 'faq-schema', key: 'faqSchema', category: 'structured-data', scope: 'page', profile: null },
  { id: 'site-schema-coverage', key: 'siteSchemaCoverage', category: 'structured-data', scope: 'multi-page', profile: null },
  { id: 'product-schema', key: 'productSchema', category: 'structured-data', scope: 'page', profile: 'ecommerce' },
  { id: 'breadcrumbs-schema', key: 'breadcrumbs', category: 'structured-data', scope: 'page', profile: 'ecommerce' },
  { id: 'software-schema', key: 'softwareSchema', category: 'structured-data', scope: 'site', profile: 'saas' },
  { id: 'article-schema', key: 'articleSchema', category: 'structured-data', scope: 'page', profile: 'blog' },
  { id: 'local-business-schema', key: 'localBusinessSchema', category: 'structured-data', scope: 'site', profile: 'local' },
  { id: 'organization-schema', key: 'organizationSchema', category: 'structured-data', scope: 'site', profile: 'general' },

  { id: 'heading-structure', key: 'headings', category: 'answerability', scope: 'page', profile: null },
  { id: 'question-headings', key: 'questionHeadings', category: 'answerability', scope: 'page', profile: null },
  { id: 'extractable-formatting', key: 'formatting', category: 'answerability', scope: 'page', profile: null },
  { id: 'paragraph-density', key: 'paragraphs', category: 'answerability', scope: 'page', profile: null },
  { id: 'content-depth', key: 'depth', category: 'answerability', scope: 'page', profile: null },
  { id: 'semantic-html', key: 'semanticHtml', category: 'answerability', scope: 'page', profile: null },
  { id: 'topic-focus', key: 'topicFocus', category: 'answerability', scope: 'page', profile: null },
  { id: 'site-thin-pages', key: 'siteThinPages', category: 'answerability', scope: 'multi-page', profile: null },
  { id: 'pricing-page', key: 'pricingPage', category: 'answerability', scope: 'site', profile: 'saas' },
  { id: 'code-examples', key: 'codeExamples', category: 'answerability', scope: 'page', profile: 'docs' },
  { id: 'docs-structure', key: 'docsStructure', category: 'answerability', scope: 'page', profile: 'docs' },

  { id: 'title-tag', key: 'titleTag', category: 'identity', scope: 'page', profile: null },
  { id: 'meta-description', key: 'metaDescription', category: 'identity', scope: 'page', profile: null },
  { id: 'canonical-url', key: 'canonical', category: 'identity', scope: 'page', profile: null },
  { id: 'open-graph', key: 'openGraph', category: 'identity', scope: 'page', profile: null },
  { id: 'language-declared', key: 'language', category: 'identity', scope: 'page', profile: null },
  { id: 'trust-pages', key: 'trustPages', category: 'identity', scope: 'site', profile: null },
  { id: 'site-duplicate-titles', key: 'siteDuplicateTitles', category: 'identity', scope: 'multi-page', profile: null },
  { id: 'site-missing-descriptions', key: 'siteMissingDescriptions', category: 'identity', scope: 'multi-page', profile: null },
  { id: 'contact-details', key: 'contactDetails', category: 'identity', scope: 'site', profile: 'local' },

  { id: 'http-status', key: 'httpStatus', category: 'technical', scope: 'page', profile: null },
  { id: 'https', key: 'https', category: 'technical', scope: 'page', profile: null },
  { id: 'response-time', key: 'responseTime', category: 'technical', scope: 'page', profile: null },
  { id: 'redirect-chain', key: 'redirects', category: 'technical', scope: 'page', profile: null },
  { id: 'html-weight', key: 'htmlWeight', category: 'technical', scope: 'page', profile: null },
  { id: 'image-alt-coverage', key: 'imageAlt', category: 'technical', scope: 'page', profile: null },
  { id: 'cdn-ai-protection', key: 'cdnProtection', category: 'technical', scope: 'site', profile: null },
  { id: 'site-unreachable-pages', key: 'siteUnreachable', category: 'technical', scope: 'multi-page', profile: null },
] as const;

export const CHECK_COUNT = CHECKS.length;

export const PAGE_LEVEL_IDS = new Set(CHECKS.filter((check) => check.scope === 'page').map((check) => check.id));

export function findCheck(id: string): CheckDefinition | undefined {
  return CHECKS.find((check) => check.id === id);
}
