import { siteConfig } from '@/config/site';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { PLANS, siteUrl } from '@/lib/plans';

export const dynamic = 'force-static';

/**
 * /llms.txt, generated so every link points at the real deployment domain
 * instead of a hard-coded one. The site passes its own llms.txt check.
 */
export function GET(): Response {
  const base = siteUrl();
  const price = (id: string) => {
    const plan = PLANS.find((entry) => entry.id === id);
    if (!plan) return '';
    return plan.billing === 'monthly' ? `$${plan.priceUsd}/mo` : `$${plan.priceUsd}`;
  };

  const body = `# ${siteConfig.name}

> ${siteConfig.name} audits whether AI assistants (ChatGPT, Claude, Perplexity, Google AI Overviews)
> can reach, read, index and cite a given web page, and returns the exact fixes for what
> is blocking them. Free scan, no signup.

## Core pages
- [Scanner and overview](${base}/en): run a free AI-visibility audit on any URL
- [API documentation](${base}/en/docs): POST /api/v1/scan, CI deploy gates, scoring model
- [Pricing](${base}/en/pricing): Free, Pro (${price('pro')}), Agency (${price('agency')}), Lifetime (${price('lifetime')})
- [Contact](${base}/en/contact): sales and support

## What the audit covers
- AI crawler access: robots.txt evaluated against ${AI_CRAWLERS.length} AI agents, separating live-retrieval
  agents (ChatGPT-User, Claude-User, Perplexity-User) from training crawlers (GPTBot, CCBot)
- Machine readability: server-rendered content, client-side-rendering risk, llms.txt, sitemap
- Structured data: JSON-LD entities, authorship, datePublished/dateModified, FAQPage markup
- Answerability: heading structure, question-shaped headings, lists and tables, paragraph density
- Metadata and identity: title, description, canonical, Open Graph, declared language
- Technical health: HTTP status, HTTPS, response time, redirect chain, payload size, image alt text

## Other languages
- [Русский](${base}/ru)
- [Español](${base}/es)
- [Deutsch](${base}/de)
`;

  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
