import { CircleCheck, CircleX, Download, LogOut, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { missingOwnerDetails } from '@/config/site';
import { isLocale, LOCALE_TAGS } from '@/i18n/config';
import { adminPassword, isAdmin } from '@/lib/admin-auth';
import { getStore, licenseHasAccess } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { licenseSecret } from '@/lib/license';
import { paymentMode } from '@/lib/payments';
import { findPlan } from '@/lib/plans';
import { approvePaymentAction, extendLicenseAction, logoutAction, rejectPaymentAction, revokeLicenseAction } from './actions';
import { getAdminCopy } from './copy';
import { EraseDataForm, IssueLicenseForm, LoginForm } from './forms';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Admin', robots: { index: false, follow: false } };

type Props = { params: Promise<{ locale: string }> };

function Table({ headers, rows, empty }: { headers: string[]; rows: React.ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="px-4 py-6 text-sm text-faint">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-surface-2 text-xs text-faint">
          <tr>
            {headers.map((header) => (
              <th key={header} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((row, index) => (
            <tr key={index} className="align-top">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2.5">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AdminPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = getAdminCopy(locale);

  if (!adminPassword()) {
    return (
      <section className="container-page max-w-xl py-24">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-warn/40 bg-warn/5 p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
          {copy.notConfigured}
        </p>
      </section>
    );
  }

  if (!(await isAdmin())) {
    return (
      <section className="container-page py-24">
        <h1 className="mb-8 text-center text-3xl font-semibold">{copy.title}</h1>
        <LoginForm locale={locale} copy={copy} />
      </section>
    );
  }

  const store = getStore();
  // Applying retention here too means it happens even if the daily cron is not set up.
  await store.purgeExpired().catch((error) => console.error('[admin] purge failed', error));
  const [stats, licenses, leads, contacts, scans, requests] = await Promise.all([
    store.stats(),
    store.listLicenses(50),
    store.listLeads(50),
    store.listContacts(50),
    store.listScans(30),
    store.listPaymentRequests(50),
  ]);

  const format = (iso: string | null) =>
    iso ? new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso)) : '—';
  const mrr =
    stats.activeByProduct.pro * (findPlan('pro')?.priceUsd ?? 0) +
    stats.activeByProduct.agency * (findPlan('agency')?.priceUsd ?? 0);

  const checklist = [
    { label: store.kind === 'postgres' ? copy.setupItems.database : copy.setupItems.databaseMemory, ok: store.kind === 'postgres' },
    { label: `${copy.setupItems.payments}${paymentMode() ? ` — ${paymentMode()}` : ''}`, ok: Boolean(paymentMode()) },
    { label: copy.setupItems.licensing, ok: Boolean(licenseSecret()) },
    { label: copy.setupItems.email, ok: emailConfigured() },
    {
      label: missingOwnerDetails().length ? `${copy.setupItems.legal}: ${missingOwnerDetails().join(', ')}` : copy.setupItems.legal,
      ok: missingOwnerDetails().length === 0,
    },
  ];

  return (
    <section className="container-page space-y-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold">{copy.title}</h1>
        <form action={logoutAction}>
          <input type="hidden" name="locale" value={locale} />
          <button type="submit" className="btn-ghost">
            <LogOut className="h-4 w-4" />
            {copy.signOut}
          </button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="font-semibold">{copy.setup}</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-2 text-sm">
              {item.ok ? (
                <CircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-pass" />
              ) : (
                <CircleX className="mt-0.5 h-4 w-4 shrink-0 text-fail" />
              )}
              <span className={item.ok ? 'text-muted' : 'text-fg'}>{item.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {[
          [copy.stats.scans24h, stats.scans24h],
          [copy.stats.scansTotal, stats.scansTotal],
          [copy.stats.leads, stats.leadsTotal],
          [copy.stats.contacts, stats.contactsTotal],
          [copy.stats.pending, stats.pendingPayments],
          [copy.stats.active, stats.licensesActive],
          [copy.stats.mrr, `$${mrr}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="card p-4">
            <p className="text-xs text-faint">{label}</p>
            <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>

      <div id="payments" className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">{copy.tables.payments}</h2>
          <p className="mt-1 text-xs text-muted">{copy.tables.paymentsHint}</p>
        </div>
        <Table
          empty={copy.tables.empty}
          headers={[copy.tables.date, copy.tables.email, copy.tables.plan, copy.tables.reference, copy.tables.message, copy.tables.decided]}
          rows={requests.map((request) => [
            format(request.createdAt),
            request.email,
            request.product,
            <span key="reference" className="break-all">{request.reference}</span>,
            <p key="message" className="max-w-xs whitespace-pre-wrap text-muted">{request.message ?? '—'}</p>,
            request.status === 'pending' ? (
              <div key="decide" className="flex flex-wrap gap-2">
                <form action={approvePaymentAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={request.id} />
                  <button type="submit" className="text-xs font-medium text-pass hover:underline">
                    {copy.tables.approve}
                  </button>
                </form>
                <form action={rejectPaymentAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={request.id} />
                  <button type="submit" className="text-xs text-fail hover:underline">
                    {copy.tables.reject}
                  </button>
                </form>
              </div>
            ) : (
              <span key="status" className={request.status === 'approved' ? 'text-pass' : 'text-fail'}>
                {request.status} · {format(request.decidedAt)}
              </span>
            ),
          ])}
        />
      </div>

      <IssueLicenseForm locale={locale} copy={copy} />

      <div id="licenses" className="card overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 font-semibold">{copy.tables.licenses}</h2>
        <Table
          empty={copy.tables.empty}
          headers={[copy.tables.date, copy.tables.email, copy.tables.plan, copy.tables.status, copy.tables.provider, copy.tables.until, copy.tables.key, '']}
          rows={licenses.map((license) => [
            format(license.createdAt),
            license.email ?? '—',
            license.product,
            <span key="status" className={licenseHasAccess(license) ? 'text-pass' : 'text-fail'}>
              {license.status}
            </span>,
            license.provider,
            format(license.periodEnd),
            <code key="key" className="font-mono text-xs">
              {license.licenseKey.slice(0, 18)}…
            </code>,
            <div key="actions" className="flex flex-wrap gap-2">
              {license.provider === 'manual' && license.product !== 'lifetime' && (
                <form action={extendLicenseAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={license.id} />
                  <button type="submit" className="whitespace-nowrap text-xs text-accent hover:underline">
                    {copy.tables.extend}
                  </button>
                </form>
              )}
              {licenseHasAccess(license) && license.provider !== 'gumroad' && (
                <form action={revokeLicenseAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="id" value={license.id} />
                  <button type="submit" className="text-xs text-fail hover:underline">
                    {copy.tables.revoke}
                  </button>
                </form>
              )}
            </div>,
          ])}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-semibold">{copy.tables.leads}</h2>
            <a href="/api/admin/leads" download className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline">
              <Download className="h-3.5 w-3.5" />
              {copy.tables.exportCsv}
            </a>
          </div>
          <Table
            empty={copy.tables.empty}
            headers={[copy.tables.date, copy.tables.email, copy.tables.source, copy.tables.score]}
            rows={leads.map((lead) => [format(lead.createdAt), lead.email, lead.source, lead.score ?? '—'])}
          />
        </div>

        <div className="card overflow-hidden">
          <h2 className="border-b border-line px-4 py-3 font-semibold">{copy.tables.contacts}</h2>
          <Table
            empty={copy.tables.empty}
            headers={[copy.tables.date, copy.tables.name, copy.tables.topic, copy.tables.message]}
            rows={contacts.map((contact) => [
              format(contact.createdAt),
              <a key="mail" href={`mailto:${contact.email}`} className="text-accent hover:underline">
                {contact.name ?? contact.email}
              </a>,
              contact.topic,
              <p key="message" className="max-w-xs whitespace-pre-wrap text-muted">
                {contact.message}
              </p>,
            ])}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <h2 className="border-b border-line px-4 py-3 font-semibold">{copy.tables.scans}</h2>
        <Table
          empty={copy.tables.empty}
          headers={[copy.tables.date, copy.tables.url, copy.tables.score, copy.tables.plan]}
          rows={scans.map((scan) => [
            format(scan.createdAt),
            <a key="url" href={`/${locale}/r/${scan.id}`} className="break-all text-accent hover:underline">
              {scan.finalUrl}
            </a>,
            `${scan.score} (${scan.grade})`,
            scan.plan,
          ])}
        />
      </div>

      <EraseDataForm locale={locale} copy={copy} />
    </section>
  );
}
