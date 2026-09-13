'use client';

import { Check, Globe } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { LOCALE_COOKIE, LOCALE_LABELS, LOCALES, type Locale } from '@/i18n/config';
import { useI18n } from '../providers';
import { Menu, MenuItem } from './menu';

/** Swaps the locale segment of the current URL, keeping the page and query. */
export function LocaleSwitcher({ align = 'right' }: { align?: 'left' | 'right' }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();

  const switchTo = (next: Locale) => {
    const segments = pathname.split('/');
    segments[1] = next;
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    router.push(`${segments.join('/')}${window.location.search}${window.location.hash}`);
  };

  return (
    <Menu
      align={align}
      label={t.language.label}
      trigger={
        <>
          <Globe className="h-4 w-4" />
          <span className="font-mono text-xs uppercase">{locale}</span>
        </>
      }
    >
      {(close) =>
        LOCALES.map((option) => (
          <MenuItem
            key={option}
            active={option === locale}
            onSelect={() => {
              close();
              if (option !== locale) switchTo(option);
            }}
          >
            <span className="w-6 font-mono text-xs uppercase text-faint">{option}</span>
            <span className="flex-1">{LOCALE_LABELS[option]}</span>
            {option === locale && <Check className="h-4 w-4 text-accent" />}
          </MenuItem>
        ))
      }
    </Menu>
  );
}
