'use client';

import Link from 'next/link';
import { useI18n } from './providers';

/**
 * Unticked by default: consent must be an active choice. The API rejects forms
 * without it, so the checkbox cannot be bypassed by editing the page.
 */
export function ConsentCheckbox({
  checked,
  onChange,
  showError = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  showError?: boolean;
}) {
  const { locale, t } = useI18n();
  return (
    <div>
      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
        <input
          type="checkbox"
          required
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-accent"
        />
        <span>
          {t.consent.label}{' '}
          <Link href={`/${locale}/legal/consent`} target="_blank" className="text-fg underline underline-offset-2">
            {t.consent.consentDoc}
          </Link>{' '}
          {t.consent.and}{' '}
          <Link href={`/${locale}/legal/privacy`} target="_blank" className="text-fg underline underline-offset-2">
            {t.consent.privacy}
          </Link>
          .
        </span>
      </label>
      {showError && !checked && <p className="mt-1 text-xs text-fail">{t.consent.required}</p>}
    </div>
  );
}
