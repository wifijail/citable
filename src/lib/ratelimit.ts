/**
 * Per-IP daily quota for free scans.
 *
 * Intentionally in-memory: on Vercel each serverless instance keeps its own
 * counter, which is imperfect but costs nothing and is enough to stop casual
 * abuse of an endpoint that only makes three outbound GET requests. Swap the
 * two functions below for Upstash Redis when volume justifies it.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_TRACKED_KEYS = 10_000;

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

function dailyLimit(): number {
  const parsed = Number.parseInt(process.env.FREE_DAILY_SCAN_LIMIT ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
}

export function consumeQuota(identifier: string, limitOverride?: number): QuotaResult {
  const limit = limitOverride ?? dailyLimit();
  const now = Date.now();
  evictExpired(now);

  const existing = buckets.get(identifier);
  const bucket =
    existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + DAY_MS };

  if (bucket.count >= limit) {
    buckets.set(identifier, bucket);
    return { allowed: false, remaining: 0, limit, resetAt: bucket.resetAt };
  }

  bucket.count++;
  buckets.set(identifier, bucket);
  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    limit,
    resetAt: bucket.resetAt,
  };
}

/** Best-effort client identity behind Vercel's proxy. */
export function clientIdentifier(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return headers.get('x-real-ip') ?? headers.get('cf-connecting-ip') ?? 'anonymous';
}
