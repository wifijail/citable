import { z } from 'zod';
import type { Consent } from '@/lib/db';

/**
 * Version of the personal-data consent text (/legal/consent). Bump it whenever
 * that text changes: every stored lead, message and payment request records the
 * version the person actually agreed to.
 */
export const CONSENT_VERSION = '2026-09-15';

/** Forms must send `consent: true`; an unticked box is rejected server-side too. */
export const ConsentField = z.literal(true, { errorMap: () => ({ message: 'consent_required' }) });

export function consentRecord(now = new Date()): Consent {
  return { consentAt: now.toISOString(), consentVersion: CONSENT_VERSION };
}
