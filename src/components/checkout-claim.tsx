'use client';

import { ArrowRight, Check, CircleAlert, Copy, Loader2, PartyPopper } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { storeLicense } from '@/lib/license-storage';
import { useI18n } from './providers';

type ClaimState =
  | { kind: 'pending'; slow: boolean }
  | { kind: 'ready'; licenseKey: string; emailSent: boolean }
  | { kind: 'inactive' }
  | { kind: 'unknown' };

const POLL_MS = 2500;
const SLOW_AFTER_MS = 45_000;

/**
 * Shown after the payment provider redirects back. Polls until the webhook has
 * created the license, then reveals the key and saves it in this browser.
 */
export function CheckoutClaim({ token }: { token: string }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<ClaimState>({ kind: 'pending', slow: false });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      try {
        const response = await fetch(`/api/license/claim?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const data = (await response.json()) as { status?: string; licenseKey?: string; emailSent?: boolean };
        if (cancelled) return;

        if (data.status === 'ready' && data.licenseKey) {
          storeLicense(data.licenseKey);
          setState({ kind: 'ready', licenseKey: data.licenseKey, emailSent: Boolean(data.emailSent) });
          return;
        }
        if (data.status === 'inactive') return setState({ kind: 'inactive' });
        if (data.status === 'unknown' || response.status === 400) return setState({ kind: 'unknown' });
      } catch {
        // Network hiccup: keep polling.
      }
      if (!cancelled) {
        setState({ kind: 'pending', slow: Date.now() - startedAt > SLOW_AFTER_MS });
        timer = setTimeout(poll, POLL_MS);
      }
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [token]);

  if (state.kind === 'pending') {
    return (
      <div className="card flex flex-col items-center gap-4 p-10 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <h1 className="text-2xl font-semibold">{state.slow ? t.checkout.slowTitle : t.checkout.pendingTitle}</h1>
        <p className="max-w-md text-muted">{state.slow ? t.checkout.slowBody : t.checkout.pendingBody}</p>
        {state.slow && (
          <Link href={`/${locale}/contact`} className="btn-ghost">
            {t.checkout.contactSupport}
          </Link>
        )}
      </div>
    );
  }

  if (state.kind === 'ready') {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden">
        <div className="bg-gradient-to-br from-accent/15 via-transparent to-mint/15 p-8 text-center sm:p-10">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent/15">
            <PartyPopper className="h-7 w-7 text-accent" />
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.checkout.readyTitle}</h1>
          <p className="mx-auto mt-2 max-w-md text-muted">{t.checkout.readyBody}</p>
        </div>
        <div className="space-y-4 p-6 sm:p-8">
          <p className="text-sm font-medium">{t.checkout.keyLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="code-block flex-1 break-all">{state.licenseKey}</code>
            <button
              type="button"
              className="btn-ghost"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.licenseKey);
                  setCopied(true);
                } catch {
                  // Clipboard blocked: the key is selectable.
                }
              }}
            >
              {copied ? <Check className="h-4 w-4 text-pass" /> : <Copy className="h-4 w-4" />}
              {copied ? t.common.copied : t.common.copy}
            </button>
          </div>
          <p className="text-sm text-faint">
            {state.emailSent ? `${t.checkout.emailed} ` : ''}
            {t.checkout.keepSafe}
          </p>
          <Link href={`/${locale}#scan`} className="btn-accent w-full sm:w-auto">
            {t.checkout.useNow}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  const inactive = state.kind === 'inactive';
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <CircleAlert className="h-8 w-8 text-warn" />
      <h1 className="text-2xl font-semibold">{inactive ? t.checkout.inactiveTitle : t.checkout.unknownTitle}</h1>
      <p className="max-w-md text-muted">{inactive ? t.checkout.inactiveBody : t.checkout.unknownBody}</p>
      <Link href={`/${locale}/contact`} className="btn-ghost mt-2">
        {t.checkout.contactSupport}
      </Link>
    </div>
  );
}
