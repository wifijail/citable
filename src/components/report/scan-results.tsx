'use client';

import { CircleAlert, Check } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';
import { useI18n } from '../providers';
import { LogoCube } from '../ui/motion';
import { ReportView } from './report-view';
import { useScan } from './scan-context';

function ScanProgress({ site }: { site: boolean }) {
  const { t } = useI18n();
  const [stage, setStage] = useState(0);
  const stages = site ? t.scanner.siteStages : t.scanner.stages;

  useEffect(() => {
    const timer = setInterval(() => setStage((current) => Math.min(current + 1, stages.length - 1)), site ? 3000 : 1000);
    return () => clearInterval(timer);
  }, [stages, site]);

  return (
    <div className="card flex flex-col items-center gap-6 p-8 sm:flex-row sm:p-10">
      <LogoCube size={72} />
      <ol className="w-full space-y-2.5">
        {stages.map((label, index) => (
          <li
            key={label}
            className={cn(
              'flex items-center gap-3 text-sm transition-colors',
              index < stage ? 'text-muted' : index === stage ? 'text-fg' : 'text-faint/60',
            )}
          >
            <span
              className={cn(
                'grid h-5 w-5 place-items-center rounded-full border',
                index < stage ? 'border-pass/40 bg-pass/10' : index === stage ? 'border-fg/60' : 'border-line',
              )}
            >
              {index < stage ? (
                <Check className="h-3 w-3 text-pass" />
              ) : index === stage ? (
                <span className="h-1.5 w-1.5 animate-ping rounded-full bg-fg" />
              ) : null}
            </span>
            {label}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Full-width results area under the hero: progress, error or the report. */
export function ScanResults() {
  const { busy, error, report, resultsRef, settings } = useScan();

  return (
    <div ref={resultsRef} className="container-page scroll-mt-20">
      <AnimatePresence mode="wait">
        {busy && (
          <motion.div key="busy" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pt-10">
            <ScanProgress site={settings.mode === 'site'} />
          </motion.div>
        )}
        {!busy && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            role="alert"
            className="mx-auto mt-8 flex max-w-2xl items-start gap-3 rounded-xl border border-fail/30 bg-fail/5 px-4 py-3 text-sm"
          >
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-fail" />
            <span>{error}</span>
          </motion.div>
        )}
        {!busy && report && (
          <motion.div key={report.scannedAt} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-10">
            <ReportView report={report} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
