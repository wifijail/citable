import type { PaidPlanId } from '@/lib/plans';

/**
 * "Pay elsewhere, then tell us" — works with any platform that gives you a
 * payment or subscription link: Boosty, Patreon, Tribute, a Kaspi invoice once
 * you have a registered business, and so on.
 *
 * The buyer pays on that platform, returns and submits a short form (email and
 * the name or order number they paid under). The owner checks the payment in the
 * platform's dashboard and approves the request in /admin, which issues the key.
 * Nothing is automatic, and the site never sees card details.
 */

function env(name: string): string | null {
  const value = process.env[name]?.trim();
  return value ? value : null;
}

export function externalPaymentLink(product: PaidPlanId): string | null {
  const value = env(`PAYMENT_LINK_${product.toUpperCase()}`);
  return value && /^https:\/\//i.test(value) ? value : null;
}

/** Shown on buttons: "Pay on Boosty". */
export function externalPlatformName(): string {
  return env('PAYMENT_PLATFORM_NAME') ?? 'Boosty';
}

export function externalConfigured(): boolean {
  return (['pro', 'agency', 'lifetime'] as const).some((product) => externalPaymentLink(product));
}
