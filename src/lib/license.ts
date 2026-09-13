import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

/**
 * License keys: `CITE-<PLAN>-<ID>-<SIGNATURE>`.
 *
 * ID is 10 random bytes; SIGNATURE is an HMAC-SHA256 of `PLAN-ID` under
 * LICENSE_SECRET (96 bits kept). The signature lets any server reject forged or
 * mistyped keys instantly, without touching the database.
 *
 * Whether a *valid-looking* key still grants access (subscription cancelled,
 * refunded, expired…) is decided by the licenses table — see `lib/access.ts`.
 */

export type Plan = 'free' | 'pro' | 'agency';

export interface LicenseInfo {
  plan: Exclude<Plan, 'free'>;
  id: string;
}

const PREFIX = 'CITE';
const SIGNATURE_HEX = 24;

export function licenseSecret(): string | null {
  const value = process.env.LICENSE_SECRET?.trim();
  // Deliberately refuse short secrets: without a real one, no key can be issued or verified.
  return value && value.length >= 16 ? value : null;
}

function sign(body: string, secret: string): string {
  return createHmac('sha256', secret).update(body).digest('hex').slice(0, SIGNATURE_HEX).toUpperCase();
}

export function issueLicense(plan: Exclude<Plan, 'free'>): string {
  const secret = licenseSecret();
  if (!secret) throw new Error('LICENSE_SECRET is not configured (min. 16 characters).');
  const body = `${plan.toUpperCase()}-${randomBytes(10).toString('hex').toUpperCase()}`;
  return `${PREFIX}-${body}-${sign(body, secret)}`;
}

/** Normalises what a human pasted: trims, upper-cases, drops inner spaces. */
export function normalizeLicenseKey(key: string): string {
  return key.trim().toUpperCase().replace(/\s+/g, '');
}

export function verifyLicense(key: string | null | undefined): LicenseInfo | null {
  const secret = licenseSecret();
  if (!key || !secret) return null;

  const parts = normalizeLicenseKey(key).split('-');
  if (parts.length !== 4) return null;
  const [prefix, planPart, id, signature] = parts;
  if (prefix !== PREFIX || !planPart || !id || !signature) return null;
  // Strict hex checks also guarantee equal byte lengths for timingSafeEqual below.
  if (!/^[0-9A-F]{20}$/.test(id) || !/^[0-9A-F]{24}$/.test(signature)) return null;

  const plan = planPart.toLowerCase();
  if (plan !== 'pro' && plan !== 'agency') return null;

  const expected = sign(`${planPart}-${id}`, secret);
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  return { plan, id };
}
