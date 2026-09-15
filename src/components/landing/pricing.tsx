'use client';

import { ArrowRight, Check, ExternalLink, Loader2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LOCALE_TAGS } from '@/i18n/config';
import { cn } from '@/lib/cn';
import { PLANS, type PaidPlanId, type PlanId } from '@/lib/plans';
import { ConsentCheckbox } from '../consent-checkbox';
import { useI18n } from '../providers';
import { LeadForm } from '../report/lead-form';
import { Reveal } from '../ui/motion';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <motion.div
      className="fixed inset-0 z-50 overflow-y-auto bg-bg/70 p-4 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        onClick={(event) => event.stopPropagation()}
        className="card relative mx-auto my-8 w-full max-w-lg p-6 sm:my-16"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t.common.close}
          className="absolute right-4 top-4 rounded-full p-1 text-faint transition hover:text-fg"
        >
          <X className="h-4 w-4" />
        </button>
        <h3 className="pr-8 text-lg font-semibold">{title}</h3>
        {children}
      </motion.div>
    </motion.div>
  );
}

function Steps({ items }: { items: readonly string[] }) {
  return (
    <ol className="mt-4 space-y-2.5">
      {items.map((item, index) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line font-mono text-[11px] text-fg">
            {index + 1}
          </span>
          {item}
        </li>
      ))}
    </ol>
  );
}

/** "I have paid" form for external platforms. Leads to the status page. */
function PaymentRequestForm({ plan, platform }: { plan: PaidPlanId; platform: string }) {
  const { locale, t } = useI18n();
  const b = t.pricing.buy;
  const router = useRouter();
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'error' | 'limited'>('idle');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent || state === 'sending') return;
    const form = new FormData(event.currentTarget);
    setState('sending');
    try {
      const response = await fetch('/api/payment-requests', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: form.get('email'),
          reference: form.get('reference'),
          message: form.get('message') || undefined,
          company: form.get('company') || undefined,
          consent,
          locale,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as { claimToken?: string };
      if (response.status === 429) return setState('limited');
      if (!response.ok || !data.claimToken) return setState('error');
      router.push(`/${locale}/checkout/success?claim=${data.claimToken}`);
    } catch {
      setState('error');
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3 border-t border-line pt-5">
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <p className="font-medium">{b.formTitle}</p>
      <label className="block space-y-1.5">
        <span className="text-sm">{b.email}</span>
        <input name="email" type="email" required maxLength={200} autoComplete="email" className="input" />
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm">{b.reference(platform)}</span>
        <input name="reference" required minLength={2} maxLength={200} className="input" />
        <span className="block text-xs text-faint">{b.referenceHint}</span>
      </label>
      <label className="block space-y-1.5">
        <span className="text-sm">
          {b.message} <span className="text-faint">({t.common.optional})</span>
        </span>
        <textarea name="message" maxLength={1000} rows={2} className="input resize-y" />
      </label>
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      <button type="submit" className="btn-accent w-full" disabled={!consent || state === 'sending'}>
        {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
        {state === 'sending' ? b.sending : b.submit}
      </button>
      {state === 'error' && <p className="text-sm text-fail">{b.error}</p>}
      {state === 'limited' && <p className="text-sm text-fail">{b.rateLimited}</p>}
    </form>
  );
}

export function Pricing({ cancelled = false }: { cancelled?: boolean }) {
  const { locale, t, features } = useI18n();
  const { payments, priceKzt } = features;
  const router = useRouter();
  const [pending, setPending] = useState<PlanId | null>(null);
  const [buying, setBuying] = useState<PaidPlanId | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatKzt = (value: number) => new Intl.NumberFormat(LOCALE_TAGS[locale]).format(value);

  async function choose(planId: PlanId) {
    if (planId === 'free') {
      router.push(`/${locale}#scan`);
      return;
    }
    if (payments.mode === 'gumroad' || payments.mode === 'external') {
      if (payments.links[planId]) setBuying(planId);
      else setUnavailable(true);
      return;
    }
    if (!payments.mode) {
      setUnavailable(true);
      return;
    }

    // Hosted checkout (Lemon Squeezy / Stripe).
    setPending(planId);
    setError(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planId, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.error === 'checkout_unavailable') return setUnavailable(true);
      if (!response.ok || !data.url) return setError(t.pricing.error);
      window.location.href = data.url;
    } catch {
      setError(t.pricing.error);
    } finally {
      setPending(null);
    }
  }

  const note =
    payments.mode === 'gumroad'
      ? t.pricing.notes.gumroad
      : payments.mode === 'external'
        ? t.pricing.notes.external(payments.platformName ?? '')
        : payments.mode
          ? t.pricing.notes.hosted
          : null;

  const buyingLink = buying ? payments.links[buying] : null;
  const platform = payments.platformName ?? '';

  return (
    <div>
      {cancelled && (
        <p className="mx-auto mb-8 max-w-xl rounded-xl border border-line bg-surface-2 px-4 py-3 text-center text-sm text-muted">
          {t.pricing.cancelled}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {PLANS.map((plan, index) => {
          const copy = t.pricing.plans[plan.id];
          const kzt = plan.id === 'free' ? null : priceKzt[plan.id];
          return (
            <Reveal key={plan.id} delay={index * 0.05} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border bg-surface p-6',
                  plan.highlighted ? 'border-fg/80 shadow-card' : 'border-line',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{copy.name}</h3>
                  {plan.highlighted && <span className="pill border border-line text-muted">{t.pricing.popular}</span>}
                </div>
                <p className="mt-1 text-sm text-muted">{copy.tagline}</p>

                <div className="mt-6">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">${plan.priceUsd}</span>
                    <span className="text-sm text-faint">{t.pricing.billing[plan.billing]}</span>
                  </div>
                  {kzt && <p className="mt-1 text-sm text-muted">{t.pricing.kzt(formatKzt(kzt))}</p>}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-pass" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void choose(plan.id)}
                  disabled={pending !== null}
                  className={cn('mt-7 w-full', plan.highlighted ? 'btn-primary' : 'btn-ghost')}
                >
                  {pending === plan.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  {pending === plan.id ? t.pricing.redirecting : copy.cta}
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="mx-auto mt-6 max-w-2xl space-y-1 text-center text-xs text-faint">
        {note && <p>{note}</p>}
        <p>
          {t.pricing.legalNote}{' '}
          <Link href={`/${locale}/legal/terms`} className="underline underline-offset-2 hover:text-fg">
            {t.pricing.terms}
          </Link>{' '}
          ·{' '}
          <Link href={`/${locale}/legal/refund`} className="underline underline-offset-2 hover:text-fg">
            {t.pricing.refund}
          </Link>
        </p>
      </div>
      {error && <p className="mt-3 text-center text-sm text-fail">{error}</p>}

      <AnimatePresence>
        {buying && buyingLink && (
          <Modal key="buy" title={t.pricing.buy.title(t.pricing.plans[buying].name)} onClose={() => setBuying(null)}>
            <Steps items={payments.mode === 'gumroad' ? t.pricing.buy.gumroadSteps : t.pricing.buy.externalSteps(platform)} />
            <a href={buyingLink} target="_blank" rel="noopener noreferrer" className="btn-primary mt-5 w-full">
              {payments.mode === 'gumroad' ? t.pricing.buy.gumroadCta : t.pricing.buy.externalCta(platform)}
              <ExternalLink className="h-4 w-4" />
            </a>
            {payments.mode === 'external' && <PaymentRequestForm plan={buying} platform={platform} />}
          </Modal>
        )}

        {unavailable && (
          <Modal key="unavailable" title={t.pricing.unavailableTitle} onClose={() => setUnavailable(false)}>
            <p className="mt-2 text-sm leading-relaxed text-muted">{t.pricing.unavailableBody}</p>
            <div className="mt-5">
              <LeadForm source="pricing-waitlist" />
            </div>
            <Link href={`/${locale}/contact`} className="btn-ghost mt-4 w-full">
              {t.pricing.contactCta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}
