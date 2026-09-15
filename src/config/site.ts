/**
 * ============================================================================
 *  OWNER SETTINGS — your details on the site.
 * ============================================================================
 *
 * Set these in Vercel → Settings → Environment Variables (then redeploy), using
 * the env name next to each field. Empty values are simply not shown: nothing
 * is invented on your behalf. /admin lists which ones are still missing.
 *
 * Card numbers / bank accounts are never configured here. Payouts are set up in
 * the payment platform's own dashboard (Gumroad, Boosty, …). See SETUP_RU.md.
 */

function env(name: string, fallback = ''): string {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

function amount(name: string): number | null {
  const parsed = Number.parseInt(env(name).replace(/\s/g, ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export const siteConfig = {
  /** Product name shown in the header, emails and legal pages. */
  name: env('NEXT_PUBLIC_BRAND_NAME', 'Citable'),

  contact: {
    /** Public support address. Shown on /contact, /about and in legal pages. */
    email: env('NEXT_PUBLIC_CONTACT_EMAIL'),
    /** Telegram username without @. */
    telegram: env('NEXT_PUBLIC_CONTACT_TELEGRAM'),
    /** Public phone. Kazakhstan's consumer law expects online sellers to publish one. */
    phone: env('NEXT_PUBLIC_CONTACT_PHONE'),
    /** Any other public link. */
    social: env('NEXT_PUBLIC_CONTACT_SOCIAL_URL'),
    /** Typical reply time, free text, e.g. "1 working day". */
    responseTime: env('NEXT_PUBLIC_CONTACT_RESPONSE_TIME'),
  },

  /** Seller identity for the About page and the legal documents. */
  legal: {
    /** Full name of the individual entrepreneur (ИП) or company, as registered. */
    entityName: env('NEXT_PUBLIC_LEGAL_ENTITY_NAME'),
    /** ИИН/БИН or other registration number. */
    registrationNumber: env('NEXT_PUBLIC_LEGAL_REG_NUMBER'),
    /** Registration details, e.g. "Notice of start of activity dated …". */
    registrationDetails: env('NEXT_PUBLIC_LEGAL_REG_DETAILS'),
    /** Legal or actual address. */
    address: env('NEXT_PUBLIC_LEGAL_ADDRESS'),
    /** Shown on the About page. The legal documents are written for Kazakhstan law. */
    country: env('NEXT_PUBLIC_LEGAL_COUNTRY'),
    /** Where personal data is stored, e.g. "Kazakhstan (ps.kz)". Shown in the Privacy Policy. */
    dataLocation: env('NEXT_PUBLIC_DATA_LOCATION'),
    /** Full-refund window for the first payment, in days. */
    refundDays: Number.parseInt(env('NEXT_PUBLIC_REFUND_DAYS', '14'), 10) || 14,
    /** Date the legal texts were last changed, ISO format. */
    lastUpdated: env('NEXT_PUBLIC_LEGAL_UPDATED', '2026-09-15'),
  },

  /**
   * Optional prices in tenge shown next to the dollar price. Kazakhstan's consumer
   * law requires the price in tenge; set these to the amounts you actually charge
   * (or a rounded equivalent if the platform charges in another currency).
   */
  priceKzt: {
    pro: amount('NEXT_PUBLIC_PRICE_KZT_PRO'),
    agency: amount('NEXT_PUBLIC_PRICE_KZT_AGENCY'),
    lifetime: amount('NEXT_PUBLIC_PRICE_KZT_LIFETIME'),
  },
} as const;

/** Which owner details are still missing, for the admin checklist. */
export function missingOwnerDetails(): string[] {
  const missing: string[] = [];
  if (!siteConfig.legal.entityName) missing.push('NEXT_PUBLIC_LEGAL_ENTITY_NAME');
  if (!siteConfig.contact.email) missing.push('NEXT_PUBLIC_CONTACT_EMAIL');
  if (!siteConfig.contact.phone) missing.push('NEXT_PUBLIC_CONTACT_PHONE');
  if (!siteConfig.legal.address) missing.push('NEXT_PUBLIC_LEGAL_ADDRESS');
  if (!siteConfig.legal.registrationNumber) missing.push('NEXT_PUBLIC_LEGAL_REG_NUMBER');
  if (!siteConfig.legal.dataLocation) missing.push('NEXT_PUBLIC_DATA_LOCATION');
  return missing;
}
