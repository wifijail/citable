'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { AuditReport } from '@/lib/audit/types';
import { readStoredLicense } from '@/lib/license-storage';
import { useI18n } from '../providers';

export type ScanReport = AuditReport & { keyProblem?: 'invalid' | 'inactive' | null };

interface ScanState {
  busy: boolean;
  report: ScanReport | null;
  error: string | null;
  scan: (url: string) => Promise<void>;
  resultsRef: React.RefObject<HTMLDivElement | null>;
}

const ScanContext = createContext<ScanState | null>(null);

/**
 * Shares one scan between the form in the hero and the full-width results
 * section further down the page.
 */
export function ScanProvider({ children }: { children: React.ReactNode }) {
  const { locale, t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);

  const scan = useCallback(
    async (url: string) => {
      if (!url.trim() || busyRef.current) return;
      busyRef.current = true;
      setBusy(true);
      setError(null);
      setReport(null);

      try {
        const response = await fetch('/api/scan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ url, locale, license: readStoredLicense() || undefined }),
        });
        const data = (await response.json().catch(() => ({}))) as ScanReport & {
          error?: string;
          message?: string;
          limit?: number;
        };

        if (!response.ok) {
          if (data.error === 'quota_exceeded') setError(t.scanner.errors.quota(data.limit ?? 5));
          else setError(data.message ?? t.scanner.errors.generic);
          return;
        }
        setReport(data);
        requestAnimationFrame(() =>
          resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        );
      } catch {
        setError(t.scanner.errors.network);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [locale, t],
  );

  const value = useMemo(() => ({ busy, report, error, scan, resultsRef }), [busy, report, error, scan]);
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan(): ScanState {
  const value = useContext(ScanContext);
  if (!value) throw new Error('useScan must be used inside <ScanProvider>');
  return value;
}
