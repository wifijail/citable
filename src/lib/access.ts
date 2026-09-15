import { createHash } from 'node:crypto';
import { getStore, licenseHasAccess, type LicenseRecord } from '@/lib/db';
import { normalizeLicenseKey, verifyLicense } from '@/lib/license';
import { gumroadConfigured, isGumroadKey, verifyGumroadKey } from '@/lib/payments/gumroad';
import { findPlan, type AccessPlan } from '@/lib/plans';
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
  if (isGumroadKey(key)) {
    return gumroadConfigured() ? resolveGumroadAccess(key) : { plan: 'free', license: null, keyProblem: 'invalid' };
  }

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

/** How long a Gumroad verdict is trusted before asking Gumroad again. */
const GUMROAD_RECHECK_MS = 6 * 60 * 60 * 1000;
const rejectedGumroadKeys = new Map<string, number>();
const REJECTED_TTL_MS = 10 * 60 * 1000;

/**
 * Gumroad keys are checked with Gumroad and the verdict is cached in the
 * licenses table. When Gumroad is unreachable the last known verdict is used, so
 * paying customers are not locked out by someone else's outage.
 */
async function resolveGumroadAccess(key: string): Promise<Access> {
  const rejectedAt = rejectedGumroadKeys.get(key);
  if (rejectedAt && Date.now() - rejectedAt < REJECTED_TTL_MS) {
    return { plan: 'free', license: null, keyProblem: 'invalid' };
  }

  const store = getStore();
  let cached: LicenseRecord | null = null;
  try {
    cached = await store.findLicenseByKey(key);
  } catch (error) {
    console.error('[access] gumroad cache lookup failed', error);
  }

  const fresh = cached && Date.now() - new Date(cached.updatedAt).getTime() < GUMROAD_RECHECK_MS;
  if (!cached || !fresh) {
    const verdict = await verifyGumroadKey(key);

    if (verdict.kind === 'invalid') {
      rejectedGumroadKeys.set(key, Date.now());
      if (rejectedGumroadKeys.size > 5000) rejectedGumroadKeys.clear();
      if (cached) await store.setLicenseStatusById(cached.id, 'expired').catch(() => undefined);
      return { plan: 'free', license: null, keyProblem: 'invalid' };
    }

    if (verdict.kind === 'ok') {
      const plan = findPlan(verdict.product);
      if (!plan || plan.grants === 'free') return { plan: 'free', license: null, keyProblem: 'invalid' };
      try {
        if (cached) {
          await store.setLicenseStatusById(cached.id, verdict.status);
          cached = { ...cached, status: verdict.status };
        } else {
          cached = (
            await store.upsertLicense({
              licenseKey: key,
              idempotencyKey: `gumroad:${verdict.saleId}`,
              // Gumroad already knows the buyer; we do not need their email.
              email: null,
              plan: plan.grants,
              product: verdict.product,
              provider: 'gumroad',
              customerRef: null,
              subscriptionRef: verdict.subscriptionId,
              status: verdict.status,
              periodEnd: null,
              claimToken: null,
              locale: 'en',
              note: null,
            })
          ).license;
        }
      } catch (error) {
        console.error('[access] could not cache gumroad verdict', error);
        const granted = verdict.status === 'active';
        return { plan: granted ? plan.grants : 'free', license: null, keyProblem: granted ? null : 'inactive' };
      }
    }
    // verdict 'unreachable': fall through to the cached row, if any.
  }

  if (!cached) return { plan: 'free', license: null, keyProblem: null };
  if (!licenseHasAccess(cached)) return { plan: 'free', license: cached, keyProblem: 'inactive' };
  return { plan: cached.plan, license: cached, keyProblem: null };
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
