/**
 * Shared vocabulary for the audit engine.
 *
 * The engine is a pure pipeline:
 *   fetchTarget() -> PageSnapshot  ->  check(ctx) -> CheckResult[]  ->  score() -> AuditReport
 *
 * Checks never perform I/O themselves: everything the network provides is captured
 * once into a `PageSnapshot`, which keeps checks deterministic and unit-testable.
 */

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
  label: string;
  /** Share of the final score, in points. All weights sum to 100. */
  weight: number;
  description: string;
}

export const CATEGORIES: readonly Category[] = [
  {
    id: 'crawler-access',
    label: 'AI Crawler Access',
    weight: 30,
    description: 'Whether AI agents are actually allowed to fetch this page at all.',
  },
  {
    id: 'machine-readability',
    label: 'Machine Readability',
    weight: 20,
    description: 'Whether the content exists in the raw HTML, without running JavaScript.',
  },
  {
    id: 'structured-data',
    label: 'Structured Data',
    weight: 15,
    description: 'Machine-readable facts about the entity, author and freshness.',
  },
  {
    id: 'answerability',
    label: 'Answerability',
    weight: 15,
    description: 'Whether the content is shaped into quotable, extractable answers.',
  },
  {
    id: 'identity',
    label: 'Metadata & Identity',
    weight: 10,
    description: 'How the page introduces itself in previews and citations.',
  },
  {
    id: 'technical',
    label: 'Technical Health',
    weight: 10,
    description: 'Transport, response and indexing signals that can silently hide a page.',
  },
] as const;

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
  /** Concrete instruction, often including a code snippet. Gated on free plan. */
  fix?: string;
  /** Business impact, used to sort the "fix these first" list. */
  impact: 'critical' | 'high' | 'medium' | 'low';
  /** Set when remediation detail was withheld behind the paywall. */
  locked?: boolean;
}

export interface CategoryScore {
  id: CategoryId;
  label: string;
  weight: number;
  /** 0..100 within the category. */
  score: number;
  checks: CheckResult[];
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface AuditReport {
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

export interface FetchedResource {
  url: string;
  ok: boolean;
  status: number;
  headers: Record<string, string>;
  body: string;
  /** Total wall time of the request, ms. */
  elapsedMs: number;
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
  warnings: string[];
}

export interface CheckContext {
  snapshot: PageSnapshot;
  /** Parsed DOM of the page body. */
  $: import('cheerio').CheerioAPI;
  /** Visible text extracted from the server-rendered HTML. */
  text: string;
  wordCount: number;
}
