import { ArrowRight, BadgeCheck, Bot, Braces, Code2, FileCode2, Gauge, MessageSquareQuote } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrawlerGlobe } from '@/components/landing/crawler-globe';
import { Faq } from '@/components/landing/faq';
import { Pricing } from '@/components/landing/pricing';
import { ScanProvider } from '@/components/report/scan-context';
import { ScanResults } from '@/components/report/scan-results';
import { ScannerForm } from '@/components/report/scanner-form';
import { Reveal } from '@/components/ui/motion';
import { getAuditMessages } from '@/i18n/audit';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { freeDailyLimit } from '@/lib/access';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { SITE_PAGE_LIMITS } from '@/lib/audit/limits';
import { CHECK_COUNT } from '@/lib/audit/registry';
import { CATEGORIES, type CategoryId } from '@/lib/audit/types';

const CATEGORY_ICONS: Record<CategoryId, typeof Bot> = {
  'crawler-access': Bot,
  'machine-readability': FileCode2,
  'structured-data': Braces,
  answerability: MessageSquareQuote,
  identity: BadgeCheck,
  technical: Gauge,
};

const PURPOSE_DOT = {
  retrieval: 'bg-pass',
  indexing: 'bg-info',
  training: 'bg-faint',
} as const;

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="max-w-2xl">
      <p className="eyebrow">{eyebrow}</p>
      <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-pretty text-muted">{subtitle}</p>}
    </Reveal>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const audit = getAuditMessages(locale);
  const needsSpace = /^[\p{L}\p{N}]/u.test(t.hero.titleTail);

  const stats = [
    { value: CHECK_COUNT, label: t.stats.checks },
    { value: AI_CRAWLERS.length, label: t.stats.agents },
    { value: CATEGORIES.length, label: t.stats.categories },
    { value: SITE_PAGE_LIMITS.agency, label: t.stats.pages },
  ];

  return (
    <>
      <ScanProvider>
        <section className="relative border-b border-line">
          <div className="bg-grid pointer-events-none absolute inset-0 -z-10" />
          <div className="container-page grid items-center gap-10 pb-14 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-8">
            <div>
              <p className="animate-fade-up font-mono text-xs text-muted">{t.hero.badge(CHECK_COUNT, AI_CRAWLERS.length)}</p>
              <h1 className="mt-4 animate-fade-up text-balance text-4xl font-semibold leading-[1.05] tracking-tight [animation-delay:60ms] sm:text-6xl">
                {t.hero.titleLead} <span className="underline decoration-accent decoration-4 underline-offset-[0.18em]">{t.hero.titleAccent}</span>
                {needsSpace ? ' ' : ''}
                {t.hero.titleTail}
              </h1>
              <p className="mt-5 max-w-xl animate-fade-up text-pretty text-lg leading-relaxed text-muted [animation-delay:120ms]">
                {t.hero.subtitle}
              </p>
              <div className="mt-8 max-w-xl animate-fade-up [animation-delay:180ms]">
                <ScannerForm />
              </div>
              <p className="mt-5 animate-fade-up text-sm text-faint [animation-delay:240ms]">{t.hero.trust(freeDailyLimit())}</p>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[520px] animate-fade-up [animation-delay:150ms]">
              <CrawlerGlobe label={t.hero.globeLabel} />
            </div>
          </div>
        </section>

        <ScanResults />
      </ScanProvider>

      {/* Facts taken from the code, not marketing numbers. */}
      <section className="container-page pt-16">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-surface px-6 py-7">
              <dt className="text-sm text-muted">{stat.label}</dt>
              <dd className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="features" className="container-page scroll-mt-24 py-16">
        <SectionHeading eyebrow={t.problem.eyebrow} title={t.problem.title} />
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.problem.items.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.06}>
              <div className="card h-full p-6">
                <p className="font-mono text-xs text-faint">0{index + 1}</p>
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 leading-relaxed text-muted">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-page py-16">
        <SectionHeading eyebrow={t.steps.eyebrow} title={t.steps.title} />
        <ol className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-line bg-line md:grid-cols-3">
          {t.steps.items.map((step, index) => (
            <li key={step.title} className="bg-surface p-6">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-fg font-mono text-xs text-bg">{index + 1}</span>
              <h3 className="mt-4 font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="container-page py-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow={t.categories.eyebrow} title={t.categories.title} subtitle={t.categories.subtitle} />
          <Link href={`/${locale}/methodology`} className="btn-ghost">
            {t.categories.methodologyLink}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.id];
            const copy = audit.categories[category.id];
            return (
              <Reveal key={category.id} delay={index * 0.04}>
                <div className="card h-full p-6">
                  <div className="flex items-start justify-between gap-4">
                    <Icon className="h-5 w-5 text-muted" />
                    <span className="font-mono text-sm text-faint">
                      {category.weight} {t.report.points}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold">{copy.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{copy.description}</p>
                </div>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-4">
          <div className="card p-6 sm:p-8">
            <h3 className="flex items-center gap-2 font-semibold">
              <Code2 className="h-4 w-4 text-muted" />
              {t.agents.title}
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{t.agents.body}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {AI_CRAWLERS.map((crawler) => (
                <li key={crawler.id}>
                  <a
                    href={crawler.docs}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={audit.crawlerNotes[crawler.id as keyof typeof audit.crawlerNotes]}
                    className="pill border border-line bg-surface-2 font-mono text-muted transition hover:border-line-strong hover:text-fg"
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${PURPOSE_DOT[crawler.purpose]}`} />
                    {crawler.name}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-faint">
              {(['retrieval', 'indexing', 'training'] as const).map((purpose) => (
                <span key={purpose} className="inline-flex items-center gap-1.5">
                  <span className={`h-2 w-2 rounded-full ${PURPOSE_DOT[purpose]}`} />
                  {audit.purposes[purpose]}
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      <section id="pricing" className="container-page scroll-mt-24 py-16">
        <SectionHeading eyebrow={t.pricing.eyebrow} title={t.pricing.title} subtitle={t.pricing.subtitle} />
        <div className="mt-10">
          <Pricing />
        </div>
      </section>

      <section className="container-page py-16">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
          <Reveal>
            <Faq />
          </Reveal>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'FAQPage',
              mainEntity: t.faq.items.map((item) => ({
                '@type': 'Question',
                name: item.q,
                acceptedAnswer: { '@type': 'Answer', text: item.a },
              })),
            }),
          }}
        />
      </section>

      <section className="container-page pt-4">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl border border-line bg-surface p-8 sm:flex-row sm:items-center sm:p-10">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.cta.title}</h2>
            <p className="mt-2 text-muted">{t.cta.subtitle}</p>
          </div>
          <Link href={`/${locale}#scan`} className="btn-primary">
            {t.cta.button}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
