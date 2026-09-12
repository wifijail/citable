'use client';

import { useCallback, useRef, useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import { ReportView } from './ReportView';

const EXAMPLES = ['stripe.com', 'nytimes.com', 'vercel.com'];

const STAGES = [
  'Fetching the page as an AI crawler…',
  'Parsing robots.txt against 16 AI agents…',
  'Checking llms.txt and sitemap…',
  'Analysing structured data and answerability…',
  'Scoring…',
];

export function Scanner() {
  const [url, setUrl] = useState('');
  const [license, setLicense] = useState('');
  const [showLicense, setShowLicense] = useState(false);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState(0);
  const stageTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopStages = useCallback(() => {
    if (stageTimer.current) {
      clearInterval(stageTimer.current);
      stageTimer.current = null;
    }
  }, []);

  const scan = useCallback(
    async (target: string) => {
      if (!target.trim() || busy) return;

      setBusy(true);
      setError(null);
      setReport(null);
      setStage(0);

      stopStages();
      stageTimer.current = setInterval(() => {
        setStage((current) => Math.min(current + 1, STAGES.length - 1));
      }, 1100);

      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url: target, license: license || undefined }),
        });
        const data = (await response.json()) as AuditReport & { error?: string };

        if (!response.ok) {
          setError(data.error ?? 'The scan failed. Please try again.');
          return;
        }
        setReport(data);
      } catch {
        setError('Could not reach the scanner. Check your connection and try again.');
      } finally {
        stopStages();
        setBusy(false);
      }
    },
    [busy, license, stopStages],
  );

  return (
    <div id="scan" className="w-full">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void scan(url);
        }}
        className="card p-2 sm:p-2.5"
      >
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="yourdomain.com/your-best-page"
            className="input-field border-transparent bg-transparent sm:flex-1"
            aria-label="URL to scan"
            autoComplete="url"
            spellCheck={false}
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={busy}>
            {busy ? 'Scanning…' : 'Scan for free'}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
        <span>Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            className="underline decoration-dotted underline-offset-4 hover:text-brand-400"
            onClick={() => {
              setUrl(example);
              void scan(example);
            }}
          >
            {example}
          </button>
        ))}
        <button
          type="button"
          className="ml-auto text-xs hover:text-slate-300"
          onClick={() => setShowLicense((value) => !value)}
        >
          {showLicense ? 'Hide license key' : 'Have a license key?'}
        </button>
      </div>

      {showLicense && (
        <div className="mt-3">
          <input
            type="text"
            value={license}
            onChange={(event) => setLicense(event.target.value)}
            placeholder="CITE-PRO-XXXXXXXX-XXXXXXXX"
            className="input-field font-mono text-sm"
            aria-label="License key"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-slate-600">
            Stored only in this browser tab and sent with each scan request.
          </p>
        </div>
      )}

      {busy && (
        <div className="mt-6 card p-6">
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 animate-ping rounded-full bg-brand-500" />
            <span className="text-slate-300">{STAGES[stage]}</span>
          </div>
          <div className="mt-4 h-1 overflow-hidden rounded bg-ink-700">
            <div
              className="h-1 rounded bg-brand-500 transition-all duration-700"
              style={{ width: `${((stage + 1) / STAGES.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {error && (
        <div className="mt-6 rounded-xl border border-red-500/40 bg-red-500/5 px-4 py-3 text-red-200">
          {error}
        </div>
      )}

      {report && (
        <div className="mt-8">
          <ReportView report={report} />
        </div>
      )}
    </div>
  );
}
