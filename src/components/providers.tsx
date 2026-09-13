'use client';

import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useMemo } from 'react';
import type { Locale } from '@/i18n/config';
import { getDictionary, type Dictionary } from '@/i18n/ui';

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Dictionaries contain formatter functions, which cannot cross the server/client
 * boundary as props. Client components therefore receive only the locale string
 * and look the dictionary up locally.
 */
export function Providers({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, t: getDictionary(locale) }), [locale]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <MotionConfig reducedMotion="user">
        <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
      </MotionConfig>
    </ThemeProvider>
  );
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <Providers>');
  return value;
}
