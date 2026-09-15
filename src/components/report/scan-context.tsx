'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { ENGINE_IDS, type EngineId } from '@/lib/audit/crawlers';
import type { AuditReport, SiteType } from '@/lib/audit/types';
import { readStoredLicense } from '@/lib/license-storage';
import { useI18n } from '../providers';

export type ScanReport = AuditReport & { keyProblem?: 'invalid' | 'inactive' | null };

/** What the visitor chose in scan settings. The server clamps it to the plan. */
export interface ScanSettings {
  mode: 'page' | 'site';
  siteType: 'auto' | SiteType;
  engines: EngineId[];
  blockTraining: boolean;
}

export const DEFAULT_SETTINGS: ScanSettings = {
  mode: 'page',
  siteType: 'auto',
  engines: [...ENGINE_IDS],
  blockTraining: false,
};

interface ScanState {
  busy: boolean;
  report: ScanReport | null;
  error: string | null;
  settings: ScanSettings;
  setSettings: (settings: ScanSettings) => void;
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
  const [settings, setSettings] = useState<ScanSettings>(DEFAULT_SETTINGS);
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
          body: JSON.stringify({
            url,
            locale,
            license: readStoredLicense() || undefined,
            options: {
              mode: settings.mode,
              siteType: settings.siteType,
              // An empty selection means "all" rather than "none".
              engines: settings.engines.length ? settings.engines : undefined,
              blockTraining: settings.blockTraining,
            },
          }),
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
        requestAnimationFrame(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } catch {
        setError(t.scanner.errors.network);
      } finally {
        busyRef.current = false;
        setBusy(false);
      }
    },
    [locale, t, settings],
  );

  const value = useMemo(
    () => ({ busy, report, error, settings, setSettings, scan, resultsRef }),
    [busy, report, error, settings, scan],
  );
  return <ScanContext.Provider value={value}>{children}</ScanContext.Provider>;
}

export function useScan(): ScanState {
  const value = useContext(ScanContext);
  if (!value) throw new Error('useScan must be used inside <ScanProvider>');
  return value;
}
