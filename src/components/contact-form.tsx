'use client';

import { Check, Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useI18n } from './providers';

type Topic = 'sales' | 'support' | 'billing' | 'partnership' | 'other';

export function ContactForm() {
  const { locale, t } = useI18n();
  const f = t.contact.form;
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error' | 'limited'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === 'sending') return;
    const form = new FormData(event.currentTarget);
    setState('sending');
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          topic: form.get('topic') as Topic,
          message: form.get('message'),
          company: form.get('company') || undefined,
          locale,
        }),
      });
      if (response.status === 429) setState('limited');
      else setState(response.ok ? 'done' : 'error');
    } catch {
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-pass/10">
          <Check className="h-6 w-6 text-pass" />
        </span>
        <p className="text-lg font-medium">{f.success}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card space-y-4 p-6 sm:p-8">
      {/* Honeypot, hidden from people and assistive tech. */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{f.name}</span>
          <input name="name" required maxLength={120} autoComplete="name" className="input" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{f.email}</span>
          <input name="email" type="email" required maxLength={200} autoComplete="email" className="input" />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{f.topic}</span>
        <select name="topic" defaultValue="sales" className="input appearance-none">
          {(Object.keys(f.topics) as Topic[]).map((topic) => (
            <option key={topic} value={topic}>
              {f.topics[topic]}
            </option>
          ))}
        </select>
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{f.message}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder={f.messagePlaceholder}
          className="input resize-y"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-accent" disabled={state === 'sending'}>
          {state === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {state === 'sending' ? f.sending : f.submit}
        </button>
        {state === 'error' && <p className="text-sm text-fail">{f.error}</p>}
        {state === 'limited' && <p className="text-sm text-fail">{f.rateLimited}</p>}
        {message.length > 0 && message.trim().length < 10 && <p className="text-sm text-faint">{f.tooShort}</p>}
      </div>
    </form>
  );
}
