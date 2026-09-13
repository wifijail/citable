import type {
  AdminStats,
  CheckoutRecord,
  ContactRecord,
  LeadRecord,
  LicenseRecord,
  LicenseStatus,
  LicenseStatusUpdate,
  NewCheckout,
  NewContact,
  NewLead,
  NewLicense,
  NewScan,
  ScanRecord,
  Store,
} from './types';
import { licenseHasAccess } from './types';

interface MemoryState {
  scans: Map<string, ScanRecord & { ipHash: string | null }>;
  leads: LeadRecord[];
  contacts: ContactRecord[];
  checkouts: Map<string, CheckoutRecord>;
  licenses: Array<LicenseRecord & { idempotencyKey: string }>;
  sequence: number;
}

const globalState = globalThis as typeof globalThis & { __citableMemory?: MemoryState };

/**
 * Development fallback used when no DATABASE_URL is configured.
 *
 * Data lives in process memory: it disappears on restart, and on Vercel every
 * serverless instance has its own copy. That is fine for trying the site locally
 * and useless for production — the admin panel shows a warning while it is active.
 */
export class MemoryStore implements Store {
  readonly kind = 'memory' as const;

  private get state(): MemoryState {
    globalState.__citableMemory ??= {
      scans: new Map(),
      leads: [],
      contacts: [],
      checkouts: new Map(),
      licenses: [],
      sequence: 0,
    };
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
    const duplicate = this.state.leads.some((l) => l.email === lead.email && l.source === lead.source);
    if (duplicate) return;
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

  async stats(): Promise<AdminStats> {
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    const active = this.state.licenses.filter((l) => licenseHasAccess(l));
    return {
      scansTotal: this.state.scans.size,
      scans24h: [...this.state.scans.values()].filter((s) => new Date(s.createdAt).getTime() > dayAgo)
        .length,
      leadsTotal: this.state.leads.length,
      contactsTotal: this.state.contacts.length,
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
}

function strip(license: LicenseRecord & { idempotencyKey: string }): LicenseRecord {
  const { idempotencyKey: _key, ...rest } = license;
  return { ...rest };
}
