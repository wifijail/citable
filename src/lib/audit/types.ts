/**
 * Shared vocabulary for the audit engine.
 *
 * The engine is a pure pipeline:
 *   fetchTarget() -> PageSnapshot  ->  check(ctx) -> CheckResult[]  ->  score() -> AuditReport
 *
 * Checks never perform I/O themselves: everything the network provides is captured
 * once into a `PageSnapshot`, which keeps checks deterministic and unit-testable.
 * Human-readable text comes from `ctx.t`, the dictionary for the requested locale.
 */

import type { AuditMessages } from '@/i18n/audit/en';
import type { Locale } from '@/i18n/config';

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
  /** Business impact, used to sort the "fix these first" list. */
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
  purpose: 'training' | 'retrieval' | 'indexing';
  allowed: boolean;
  /** The robots.txt rule that decided it, if any. */
  rule: string | null;
  matchedGroup: string | null;
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
  /** Machine-readable failure reason: 'timeout' or a raw network message. */
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
}
