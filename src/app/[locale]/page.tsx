import {
  ArrowRight,
  BadgeCheck,
  Bot,
  Braces,
  EyeOff,
  FileCode2,
  Gauge,
  Link2,
  MessageSquareQuote,
  Quote,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  WandSparkles,
} from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CrawlerGlobe } from '@/components/landing/crawler-globe';
import { Faq } from '@/components/landing/faq';
import { Pricing } from '@/components/landing/pricing';
import { ScanProvider } from '@/components/report/scan-context';
import { ScanResults } from '@/components/report/scan-results';
import { ScannerForm } from '@/components/report/scanner-form';
import { AnimatedNumber, LogoCube, Marquee, Reveal, SpotlightCard } from '@/components/ui/motion';
import { getAuditMessages } from '@/i18n/audit';
import { isLocale } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { CATEGORIES, type CategoryId } from '@/lib/audit/types';

const CATEGORY_ICONS: Record<CategoryId, typeof Bot> = {
  'crawler-access': Bot,
  'machine-readability': FileCode2,
  'structured-data': Braces,
  answerability: MessageSquareQuote,
  identity: BadgeCheck,
  technical: Gauge,
};

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <Reveal className="mx-auto max-w-2xl text-center">
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

  return (
    <>
      <ScanProvider>
        {/* ------------------------------------------------------------ hero */}
        <section className="relative">
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="bg-grid absolute inset-0" />
            <div className="absolute -left-40 top-10 h-[28rem] w-[28rem] animate-aurora rounded-full bg-accent/20 blur-[110px]" />
            <div className="absolute -right-32 top-40 h-[24rem] w-[24rem] animate-aurora rounded-full bg-mint/15 blur-[110px] [animation-delay:-8s]" />
          </div>

          <div className="container-page grid items-center gap-10 pb-10 pt-12 sm:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-6">
            <div>
              <div className="animate-fade-up">
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs text-muted backdrop-blur">
                  <Sparkles className="h-3.5 w-3.5 text-accent" />
                  {t.hero.badge}
                </span>
              </div>
              <div className="animate-fade-up [animation-delay:60ms]">
                <h1 className="mt-5 text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
                  {t.hero.titleLead} <span className="text-gradient">{t.hero.titleAccent}</span>
                  {needsSpace ? ' ' : ''}
                  {t.hero.titleTail}
                </h1>
              </div>
              <div className="animate-fade-up [animation-delay:120ms]">
                <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted">{t.hero.subtitle}</p>
              </div>
              <div className="mt-8 max-w-xl animate-fade-up [animation-delay:180ms]">
                <ScannerForm />
              </div>
              <div className="animate-fade-up [animation-delay:240ms]">
                <p className="mt-5 flex items-center gap-2 text-sm text-faint">
                  <ShieldCheck className="h-4 w-4 text-pass" />
                  {t.hero.trust}
                </p>
              </div>
            </div>

            <div className="relative mx-auto aspect-square w-full max-w-[560px] animate-fade-up [animation-delay:150ms]">
              <CrawlerGlobe label={t.hero.globeLabel} />
              <div className="pointer-events-none absolute bottom-[12%] left-0 hidden animate-float rounded-xl border border-line bg-surface/85 px-3 py-2 shadow-card backdrop-blur sm:block">
                <p className="font-mono text-[11px] text-faint">robots.txt</p>
                <p className="text-sm">
                  ChatGPT-User <span className="text-pass">✓ allow</span>
                </p>
              </div>
              <div className="pointer-events-none absolute right-0 top-[14%] hidden animate-float rounded-xl border border-line bg-surface/85 px-3 py-2 shadow-card backdrop-blur [animation-delay:-3s] sm:block">
                <p className="font-mono text-[11px] text-faint">AI Visibility</p>
                <p className="text-sm font-semibold">
                  82 <span className="font-normal text-faint">/ 100</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        <ScanResults />
      </ScanProvider>

      {/* --------------------------------------------------------- marquee */}
      <section className="mt-16 border-y border-line bg-subtle/60 py-6">
        <p className="container-page mb-4 text-center font-mono text-xs uppercase tracking-[0.18em] text-faint">
          {t.marquee.label}
        </p>
        <Marquee>
          {AI_CRAWLERS.map((crawler) => (
            <span
              key={crawler.id}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm"
            >
              <span
                className={
                  crawler.purpose === 'retrieval'
                    ? 'h-1.5 w-1.5 rounded-full bg-mint'
                    : crawler.purpose === 'indexing'
                      ? 'h-1.5 w-1.5 rounded-full bg-accent'
                      : 'h-1.5 w-1.5 rounded-full bg-faint'
                }
              />
              <span className="font-mono">{crawler.name}</span>
              <span className="text-faint">{crawler.vendor}</span>
            </span>
          ))}
        </Marquee>
      </section>

      {/* ----------------------------------------------------------- stats */}
      <section className="container-page py-16">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {[
            { value: 31, label: t.stats.checks },
            { value: AI_CRAWLERS.length, label: t.stats.agents },
            { value: CATEGORIES.length, label: t.stats.categories },
            { value: 5, label: t.stats.seconds, prefix: '~' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface px-6 py-8 text-center">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {stat.prefix}
                <AnimatedNumber value={stat.value} />
              </p>
              <p className="mt-2 text-sm text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* --------------------------------------------------------- problem */}
      <section id="features" className="container-page scroll-mt-24 py-16">
        <SectionHeading eyebrow={t.problem.eyebrow} title={t.problem.title} />
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {t.problem.items.map((item, index) => {
            const Icon = [TrendingDown, EyeOff, Quote][index] ?? Quote;
            return (
              <Reveal key={item.title} delay={index * 0.08}>
                <SpotlightCard className="h-full p-6">
                  <span className="grid h-10 w-10 place-items-center rounded-xl border border-line bg-surface-2">
                    <Icon className="h-5 w-5 text-accent" />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{item.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{item.body}</p>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ----------------------------------------------------------- steps */}
      <section className="container-page py-16">
        <SectionHeading eyebrow={t.steps.eyebrow} title={t.steps.title} />
        <div className="relative mt-14 grid gap-8 md:grid-cols-3">
          <div className="absolute left-[16%] right-[16%] top-6 hidden h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent md:block" />
          {t.steps.items.map((step, index) => {
            const Icon = [Link2, ScanSearch, WandSparkles][index] ?? Link2;
            return (
              <Reveal key={step.title} delay={index * 0.1} className="relative text-center">
                <span className="relative mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-line bg-surface shadow-card">
                  <Icon className="h-5 w-5 text-accent" />
                  <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-fg font-mono text-[10px] text-bg">
                    {index + 1}
                  </span>
                </span>
                <h3 className="mt-5 text-lg font-semibold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs leading-relaxed text-muted">{step.body}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------ categories */}
      <section className="container-page py-16">
        <SectionHeading eyebrow={t.categories.eyebrow} title={t.categories.title} subtitle={t.categories.subtitle} />
        <div className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CATEGORIES.map((category, index) => {
            const Icon = CATEGORY_ICONS[category.id];
            const copy = audit.categories[category.id];
            return (
              <Reveal key={category.id} delay={index * 0.05}>
                <SpotlightCard className="h-full p-6">
                  <div className="flex items-start justify-between gap-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10">
                      <Icon className="h-5 w-5 text-accent" />
                    </span>
                    <span className="font-mono text-sm text-faint">
                      {category.weight} {t.report.points}
                    </span>
                  </div>
                  <h3 className="mt-5 font-semibold">{copy.label}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{copy.description}</p>
                  <div className="mt-5 h-1 overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accent to-mint"
                      style={{ width: `${(category.weight / 30) * 100}%` }}
                    />
                  </div>
                </SpotlightCard>
              </Reveal>
            );
          })}
        </div>

        <Reveal className="mt-4">
          <div className="card p-6 sm:p-8">
            <h3 className="font-semibold">{t.agents.title}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{t.agents.body}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {AI_CRAWLERS.map((crawler) => (
                <span
                  key={crawler.id}
                  title={audit.crawlerNotes[crawler.id as keyof typeof audit.crawlerNotes]}
                  className="pill border border-line bg-surface-2 font-mono text-muted"
                >
                  {crawler.name}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap gap-4 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-mint" />
                {audit.purposes.retrieval}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-accent" />
                {audit.purposes.indexing}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-faint" />
                {audit.purposes.training}
              </span>
            </div>
          </div>
        </Reveal>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section id="pricing" className="container-page scroll-mt-24 py-16">
        <SectionHeading eyebrow={t.pricing.eyebrow} title={t.pricing.title} subtitle={t.pricing.subtitle} />
        <div className="mt-12">
          <Pricing />
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="container-page py-16">
        <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} />
        <Reveal className="mx-auto mt-10 max-w-3xl">
          <Faq />
        </Reveal>
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

      {/* ------------------------------------------------------------- cta */}
      <section className="container-page pt-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-line bg-surface px-6 py-14 text-center shadow-card sm:px-12">
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
            <div className="pointer-events-none absolute left-1/2 top-0 h-64 w-[36rem] -translate-x-1/2 rounded-full bg-accent/20 blur-[100px]" />
            <div className="relative flex flex-col items-center">
              <LogoCube size={64} />
              <h2 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">{t.cta.title}</h2>
              <p className="mt-3 max-w-lg text-muted">{t.cta.subtitle}</p>
              <Link href={`/${locale}#scan`} className="btn-accent mt-7">
                {t.cta.button}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
