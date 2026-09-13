export type PlanId = 'free' | 'pro' | 'agency' | 'lifetime';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  features: string[];
  cta: string;
  highlighted?: boolean;
  /** Env var holding the Stripe Price id. Absent for the free plan. */
  priceEnv?: string;
  /** Plan granted by the license key issued after payment. */
  grants?: 'pro' | 'agency';
}

export const PLANS: readonly PlanDefinition[] = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    cadence: 'forever',
    tagline: 'Find out where you stand.',
    cta: 'Run a free scan',
    features: [
      '5 scans per day',
      'Full AI Visibility Score and category breakdown',
      'All 16 AI crawlers checked against your robots.txt',
      'Top 3 fixes with full instructions',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    cadence: 'per month',
    tagline: 'For the person responsible for the traffic.',
    cta: 'Upgrade to Pro',
    highlighted: true,
    priceEnv: 'STRIPE_PRICE_PRO_MONTHLY',
    grants: 'pro',
    features: [
      'Unlimited scans',
      'Every fix unlocked, with copy-paste snippets',
      'Full evidence trail for each check',
      'JSON and CSV export',
      'API access for CI pipelines',
    ],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: '$79',
    cadence: 'per month',
    tagline: 'Sell AI visibility audits as a service.',
    cta: 'Upgrade to Agency',
    priceEnv: 'STRIPE_PRICE_AGENCY_MONTHLY',
    grants: 'agency',
    features: [
      'Everything in Pro',
      'White-label reports for client delivery',
      'Up to 25 tracked sites',
      'Priority rate limits',
      'Email support',
    ],
  },
  {
    id: 'lifetime',
    name: 'Lifetime',
    price: '$149',
    cadence: 'one-time',
    tagline: 'Launch offer — first 100 customers.',
    cta: 'Buy lifetime access',
    priceEnv: 'STRIPE_PRICE_LIFETIME',
    grants: 'pro',
    features: [
      'Everything in Pro, forever',
      'All future Pro features included',
      'No subscription to manage',
    ],
  },
] as const;

export function findPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id);
}

/**
 * Absolute public origin of the site, never empty.
 *
 * An env var that exists but is blank (common when pasting .env.example into the
 * Vercel dashboard) must fall through too — `??` would keep the empty string and
 * `new URL('')` then throws during `next build`, which is exactly how the first
 * Vercel deployment failed.
 */
export function siteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
    process.env.VERCEL_URL,
  ];

  for (const raw of candidates) {
    const value = raw?.trim();
    if (!value) continue;
    const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // Malformed value: try the next candidate instead of failing the build.
    }
  }
  return 'http://localhost:3000';
}
