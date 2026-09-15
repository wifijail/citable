import { siteConfig } from '@/config/site';
import { AI_CRAWLERS } from '@/lib/audit/crawlers';
import { CHECK_COUNT } from '@/lib/audit/registry';
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

> ${siteConfig.name} checks whether AI assistants and AI search (ChatGPT, Claude, Perplexity, Google and others)
> are allowed to fetch a web page or a sample of a site, can read it without JavaScript, and find clear
> structured information in it. It reports the problems it finds with a fix for each. The score is the
> service's own heuristic and does not guarantee citations.

## Core pages
- [Scanner](${base}/en): check a page or a whole site
- [Methodology](${base}/en/methodology): all ${CHECK_COUNT} checks, scoring and sources
- [API documentation](${base}/en/docs): POST /api/v1/scan, options, CI usage
- [Pricing](${base}/en/pricing): Free, Pro (${price('pro')}), Agency (${price('agency')}), Lifetime (${price('lifetime')})
- [About](${base}/en/about): operator details and third-party licences
- [Contact](${base}/en/contact)

## What the audit covers
- AI crawler access: robots.txt evaluated for ${AI_CRAWLERS.length} AI agents, separating agents that fetch pages
  for a user's question (ChatGPT-User, Claude-User, Perplexity-User) from indexers and training crawlers
- Machine readability: server-rendered content, client-side rendering, llms.txt, sitemap
- Structured data: JSON-LD, authorship, dates, type-specific markup (Product, SoftwareApplication, Article, LocalBusiness)
- Answerability: headings, lists and tables, paragraph density, topic focus
- Identity: title, description, canonical, Open Graph, language, trust pages
- Technical: HTTP status, HTTPS, response time, redirects, page weight, image alt text, CDN bot protection
- Site mode: sampled pages compared for duplicates, missing descriptions, blocked or noindexed pages

## Legal
- [Terms of Service](${base}/en/legal/terms)
- [Privacy Policy](${base}/en/legal/privacy)
- [Refund Policy](${base}/en/legal/refund)

## Other languages
- [Русский](${base}/ru)
- [Қазақша](${base}/kk)
- [Español](${base}/es)
- [Deutsch](${base}/de)
`;

  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
