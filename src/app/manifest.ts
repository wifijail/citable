import type { MetadataRoute } from 'next';
import { siteConfig } from '@/config/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: siteConfig.name,
    short_name: siteConfig.name,
    description: 'AI search visibility audits',
    start_url: '/',
    display: 'standalone',
    background_color: '#08070d',
    theme_color: '#6842ff',
    icons: [
      { src: '/icon/medium', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/large', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/large', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
