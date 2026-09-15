import { afterAll, describe, expect, it } from 'vitest';
import { MemoryStore } from '@/lib/db/memory';
import { PostgresStore } from '@/lib/db/postgres';
import { licenseHasAccess, type NewLicense, type Store } from '@/lib/db/types';
import type { AuditReport } from '@/lib/audit/types';

/**
 * The same contract runs against both stores. The Postgres half only runs when
 * TEST_DATABASE_URL points at a disposable database, e.g.
 *   TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:55432/postgres npm test
 */
const stores: Array<[string, () => Store]> = [['memory', () => new MemoryStore()]];
if (process.env.TEST_DATABASE_URL) {
  stores.push(['postgres', () => new PostgresStore(process.env.TEST_DATABASE_URL as string)]);
}

const CONSENT = { consentAt: new Date().toISOString(), consentVersion: 'test' };
const unique = () => Math.random().toString(36).slice(2, 10);

function license(overrides: Partial<NewLicense> = {}): NewLicense {
  const id = unique();
  return {
    licenseKey: `CITE-PRO-${id}`,
    idempotencyKey: `test:${id}`,
    email: `${id}@example.com`,
    plan: 'pro',
    product: 'pro',
    provider: 'lemonsqueezy',
    customerRef: null,
    subscriptionRef: null,
    status: 'active',
    periodEnd: null,
    claimToken: null,
    locale: 'en',
    note: null,
    ...overrides,
  };
}

describe.each(stores)('%s store', (_name, create) => {
  const store = create();

  afterAll(async () => {
    const { __citableSql } = globalThis as { __citableSql?: { end: () => Promise<void> } };
    if (store.kind === 'postgres') await __citableSql?.end();
  });

  it('stores and reads back a scan with its full report', async () => {
    const id = unique();
    const report = { score: 77, grade: 'B', categories: [] } as unknown as AuditReport;
    await store.saveScan({
      id,
      url: 'https://example.com/',
      finalUrl: 'https://example.com/',
      score: 77,
      grade: 'B',
      plan: 'free',
      locale: 'ru',
      ipHash: `ip-${id}`,
      report,
    });

    const found = await store.getScan(id);
    expect(found?.score).toBe(77);
    expect(found?.locale).toBe('ru');
    expect(found?.report.score).toBe(77);
    expect(await store.getScan('does-not-exist')).toBeNull();
  });

  it('counts free scans per IP inside the window', async () => {
    const ipHash = `ip-${unique()}`;
    for (let i = 0; i < 3; i++) {
      await store.saveScan({
        id: unique(),
        url: 'https://a.com/',
        finalUrl: 'https://a.com/',
        score: 50,
        grade: 'D',
        plan: i === 2 ? 'pro' : 'free',
        locale: 'en',
        ipHash,
        report: {} as AuditReport,
      });
    }
    const since = new Date(Date.now() - 60_000);
    expect(await store.countFreeScansSince(ipHash, since)).toBe(2);
    expect(await store.countFreeScansSince(ipHash, new Date(Date.now() + 60_000))).toBe(0);
  });

  it('deduplicates leads by email and source', async () => {
    const email = `${unique()}@example.com`;
    await store.saveLead({ email, source: 'report', scannedUrl: null, score: null, locale: 'en', ...CONSENT });
    await store.saveLead({ email, source: 'report', scannedUrl: 'https://x.com', score: 40, locale: 'en', ...CONSENT });
    const leads = (await store.listLeads(500)).filter((lead) => lead.email === email);
    expect(leads).toHaveLength(1);
  });

  it('saves contact messages', async () => {
    const email = `${unique()}@example.com`;
    await store.saveContact({ name: 'Ann', email, topic: 'sales', message: 'Hello', locale: 'de', ...CONSENT });
    const found = (await store.listContacts(500)).find((contact) => contact.email === email);
    expect(found?.message).toBe('Hello');
  });

  it('round-trips a pending checkout', async () => {
    const claimToken = unique();
    await store.createCheckout({ claimToken, product: 'agency', provider: 'stripe', locale: 'es', email: null });
    const found = await store.getCheckout(claimToken);
    expect(found?.product).toBe('agency');
    expect(found?.locale).toBe('es');
  });

  it('makes license creation idempotent across webhook retries', async () => {
    const claimToken = unique();
    const first = await store.upsertLicense(license({ idempotencyKey: `claim:${claimToken}`, claimToken }));
    const retry = await store.upsertLicense(
      license({ idempotencyKey: `claim:${claimToken}`, claimToken, subscriptionRef: 'sub_123' }),
    );

    expect(first.inserted).toBe(true);
    expect(retry.inserted).toBe(false);
    // The retry must not mint a second key, but it may fill in missing references.
    expect(retry.license.licenseKey).toBe(first.license.licenseKey);
    expect(retry.license.subscriptionRef).toBe('sub_123');
    expect((await store.findLicenseByClaim(claimToken))?.licenseKey).toBe(first.license.licenseKey);
    expect((await store.findLicenseByKey(first.license.licenseKey))?.id).toBe(first.license.id);
  });

  it('updates status by subscription and leaves lifetime purchases alone', async () => {
    const customerRef = `cus_${unique()}`;
    const subscriptionRef = `sub_${unique()}`;
    const monthly = await store.upsertLicense(license({ customerRef, subscriptionRef, provider: 'stripe' }));
    const lifetime = await store.upsertLicense(
      license({ customerRef, provider: 'stripe', product: 'lifetime' }),
    );

    const periodEnd = new Date(Date.now() + 86_400_000).toISOString();
    expect(
      await store.updateLicenseStatus({ provider: 'stripe', subscriptionRef, status: 'cancelled', periodEnd }),
    ).toBe(1);
    const cancelled = await store.findLicenseByKey(monthly.license.licenseKey);
    expect(cancelled?.status).toBe('cancelled');
    expect(cancelled && licenseHasAccess(cancelled)).toBe(true);

    await store.updateLicenseStatus({ provider: 'stripe', customerRef, status: 'expired' });
    expect((await store.findLicenseByKey(lifetime.license.licenseKey))?.status).toBe('active');
  });

  it('stores a contact message without a name', async () => {
    const email = `${unique()}@example.com`;
    await store.saveContact({ name: null, email, topic: 'support', message: 'No name given', locale: 'kk', ...CONSENT });
    const found = (await store.listContacts(500)).find((contact) => contact.email === email);
    expect(found?.name).toBeNull();
    expect(found?.consentVersion).toBe('test');
  });

  it('runs the manual payment request lifecycle', async () => {
    const claimToken = unique();
    const request = await store.createPaymentRequest({
      claimToken,
      product: 'pro',
      email: `${unique()}@example.com`,
      reference: 'boosty: user123',
      message: null,
      locale: 'ru',
      ...CONSENT,
    });
    expect(request.status).toBe('pending');
    expect((await store.getPaymentRequestByClaim(claimToken))?.id).toBe(request.id);
    expect((await store.listPaymentRequests(500)).some((r) => r.id === request.id)).toBe(true);

    const { license: issued } = await store.upsertLicense(license({ claimToken, provider: 'manual', idempotencyKey: `claim:${claimToken}` }));
    expect(await store.decidePaymentRequest(request.id, 'approved', issued.id)).toBe(true);
    // A request can only be decided once.
    expect(await store.decidePaymentRequest(request.id, 'rejected', null)).toBe(false);
    const decided = await store.getPaymentRequest(request.id);
    expect(decided?.status).toBe('approved');
    expect(decided?.licenseId).toBe(issued.id);
    expect(decided?.decidedAt).not.toBeNull();
  });

  it('extends a license from the later of now and its current end', async () => {
    const past = new Date(Date.now() - 10 * 86_400_000).toISOString();
    const { license: created } = await store.upsertLicense(license({ periodEnd: past, status: 'expired' }));
    expect(await store.extendLicense(created.id, 31)).toBe(true);
    const extended = await store.findLicenseByKey(created.licenseKey);
    const days = (new Date(extended?.periodEnd ?? 0).getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(30);
    expect(days).toBeLessThan(32);
    expect(extended && licenseHasAccess(extended)).toBe(true);
  });

  it('purges data past its retention period', async () => {
    const id = unique();
    await store.saveScan({
      id,
      url: 'https://old.example/',
      finalUrl: 'https://old.example/',
      score: 1,
      grade: 'F',
      plan: 'free',
      locale: 'en',
      ipHash: `ip-${id}`,
      report: {} as AuditReport,
    });
    // Pretend three days have passed: the IP hash must go, the scan must stay.
    const soon = await store.purgeExpired(new Date(Date.now() + 3 * 86_400_000));
    expect(soon.ipHashesCleared).toBeGreaterThan(0);
    expect(await store.getScan(id)).not.toBeNull();
    expect(await store.countFreeScansSince(`ip-${id}`, new Date(0))).toBe(0);

    const later = await store.purgeExpired(new Date(Date.now() + 400 * 86_400_000));
    expect(later.scansDeleted).toBeGreaterThan(0);
    expect(await store.getScan(id)).toBeNull();
  });

  it('erases personal data for an email address', async () => {
    const email = `${unique()}@Example.com`;
    await store.saveLead({ email: email.toLowerCase(), source: 'report', scannedUrl: null, score: null, locale: 'en', ...CONSENT });
    await store.saveContact({ name: 'Bob', email: email.toLowerCase(), topic: 'other', message: 'Delete me', locale: 'en', ...CONSENT });
    const { license: owned } = await store.upsertLicense(license({ email: email.toLowerCase() }));

    const result = await store.eraseByEmail(email);
    expect(result.leads).toBe(1);
    expect(result.contacts).toBe(1);
    expect(result.licensesAnonymised).toBe(1);
    expect((await store.findLicenseByKey(owned.licenseKey))?.email).toBeNull();
  });

  it('reports admin stats', async () => {
    const stats = await store.stats();
    expect(stats.licensesActive).toBeGreaterThan(0);
    expect(stats.activeByProduct.lifetime).toBeGreaterThan(0);
    expect(typeof stats.pendingPayments).toBe('number');
  });
});

describe('licenseHasAccess', () => {
  const now = new Date('2026-09-13T12:00:00Z');
  const day = 86_400_000;

  it('grants access to active licenses, with a grace period after renewal is due', () => {
    expect(licenseHasAccess({ status: 'active', periodEnd: null }, now)).toBe(true);
    expect(
      licenseHasAccess({ status: 'active', periodEnd: new Date(now.getTime() - day).toISOString() }, now),
    ).toBe(true);
    expect(
      licenseHasAccess({ status: 'active', periodEnd: new Date(now.getTime() - 5 * day).toISOString() }, now),
    ).toBe(false);
  });

  it('keeps cancelled subscriptions working until the paid period ends', () => {
    expect(
      licenseHasAccess({ status: 'cancelled', periodEnd: new Date(now.getTime() + day).toISOString() }, now),
    ).toBe(true);
    expect(
      licenseHasAccess({ status: 'cancelled', periodEnd: new Date(now.getTime() - 1).toISOString() }, now),
    ).toBe(false);
  });

  it('denies expired and past-due licenses', () => {
    expect(licenseHasAccess({ status: 'expired', periodEnd: null }, now)).toBe(false);
    expect(licenseHasAccess({ status: 'past_due', periodEnd: null }, now)).toBe(false);
  });
});
