import postgres from 'postgres';
import type { AuditReport } from '@/lib/audit/types';
import type { Locale } from '@/i18n/config';
import type { PaidPlanId } from '@/lib/plans';
import { SCHEMA_STATEMENTS } from './schema';
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
  PaymentProvider,
  ScanRecord,
  Store,
} from './types';

type Sql = ReturnType<typeof postgres>;
type Row = Record<string, unknown>;

const globalDb = globalThis as typeof globalThis & {
  __citableSql?: Sql;
  __citableSchema?: Promise<void>;
};

function iso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function isoOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : iso(value);
}

function str(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

function toLicense(row: Row): LicenseRecord {
  return {
    id: Number(row.id),
    licenseKey: String(row.license_key),
    email: str(row.email),
    plan: row.plan === 'agency' ? 'agency' : 'pro',
    product: String(row.product) as PaidPlanId,
    provider: String(row.provider) as PaymentProvider,
    customerRef: str(row.customer_ref),
    subscriptionRef: str(row.subscription_ref),
    status: String(row.status) as LicenseStatus,
    periodEnd: isoOrNull(row.period_end),
    claimToken: str(row.claim_token),
    locale: String(row.locale) as Locale,
    note: str(row.note),
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  };
}

/**
 * Postgres-backed store. Works with any Postgres: Neon and Supabase (both have
 * free tiers and one-click Vercel integrations), or your own server.
 *
 * Tables are created automatically on first use, so there is no migration step
 * to forget. The same statements live in `schema.ts` if you prefer to run them
 * by hand.
 */
export class PostgresStore implements Store {
  readonly kind = 'postgres' as const;

  constructor(private readonly url: string) {}

  private get sql(): Sql {
    globalDb.__citableSql ??= postgres(this.url, {
      // Serverless functions are short-lived: one connection each is plenty,
      // and poolers such as PgBouncer/Neon/Supabase do not support prepared statements.
      max: 1,
      prepare: false,
      idle_timeout: 20,
      connect_timeout: 10,
    });
    return globalDb.__citableSql;
  }

  /** Runs the idempotent schema once per server instance. */
  private async ready(): Promise<Sql> {
    const sql = this.sql;
    globalDb.__citableSchema ??= (async () => {
      for (const statement of SCHEMA_STATEMENTS) {
        await sql.unsafe(statement);
      }
    })().catch((error: unknown) => {
      // Let the next request retry instead of caching the failure forever.
      globalDb.__citableSchema = undefined;
      throw error;
    });
    await globalDb.__citableSchema;
    return sql;
  }

  async saveScan(scan: NewScan): Promise<void> {
    const sql = await this.ready();
    await sql`
      insert into scans (id, url, final_url, score, grade, plan, locale, ip_hash, report)
      values (${scan.id}, ${scan.url}, ${scan.finalUrl}, ${scan.score}, ${scan.grade},
              ${scan.plan}, ${scan.locale}, ${scan.ipHash},
              ${sql.json(scan.report as unknown as postgres.JSONValue)})
      on conflict (id) do nothing
    `;
  }

  async getScan(id: string): Promise<ScanRecord | null> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`select * from scans where id = ${id} limit 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      id: String(row.id),
      url: String(row.url),
      finalUrl: String(row.final_url),
      score: Number(row.score),
      grade: String(row.grade),
      plan: String(row.plan) as ScanRecord['plan'],
      locale: String(row.locale) as Locale,
      report: row.report as AuditReport,
      createdAt: iso(row.created_at),
    };
  }

  async countFreeScansSince(ipHash: string, since: Date): Promise<number> {
    const sql = await this.ready();
    const rows = await sql<{ count: string }[]>`
      select count(*)::text as count from scans
      where ip_hash = ${ipHash} and plan = 'free' and created_at >= ${since}
    `;
    return Number(rows[0]?.count ?? 0);
  }

  async saveLead(lead: NewLead): Promise<void> {
    const sql = await this.ready();
    await sql`
      insert into leads (email, source, scanned_url, score, locale)
      values (${lead.email}, ${lead.source}, ${lead.scannedUrl}, ${lead.score}, ${lead.locale})
      on conflict (email, source) do update
        set scanned_url = coalesce(excluded.scanned_url, leads.scanned_url),
            score = coalesce(excluded.score, leads.score)
    `;
  }

  async saveContact(contact: NewContact): Promise<void> {
    const sql = await this.ready();
    await sql`
      insert into contact_messages (name, email, topic, message, locale)
      values (${contact.name}, ${contact.email}, ${contact.topic}, ${contact.message}, ${contact.locale})
    `;
  }

  async createCheckout(checkout: NewCheckout): Promise<void> {
    const sql = await this.ready();
    await sql`
      insert into checkouts (claim_token, product, provider, locale, email)
      values (${checkout.claimToken}, ${checkout.product}, ${checkout.provider},
              ${checkout.locale}, ${checkout.email})
      on conflict (claim_token) do nothing
    `;
  }

  async getCheckout(claimToken: string): Promise<CheckoutRecord | null> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`select * from checkouts where claim_token = ${claimToken} limit 1`;
    const row = rows[0];
    if (!row) return null;
    return {
      claimToken: String(row.claim_token),
      product: String(row.product) as PaidPlanId,
      provider: String(row.provider) as PaymentProvider,
      locale: String(row.locale) as Locale,
      email: str(row.email),
      createdAt: iso(row.created_at),
    };
  }

  async upsertLicense(license: NewLicense): Promise<{ license: LicenseRecord; inserted: boolean }> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`
      insert into licenses (
        license_key, idempotency_key, email, plan, product, provider, customer_ref,
        subscription_ref, status, period_end, claim_token, locale, note
      ) values (
        ${license.licenseKey}, ${license.idempotencyKey}, ${license.email}, ${license.plan},
        ${license.product}, ${license.provider}, ${license.customerRef}, ${license.subscriptionRef},
        ${license.status}, ${license.periodEnd}, ${license.claimToken}, ${license.locale}, ${license.note}
      )
      on conflict (idempotency_key) do update set
        subscription_ref = coalesce(licenses.subscription_ref, excluded.subscription_ref),
        customer_ref = coalesce(licenses.customer_ref, excluded.customer_ref),
        email = coalesce(licenses.email, excluded.email),
        period_end = coalesce(excluded.period_end, licenses.period_end),
        updated_at = now()
      returning *, (xmax = 0) as inserted
    `;
    const row = rows[0];
    if (!row) throw new Error('License upsert returned no row');
    return { license: toLicense(row), inserted: row.inserted === true };
  }

  async findLicenseByKey(key: string): Promise<LicenseRecord | null> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`select * from licenses where license_key = ${key} limit 1`;
    return rows[0] ? toLicense(rows[0]) : null;
  }

  async findLicenseByClaim(claimToken: string): Promise<LicenseRecord | null> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`
      select * from licenses where claim_token = ${claimToken} order by id asc limit 1
    `;
    return rows[0] ? toLicense(rows[0]) : null;
  }

  async updateLicenseStatus(update: LicenseStatusUpdate): Promise<number> {
    if (!update.subscriptionRef && !update.customerRef) return 0;
    const sql = await this.ready();

    const period = update.periodEnd === undefined ? sql`` : sql`, period_end = ${update.periodEnd}`;
    // Customer-level updates never touch one-time lifetime purchases.
    const target = update.subscriptionRef
      ? sql`subscription_ref = ${update.subscriptionRef}`
      : sql`customer_ref = ${update.customerRef ?? ''} and product <> 'lifetime'`;

    const result = await sql`
      update licenses set status = ${update.status}${period}, updated_at = now()
      where provider = ${update.provider} and ${target}
    `;
    return result.count;
  }

  async setLicenseStatusById(id: number, status: LicenseStatus): Promise<boolean> {
    const sql = await this.ready();
    const result = await sql`update licenses set status = ${status}, updated_at = now() where id = ${id}`;
    return result.count > 0;
  }

  async stats(): Promise<AdminStats> {
    const sql = await this.ready();
    const [scans] = await sql<{ total: string; day: string }[]>`
      select count(*)::text as total,
             count(*) filter (where created_at > now() - interval '24 hours')::text as day
      from scans
    `;
    const [leads] = await sql<{ total: string }[]>`select count(*)::text as total from leads`;
    const [contacts] = await sql<{ total: string }[]>`
      select count(*)::text as total from contact_messages
    `;
    const active = await sql<{ product: string; total: string }[]>`
      select product, count(*)::text as total from licenses
      where (status = 'active' and (period_end is null or period_end > now() - interval '3 days'))
         or (status = 'cancelled' and period_end > now())
      group by product
    `;

    const byProduct = { pro: 0, agency: 0, lifetime: 0 } as Record<PaidPlanId, number>;
    for (const row of active) {
      if (row.product in byProduct) byProduct[row.product as PaidPlanId] = Number(row.total);
    }

    return {
      scansTotal: Number(scans?.total ?? 0),
      scans24h: Number(scans?.day ?? 0),
      leadsTotal: Number(leads?.total ?? 0),
      contactsTotal: Number(contacts?.total ?? 0),
      licensesActive: byProduct.pro + byProduct.agency + byProduct.lifetime,
      activeByProduct: byProduct,
    };
  }

  async listLeads(limit: number): Promise<LeadRecord[]> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`select * from leads order by created_at desc limit ${limit}`;
    return rows.map((row) => ({
      id: Number(row.id),
      email: String(row.email),
      source: String(row.source),
      scannedUrl: str(row.scanned_url),
      score: row.score === null ? null : Number(row.score),
      locale: String(row.locale),
      createdAt: iso(row.created_at),
    }));
  }

  async listContacts(limit: number): Promise<ContactRecord[]> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`
      select * from contact_messages order by created_at desc limit ${limit}
    `;
    return rows.map((row) => ({
      id: Number(row.id),
      name: String(row.name),
      email: String(row.email),
      topic: String(row.topic),
      message: String(row.message),
      locale: String(row.locale),
      createdAt: iso(row.created_at),
    }));
  }

  async listLicenses(limit: number): Promise<LicenseRecord[]> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`select * from licenses order by created_at desc limit ${limit}`;
    return rows.map(toLicense);
  }

  async listScans(limit: number): Promise<Omit<ScanRecord, 'report'>[]> {
    const sql = await this.ready();
    const rows = await sql<Row[]>`
      select id, url, final_url, score, grade, plan, locale, created_at
      from scans order by created_at desc limit ${limit}
    `;
    return rows.map((row) => ({
      id: String(row.id),
      url: String(row.url),
      finalUrl: String(row.final_url),
      score: Number(row.score),
      grade: String(row.grade),
      plan: String(row.plan) as ScanRecord['plan'],
      locale: String(row.locale) as Locale,
      createdAt: iso(row.created_at),
    }));
  }
}
