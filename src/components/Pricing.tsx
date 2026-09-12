'use client';

import { useState } from 'react';
import { PLANS } from '@/lib/plans';
import { LeadForm } from './LeadForm';

export function Pricing() {
  const [pending, setPending] = useState<string | null>(null);
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkout(planId: string) {
    if (planId === 'free') {
      document.getElementById('scan')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    setPending(planId);
    setError(null);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      const data = (await response.json()) as { url?: string; error?: string; code?: string };

      if (data.code === 'checkout_unavailable') {
        // Payments not wired up yet — capture demand instead of showing a dead end.
        setFallback(true);
        return;
      }
      if (!response.ok || !data.url) {
        setError(data.error ?? 'Could not start checkout.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('Could not reach the payment provider.');
    } finally {
      setPending(null);
    }
  }

  return (
    <section id="pricing" className="container-page py-20">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-bold text-white sm:text-4xl">
          One fixed AI-visibility bug pays for a year
        </h2>
        <p className="mt-3 text-slate-400">
          Start free. Upgrade when you want every fix, unlimited scans and the API.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-4">
        {PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-6 ${
              plan.highlighted ? 'border-brand-500/60 ring-1 ring-brand-500/30' : ''
            }`}
          >
            {plan.highlighted && (
              <span className="pill mb-3 self-start bg-brand-500/15 text-brand-300">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>

            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-white">{plan.price}</span>
              <span className="text-sm text-slate-500">{plan.cadence}</span>
            </div>

            <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-300">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-brand-400" aria-hidden>
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => void checkout(plan.id)}
              disabled={pending === plan.id}
              className={`mt-6 ${plan.highlighted ? 'btn-primary' : 'btn-ghost'} w-full`}
            >
              {pending === plan.id ? 'Redirecting…' : plan.cta}
            </button>
          </div>
        ))}
      </div>

      {error && <p className="mt-6 text-center text-sm text-red-400">{error}</p>}

      {fallback && (
        <div className="card mx-auto mt-8 max-w-xl p-6">
          <h3 className="font-semibold text-white">Payments open in a few days</h3>
          <p className="mt-2 text-sm text-slate-400">
            Leave your email and we will send an early-access link with 50% off the first three
            months.
          </p>
          <div className="mt-4">
            <LeadForm source="pricing-waitlist" label="" />
          </div>
        </div>
      )}
    </section>
  );
}
