import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeProvider, paymentMode, publicPaymentConfig } from '@/lib/payments';
import { isGumroadKey, purchaseStatus, verifyGumroadKey } from '@/lib/payments/gumroad';
import {
  lemonSubscriptionState,
  productForLemonVariant,
  verifyLemonSignature,
} from '@/lib/payments/lemonsqueezy';
import { stripeSubscriptionState, verifyStripeSignature } from '@/lib/payments/stripe';
import { siteUrl } from '@/lib/plans';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('Stripe webhook signature', () => {
  const secret = 'whsec_test';
  const body = '{"type":"checkout.session.completed"}';
  const now = 1_790_000_000;
  const sign = (timestamp: number, payload = body) =>
    createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');

  it('accepts a correct, fresh signature', () => {
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, secret, now)).toBe(true);
  });

  it('accepts when any of several v1 signatures matches (secret rotation)', () => {
    expect(verifyStripeSignature(body, `t=${now},v1=deadbeef,v1=${sign(now)}`, secret, now)).toBe(true);
  });

  it('rejects a modified body, a wrong secret and a replayed timestamp', () => {
    expect(verifyStripeSignature('{"type":"x"}', `t=${now},v1=${sign(now)}`, secret, now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, 'other', now)).toBe(false);
    expect(verifyStripeSignature(body, `t=${now},v1=${sign(now)}`, secret, now + 3600)).toBe(false);
    expect(verifyStripeSignature(body, null, secret, now)).toBe(false);
  });
});

describe('Stripe subscription lifecycle', () => {
  it('maps statuses onto license states', () => {
    expect(stripeSubscriptionState({ id: 's', status: 'active', current_period_end: 1_800_000_000 })).toEqual({
      status: 'active',
      periodEnd: new Date(1_800_000_000_000).toISOString(),
    });
    expect(stripeSubscriptionState({ id: 's', status: 'active', cancel_at_period_end: true }).status).toBe('cancelled');
    expect(stripeSubscriptionState({ id: 's', status: 'past_due' }).status).toBe('past_due');
    expect(stripeSubscriptionState({ id: 's', status: 'canceled' }).status).toBe('expired');
  });

  it('reads the period end from subscription items on newer API versions', () => {
    const state = stripeSubscriptionState({ id: 's', status: 'active', items: { data: [{ current_period_end: 1_800_000_000 }] } });
    expect(state.periodEnd).toBe(new Date(1_800_000_000_000).toISOString());
  });
});

describe('Lemon Squeezy', () => {
  it('verifies the X-Signature header', () => {
    const body = '{"meta":{"event_name":"order_created"}}';
    const signature = createHmac('sha256', 'ls_secret').update(body).digest('hex');
    expect(verifyLemonSignature(body, signature, 'ls_secret')).toBe(true);
    expect(verifyLemonSignature(body, signature, 'wrong')).toBe(false);
    expect(verifyLemonSignature(`${body} `, signature, 'ls_secret')).toBe(false);
    expect(verifyLemonSignature(body, null, 'ls_secret')).toBe(false);
  });

  it('decides the product from the variant id, never from buyer-controlled data', () => {
    vi.stubEnv('LEMONSQUEEZY_VARIANT_PRO', '111');
    vi.stubEnv('LEMONSQUEEZY_VARIANT_AGENCY', '222');
    vi.stubEnv('LEMONSQUEEZY_VARIANT_LIFETIME', '333');
    expect(productForLemonVariant(111)).toBe('pro');
    expect(productForLemonVariant('222')).toBe('agency');
    expect(productForLemonVariant(333)).toBe('lifetime');
    expect(productForLemonVariant(999)).toBeNull();
    expect(productForLemonVariant(null)).toBeNull();
  });

  it('keeps cancelled subscriptions active until ends_at', () => {
    expect(lemonSubscriptionState({ status: 'cancelled', ends_at: '2026-10-01T00:00:00Z' })).toEqual({
      status: 'cancelled',
      periodEnd: '2026-10-01T00:00:00Z',
    });
    expect(lemonSubscriptionState({ status: 'on_trial', renews_at: '2026-10-01T00:00:00Z' }).status).toBe('active');
    expect(lemonSubscriptionState({ status: 'unpaid' }).status).toBe('past_due');
    expect(lemonSubscriptionState({ status: 'expired' }).status).toBe('expired');
  });
});

describe('provider selection', () => {
  it('reports nothing configured by default', () => {
    vi.stubEnv('LEMONSQUEEZY_API_KEY', '');
    vi.stubEnv('STRIPE_SECRET_KEY', '');
    expect(activeProvider()).toBeNull();
  });

  it('prefers Lemon Squeezy when both are fully configured, unless forced', () => {
    vi.stubEnv('LICENSE_SECRET', 'x'.repeat(32));
    vi.stubEnv('LEMONSQUEEZY_API_KEY', 'k');
    vi.stubEnv('LEMONSQUEEZY_STORE_ID', '1');
    vi.stubEnv('LEMONSQUEEZY_WEBHOOK_SECRET', 's');
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', 'wh');
    expect(activeProvider()).toBe('lemonsqueezy');
    vi.stubEnv('PAYMENT_PROVIDER', 'stripe');
    expect(activeProvider()).toBe('stripe');
  });

  it('does not treat a half-configured provider as active', () => {
    vi.stubEnv('STRIPE_SECRET_KEY', 'sk');
    vi.stubEnv('STRIPE_WEBHOOK_SECRET', '');
    vi.stubEnv('LEMONSQUEEZY_API_KEY', '');
    expect(activeProvider()).toBeNull();
  });
});

describe('external payment modes', () => {
  const clearHosted = () => {
    for (const name of ['LEMONSQUEEZY_API_KEY', 'STRIPE_SECRET_KEY', 'PAYMENT_PROVIDER']) vi.stubEnv(name, '');
  };

  it('uses Gumroad when a product id and page are set, without needing LICENSE_SECRET', () => {
    clearHosted();
    vi.stubEnv('LICENSE_SECRET', '');
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', 'prod_pro');
    vi.stubEnv('GUMROAD_URL_PRO', 'https://seller.gumroad.com/l/pro');
    expect(paymentMode()).toBe('gumroad');
    const config = publicPaymentConfig();
    expect(config.platformName).toBe('Gumroad');
    expect(config.links.pro).toBe('https://seller.gumroad.com/l/pro');
    expect(config.links.agency).toBeNull();
  });

  it('uses payment links only when keys can be issued, and ignores non-https links', () => {
    clearHosted();
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', '');
    vi.stubEnv('PAYMENT_LINK_PRO', 'https://boosty.to/someone');
    vi.stubEnv('PAYMENT_PLATFORM_NAME', 'Boosty');
    vi.stubEnv('LICENSE_SECRET', '');
    expect(paymentMode()).toBeNull();
    vi.stubEnv('LICENSE_SECRET', 'x'.repeat(32));
    expect(paymentMode()).toBe('external');
    expect(publicPaymentConfig().platformName).toBe('Boosty');
    vi.stubEnv('PAYMENT_LINK_PRO', 'javascript:alert(1)');
    expect(paymentMode()).toBeNull();
  });
});

describe('Gumroad license verification', () => {
  const KEY = 'A1B2C3D4-E5F6A7B8-C9D0E1F2-A3B4C5D6';
  const reply = (status: number, body: unknown) =>
    Promise.resolve(new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));

  it('recognises the Gumroad key format only', () => {
    expect(isGumroadKey(KEY)).toBe(true);
    expect(isGumroadKey('CITE-PRO-0123456789ABCDEF0123-0123456789ABCDEF01234567')).toBe(false);
  });

  it('maps refunds, disputes and memberships to license status', () => {
    expect(purchaseStatus({})).toBe('active');
    expect(purchaseStatus({ refunded: true })).toBe('expired');
    expect(purchaseStatus({ disputed: true })).toBe('expired');
    expect(purchaseStatus({ disputed: true, dispute_won: true })).toBe('active');
    expect(purchaseStatus({ subscription_failed_at: '2026-09-01T00:00:00Z' })).toBe('past_due');
    expect(purchaseStatus({ subscription_ended_at: '2026-09-01T00:00:00Z' })).toBe('expired');
  });

  it('finds the product a key belongs to', async () => {
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', 'prod_pro');
    vi.stubEnv('GUMROAD_PRODUCT_ID_AGENCY', 'prod_agency');
    vi.stubEnv('GUMROAD_PRODUCT_ID_LIFETIME', '');
    const calls: string[] = [];
    const fetchMock = ((_url: string, init?: RequestInit) => {
      const params = init?.body as URLSearchParams;
      calls.push(params.get('product_id') ?? '');
      expect(params.get('increment_uses_count')).toBe('false');
      return params.get('product_id') === 'prod_agency'
        ? reply(200, { success: true, purchase: { product_id: 'prod_agency', sale_id: 'sale_1', license_key: KEY } })
        : reply(404, { success: false, message: 'That license does not exist for the provided product.' });
    }) as typeof fetch;

    const verdict = await verifyGumroadKey(KEY, fetchMock);
    expect(calls).toEqual(['prod_pro', 'prod_agency']);
    expect(verdict).toEqual({ kind: 'ok', product: 'agency', status: 'active', saleId: 'sale_1', subscriptionId: null });
  });

  it('distinguishes an unknown key from Gumroad being down', async () => {
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', 'prod_pro');
    vi.stubEnv('GUMROAD_PRODUCT_ID_AGENCY', '');
    vi.stubEnv('GUMROAD_PRODUCT_ID_LIFETIME', '');
    const unknown = (() => reply(404, { success: false })) as typeof fetch;
    const down = (() => Promise.reject(new Error('ECONNRESET'))) as typeof fetch;
    expect(await verifyGumroadKey(KEY, unknown)).toEqual({ kind: 'invalid' });
    expect(await verifyGumroadKey(KEY, down)).toEqual({ kind: 'unreachable' });
  });

  it('rejects an answer about a different product', async () => {
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', 'prod_pro');
    vi.stubEnv('GUMROAD_PRODUCT_ID_AGENCY', '');
    vi.stubEnv('GUMROAD_PRODUCT_ID_LIFETIME', '');
    const wrong = (() => reply(200, { success: true, purchase: { product_id: 'someone_else', license_key: KEY } })) as typeof fetch;
    expect(await verifyGumroadKey(KEY, wrong)).toEqual({ kind: 'invalid' });
  });
});

describe('siteUrl', () => {
  it('survives the blank variable that broke the first Vercel build', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', '');
    vi.stubEnv('VERCEL_URL', '');
    expect(siteUrl()).toBe('http://localhost:3000');
  });

  it('falls back to Vercel system variables and normalises to an origin', () => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', '   ');
    vi.stubEnv('VERCEL_PROJECT_PRODUCTION_URL', 'citable.vercel.app');
    expect(siteUrl()).toBe('https://citable.vercel.app');
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://citable.dev/some/path/');
    expect(siteUrl()).toBe('https://citable.dev');
  });
});
