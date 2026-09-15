import type { Metadata, Viewport } from 'next';
import { JetBrains_Mono, Onest } from 'next/font/google';
import { notFound } from 'next/navigation';
import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { Providers, type SiteFeatures } from '@/components/providers';
import { siteConfig } from '@/config/site';
import { isLocale, LOCALE_TAGS, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/ui';
import { freeDailyLimit } from '@/lib/access';
import { publicPaymentConfig } from '@/lib/payments';
import { PLANS, siteUrl } from '@/lib/plans';

const sans = Onest({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-mono', display: 'swap' });

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafc' },
    { media: '(prefers-color-scheme: dark)', color: '#08070d' },
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);

  return {
    metadataBase: new URL(siteUrl()),
    title: { default: t.meta.title, template: `%s — ${siteConfig.name}` },
    description: t.meta.description,
    applicationName: siteConfig.name,
    alternates: {
      canonical: `/${locale}`,
      languages: Object.fromEntries(LOCALES.map((code) => [LOCALE_TAGS[code], `/${code}`])),
    },
    openGraph: {
      type: 'website',
      siteName: siteConfig.name,
      title: t.meta.title,
      description: t.meta.description,
      url: `/${locale}`,
      locale: LOCALE_TAGS[locale].replace('-', '_'),
    },
    twitter: { card: 'summary_large_image', title: t.meta.title, description: t.meta.description },
    robots: { index: true, follow: true },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const features: SiteFeatures = {
    payments: publicPaymentConfig(),
    freeDailyLimit: freeDailyLimit(),
    priceKzt: { ...siteConfig.priceKzt },
  };

  // The product's own structured data — the site passes its own audit.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: siteConfig.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: t.meta.description,
    url: `${siteUrl()}/${locale}`,
    inLanguage: LOCALE_TAGS[locale],
    offers: PLANS.map((plan) => ({
      '@type': 'Offer',
      price: String(plan.priceUsd),
      priceCurrency: 'USD',
      name: t.pricing.plans[plan.id].name,
    })),
  };

  return (
    <html lang={LOCALE_TAGS[locale]} suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
      <head>
        {/* Without JavaScript, scroll reveals would stay in their hidden initial state. */}
        <noscript>
          <style>{'[data-reveal]{opacity:1!important;transform:none!important;filter:none!important}'}</style>
        </noscript>
      </head>
      <body>
        <Providers locale={locale} features={features}>
          <div className="relative flex min-h-screen flex-col overflow-x-clip">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer locale={locale} />
          </div>
        </Providers>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </body>
    </html>
  );
}
