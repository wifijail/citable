import type { AuditReport } from '@/lib/audit/types';
import type { Locale } from '@/i18n/config';
import type { AccessPlan, PaidPlanId } from '@/lib/plans';

export type PaymentProvider = 'stripe' | 'lemonsqueezy' | 'manual';

/**
 * - active:    paid and current
 * - cancelled: will not renew, but access continues until `periodEnd`
 * - past_due:  payment failed; access suspended until it recovers
 * - expired:   ended, no access
 */
export type LicenseStatus = 'active' | 'cancelled' | 'past_due' | 'expired';

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

export interface LeadRecord {
  id: number;
  email: string;
  source: string;
  scannedUrl: string | null;
  score: number | null;
  locale: string;
  createdAt: string;
}

export type NewLead = Omit<LeadRecord, 'id' | 'createdAt'>;

export interface ContactRecord {
  id: number;
  name: string;
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
  licensesActive: number;
  activeByProduct: Record<PaidPlanId, number>;
}

export interface Store {
  readonly kind: 'postgres' | 'memory';

  saveScan(scan: NewScan): Promise<void>;
  getScan(id: string): Promise<ScanRecord | null>;
  countFreeScansSince(ipHash: string, since: Date): Promise<number>;

  saveLead(lead: NewLead): Promise<void>;
  saveContact(contact: NewContact): Promise<void>;

  createCheckout(checkout: NewCheckout): Promise<void>;
  getCheckout(claimToken: string): Promise<CheckoutRecord | null>;

  /** Inserts, or merges into the existing row with the same idempotency key. */
  upsertLicense(license: NewLicense): Promise<{ license: LicenseRecord; inserted: boolean }>;
  findLicenseByKey(key: string): Promise<LicenseRecord | null>;
  findLicenseByClaim(claimToken: string): Promise<LicenseRecord | null>;
  updateLicenseStatus(update: LicenseStatusUpdate): Promise<number>;
  setLicenseStatusById(id: number, status: LicenseStatus): Promise<boolean>;

  stats(): Promise<AdminStats>;
  listLeads(limit: number): Promise<LeadRecord[]>;
  listContacts(limit: number): Promise<ContactRecord[]>;
  listLicenses(limit: number): Promise<LicenseRecord[]>;
  listScans(limit: number): Promise<Omit<ScanRecord, 'report'>[]>;
}

const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/** Whether a license currently grants paid access. */
export function licenseHasAccess(
  license: Pick<LicenseRecord, 'status' | 'periodEnd'>,
  now = new Date(),
): boolean {
  const end = license.periodEnd ? new Date(license.periodEnd).getTime() : null;
  if (license.status === 'active') {
    // A renewal webhook can arrive a little late; don't lock a paying customer out over it.
    return end === null || end + RENEWAL_GRACE_MS > now.getTime();
  }
  if (license.status === 'cancelled') return end !== null && end > now.getTime();
  return false;
}
