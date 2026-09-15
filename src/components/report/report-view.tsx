'use client';

import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  CircleCheck,
  CircleX,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Info,
  Layers,
  Link2,
  Lock,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { LOCALE_TAGS } from '@/i18n/config';
import type { AuditReport, CheckResult, CheckStatus } from '@/lib/audit/types';
import { cn } from '@/lib/cn';
import { useI18n } from '../providers';
import { ScoreRing } from './score-ring';

const STATUS_META: Record<CheckStatus, { Icon: typeof CircleCheck; tone: string }> = {
  pass: { Icon: CircleCheck, tone: 'text-pass bg-pass/10 border-pass/25' },
  warn: { Icon: TriangleAlert, tone: 'text-warn bg-warn/10 border-warn/25' },
  fail: { Icon: CircleX, tone: 'text-fail bg-fail/10 border-fail/25' },
  info: { Icon: Info, tone: 'text-info bg-info/10 border-info/25' },
};

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          // Clipboard can be blocked; the text stays selectable.
        }
      }}
      className="inline-flex items-center gap-1 rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted transition hover:text-fg"
    >
      {copied ? <Check className="h-3 w-3 text-pass" /> : <Copy className="h-3 w-3" />}
      {copied ? t.common.copied : t.common.copy}
    </button>
  );
}

function Expand({ open, children }: { open: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CheckCard({ check }: { check: CheckResult }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { Icon, tone } = STATUS_META[check.status];

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border', tone)} title={t.report.status[check.status]}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-medium text-fg">{check.title}</h4>
            {check.impact === 'critical' && check.status === 'fail' && (
              <span className="pill bg-fail/10 text-fail">{t.report.critical}</span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">{check.summary}</p>

          {check.evidence && check.evidence.length > 0 && (
            <ul className="mt-2.5 space-y-0.5 font-mono text-xs text-faint">
              {check.evidence.map((item, index) => (
                <li key={index} className="break-words">
                  {item}
                </li>
              ))}
            </ul>
          )}

          {check.fix && (
            <div className="mt-3">
              <button
                type="button"
                onClick={() => setOpen((value) => !value)}
                aria-expanded={open}
                className="inline-flex items-center gap-1 text-sm font-medium text-fg underline-offset-4 hover:underline"
              >
                {t.report.howToFix}
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
              </button>
              <Expand open={open}>
                <div className="relative mt-2">
                  <pre className="code-block whitespace-pre-wrap pr-20">{check.fix}</pre>
                  <div className="absolute right-2 top-2">
                    <CopyButton text={check.fix} />
                  </div>
                </div>
              </Expand>
            </div>
          )}

          {check.locked && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-1.5 text-xs text-muted">
              <Lock className="h-3.5 w-3.5" />
              {t.report.locked}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, hint, icon: Icon, children }: { title: string; hint?: string; icon?: typeof Bot; children: React.ReactNode }) {
  return (
    <section className="card p-6 sm:p-8">
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        {Icon && <Icon className="h-5 w-5 text-muted" />}
        {title}
      </h3>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function GeneratedFiles({ report }: { report: AuditReport }) {
  const { t } = useI18n();
  const files = [
    { id: 'robots', label: t.report.generatedRobots, name: 'robots.txt', content: report.generated?.robotsTxt ?? null },
    { id: 'llms', label: t.report.generatedLlms, name: 'llms.txt', content: report.generated?.llmsTxt ?? null },
    { id: 'jsonld', label: t.report.generatedJsonLd, name: 'schema.jsonld', content: report.generated?.jsonLd ?? null },
  ];
  const [active, setActive] = useState(files[0]!.id);
  const file = files.find((item) => item.id === active) ?? files[0]!;
  const locked = report.plan === 'free' && file.id !== 'robots';

  const download = () => {
    if (!file.content) return;
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([file.content], { type: 'text/plain;charset=utf-8' }));
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <Section title={t.report.generatedTitle} hint={t.report.generatedHint} icon={FileText}>
      <div role="tablist" className="flex flex-wrap gap-1.5">
        {files.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={item.id === active}
            onClick={() => setActive(item.id)}
            className={cn(
              'rounded-lg border px-3 py-1.5 font-mono text-xs transition',
              item.id === active ? 'border-fg/70 bg-fg text-bg' : 'border-line text-muted hover:text-fg',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-3">
        {file.content ? (
          <div className="relative">
            <pre className="code-block max-h-96 whitespace-pre-wrap pr-28">{file.content}</pre>
            <div className="absolute right-2 top-2 flex gap-1.5">
              <CopyButton text={file.content} />
              <button
                type="button"
                onClick={download}
                aria-label={`${t.common.download} ${file.name}`}
                className="inline-flex items-center rounded-md border border-line bg-surface px-2 py-1 text-xs text-muted transition hover:text-fg"
              >
                <Download className="h-3 w-3" />
              </button>
            </div>
          </div>
        ) : (
          <p className="inline-flex items-center gap-2 rounded-lg border border-dashed border-line-strong px-3 py-2 text-sm text-muted">
            {locked ? <Lock className="h-3.5 w-3.5" /> : <Info className="h-3.5 w-3.5" />}
            {locked ? t.report.generatedLocked : t.report.generatedNone}
          </p>
        )}
      </div>
    </Section>
  );
}

export function ReportView({ report, shareable = true }: { report: AuditReport; shareable?: boolean }) {
  const { locale, t } = useI18n();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const checkTitles = useMemo(() => {
    const titles = new Map<string, string>();
    for (const category of report.categories) for (const check of category.checks) titles.set(check.id, check.title);
    return titles;
  }, [report.categories]);

  const selectedCrawlers = report.crawlers.filter((crawler) => crawler.selected !== false);
  const blocked = selectedCrawlers.filter((crawler) => !crawler.allowed && crawler.purpose !== 'training');
  const scannedAt = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(report.scannedAt),
  );
  const pages = report.pages ?? [];
  const topics = report.topics ?? [];
  const topWeight = Math.max(1, ...topics.map((topic) => topic.weight));
  const profile = report.profile;

  const copyShareLink = async () => {
    if (!report.id) return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${locale}/r/${report.id}`);
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      // Ignore blocked clipboard.
    }
  };

  const downloadJson = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    link.download = `citable-${new URL(report.finalUrl).hostname}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      {/* Headline */}
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-6 sm:p-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <ScoreRing score={report.score} grade={report.grade} label={t.report.scoreLabel} />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{t.report.scoreLabel}</p>
            <h2 className="mt-2 break-words text-xl font-semibold sm:text-2xl">{report.finalUrl}</h2>
            <p className="mt-3 leading-relaxed text-muted">{report.verdict}</p>

            <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {report.categories.map((category, index) => (
                <div key={category.id} className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-muted">{category.label}</span>
                    <span className="text-sm font-semibold tabular-nums">{category.score}</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                    <motion.div
                      className={cn(
                        'h-full rounded-full',
                        category.score >= 75 ? 'bg-pass' : category.score >= 50 ? 'bg-warn' : 'bg-fail',
                      )}
                      initial={{ width: 0 }}
                      animate={{ width: `${category.score}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + index * 0.05, ease: [0.2, 0.8, 0.2, 1] }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {shareable && report.id && (
                <button type="button" onClick={copyShareLink} className="btn-ghost !py-2">
                  {shared ? <Check className="h-4 w-4 text-pass" /> : <Link2 className="h-4 w-4" />}
                  {shared ? t.report.shareCopied : t.report.share}
                </button>
              )}
              {!report.truncated && (
                <button type="button" onClick={downloadJson} className="btn-ghost !py-2">
                  <Download className="h-4 w-4" />
                  {t.report.exportJson}
                </button>
              )}
              <span className="text-xs text-faint">{t.report.meta(scannedAt, report.durationMs)}</span>
            </div>
          </div>
        </div>

        {report.warnings.length > 0 && (
          <div className="mt-6 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm">
            <p className="font-medium text-warn">{t.report.warnings}</p>
            <ul className="mt-1 space-y-0.5 text-muted">
              {report.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="mt-6 border-t border-line pt-4 text-xs leading-relaxed text-faint">{t.report.disclaimer}</p>
      </motion.section>

      {/* Site profile and topics */}
      {profile && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Section title={t.report.profileTitle} icon={Layers}>
            <p className="text-2xl font-semibold">{profile.label ?? t.siteTypes[profile.type]}</p>
            {profile.overridden ? (
              <p className="mt-2 text-sm text-muted">
                {t.report.profileOverridden(profile.detectedLabel ?? t.siteTypes[profile.detected])}
              </p>
            ) : (profile.signalLabels ?? profile.signals).length > 0 ? (
              <div className="mt-3">
                <p className="text-xs text-faint">{t.report.profileSignals}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(profile.signalLabels ?? profile.signals).map((signal) => (
                    <span key={signal} className="pill border border-line text-muted">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">{t.report.profileNoSignals}</p>
            )}
            {report.cdn && <p className="mt-3 text-sm text-muted">{t.report.cdn(report.cdn)}</p>}
            <p className="mt-4 text-xs text-faint">{t.report.profileHint}</p>
          </Section>

          {topics.length > 0 && (
            <Section title={t.report.topicsTitle} hint={t.report.topicsHint}>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
                {topics.map((topic) => (
                  <span
                    key={topic.term}
                    className="text-fg"
                    style={{ fontSize: `${0.8 + (topic.weight / topWeight) * 0.7}rem`, opacity: 0.55 + (topic.weight / topWeight) * 0.45 }}
                  >
                    {topic.term}
                  </span>
                ))}
              </div>
            </Section>
          )}
        </div>
      )}

      {/* Crawler matrix */}
      <Section title={t.report.crawlersTitle} icon={Bot}>
        <p className={cn('-mt-3 mb-5 text-sm', blocked.length ? 'text-fail' : 'text-muted')}>
          {blocked.length ? t.report.crawlersBlocked(blocked.length) : t.report.crawlersAllOk}
        </p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.crawlers.map((crawler) => {
            const selected = crawler.selected !== false;
            return (
              <div
                key={crawler.id}
                title={crawler.rule ? `${t.report.rule}: ${crawler.rule}` : t.report.noRule}
                className={cn(
                  'rounded-xl border px-3 py-2.5',
                  !selected ? 'border-line opacity-55' : crawler.allowed ? 'border-line bg-surface-2' : 'border-fail/40 bg-fail/5',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-xs text-fg">{crawler.name}</span>
                  {crawler.allowed ? <Check className="h-4 w-4 shrink-0 text-pass" /> : <X className="h-4 w-4 shrink-0 text-fail" />}
                </div>
                <p className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-faint">
                  <span className="truncate">
                    {crawler.vendor}
                    {!selected && ` · ${t.report.notSelected}`}
                  </span>
                  {crawler.docs && (
                    <a
                      href={crawler.docs}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${t.report.docs}: ${crawler.name}`}
                      className="shrink-0 hover:text-fg"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Priority fixes */}
      {report.priorityFixes.length > 0 && (
        <Section title={t.report.fixFirst} hint={t.report.fixFirstHint}>
          <div className="space-y-3">
            {report.priorityFixes.slice(0, 8).map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </div>
        </Section>
      )}

      {/* Paywall */}
      {report.truncated && (
        <section className="rounded-2xl border border-line-strong bg-surface-2 p-6 sm:p-8">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Lock className="h-5 w-5 text-muted" />
            {t.report.paywallTitle(report.lockedCount)}
          </h3>
          <p className="mt-2 max-w-2xl leading-relaxed text-muted">{t.report.paywallBody}</p>
          <Link href={`/${locale}/pricing`} className="btn-primary mt-5">
            {t.report.paywallCta}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      )}

      {/* Sampled pages */}
      {pages.length > 0 && (
        <Section title={t.report.pagesTitle(pages.length)} hint={t.report.pagesHint}>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-surface-2 text-xs text-faint">
                <tr>
                  <th className="px-3 py-2 font-medium">{t.report.pagesColumns.page}</th>
                  <th className="px-3 py-2 font-medium">{t.report.pagesColumns.status}</th>
                  <th className="px-3 py-2 font-medium">{t.report.pagesColumns.score}</th>
                  <th className="px-3 py-2 font-medium">{t.report.pagesColumns.words}</th>
                  <th className="px-3 py-2 font-medium">{t.report.pagesColumns.issues}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pages.map((page) => {
                  const path = (() => {
                    try {
                      const parsed = new URL(page.url);
                      return `${parsed.pathname}${parsed.search}`;
                    } catch {
                      return page.url;
                    }
                  })();
                  return (
                    <tr key={page.url} className="align-top">
                      <td className="max-w-[16rem] px-3 py-2.5">
                        <a href={page.url} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-xs hover:underline">
                          {path}
                        </a>
                        {page.title && <p className="mt-0.5 truncate text-xs text-faint">{page.title}</p>}
                      </td>
                      <td className={cn('px-3 py-2.5 font-mono text-xs', page.status === 200 ? 'text-muted' : 'text-fail')}>
                        {page.status || '—'}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums">{page.score}</td>
                      <td className="px-3 py-2.5 tabular-nums text-muted">{page.wordCount}</td>
                      <td className="px-3 py-2.5 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {page.noindex && <span className="pill bg-fail/10 text-fail">{t.report.pagesNoindex}</span>}
                          {page.blockedFor.length > 0 && (
                            <span className="pill bg-fail/10 text-fail">{t.report.pagesBlocked(page.blockedFor.join(', '))}</span>
                          )}
                          {page.inSitemap === false && <span className="pill bg-warn/10 text-warn">{t.report.pagesNotInSitemap}</span>}
                          {page.issues.map((id) => (
                            <span key={id} className="pill border border-line text-muted">
                              {checkTitles.get(id) ?? id}
                            </span>
                          ))}
                          {page.issues.length === 0 && !page.noindex && page.blockedFor.length === 0 && (
                            <span className="text-pass">{t.report.pagesNoIssues}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {report.generated && <GeneratedFiles report={report} />}

      {/* Full breakdown */}
      <Section title={t.report.breakdown}>
        <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {report.categories.map((category) => {
            const isOpen = openCategory === category.id;
            const failing = category.checks.filter((check) => check.status === 'fail').length;
            return (
              <div key={category.id}>
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : category.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 bg-surface px-4 py-3.5 text-left transition hover:bg-surface-2"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="font-medium">{category.label}</span>
                    {failing > 0 && <span className="pill bg-fail/10 text-fail">{t.report.failing(failing)}</span>}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-sm tabular-nums text-muted">{category.score}/100</span>
                    <ChevronDown className={cn('h-4 w-4 text-faint transition-transform', isOpen && 'rotate-180')} />
                  </span>
                </button>
                <Expand open={isOpen}>
                  <div className="space-y-3 bg-subtle p-4">
                    {category.checks.map((check) => (
                      <CheckCard key={check.id} check={check} />
                    ))}
                  </div>
                </Expand>
              </div>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
