import type { MetadataRoute } from 'next';
import { LOCALES } from '@/i18n/config';
import { siteUrl } from '@/lib/plans';

/**
 * Our own robots.txt. A tool that audits AI crawler access has to get this right:
 * every public page is open to all agents; only private routes are excluded.
 */
export default function robots(): MetadataRoute.Robots {
  const privatePaths = ['/api/', ...LOCALES.flatMap((locale) => [`/${locale}/admin`, `/${locale}/checkout/`])];
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: privatePaths }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
