import type { Metadata } from 'next';
import { siteUrl } from '@/lib/plans';
import './globals.css';

const title = 'Citable — is your site ready to be cited by AI search?';
const description =
  'Scan any URL and see whether ChatGPT, Claude, Perplexity and Google AI Overviews can read, index and cite it — with the exact fixes for what is broken.';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: title,
    template: '%s — Citable',
  },
  description,
  keywords: [
    'AI SEO',
    'generative engine optimization',
    'GEO',
    'llms.txt',
    'GPTBot',
    'ClaudeBot',
    'PerplexityBot',
    'AI visibility audit',
  ],
  openGraph: {
    title,
    description,
    url: siteUrl(),
    siteName: 'Citable',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title, description },
  robots: { index: true, follow: true },
  alternates: { canonical: siteUrl() },
};

/** The tool's own structured data — we practise what the audit preaches. */
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Citable',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  description,
  url: siteUrl(),
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'USD', name: 'Free' },
    { '@type': 'Offer', price: '19', priceCurrency: 'USD', name: 'Pro' },
    { '@type': 'Offer', price: '79', priceCurrency: 'USD', name: 'Agency' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
