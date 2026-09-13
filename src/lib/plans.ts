/**
 * Pricing — the single source of truth for what the site DISPLAYS.
 *
 * Important: the amount a customer is actually charged is whatever you configure
 * on the product in Lemon Squeezy / Stripe. If you change a price here, change it
 * there too, otherwise the page and the checkout will disagree.
 */

export type PlanId = 'free' | 'pro' | 'agency' | 'lifetime';
export type PaidPlanId = Exclude<PlanId, 'free'>;
export type AccessPlan = 'free' | 'pro' | 'agency';

export interface PlanDefinition {
  id: PlanId;
  /** Price in whole US dollars. */
  priceUsd: number;
  billing: 'forever' | 'monthly' | 'once';
  highlighted?: boolean;
  /** Access level unlocked by a license bought on this plan. */
  grants: AccessPlan;
  /** Env vars holding the provider's product identifiers. */
  stripePriceEnv?: string;
  lemonVariantEnv?: string;
}

export const PLANS: readonly PlanDefinition[] = [
  { id: 'free', priceUsd: 0, billing: 'forever', grants: 'free' },
  {
    id: 'pro',
    priceUsd: 7,
    billing: 'monthly',
    highlighted: true,
    grants: 'pro',
    stripePriceEnv: 'STRIPE_PRICE_PRO_MONTHLY',
    lemonVariantEnv: 'LEMONSQUEEZY_VARIANT_PRO',
  },
  {
    id: 'agency',
    priceUsd: 19,
    billing: 'monthly',
    grants: 'agency',
    stripePriceEnv: 'STRIPE_PRICE_AGENCY_MONTHLY',
    lemonVariantEnv: 'LEMONSQUEEZY_VARIANT_AGENCY',
  },
  {
    id: 'lifetime',
    priceUsd: 49,
    billing: 'once',
    grants: 'pro',
    stripePriceEnv: 'STRIPE_PRICE_LIFETIME',
    lemonVariantEnv: 'LEMONSQUEEZY_VARIANT_LIFETIME',
  },
] as const;

export function findPlan(id: string): PlanDefinition | undefined {
  return PLANS.find((plan) => plan.id === id);
}

export function isPaidPlan(id: string): id is PaidPlanId {
  return id === 'pro' || id === 'agency' || id === 'lifetime';
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
