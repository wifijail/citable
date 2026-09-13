import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { activeProvider } from '@/lib/payments';
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
