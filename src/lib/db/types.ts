import type { AuditReport } from '@/lib/audit/types';
import type { Locale } from '@/i18n/config';
import type { AccessPlan, PaidPlanId } from '@/lib/plans';

export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'gumroad' | 'manual';

/**
 * - active:    paid and current (until `periodEnd`, if set, plus a short grace period)
 * - cancelled: will not renew, access continues until `periodEnd`
 * - past_due:  payment failed; access suspended until it recovers
 * - expired:   ended, no access
 */
export type LicenseStatus = 'active' | 'cancelled' | 'past_due' | 'expired';

/** Proof that a person agreed to the data-processing terms, and to which version. */
export interface Consent {
  consentAt: string;
  consentVersion: string;
}

export interface ScanRecord {
  id: string;
  url: string;
  finalUrl: string;
  score: number;
  grade: string;
  plan: AccessPlan;
  locale: Locale;
  /** The complete, ungated report. Gating is applied when it is displayed. */
  report: AuditReport;
  createdAt: string;
}

export interface NewScan extends Omit<ScanRecord, 'createdAt'> {
  ipHash: string | null;
}

export interface LeadRecord extends Consent {
  id: number;
  email: string;
  source: string;
  scannedUrl: string | null;
  score: number | null;
  locale: string;
  createdAt: string;
}

export type NewLead = Omit<LeadRecord, 'id' | 'createdAt'>;

export interface ContactRecord extends Consent {
  id: number;
  /** Optional: only the email is needed to reply. */
  name: string | null;
  email: string;
  topic: string;
  message: string;
  locale: string;
  createdAt: string;
}

export type NewContact = Omit<ContactRecord, 'id' | 'createdAt'>;

export interface CheckoutRecord {
  claimToken: string;
  product: PaidPlanId;
  provider: PaymentProvider;
  locale: Locale;
  email: string | null;
  createdAt: string;
}

export type NewCheckout = Omit<CheckoutRecord, 'createdAt'>;

export type PaymentRequestStatus = 'pending' | 'approved' | 'rejected';

/** A buyer's "I have paid" notice for a payment taken outside the site. */
export interface PaymentRequestRecord extends Consent {
  id: number;
  claimToken: string;
  product: PaidPlanId;
  email: string;
  /** What the buyer says identifies the payment: platform username, order number… */
  reference: string;
  message: string | null;
  locale: Locale;
  status: PaymentRequestStatus;
  licenseId: number | null;
  createdAt: string;
  decidedAt: string | null;
}

export type NewPaymentRequest = Omit<PaymentRequestRecord, 'id' | 'status' | 'licenseId' | 'createdAt' | 'decidedAt'>;

export interface LicenseRecord {
  id: number;
  licenseKey: string;
  email: string | null;
  plan: Exclude<AccessPlan, 'free'>;
  product: PaidPlanId;
  provider: PaymentProvider;
  customerRef: string | null;
  subscriptionRef: string | null;
  status: LicenseStatus;
  periodEnd: string | null;
  claimToken: string | null;
  locale: Locale;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewLicense {
  licenseKey: string;
  /** Deduplicates webhook retries and the several events one purchase produces. */
  idempotencyKey: string;
  email: string | null;
  plan: Exclude<AccessPlan, 'free'>;
  product: PaidPlanId;
  provider: PaymentProvider;
  customerRef: string | null;
  subscriptionRef: string | null;
  status: LicenseStatus;
  periodEnd: string | null;
  claimToken: string | null;
  locale: Locale;
  note: string | null;
}

export interface LicenseStatusUpdate {
  provider: PaymentProvider;
  subscriptionRef?: string | null;
  customerRef?: string | null;
  status: LicenseStatus;
  periodEnd?: string | null;
}

export interface AdminStats {
  scansTotal: number;
  scans24h: number;
  leadsTotal: number;
  contactsTotal: number;
  pendingPayments: number;
  licensesActive: number;
  activeByProduct: Record<PaidPlanId, number>;
}

export interface PurgeResult {
  ipHashesCleared: number;
  scansDeleted: number;
  checkoutsDeleted: number;
  requestsDeleted: number;
  leadsDeleted: number;
  contactsDeleted: number;
}

export interface ErasureResult {
  leads: number;
  contacts: number;
  requests: number;
  licensesAnonymised: number;
}

/**
 * Retention periods — the Privacy Policy quotes these values, so change both
 * together.
 */
export const RETENTION = {
  ipHashHours: 48,
  scanDays: 365,
  checkoutDays: 30,
  rejectedRequestDays: 90,
  leadDays: 730,
  contactDays: 730,
} as const;

export interface Store {
  readonly kind: 'postgres' | 'memory';

  saveScan(scan: NewScan): Promise<void>;
  getScan(id: string): Promise<ScanRecord | null>;
  countFreeScansSince(ipHash: string, since: Date): Promise<number>;

  saveLead(lead: NewLead): Promise<void>;
  saveContact(contact: NewContact): Promise<void>;

  createCheckout(checkout: NewCheckout): Promise<void>;
  getCheckout(claimToken: string): Promise<CheckoutRecord | null>;

  createPaymentRequest(request: NewPaymentRequest): Promise<PaymentRequestRecord>;
  getPaymentRequestByClaim(claimToken: string): Promise<PaymentRequestRecord | null>;
  getPaymentRequest(id: number): Promise<PaymentRequestRecord | null>;
  listPaymentRequests(limit: number): Promise<PaymentRequestRecord[]>;
  decidePaymentRequest(id: number, status: Exclude<PaymentRequestStatus, 'pending'>, licenseId: number | null): Promise<boolean>;

  /** Inserts, or merges into the existing row with the same idempotency key. */
  upsertLicense(license: NewLicense): Promise<{ license: LicenseRecord; inserted: boolean }>;
  findLicenseByKey(key: string): Promise<LicenseRecord | null>;
  findLicenseByClaim(claimToken: string): Promise<LicenseRecord | null>;
  updateLicenseStatus(update: LicenseStatusUpdate): Promise<number>;
  setLicenseStatusById(id: number, status: LicenseStatus): Promise<boolean>;
  /** Pushes the end date forward by `days` from the later of now and the current end. */
  extendLicense(id: number, days: number): Promise<boolean>;

  stats(): Promise<AdminStats>;
  listLeads(limit: number): Promise<LeadRecord[]>;
  listContacts(limit: number): Promise<ContactRecord[]>;
  listLicenses(limit: number): Promise<LicenseRecord[]>;
  listScans(limit: number): Promise<Omit<ScanRecord, 'report'>[]>;

  /** Applies the retention periods in `RETENTION`. */
  purgeExpired(now?: Date): Promise<PurgeResult>;
  /** Right-to-erasure: deletes personal data linked to an email address. */
  eraseByEmail(email: string): Promise<ErasureResult>;
}

const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Whether a license currently grants paid access. */
export function licenseHasAccess(
  license: Pick<LicenseRecord, 'status' | 'periodEnd'>,
  now = new Date(),
): boolean {
  const end = license.periodEnd ? new Date(license.periodEnd).getTime() : null;
  if (license.status === 'active') {
    // A renewal webhook or a manual extension can arrive a little late.
    return end === null || end + RENEWAL_GRACE_MS > now.getTime();
  }
  if (license.status === 'cancelled') return end !== null && end > now.getTime();
  return false;
}
