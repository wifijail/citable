import type {
  AdminStats,
  CheckoutRecord,
  ContactRecord,
  ErasureResult,
  LeadRecord,
  LicenseRecord,
  LicenseStatus,
  LicenseStatusUpdate,
  NewCheckout,
  NewContact,
  NewLead,
  NewLicense,
  NewPaymentRequest,
  NewScan,
  PaymentRequestRecord,
  PaymentRequestStatus,
  PurgeResult,
  ScanRecord,
  Store,
} from './types';
import { licenseHasAccess, RETENTION } from './types';

interface MemoryState {
  scans: Map<string, ScanRecord & { ipHash: string | null }>;
  leads: LeadRecord[];
  contacts: ContactRecord[];
  checkouts: Map<string, CheckoutRecord>;
  requests: PaymentRequestRecord[];
  licenses: Array<LicenseRecord & { idempotencyKey: string }>;
  sequence: number;
}

const globalState = globalThis as typeof globalThis & { __citableMemory?: MemoryState };
const DAY = 24 * 60 * 60 * 1000;

/**
 * Development fallback used when no DATABASE_URL is configured.
 *
 * Data lives in process memory: it disappears on restart, and on Vercel every
 * serverless instance has its own copy. Fine for trying the site locally,
 * useless for production — the admin checklist flags it.
 */
export class MemoryStore implements Store {
  readonly kind = 'memory' as const;

  private get state(): MemoryState {
    globalState.__citableMemory ??= {
      scans: new Map(),
      leads: [],
      contacts: [],
      checkouts: new Map(),
      requests: [],
      licenses: [],
      sequence: 0,
    };
    // Older in-memory state from a hot reload may lack newer collections.
    globalState.__citableMemory.requests ??= [];
    return globalState.__citableMemory;
  }

  private nextId(): number {
    this.state.sequence += 1;
    return this.state.sequence;
  }

  async saveScan(scan: NewScan): Promise<void> {
    this.state.scans.set(scan.id, { ...scan, createdAt: new Date().toISOString() });
  }

  async getScan(id: string): Promise<ScanRecord | null> {
    const found = this.state.scans.get(id);
    if (!found) return null;
    const { ipHash: _ipHash, ...record } = found;
    return record;
  }

  async countFreeScansSince(ipHash: string, since: Date): Promise<number> {
    let count = 0;
    for (const scan of this.state.scans.values()) {
      if (scan.ipHash === ipHash && scan.plan === 'free' && new Date(scan.createdAt) >= since) count++;
    }
    return count;
  }

  async saveLead(lead: NewLead): Promise<void> {
    const existing = this.state.leads.find((l) => l.email === lead.email && l.source === lead.source);
    if (existing) {
      existing.scannedUrl = lead.scannedUrl ?? existing.scannedUrl;
      existing.score = lead.score ?? existing.score;
      existing.consentAt = lead.consentAt;
      existing.consentVersion = lead.consentVersion;
      return;
    }
    this.state.leads.unshift({ ...lead, id: this.nextId(), createdAt: new Date().toISOString() });
  }

  async saveContact(contact: NewContact): Promise<void> {
    this.state.contacts.unshift({ ...contact, id: this.nextId(), createdAt: new Date().toISOString() });
  }

  async createCheckout(checkout: NewCheckout): Promise<void> {
    this.state.checkouts.set(checkout.claimToken, { ...checkout, createdAt: new Date().toISOString() });
  }

  async getCheckout(claimToken: string): Promise<CheckoutRecord | null> {
    return this.state.checkouts.get(claimToken) ?? null;
  }

  async createPaymentRequest(request: NewPaymentRequest): Promise<PaymentRequestRecord> {
    const record: PaymentRequestRecord = {
      ...request,
      id: this.nextId(),
      status: 'pending',
      licenseId: null,
      createdAt: new Date().toISOString(),
      decidedAt: null,
    };
    this.state.requests.unshift(record);
    return { ...record };
  }

  async getPaymentRequestByClaim(claimToken: string): Promise<PaymentRequestRecord | null> {
    const found = this.state.requests.find((r) => r.claimToken === claimToken);
    return found ? { ...found } : null;
  }

  async getPaymentRequest(id: number): Promise<PaymentRequestRecord | null> {
    const found = this.state.requests.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async listPaymentRequests(limit: number): Promise<PaymentRequestRecord[]> {
    return [...this.state.requests]
      .sort((a, b) => Number(a.status !== 'pending') - Number(b.status !== 'pending') || b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((r) => ({ ...r }));
  }

  async decidePaymentRequest(
    id: number,
    status: Exclude<PaymentRequestStatus, 'pending'>,
    licenseId: number | null,
  ): Promise<boolean> {
    const found = this.state.requests.find((r) => r.id === id && r.status === 'pending');
    if (!found) return false;
    found.status = status;
    found.licenseId = licenseId;
    found.decidedAt = new Date().toISOString();
    return true;
  }

  async upsertLicense(input: NewLicense): Promise<{ license: LicenseRecord; inserted: boolean }> {
    const now = new Date().toISOString();
    const existing = this.state.licenses.find((l) => l.idempotencyKey === input.idempotencyKey);

    if (existing) {
      existing.subscriptionRef ??= input.subscriptionRef;
      existing.customerRef ??= input.customerRef;
      existing.email ??= input.email;
      existing.periodEnd = input.periodEnd ?? existing.periodEnd;
      existing.updatedAt = now;
      return { license: strip(existing), inserted: false };
    }

    const created = { ...input, id: this.nextId(), createdAt: now, updatedAt: now };
    this.state.licenses.unshift(created);
    return { license: strip(created), inserted: true };
  }

  async findLicenseByKey(key: string): Promise<LicenseRecord | null> {
    const found = this.state.licenses.find((l) => l.licenseKey === key);
    return found ? strip(found) : null;
  }

  async findLicenseByClaim(claimToken: string): Promise<LicenseRecord | null> {
    const found = this.state.licenses.find((l) => l.claimToken === claimToken);
    return found ? strip(found) : null;
  }

  async updateLicenseStatus(update: LicenseStatusUpdate): Promise<number> {
    let changed = 0;
    for (const license of this.state.licenses) {
      if (license.provider !== update.provider) continue;
      const matches =
        (update.subscriptionRef && license.subscriptionRef === update.subscriptionRef) ||
        (!update.subscriptionRef &&
          update.customerRef &&
          license.customerRef === update.customerRef &&
          // Same rule as Postgres: customer-level updates never touch one-time purchases.
          license.product !== 'lifetime');
      if (!matches) continue;
      license.status = update.status;
      if (update.periodEnd !== undefined) license.periodEnd = update.periodEnd;
      license.updatedAt = new Date().toISOString();
      changed++;
    }
    return changed;
  }

  async setLicenseStatusById(id: number, status: LicenseStatus): Promise<boolean> {
    const license = this.state.licenses.find((l) => l.id === id);
    if (!license) return false;
    license.status = status;
    license.updatedAt = new Date().toISOString();
    return true;
  }

  async extendLicense(id: number, days: number): Promise<boolean> {
    const license = this.state.licenses.find((l) => l.id === id);
    if (!license) return false;
    const base = Math.max(Date.now(), license.periodEnd ? new Date(license.periodEnd).getTime() : 0);
    license.periodEnd = new Date(base + days * DAY).toISOString();
    license.status = 'active';
    license.updatedAt = new Date().toISOString();
    return true;
  }

  async stats(): Promise<AdminStats> {
    const dayAgo = Date.now() - DAY;
    const active = this.state.licenses.filter((l) => licenseHasAccess(l));
    return {
      scansTotal: this.state.scans.size,
      scans24h: [...this.state.scans.values()].filter((s) => new Date(s.createdAt).getTime() > dayAgo).length,
      leadsTotal: this.state.leads.length,
      contactsTotal: this.state.contacts.length,
      pendingPayments: this.state.requests.filter((r) => r.status === 'pending').length,
      licensesActive: active.length,
      activeByProduct: {
        pro: active.filter((l) => l.product === 'pro').length,
        agency: active.filter((l) => l.product === 'agency').length,
        lifetime: active.filter((l) => l.product === 'lifetime').length,
      },
    };
  }

  async listLeads(limit: number): Promise<LeadRecord[]> {
    return this.state.leads.slice(0, limit);
  }

  async listContacts(limit: number): Promise<ContactRecord[]> {
    return this.state.contacts.slice(0, limit);
  }

  async listLicenses(limit: number): Promise<LicenseRecord[]> {
    return this.state.licenses.slice(0, limit).map(strip);
  }

  async listScans(limit: number): Promise<Omit<ScanRecord, 'report'>[]> {
    return [...this.state.scans.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map(({ report: _report, ipHash: _ipHash, ...rest }) => rest);
  }

  async purgeExpired(now = new Date()): Promise<PurgeResult> {
    const t = now.getTime();
    const older = (iso: string, ms: number) => new Date(iso).getTime() < t - ms;
    const result: PurgeResult = {
      ipHashesCleared: 0,
      scansDeleted: 0,
      checkoutsDeleted: 0,
      requestsDeleted: 0,
      leadsDeleted: 0,
      contactsDeleted: 0,
    };

    for (const [id, scan] of this.state.scans) {
      if (older(scan.createdAt, RETENTION.scanDays * DAY)) {
        this.state.scans.delete(id);
        result.scansDeleted++;
      } else if (scan.ipHash && older(scan.createdAt, RETENTION.ipHashHours * 60 * 60 * 1000)) {
        scan.ipHash = null;
        result.ipHashesCleared++;
      }
    }
    for (const [token, checkout] of this.state.checkouts) {
      const claimed = this.state.licenses.some((l) => l.claimToken === token);
      if (!claimed && older(checkout.createdAt, RETENTION.checkoutDays * DAY)) {
        this.state.checkouts.delete(token);
        result.checkoutsDeleted++;
      }
    }
    const keepRequest = (r: PaymentRequestRecord) =>
      !(r.status === 'rejected' && older(r.decidedAt ?? r.createdAt, RETENTION.rejectedRequestDays * DAY));
    result.requestsDeleted = this.state.requests.length - this.state.requests.filter(keepRequest).length;
    this.state.requests = this.state.requests.filter(keepRequest);

    const leadsBefore = this.state.leads.length;
    this.state.leads = this.state.leads.filter((l) => !older(l.createdAt, RETENTION.leadDays * DAY));
    result.leadsDeleted = leadsBefore - this.state.leads.length;
    const contactsBefore = this.state.contacts.length;
    this.state.contacts = this.state.contacts.filter((c) => !older(c.createdAt, RETENTION.contactDays * DAY));
    result.contactsDeleted = contactsBefore - this.state.contacts.length;
    return result;
  }

  async eraseByEmail(email: string): Promise<ErasureResult> {
    const target = email.trim().toLowerCase();
    const leadsBefore = this.state.leads.length;
    this.state.leads = this.state.leads.filter((l) => l.email.toLowerCase() !== target);
    const contactsBefore = this.state.contacts.length;
    this.state.contacts = this.state.contacts.filter((c) => c.email.toLowerCase() !== target);
    const requestsBefore = this.state.requests.length;
    this.state.requests = this.state.requests.filter((r) => r.email.toLowerCase() !== target);
    let licensesAnonymised = 0;
    for (const license of this.state.licenses) {
      if (license.email?.toLowerCase() === target) {
        license.email = null;
        licensesAnonymised++;
      }
    }
    for (const checkout of this.state.checkouts.values()) {
      if (checkout.email?.toLowerCase() === target) checkout.email = null;
    }
    return {
      leads: leadsBefore - this.state.leads.length,
      contacts: contactsBefore - this.state.contacts.length,
      requests: requestsBefore - this.state.requests.length,
      licensesAnonymised,
    };
  }
}

function strip(license: LicenseRecord & { idempotencyKey: string }): LicenseRecord {
  const { idempotencyKey: _key, ...rest } = license;
  return { ...rest };
}
