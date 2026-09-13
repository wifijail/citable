'use client';

import { ArrowRight, Check, Loader2, ShieldCheck, Sparkles, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { PLANS, type PlanId } from '@/lib/plans';
import { useI18n } from '../providers';
import { LeadForm } from '../report/lead-form';
import { Reveal } from '../ui/motion';

export function Pricing({ cancelled = false }: { cancelled?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, setPending] = useState<PlanId | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function choose(planId: PlanId) {
    if (planId === 'free') {
      router.push(`/${locale}#scan`);
      return;
    }
    setPending(planId);
    setError(null);
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planId, locale }),
      });
      const data = (await response.json().catch(() => ({}))) as { url?: string; error?: string };
      if (data.error === 'checkout_unavailable') {
        setUnavailable(true);
        return;
      }
      if (!response.ok || !data.url) {
        setError(t.pricing.error);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError(t.pricing.error);
    } finally {
      setPending(null);
    }
  }

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
          const highlighted = plan.highlighted;
          return (
            <Reveal key={plan.id} delay={index * 0.06} className="h-full">
              <div
                className={cn(
                  'relative flex h-full flex-col rounded-2xl border bg-surface p-6 transition duration-300 hover:-translate-y-1',
                  highlighted ? 'beam-border border-transparent shadow-glow' : 'border-line shadow-card hover:border-line-strong',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{copy.name}</h3>
                  {highlighted && (
                    <span className="pill bg-accent/10 text-accent">
                      <Sparkles className="h-3 w-3" />
                      {t.pricing.popular}
                    </span>
                  )}
                  {plan.id === 'lifetime' && <span className="pill bg-mint/10 text-mint">{t.pricing.launch}</span>}
                </div>
                <p className="mt-1 text-sm text-muted">{copy.tagline}</p>

                <div className="mt-6 flex items-baseline gap-1.5">
                  <span className="text-4xl font-semibold tracking-tight">${plan.priceUsd}</span>
                  <span className="text-sm text-faint">{t.pricing.billing[plan.billing]}</span>
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {copy.features.map((feature) => (
                    <li key={feature} className="flex gap-2.5">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void choose(plan.id)}
                  disabled={pending !== null}
                  className={cn('mt-7 w-full', highlighted ? 'btn-accent' : 'btn-ghost')}
                >
                  {pending === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {pending === plan.id ? t.pricing.redirecting : copy.cta}
                </button>
              </div>
            </Reveal>
          );
        })}
      </div>

      <p className="mt-6 flex items-center justify-center gap-2 text-xs text-faint">
        <ShieldCheck className="h-3.5 w-3.5" />
        {t.pricing.secure}
      </p>
      {error && <p className="mt-3 text-center text-sm text-fail">{error}</p>}

      <AnimatePresence>
        {unavailable && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-bg/70 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setUnavailable(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="checkout-unavailable-title"
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              onClick={(event) => event.stopPropagation()}
              className="card relative w-full max-w-md p-6"
            >
              <button
                type="button"
                onClick={() => setUnavailable(false)}
                aria-label={t.common.close}
                className="absolute right-4 top-4 rounded-full p-1 text-faint transition hover:text-fg"
              >
                <X className="h-4 w-4" />
              </button>
              <h3 id="checkout-unavailable-title" className="pr-8 text-lg font-semibold">
                {t.pricing.unavailableTitle}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{t.pricing.unavailableBody}</p>
              <div className="mt-5">
                <LeadForm source="pricing-waitlist" />
              </div>
              <Link href={`/${locale}/contact`} className="btn-ghost mt-4 w-full">
                {t.pricing.contactCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
