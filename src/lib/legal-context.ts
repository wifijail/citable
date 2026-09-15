import { siteConfig } from '@/config/site';
import type { LegalContext } from '@/i18n/legal';
import { CONSENT_VERSION } from '@/lib/consent';
import { RETENTION } from '@/lib/db/types';
import { publicPaymentConfig } from '@/lib/payments';
import { siteUrl } from '@/lib/plans';

/** Owner details from the environment; missing ones are left out of the text, never invented. */
export function legalContext(): LegalContext {
  const { legal, contact } = siteConfig;
  return {
    brand: siteConfig.name,
    siteUrl: siteUrl(),
    entity: legal.entityName || null,
    registration: legal.registrationNumber || null,
    address: legal.address || null,
    email: contact.email || null,
    phone: contact.phone || null,
    refundDays: legal.refundDays,
    updated: legal.lastUpdated,
    dataLocation: legal.dataLocation || null,
    consentVersion: CONSENT_VERSION,
    paymentPlatform: publicPaymentConfig().platformName,
    retention: { ...RETENTION },
  };
}
