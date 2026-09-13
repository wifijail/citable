import { NextResponse } from 'next/server';
import { clientIp, hashIp } from '@/lib/access';
import { getStore, licenseHasAccess } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

/**
 * Polled by the checkout success page until the payment webhook has created the
 * license. The claim token is a 32-character random secret known only to the buyer.
 */
export async function GET(request: Request): Promise<Response> {
  if (!consumeQuota(`claim:${hashIp(clientIp(request.headers))}`, 120, 10 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const token = new URL(request.url).searchParams.get('token') ?? '';
  if (!/^[0-9a-zA-Z]{32}$/.test(token)) {
    return NextResponse.json({ error: 'invalid_token' }, { status: 400 });
  }

  const store = getStore();
  const [license, checkout] = await Promise.all([
    store.findLicenseByClaim(token),
    store.getCheckout(token),
  ]);

  if (!license) {
    return NextResponse.json(
      { status: checkout ? 'pending' : 'unknown' },
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  return NextResponse.json(
    {
      status: licenseHasAccess(license) ? 'ready' : 'inactive',
      licenseKey: license.licenseKey,
      plan: license.plan,
      product: license.product,
      // Only claim an email went out when a mail provider is actually configured.
      emailSent: Boolean(license.email) && emailConfigured(),
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
