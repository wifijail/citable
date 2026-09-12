import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/plans';

/**
 * Our own robots.txt. A tool that audits AI crawler access has to get this right:
 * every retrieval and indexing agent is explicitly welcomed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/api/' }],
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
