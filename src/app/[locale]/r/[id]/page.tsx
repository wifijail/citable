import { ArrowRight } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ReportView } from '@/components/report/report-view';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { applyPlanGating } from '@/lib/audit';
import { getStore } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ locale: string; id: string }> };

const loadScan = cache(async (id: string) => {
  if (!/^[0-9a-zA-Z]{12}$/.test(id)) return null;
  try {
    return await getStore().getScan(id);
  } catch (error) {
    console.error('[report] could not load scan', error);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, id } = await params;
  if (!isLocale(locale)) return {};
  const scan = await loadScan(id);
  if (!scan) return { robots: { index: false } };
  const t = getDictionary(locale);
  return {
    title: t.shared.title(new URL(scan.finalUrl).hostname),
    description: scan.report.verdict,
    // Reports are shared by link, not meant to be indexed.
    robots: { index: false, follow: true },
  };
}

export default async function SharedReportPage({ params }: Props) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  const scan = await loadScan(id);
  if (!scan) notFound();

  const t = getDictionary(locale);
  // A report made on a paid plan is shared in full; a free one keeps its paywall.
  const report = applyPlanGating({ ...scan.report, id: scan.id, plan: scan.plan });

  return (
    <section className="container-page py-12 sm:py-16">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{t.report.scoreLabel}</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {t.shared.title(new URL(scan.finalUrl).hostname)}
          </h1>
        </div>
        <Link href={`/${locale}#scan`} className="btn-accent">
          {t.shared.cta}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <ReportView report={report} />
    </section>
  );
}
