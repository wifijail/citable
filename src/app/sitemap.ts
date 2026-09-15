import type { MetadataRoute } from 'next';
import { LOCALE_TAGS, LOCALES } from '@/i18n/config';
import { LEGAL_SLUGS } from '@/i18n/legal';
import { siteUrl } from '@/lib/plans';

const PAGES: Array<{ path: string; priority: number; changeFrequency: 'weekly' | 'monthly' | 'yearly' }> = [
  { path: '', priority: 1, changeFrequency: 'weekly' },
  { path: '/pricing', priority: 0.9, changeFrequency: 'monthly' },
  { path: '/methodology', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/docs', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/about', priority: 0.4, changeFrequency: 'yearly' },
  { path: '/contact', priority: 0.5, changeFrequency: 'yearly' },
  ...LEGAL_SLUGS.map((slug) => ({ path: `/legal/${slug}`, priority: 0.2, changeFrequency: 'yearly' as const })),
];

/** One entry per page per language, each listing its translations for hreflang. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const lastModified = new Date();

  return PAGES.flatMap((page) =>
    LOCALES.map((locale) => ({
      url: `${base}/${locale}${page.path}`,
      lastModified,
      changeFrequency: page.changeFrequency,
      priority: page.priority,
      alternates: {
        languages: Object.fromEntries(LOCALES.map((code) => [LOCALE_TAGS[code], `${base}/${code}${page.path}`])),
      },
    })),
  );
}
