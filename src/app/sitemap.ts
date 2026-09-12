import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/plans';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteUrl()}/`, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${siteUrl()}/docs`, lastModified: now, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
