import { ExternalLink } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getAuditMessages } from '@/i18n/audit';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { USER_AGENT } from '@/lib/audit/fetcher';
import { CHECKS, CHECK_COUNT } from '@/lib/audit/registry';
import { CATEGORIES } from '@/lib/audit/types';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return { title: t.methodology.title, description: t.methodology.subtitle, alternates: { canonical: `/${locale}/methodology` } };
}

/** Rendered from the check registry, so the public description cannot drift from the code. */
export default async function MethodologyPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const m = t.methodology;
  const audit = getAuditMessages(locale);

  const prose = [
    { title: m.fetchTitle, body: m.fetchBody(USER_AGENT) },
    { title: m.siteModeTitle, body: m.siteModeBody },
    { title: m.profileTitle, body: m.profileBody },
    { title: m.scoringTitle, body: m.scoringBody },
  ];

  return (
    <div className="container-page max-w-4xl py-16 sm:py-24">
      <p className="eyebrow">{m.eyebrow}</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">{m.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted">{m.subtitle}</p>

      <div className="mt-12 grid gap-8 sm:grid-cols-2">
        {prose.map((item) => (
          <section key={item.title}>
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
          </section>
        ))}
      </div>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">{m.checksTitle(CHECK_COUNT)}</h2>
        <div className="mt-6 space-y-8">
          {CATEGORIES.map((category) => {
            const checks = CHECKS.filter((check) => check.category === category.id);
            return (
              <div key={category.id}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
                  <h3 className="font-semibold">{audit.categories[category.id].label}</h3>
                  <span className="font-mono text-sm text-faint">
                    {category.weight} {t.report.points}
                  </span>
                </div>
                <ul className="divide-y divide-line">
                  {checks.map((check) => {
                    const copy = audit.checks[check.key] as { title: string; what: string };
                    return (
                      <li key={check.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_auto] sm:gap-4">
                        <div>
                          <p className="text-sm font-medium">{copy.title}</p>
                          <p className="mt-0.5 text-sm leading-relaxed text-muted">{copy.what}</p>
                        </div>
                        <p className="font-mono text-xs text-faint sm:text-right">
                          {check.id}
                          <br />
                          {m.scope[check.scope]}
                          {check.profile && ` · ${m.onlyFor(t.siteTypes[check.profile])}`}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-semibold tracking-tight">{t.agents.title}</h2>
        <div className="mt-4 overflow-x-auto rounded-xl border border-line">
          <table className="w-full min-w-[520px] text-left text-sm">
            <tbody className="divide-y divide-line">
              {AI_CRAWLERS.map((crawler) => (
                <tr key={crawler.id}>
                  <td className="px-4 py-2.5 font-mono text-xs">{crawler.name}</td>
                  <td className="px-4 py-2.5 text-muted">{crawler.vendor}</td>
                  <td className="px-4 py-2.5 text-muted">{audit.purposes[crawler.purpose]}</td>
                  <td className="px-4 py-2.5 text-right">
                    <a href={crawler.docs} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
                      {t.report.docs}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-14 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="font-semibold">{m.limitsTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
            {m.limits.map((limit) => (
              <li key={limit}>— {limit}</li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="font-semibold">{m.sourcesTitle}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {m.sources.map((source) => (
              <li key={source.href}>
                <a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted hover:text-fg">
                  {source.label}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
