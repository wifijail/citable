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
  Info,
  Link2,
  Lock,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useState } from 'react';
import { LOCALE_TAGS } from '@/i18n/config';
import type { AuditReport, CheckResult, CheckStatus } from '@/lib/audit/types';
import { cn } from '@/lib/cn';
import { useI18n } from '../providers';
import { LeadForm } from './lead-form';
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

function CheckCard({ check }: { check: CheckResult }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { Icon, tone } = STATUS_META[check.status];

  return (
    <div className="rounded-xl border border-line bg-surface p-4 transition hover:border-line-strong">
      <div className="flex items-start gap-3">
        <span className={cn('mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border', tone)}>
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
                className="inline-flex items-center gap-1 text-sm font-medium text-accent"
              >
                {t.report.howToFix}
                <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative mt-2">
                      <pre className="code-block whitespace-pre-wrap pr-20">{check.fix}</pre>
                      <div className="absolute right-2 top-2">
                        <CopyButton text={check.fix} />
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
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

export function ReportView({ report, shareable = true }: { report: AuditReport; shareable?: boolean }) {
  const { locale, t } = useI18n();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [shared, setShared] = useState(false);

  const blocked = report.crawlers.filter((crawler) => !crawler.allowed && crawler.purpose !== 'training');
  const scannedAt = new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(report.scannedAt),
  );

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
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `citable-${new URL(report.finalUrl).hostname}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-5">
      {/* Headline */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="card relative overflow-hidden p-6 sm:p-8"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/15 blur-3xl" />
        <div className="relative flex flex-col gap-8 md:flex-row md:items-center">
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
                      className="h-full rounded-full bg-gradient-to-r from-accent to-mint"
                      initial={{ width: 0 }}
                      animate={{ width: `${category.score}%` }}
                      transition={{ duration: 0.9, delay: 0.15 + index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
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
          <div className="relative mt-6 rounded-xl border border-warn/30 bg-warn/5 px-4 py-3 text-sm">
            <p className="font-medium text-warn">{t.report.warnings}</p>
            <ul className="mt-1 space-y-0.5 text-muted">
              {report.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </div>
        )}
      </motion.section>

      {/* Crawler matrix */}
      <section className="card p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Bot className="h-5 w-5 text-accent" />
              {t.report.crawlersTitle}
            </h3>
            <p className={cn('mt-1 text-sm', blocked.length ? 'text-fail' : 'text-muted')}>
              {blocked.length ? t.report.crawlersBlocked(blocked.length) : t.report.crawlersAllOk}
            </p>
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.crawlers.map((crawler, index) => (
            <motion.div
              key={crawler.id}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.025 }}
              title={crawler.rule ? `${t.report.rule}: ${crawler.rule}` : t.report.noRule}
              className={cn(
                'rounded-xl border px-3 py-2.5',
                crawler.allowed ? 'border-line bg-surface-2' : 'border-fail/40 bg-fail/5',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-fg">{crawler.name}</span>
                {crawler.allowed ? (
                  <Check className="h-4 w-4 shrink-0 text-pass" />
                ) : (
                  <X className="h-4 w-4 shrink-0 text-fail" />
                )}
              </div>
              <p className="mt-0.5 truncate text-[11px] text-faint">{crawler.vendor}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Priority fixes */}
      {report.priorityFixes.length > 0 && (
        <section className="card p-6 sm:p-8">
          <h3 className="text-lg font-semibold">{t.report.fixFirst}</h3>
          <p className="mt-1 text-sm text-muted">{t.report.fixFirstHint}</p>
          <div className="mt-5 space-y-3">
            {report.priorityFixes.slice(0, 8).map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </div>
        </section>
      )}

      {/* Paywall */}
      {report.truncated && (
        <section className="beam-border relative overflow-hidden rounded-2xl border border-accent/30 bg-surface p-6 shadow-glow sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-mint/10" />
          <div className="relative">
            <h3 className="flex items-center gap-2 text-xl font-semibold">
              <Lock className="h-5 w-5 text-accent" />
              {t.report.paywallTitle(report.lockedCount)}
            </h3>
            <p className="mt-2 max-w-2xl leading-relaxed text-muted">{t.report.paywallBody}</p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={`/${locale}/pricing`} className="btn-accent">
                {t.report.paywallCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={`/${locale}/pricing`} className="btn-ghost">
                {t.report.paywallCompare}
              </Link>
            </div>
            <div className="mt-6 max-w-xl border-t border-line pt-5">
              <LeadForm url={report.finalUrl} score={report.score} label={t.report.emailPrompt} />
            </div>
          </div>
        </section>
      )}

      {/* Full breakdown */}
      <section className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold">{t.report.breakdown}</h3>
        <div className="mt-5 divide-y divide-line overflow-hidden rounded-xl border border-line">
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
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-subtle"
                    >
                      <div className="space-y-3 p-4">
                        {category.checks.map((check) => (
                          <CheckCard key={check.id} check={check} />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
