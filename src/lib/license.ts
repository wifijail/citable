import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Stateless licensing.
 *
 * A key is `CITE-<PLAN>-<PAYLOAD>-<SIGNATURE>`, where the signature is an HMAC of
 * the payload under LICENSE_SECRET. Verification is a local hash comparison, so
 * paid access needs no database, no session store and no per-request round trip —
 * which is what keeps the marginal cost of a customer at zero.
 *
 * Revocation is the deliberate trade-off: to invalidate keys you rotate the secret.
 * For a $19/month tool that is the right side of the complexity line.
 */

export type Plan = 'free' | 'pro' | 'agency';

export interface LicenseInfo {
  plan: Plan;
  /** Opaque customer reference (Stripe customer id or hashed email). */
  reference: string;
  issuedAt: number;
}

const PREFIX = 'CITE';

function secret(): string {
  const value = process.env.LICENSE_SECRET;
  if (!value || value.length < 8) {
    // Deliberately unusable fallback: without a real secret, no key can verify.
    return '';
  }
  return value;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('hex').slice(0, 32).toUpperCase();
}

// Hex, not base64url: keys are printed, spoken and pasted in upper case, and
// base64url would both lose information on case-folding and collide with the
// `-` separator used in the key format.
function encodePayload(info: Omit<LicenseInfo, 'plan'>): string {
  return Buffer.from(`${info.reference}:${info.issuedAt}`, 'utf8')
    .toString('hex')
    .toUpperCase();
}

function decodePayload(encoded: string): Omit<LicenseInfo, 'plan'> | null {
  try {
    if (!/^[0-9A-F]+$/i.test(encoded) || encoded.length % 2 !== 0) return null;
    const decoded = Buffer.from(encoded, 'hex').toString('utf8');
    const separator = decoded.lastIndexOf(':');
    if (separator === -1) return null;
    const reference = decoded.slice(0, separator);
    const issuedAt = Number.parseInt(decoded.slice(separator + 1), 10);
    if (!reference || !Number.isFinite(issuedAt)) return null;
    return { reference, issuedAt };
  } catch {
    return null;
  }
}

export function issueLicense(plan: Exclude<Plan, 'free'>, reference: string): string {
  if (!secret()) throw new Error('LICENSE_SECRET is not configured.');
  const payload = encodePayload({ reference, issuedAt: Date.now() });
  const body = `${plan.toUpperCase()}-${payload}`;
  return `${PREFIX}-${body}-${sign(body)}`;
}

export function verifyLicense(key: string | null | undefined): LicenseInfo | null {
  if (!key || !secret()) return null;

  const parts = key.trim().toUpperCase().split('-');
  if (parts.length !== 4) return null;
  const [prefix, planPart, payload, signature] = parts;
  if (prefix !== PREFIX || !planPart || !payload || !signature) return null;

  const plan = planPart.toLowerCase();
  if (plan !== 'pro' && plan !== 'agency') return null;

  const expected = sign(`${planPart}-${payload}`);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;

  const decoded = decodePayload(payload);
  if (!decoded) return null;

  return { plan, reference: decoded.reference, issuedAt: decoded.issuedAt };
}

/** Resolves the effective plan for a request, from a header or a cookie. */
export function planFromKey(key: string | null | undefined): Plan {
  return verifyLicense(key)?.plan ?? 'free';
}
