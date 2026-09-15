'use client';

import { MotionConfig } from 'motion/react';
import { ThemeProvider } from 'next-themes';
import { createContext, useContext, useMemo } from 'react';
import type { Locale } from '@/i18n/config';
import { getDictionary, type Dictionary } from '@/i18n/ui';
import type { PublicPaymentConfig } from '@/lib/payments';
import type { PaidPlanId } from '@/lib/plans';

/** Server-side configuration the browser needs. Only public, serialisable values. */
export interface SiteFeatures {
  payments: PublicPaymentConfig;
  freeDailyLimit: number;
  priceKzt: Record<PaidPlanId, number | null>;
}

interface I18nValue {
  locale: Locale;
  t: Dictionary;
  features: SiteFeatures;
}

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Dictionaries contain formatter functions, which cannot cross the server/client
 * boundary as props. Client components therefore receive only the locale string
 * and look the dictionary up locally.
 */
export function Providers({
  locale,
  features,
  children,
}: {
  locale: Locale;
  features: SiteFeatures;
  children: React.ReactNode;
}) {
  const value = useMemo(() => ({ locale, t: getDictionary(locale), features }), [locale, features]);

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
