'use client';

import { Check, Loader2, Mail } from 'lucide-react';
import { useState } from 'react';
import { ConsentCheckbox } from '../consent-checkbox';
import { useI18n } from '../providers';

/** Waitlist for when payments open. The only place the site asks for an email without a request. */
export function LeadForm({ source = 'pricing-waitlist' }: { source?: 'pricing-waitlist' | 'footer' }) {
  const { locale, t } = useI18n();
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (state === 'sending' || !consent) return;
    setState('sending');
    try {
      const response = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email, source, locale, consent }),
      });
      setState(response.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-pass/30 bg-pass/10 px-4 py-3 text-sm text-fg">
        <Check className="h-4 w-4 shrink-0 text-pass" />
        {t.lead.done}
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="text-sm font-medium">{t.lead.title}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Email</span>
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={t.lead.placeholder}
            className="input pl-10"
          />
        </label>
        <button type="submit" className="btn-primary" disabled={state === 'sending' || !consent}>
          {state === 'sending' && <Loader2 className="h-4 w-4 animate-spin" />}
          {state === 'sending' ? t.lead.sending : t.lead.submit}
        </button>
      </div>
      <ConsentCheckbox checked={consent} onChange={setConsent} />
      {state === 'error' ? <p className="text-sm text-fail">{t.lead.error}</p> : <p className="text-xs text-faint">{t.lead.note}</p>}
    </form>
  );
}
