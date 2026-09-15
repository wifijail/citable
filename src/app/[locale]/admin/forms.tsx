'use client';

import { Check, Copy, KeyRound, Loader2, LogIn, UserX } from 'lucide-react';
import { useActionState, useState } from 'react';
import { eraseDataAction, issueLicenseAction, loginAction, type ActionState } from './actions';
import type { AdminCopy } from './copy';

const INITIAL: ActionState = { ok: false, message: '' };

export function LoginForm({ locale, copy }: { locale: string; copy: AdminCopy }) {
  const [state, action, pending] = useActionState(loginAction, INITIAL);
  return (
    <form action={action} className="card mx-auto max-w-sm space-y-4 p-6">
      <input type="hidden" name="locale" value={locale} />
      <label className="block space-y-1.5">
        <span className="text-sm font-medium">{copy.password}</span>
        <input name="password" type="password" required autoComplete="current-password" className="input" />
      </label>
      {state.message && <p className="text-sm text-fail">{copy.errors[state.message] ?? state.message}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
        {copy.signIn}
      </button>
    </form>
  );
}

export function EraseDataForm({ locale, copy }: { locale: string; copy: AdminCopy }) {
  const [state, action, pending] = useActionState(eraseDataAction, INITIAL);
  return (
    <form action={action} className="card space-y-3 p-6">
      <input type="hidden" name="locale" value={locale} />
      <h2 className="flex items-center gap-2 font-semibold">
        <UserX className="h-4 w-4 text-fail" />
        {copy.tables.erase}
      </h2>
      <p className="text-sm text-muted">{copy.tables.eraseHint}</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input name="email" type="email" required className="input flex-1" aria-label={copy.issue.email} />
        <button type="submit" className="btn-ghost" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {copy.tables.eraseSubmit}
        </button>
      </div>
      {state.message && (
        <p className={state.ok ? 'text-sm text-pass' : 'text-sm text-fail'}>
          {state.ok ? state.message : (copy.errors[state.message] ?? state.message)}
        </p>
      )}
    </form>
  );
}

export function IssueLicenseForm({ locale, copy }: { locale: string; copy: AdminCopy }) {
  const [state, action, pending] = useActionState(issueLicenseAction, INITIAL);
  const [copied, setCopied] = useState(false);

  return (
    <form action={action} className="card space-y-4 p-6">
      <input type="hidden" name="locale" value={locale} />
      <div>
        <h2 className="flex items-center gap-2 font-semibold">
          <KeyRound className="h-4 w-4 text-accent" />
          {copy.issue.title}
        </h2>
        <p className="mt-1 text-sm text-muted">{copy.issue.hint}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs text-muted">{copy.issue.email}</span>
          <input name="email" type="email" required className="input" />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">{copy.issue.product}</span>
          <select name="product" defaultValue="pro" className="input">
            <option value="pro">Pro</option>
            <option value="agency">Agency</option>
            <option value="lifetime">Lifetime</option>
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-muted">{copy.issue.days}</span>
          <input name="days" type="number" min={0} max={3650} defaultValue={30} className="input" />
        </label>
        <label className="block space-y-1.5 sm:col-span-2">
          <span className="text-xs text-muted">{copy.issue.note}</span>
          <input name="note" maxLength={300} className="input" />
        </label>
      </div>
      <button type="submit" className="btn-accent" disabled={pending}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {copy.issue.submit}
      </button>

      {state.message && !state.ok && <p className="text-sm text-fail">{copy.errors[state.message] ?? state.message}</p>}
      {state.ok && state.licenseKey && (
        <div className="rounded-xl border border-pass/30 bg-pass/5 p-3">
          <p className="text-sm">{copy.issue.done}</p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-xs">{state.licenseKey}</code>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1.5"
              onClick={async () => {
                await navigator.clipboard.writeText(state.licenseKey ?? '');
                setCopied(true);
              }}
            >
              {copied ? <Check className="h-4 w-4 text-pass" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
