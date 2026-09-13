import { createHash } from 'node:crypto';
import { getStore, licenseHasAccess, type LicenseRecord } from '@/lib/db';
import { normalizeLicenseKey, verifyLicense } from '@/lib/license';
import type { AccessPlan } from '@/lib/plans';
import { consumeQuota } from '@/lib/ratelimit';

export interface Access {
  plan: AccessPlan;
  license: LicenseRecord | null;
  /** Why a supplied key did not grant paid access, for a helpful UI message. */
  keyProblem: 'invalid' | 'inactive' | null;
}

/**
 * Decides what a request may see.
 *
 * 1. The signature check rejects forged or mistyped keys without any I/O.
 * 2. With a real database, the licenses table is the source of truth, so a
 *    cancelled or refunded subscription stops working on its own.
 * 3. Without a database (local development) a correctly signed key is trusted.
 */
export async function resolveAccess(rawKey: string | null | undefined): Promise<Access> {
  if (!rawKey?.trim()) return { plan: 'free', license: null, keyProblem: null };

  const key = normalizeLicenseKey(rawKey);
  const signed = verifyLicense(key);
  if (!signed) return { plan: 'free', license: null, keyProblem: 'invalid' };

  const store = getStore();
  if (store.kind === 'memory') {
    const license = await store.findLicenseByKey(key);
    if (license && !licenseHasAccess(license)) return { plan: 'free', license, keyProblem: 'inactive' };
    return { plan: signed.plan, license, keyProblem: null };
  }

  try {
    const license = await store.findLicenseByKey(key);
    if (!license) return { plan: 'free', license: null, keyProblem: 'invalid' };
    if (!licenseHasAccess(license)) return { plan: 'free', license, keyProblem: 'inactive' };
    return { plan: license.plan, license, keyProblem: null };
  } catch (error) {
    // Fail closed: a database outage must not hand out paid access.
    console.error('[access] license lookup failed', error);
    return { plan: 'free', license: null, keyProblem: null };
  }
}

/** Best-effort client IP behind Vercel's proxy. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || headers.get('x-real-ip') || headers.get('cf-connecting-ip') || 'anonymous';
}

/** IPs are never stored raw — only a salted hash, enough to count scans per visitor. */
export function hashIp(ip: string): string {
  const salt = process.env.LICENSE_SECRET || 'citable-ip-salt';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex').slice(0, 32);
}

export function freeDailyLimit(): number {
  const parsed = Number.parseInt(process.env.FREE_DAILY_SCAN_LIMIT ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 5;
}

/**
 * Free-plan scan quota. Counted from the scans table when a database exists
 * (accurate across all serverless instances), otherwise in memory.
 */
export async function checkFreeQuota(ipHash: string): Promise<{ allowed: boolean; limit: number }> {
  const limit = freeDailyLimit();
  const store = getStore();

  if (store.kind === 'postgres') {
    try {
      const used = await store.countFreeScansSince(ipHash, new Date(Date.now() - 24 * 60 * 60 * 1000));
      return { allowed: used < limit, limit };
    } catch (error) {
      console.error('[quota] falling back to in-memory counting', error);
    }
  }

  return { allowed: consumeQuota(`scan:${ipHash}`, limit).allowed, limit };
}
