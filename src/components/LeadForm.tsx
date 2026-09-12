'use client';

import { useState } from 'react';

interface LeadFormProps {
  url?: string;
  score?: number;
  label?: string;
  source?: string;
}

export function LeadForm({ url, score, label, source = 'report' }: LeadFormProps) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending') return;
    setState('sending');

    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, url, score, source }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setState('error');
        setMessage(data.error ?? 'Something went wrong.');
        return;
      }
      setState('done');
    } catch {
      setState('error');
      setMessage('Network error. Please try again.');
    }
  }

  if (state === 'done') {
    return (
      <p className="rounded-lg border border-brand-500/40 bg-brand-500/10 px-4 py-3 text-sm text-brand-200">
        Got it. We will send the full report to <strong>{email}</strong>.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      {label && <label className="block text-sm text-slate-400">{label}</label>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          className="input-field sm:flex-1"
          aria-label="Email address"
        />
        <button type="submit" className="btn-primary" disabled={state === 'sending'}>
          {state === 'sending' ? 'Sending…' : 'Send it'}
        </button>
      </div>
      {state === 'error' && <p className="text-sm text-red-400">{message}</p>}
      <p className="text-xs text-slate-600">No spam. Unsubscribe in one click.</p>
    </form>
  );
}
