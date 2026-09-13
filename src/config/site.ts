/**
 * ============================================================================
 *  OWNER SETTINGS — the one file you edit to put YOUR details on the site.
 * ============================================================================
 *
 * Every value can be set in two ways:
 *   1. In the Vercel dashboard → Settings → Environment Variables (recommended,
 *      no code change, takes effect on the next deploy), using the env name
 *      shown next to each field; or
 *   2. Directly in the fallback string below.
 *
 * Empty values are simply hidden on the site. Nothing here is invented: until
 * you fill a field in, the site does not show it.
 *
 * Bank cards / IBAN are NOT configured here. Payouts are set up inside your
 * payment provider's dashboard (Lemon Squeezy or Stripe); this app only receives
 * API keys from it. See SETUP_RU.md.
 */

function env(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export const siteConfig = {
  /** Product name shown in the header, emails and legal pages. */
  name: env('NEXT_PUBLIC_BRAND_NAME', 'Citable'),

  contact: {
    /** Public support address. Shown on /contact and in the footer. */
    email: env('NEXT_PUBLIC_CONTACT_EMAIL', ''),
    /** Telegram username without @, e.g. "citable_support". */
    telegram: env('NEXT_PUBLIC_CONTACT_TELEGRAM', ''),
    /** Any other public link: X, LinkedIn, Discord invite... */
    social: env('NEXT_PUBLIC_CONTACT_SOCIAL_URL', ''),
    /** Typical reply time, free text, e.g. "24 hours". */
    responseTime: env('NEXT_PUBLIC_CONTACT_RESPONSE_TIME', ''),
  },

  /**
   * Seller identity for the Terms, Privacy and Refund pages. Payment providers
   * check these pages during account review, so fill them in before applying.
   */
  legal: {
    /** Legal name: company, sole proprietor or your full name. */
    entityName: env('NEXT_PUBLIC_LEGAL_ENTITY_NAME', ''),
    /** Country whose law governs the Terms. */
    country: env('NEXT_PUBLIC_LEGAL_COUNTRY', ''),
    /** Registered/business address, if you want it public. */
    address: env('NEXT_PUBLIC_LEGAL_ADDRESS', ''),
    /** Registration / tax number, if applicable. */
    registrationNumber: env('NEXT_PUBLIC_LEGAL_REG_NUMBER', ''),
    /** Refund window in days offered on paid plans. */
    refundDays: Number.parseInt(env('NEXT_PUBLIC_REFUND_DAYS', '14'), 10) || 14,
    /** Date the legal texts were last reviewed, ISO format. */
    lastUpdated: env('NEXT_PUBLIC_LEGAL_UPDATED', '2026-09-13'),
  },
} as const;

/** Whether the owner has filled in enough identity for legal pages to be credible. */
export function legalIdentityComplete(): boolean {
  return Boolean(siteConfig.legal.entityName && siteConfig.legal.country && siteConfig.contact.email);
}
