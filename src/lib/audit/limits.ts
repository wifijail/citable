/**
 * Pages fetched in site mode, per plan. Bounded by the serverless time budget.
 * Kept free of imports so client components can use it without pulling in zod.
 */
export const SITE_PAGE_LIMITS = { free: 5, pro: 15, agency: 25 } as const;
