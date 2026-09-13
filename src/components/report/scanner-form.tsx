'use client';

import { ArrowRight, CircleAlert, CircleCheck, KeyRound, Loader2, Search } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { onLicenseChange, readStoredLicense, storeLicense } from '@/lib/license-storage';
import { useI18n } from '../providers';
import { useScan } from './scan-context';

const EXAMPLES = ['stripe.com/pricing', 'vercel.com', 'wikipedia.org'];

type KeyState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'valid'; plan: string }
  | { kind: 'invalid' }
  | { kind: 'inactive' };

export function ScannerForm() {
  const { t } = useI18n();
  const { scan, busy } = useScan();
  const [url, setUrl] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [license, setLicense] = useState('');
  const [keyState, setKeyState] = useState<KeyState>({ kind: 'idle' });

  useEffect(() => {
    const stored = readStoredLicense();
    if (stored) {
      setLicense(stored);
      setShowKey(true);
    }
    return onLicenseChange(setLicense);
  }, []);

  // Validate the key shortly after the visitor stops typing.
  useEffect(() => {
    const key = license.trim();
    if (!key) {
      setKeyState({ kind: 'idle' });
      return;
    }
    setKeyState({ kind: 'checking' });
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/license/verify', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ key }),
        });
        const data = (await response.json()) as { valid?: boolean; plan?: string; problem?: string };
        if (data.valid && data.plan) setKeyState({ kind: 'valid', plan: data.plan });
        else setKeyState({ kind: data.problem === 'inactive' ? 'inactive' : 'invalid' });
      } catch {
        setKeyState({ kind: 'idle' });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [license]);

  const submit = (target: string) => {
    setUrl(target);
    void scan(target);
  };

  return (
    <div id="scan" className="w-full scroll-mt-24">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit(url);
        }}
        className="group relative rounded-2xl border border-line bg-surface p-1.5 shadow-card transition focus-within:border-accent focus-within:shadow-glow"
      >
        <div className="flex flex-col gap-1.5 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">URL</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder={t.scanner.placeholder}
              autoComplete="url"
              spellCheck={false}
              className="h-12 w-full rounded-xl bg-transparent pl-11 pr-3 text-[15px] text-fg outline-none placeholder:text-faint"
            />
          </label>
          <button type="submit" disabled={busy} className="btn-accent h-12 rounded-xl px-6">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {busy ? t.scanner.scanning : t.scanner.submit}
            {!busy && <ArrowRight className="h-4 w-4" />}
          </button>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-faint">
        <span>{t.scanner.examples}</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            disabled={busy}
            onClick={() => submit(example)}
            className="rounded-full border border-line px-2.5 py-0.5 font-mono text-xs text-muted transition hover:border-accent hover:text-fg"
          >
            {example}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setShowKey((value) => !value)}
          className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-fg"
        >
          <KeyRound className="h-3.5 w-3.5" />
          {showKey ? t.scanner.hideKey : t.scanner.haveKey}
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showKey && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-3">
              <input
                type="text"
                value={license}
                onChange={(event) => {
                  setLicense(event.target.value);
                  storeLicense(event.target.value.trim());
                }}
                placeholder={t.scanner.keyPlaceholder}
                spellCheck={false}
                aria-label={t.scanner.haveKey}
                className="input font-mono text-xs"
              />
              <p className="mt-1.5 flex items-center gap-1.5 text-xs">
                {keyState.kind === 'idle' && <span className="text-faint">{t.scanner.keyHint}</span>}
                {keyState.kind === 'checking' && (
                  <span className="inline-flex items-center gap-1.5 text-faint">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {t.scanner.keyChecking}
                  </span>
                )}
                {keyState.kind === 'valid' && (
                  <span className="inline-flex items-center gap-1.5 text-pass">
                    <CircleCheck className="h-3.5 w-3.5" />
                    {t.scanner.keyValid(keyState.plan.charAt(0).toUpperCase() + keyState.plan.slice(1))}
                  </span>
                )}
                {(keyState.kind === 'invalid' || keyState.kind === 'inactive') && (
                  <span className="inline-flex items-center gap-1.5 text-fail">
                    <CircleAlert className="h-3.5 w-3.5" />
                    {keyState.kind === 'invalid' ? t.scanner.keyInvalid : t.scanner.keyInactive}
                  </span>
                )}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
