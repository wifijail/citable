/**
 * Shared vocabulary for the audit engine.
 *
 *   fetchTarget() ─► PageSnapshot ─┬─► detectProfile()
 *                                  ├─► crawlSite()      (site mode: more pages)
 *                                  └─► analyseSnapshot() ─► checks ─► score ─► AuditReport
 *
 * Checks never perform I/O: everything the network provides is captured first,
 * which keeps checks deterministic and unit-testable. Human-readable text comes
 * from `ctx.t`, the dictionary for the requested locale.
 */

import type { AuditMessages } from '@/i18n/audit/en';
import type { Locale } from '@/i18n/config';
import type { EngineId } from './crawlers';

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';

export type CategoryId =
  | 'crawler-access'
  | 'machine-readability'
  | 'structured-data'
  | 'answerability'
  | 'identity'
  | 'technical';

export interface Category {
  id: CategoryId;
  /** Share of the final score, in points. All weights sum to 100. */
  weight: number;
}

export const CATEGORIES: readonly Category[] = [
  { id: 'crawler-access', weight: 30 },
  { id: 'machine-readability', weight: 20 },
  { id: 'structured-data', weight: 15 },
  { id: 'answerability', weight: 15 },
  { id: 'identity', weight: 10 },
  { id: 'technical', weight: 10 },
] as const;

export type Impact = 'critical' | 'high' | 'medium' | 'low';

export type SiteType = 'saas' | 'ecommerce' | 'blog' | 'local' | 'docs' | 'general';
export const SITE_TYPES: readonly SiteType[] = ['saas', 'ecommerce', 'blog', 'local', 'docs', 'general'];

export interface ScanOptions {
  /** `page` audits one URL; `site` also samples other pages of the same site. */
  mode: 'page' | 'site';
  /** Upper bound on pages fetched in site mode, including the start page. */
  maxPages: number;
  /** `auto` detects the site type; anything else overrides the detection. */
  siteType: SiteType | 'auto';
  /** Assistants the owner cares about; other agents are shown but not scored. */
  engines: EngineId[];
  /** The owner deliberately keeps training crawlers out. */
  blockTraining: boolean;
}

export interface CheckResult {
  /** Stable machine id, safe to use in CI assertions. */
  id: string;
  title: string;
  category: CategoryId;
  status: CheckStatus;
  /** 0..1 — how much of this check's weight was earned. */
  score: number;
  /** Relative weight inside its category. */
  weight: number;
  /** One-line verdict shown in the report. */
  summary: string;
  /** What we actually observed (URLs, header values, counts). */
  evidence?: string[];
  /** Concrete instruction, often including a code snippet. Gated on the free plan. */
  fix?: string;
  /** Used to sort the "fix these first" list. */
  impact: Impact;
  /** Set when remediation detail was withheld behind the paywall. */
  locked?: boolean;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  description: string;
  weight: number;
  /** 0..100 within the category. */
  score: number;
  checks: CheckResult[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface CrawlerVerdict {
  id: string;
  name: string;
  vendor: string;
  engine: EngineId;
  purpose: 'training' | 'retrieval' | 'indexing';
  allowed: boolean;
  /** Whether this agent's engine is among the owner's selected engines. */
  selected: boolean;
  /** The robots.txt rule that decided it, if any. */
  rule: string | null;
  matchedGroup: string | null;
  docs: string;
}

export interface SiteProfile {
  type: SiteType;
  /** What detection alone concluded, even when overridden. */
  detected: SiteType;
  confidence: 'high' | 'medium' | 'low';
  /** Short machine-readable reasons, localised at render time. */
  signals: string[];
  overridden: boolean;
  /** Localised labels, filled in when the report is built (absent in older stored reports). */
  label?: string;
  detectedLabel?: string;
  signalLabels?: string[];
}

export interface PageSummary {
  url: string;
  status: number;
  score: number;
  title: string;
  wordCount: number;
  /** Ids of failing/warning page-level checks. */
  issues: string[];
  jsonLdTypes: string[];
  /** Selected retrieval/indexing agents blocked from this path by robots.txt. */
  blockedFor: string[];
  inSitemap: boolean | null;
  noindex: boolean;
  description: string;
}

export interface GeneratedFiles {
  robotsTxt: string;
  llmsTxt: string | null;
  jsonLd: string | null;
}

export interface TopicTerm {
  term: string;
  weight: number;
}

export interface AuditReport {
  /** Public share id, present once the scan has been stored. */
  id?: string;
  locale: Locale;
  url: string;
  finalUrl: string;
  scannedAt: string;
  durationMs: number;
  score: number;
  grade: Grade;
  verdict: string;
  categories: CategoryScore[];
  /** Highest-impact failing checks, already sorted. */
  priorityFixes: CheckResult[];
  crawlers: CrawlerVerdict[];
  plan: 'free' | 'pro' | 'agency';
  options: ScanOptions;
  profile: SiteProfile;
  /** Other pages sampled in site mode (empty in page mode). */
  pages: PageSummary[];
  generated: GeneratedFiles;
  /** Terms the page is most about, as a text-only reader would see it. */
  topics: TopicTerm[];
  /** CDN/WAF detected from response headers, if any. */
  cdn: string | null;
  /** True when detail was withheld because the caller is on the free plan. */
  truncated: boolean;
  lockedCount: number;
  warnings: string[];
}

export interface FetchedResource {
  url: string;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  /** Total wall time of the request, ms. */
  elapsedMs: number;
  /** Redirect hops followed before the final response. */
  redirects: number;
  /** Machine-readable failure reason: 'timeout', 'blocked-redirect' or a network message. */
  error?: string;
}

export interface PageSnapshot {
  requestedUrl: string;
  finalUrl: string;
  origin: string;
  page: FetchedResource;
  robots: FetchedResource | null;
  llmsTxt: FetchedResource | null;
  sitemap: FetchedResource | null;
  redirectChainLength: number;
}

export interface CheckContext {
  snapshot: PageSnapshot;
  /** Parsed DOM of the page body. */
  $: import('cheerio').CheerioAPI;
  /** Visible text extracted from the server-rendered HTML. */
  text: string;
  wordCount: number;
  t: AuditMessages;
  options: ScanOptions;
  profile: SiteProfile;
  /** Pages sampled in site mode; empty in page mode. */
  pages: PageSummary[];
}
