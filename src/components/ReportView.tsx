'use client';

import { useState } from 'react';
import type { AuditReport, CheckResult, CheckStatus } from '@/lib/audit/types';
import { LeadForm } from './LeadForm';
import { ScoreRing } from './ScoreRing';

const STATUS_STYLES: Record<CheckStatus, { pill: string; label: string; icon: string }> = {
  pass: { pill: 'bg-emerald-500/10 text-emerald-300', label: 'Pass', icon: '✓' },
  warn: { pill: 'bg-amber-500/10 text-amber-300', label: 'Needs work', icon: '!' },
  fail: { pill: 'bg-red-500/10 text-red-300', label: 'Failing', icon: '✕' },
  info: { pill: 'bg-sky-500/10 text-sky-300', label: 'Heads up', icon: 'i' },
};

const PURPOSE_LABEL: Record<string, string> = {
  retrieval: 'Answers live questions',
  indexing: 'Builds the answer index',
  training: 'Collects training data',
};

function CheckCard({ check }: { check: CheckResult }) {
  const style = STATUS_STYLES[check.status];
  return (
    <div className="rounded-xl border border-ink-700 bg-ink-950/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`pill ${style.pill}`}>
          <span aria-hidden>{style.icon}</span>
          {style.label}
        </span>
        <h4 className="font-medium text-slate-100">{check.title}</h4>
        {check.impact === 'critical' && check.status === 'fail' && (
          <span className="pill bg-red-500/15 text-red-300">Critical</span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-400">{check.summary}</p>

      {check.evidence && check.evidence.length > 0 && (
        <ul className="mt-3 space-y-1 font-mono text-xs text-slate-500">
          {check.evidence.map((item, index) => (
            <li key={index} className="break-words">
              {item}
            </li>
          ))}
        </ul>
      )}

      {check.fix && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-sm font-medium text-brand-400 hover:text-brand-200">
            How to fix it
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">{check.fix}</pre>
        </details>
      )}

      {check.locked && (
        <p className="mt-3 rounded-lg border border-dashed border-ink-600 px-3 py-2 text-sm text-slate-500">
          🔒 Fix instructions and evidence are part of Pro.
        </p>
      )}
    </div>
  );
}

export function ReportView({ report }: { report: AuditReport }) {
  const [openCategory, setOpenCategory] = useState<string | null>(
    report.categories[0]?.id ?? null,
  );

  const blockedRetrieval = report.crawlers.filter(
    (crawler) => !crawler.allowed && crawler.purpose !== 'training',
  );

  return (
    <div className="animate-fade-up space-y-6">
      {/* Headline verdict */}
      <section className="card p-6 sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <ScoreRing score={report.score} grade={report.grade} />
          <div className="min-w-0 flex-1">
            <p className="text-xs uppercase tracking-widest text-slate-500">
              AI Visibility Score
            </p>
            <h2 className="mt-1 break-words text-xl font-semibold text-white">
              {report.finalUrl}
            </h2>
            <p className="mt-3 text-slate-300">{report.verdict}</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {report.categories.slice(0, 6).map((category) => (
                <div key={category.id} className="rounded-lg bg-ink-800/60 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs text-slate-400">{category.label}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-100">
                      {category.score}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1 rounded bg-ink-600">
                    <div
                      className="h-1 rounded bg-brand-500"
                      style={{ width: `${category.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {report.warnings.length > 0 && (
          <ul className="mt-5 space-y-1 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
            {report.warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
      </section>

      {/* Crawler matrix — the screenshot people share */}
      <section className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Who is allowed to read this page</h3>
        <p className="mt-1 text-sm text-slate-400">
          {blockedRetrieval.length === 0
            ? 'Every answer engine can reach this URL.'
            : `${blockedRetrieval.length} answer engine${blockedRetrieval.length > 1 ? 's are' : ' is'} blocked from this URL by robots.txt.`}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {report.crawlers.map((crawler) => (
            <div
              key={crawler.id}
              className={`rounded-lg border px-3 py-2.5 ${
                crawler.allowed
                  ? 'border-ink-700 bg-ink-950/40'
                  : 'border-red-500/40 bg-red-500/5'
              }`}
              title={crawler.rule ? `Rule: ${crawler.rule}` : 'No matching rule'}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-mono text-xs text-slate-200">{crawler.name}</span>
                <span className={crawler.allowed ? 'text-emerald-400' : 'text-red-400'}>
                  {crawler.allowed ? '✓' : '✕'}
                </span>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-slate-500">
                {crawler.vendor} · {PURPOSE_LABEL[crawler.purpose] ?? crawler.purpose}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Priority fixes */}
      {report.priorityFixes.length > 0 && (
        <section className="card p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">Fix these first</h3>
          <p className="mt-1 text-sm text-slate-400">
            Ordered by how much each one costs you in citations.
          </p>
          <div className="mt-4 space-y-3">
            {report.priorityFixes.slice(0, 8).map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </div>
        </section>
      )}

      {/* Paywall */}
      {report.truncated && (
        <section className="card border-brand-500/40 bg-brand-500/5 p-6 sm:p-8">
          <h3 className="text-lg font-semibold text-white">
            {report.lockedCount} more fixes are waiting
          </h3>
          <p className="mt-2 max-w-2xl text-slate-300">
            You are seeing the three highest-impact fixes. Pro unlocks every remaining
            recommendation with copy-paste snippets, the full evidence trail, unlimited scans and
            API access for your CI pipeline.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <a href="#pricing" className="btn-primary">
              Unlock everything — $19/mo
            </a>
            <a href="#how-it-works" className="btn-ghost">
              How scoring works
            </a>
          </div>
          <div className="mt-6 border-t border-ink-700 pt-5">
            <LeadForm
              url={report.finalUrl}
              score={report.score}
              label="Or get the full report by email, plus a weekly re-scan:"
            />
          </div>
        </section>
      )}

      {/* Full breakdown */}
      <section className="card p-6 sm:p-8">
        <h3 className="text-lg font-semibold text-white">Full breakdown</h3>
        <div className="mt-4 space-y-3">
          {report.categories.map((category) => {
            const isOpen = openCategory === category.id;
            const failing = category.checks.filter((check) => check.status === 'fail').length;
            return (
              <div key={category.id} className="rounded-xl border border-ink-700">
                <button
                  type="button"
                  onClick={() => setOpenCategory(isOpen ? null : category.id)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="font-medium text-slate-100">{category.label}</span>
                    {failing > 0 && (
                      <span className="pill bg-red-500/10 text-red-300">{failing} failing</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-sm tabular-nums text-slate-400">
                      {category.score}/100
                    </span>
                    <span className="text-slate-500">{isOpen ? '−' : '+'}</span>
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-ink-700 p-4">
                    {category.checks.map((check) => (
                      <CheckCard key={check.id} check={check} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <p className="text-center text-xs text-slate-600">
        Scanned {new Date(report.scannedAt).toLocaleString()} in {report.durationMs} ms ·
        plan: {report.plan}
      </p>
    </div>
  );
}
