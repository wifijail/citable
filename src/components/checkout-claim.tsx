'use client';

import { ArrowRight, Check, CircleAlert, Clock, Copy, KeyRound, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { LOCALE_TAGS } from '@/i18n/config';
import { storeLicense } from '@/lib/license-storage';
import { useI18n } from './providers';

type ClaimState =
  | { kind: 'pending'; slow: boolean }
  | { kind: 'review' }
  | { kind: 'ready'; licenseKey: string; emailSent: boolean; periodEnd: string | null }
  | { kind: 'rejected' }
  | { kind: 'inactive' }
  | { kind: 'unknown' };

const POLL_MS = 2500;
/** Manual confirmation takes hours, so the status page checks less often. */
const REVIEW_POLL_MS = 30_000;
const SLOW_AFTER_MS = 45_000;

function CopyButton({ text }: { text: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          // Clipboard blocked: the text is selectable.
        }
      }}
    >
      {copied ? <Check className="h-4 w-4 text-pass" /> : <Copy className="h-4 w-4" />}
      {copied ? t.common.copied : t.common.copy}
    </button>
  );
}

/**
 * Status page after a purchase. Polls until a license exists for the claim token
 * — created by a payment webhook within seconds, or by the owner approving an
 * external payment — then reveals the key and saves it in this browser.
 */
export function CheckoutClaim({ token }: { token: string }) {
  const { locale, t } = useI18n();
  const [state, setState] = useState<ClaimState>({ kind: 'pending', slow: false });
  const [pageUrl, setPageUrl] = useState('');

  useEffect(() => setPageUrl(window.location.href), []);

  useEffect(() => {
    let cancelled = false;
    const startedAt = Date.now();
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      let next = POLL_MS;
      try {
        const response = await fetch(`/api/license/claim?token=${encodeURIComponent(token)}`, { cache: 'no-store' });
        const data = (await response.json()) as {
          status?: string;
          licenseKey?: string;
          emailSent?: boolean;
          periodEnd?: string | null;
        };
        if (cancelled) return;

        if (data.status === 'ready' && data.licenseKey) {
          storeLicense(data.licenseKey);
          setState({ kind: 'ready', licenseKey: data.licenseKey, emailSent: Boolean(data.emailSent), periodEnd: data.periodEnd ?? null });
          return;
        }
        if (data.status === 'inactive') return setState({ kind: 'inactive' });
        if (data.status === 'rejected') return setState({ kind: 'rejected' });
        if (data.status === 'unknown' || response.status === 400) return setState({ kind: 'unknown' });
        if (data.status === 'review') {
          setState({ kind: 'review' });
          next = REVIEW_POLL_MS;
        } else {
          setState({ kind: 'pending', slow: Date.now() - startedAt > SLOW_AFTER_MS });
        }
      } catch {
        // Network hiccup: keep polling.
      }
      if (!cancelled) timer = setTimeout(poll, next);
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
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
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

  if (state.kind === 'review') {
    return (
      <div className="card p-8 sm:p-10">
        <Clock className="h-8 w-8 text-muted" />
        <h1 className="mt-4 text-2xl font-semibold">{t.checkout.reviewTitle}</h1>
        <p className="mt-2 max-w-lg leading-relaxed text-muted">{t.checkout.reviewBody}</p>
        {pageUrl && (
          <div className="mt-6">
            <p className="text-sm font-medium">{t.checkout.reviewSave}</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <code className="code-block flex-1 break-all text-xs">{pageUrl}</code>
              <CopyButton text={pageUrl} />
            </div>
          </div>
        )}
      </div>
    );
  }

  if (state.kind === 'ready') {
    const until = state.periodEnd
      ? new Intl.DateTimeFormat(LOCALE_TAGS[locale], { dateStyle: 'long' }).format(new Date(state.periodEnd))
      : null;
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-8 sm:p-10">
        <KeyRound className="h-8 w-8 text-pass" />
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.checkout.readyTitle}</h1>
        <p className="mt-2 max-w-md text-muted">{t.checkout.readyBody}</p>
        <div className="mt-6 space-y-4">
          <p className="text-sm font-medium">{t.checkout.keyLabel}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <code className="code-block flex-1 break-all">{state.licenseKey}</code>
            <CopyButton text={state.licenseKey} />
          </div>
          <p className="text-sm text-faint">
            {until ? `${t.checkout.validUntil(until)} ` : ''}
            {state.emailSent ? `${t.checkout.emailed} ` : ''}
            {t.checkout.keepSafe}
          </p>
          <Link href={`/${locale}#scan`} className="btn-primary w-full sm:w-auto">
            {t.checkout.useNow}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </motion.div>
    );
  }

  const copy =
    state.kind === 'inactive'
      ? { title: t.checkout.inactiveTitle, body: t.checkout.inactiveBody }
      : state.kind === 'rejected'
        ? { title: t.checkout.rejectedTitle, body: t.checkout.rejectedBody }
        : { title: t.checkout.unknownTitle, body: t.checkout.unknownBody };

  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <CircleAlert className="h-8 w-8 text-warn" />
      <h1 className="text-2xl font-semibold">{copy.title}</h1>
      <p className="max-w-md text-muted">{copy.body}</p>
      <Link href={`/${locale}/contact`} className="btn-ghost mt-2">
        {t.checkout.contactSupport}
      </Link>
    </div>
  );
}
