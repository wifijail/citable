/**
 * Small in-memory fixed-window limiter for low-stakes endpoints (lead capture,
 * contact form, license claim polling) and the scan quota when no database is
 * configured.
 *
 * On Vercel each serverless instance keeps its own counters, so limits are
 * approximate. That is acceptable for abuse damping; anything that must be exact
 * (the free scan quota) is counted in Postgres instead — see `lib/access.ts`.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_TRACKED_KEYS = 10_000;

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: number;
}

function evictExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size > MAX_TRACKED_KEYS) buckets.clear();
}

export function consumeQuota(
  identifier: string,
  limit: number,
  windowMs = 24 * 60 * 60 * 1000,
): QuotaResult {
  const now = Date.now();
  evictExpired(now);

  const existing = buckets.get(identifier);
  const bucket = existing && existing.resetAt > now ? existing : { count: 0, resetAt: now + windowMs };

  if (bucket.count >= limit) {
    buckets.set(identifier, bucket);
    return { allowed: false, remaining: 0, limit, resetAt: bucket.resetAt };
  }

  bucket.count++;
  buckets.set(identifier, bucket);
  return { allowed: true, remaining: Math.max(0, limit - bucket.count), limit, resetAt: bucket.resetAt };
}
