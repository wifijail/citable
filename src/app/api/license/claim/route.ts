import { NextResponse } from 'next/server';
import { clientIp, hashIp } from '@/lib/access';
import { getStore, licenseHasAccess } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const NO_STORE = { 'cache-control': 'no-store' };

/**
 * Polled by the status page until a license exists for the claim token:
 * - hosted checkout: the payment webhook creates it within seconds;
 * - external payment: the owner approves the request in /admin (hours).
 * The claim token is a 32-character random secret known only to the buyer.
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
  const [license, checkout, paymentRequest] = await Promise.all([
    store.findLicenseByClaim(token),
    store.getCheckout(token),
    store.getPaymentRequestByClaim(token),
  ]);

  if (!license) {
    let status = 'unknown';
    if (paymentRequest) status = paymentRequest.status === 'rejected' ? 'rejected' : 'review';
    else if (checkout) status = 'pending';
    return NextResponse.json({ status, product: paymentRequest?.product ?? checkout?.product }, { headers: NO_STORE });
  }

  return NextResponse.json(
    {
      status: licenseHasAccess(license) ? 'ready' : 'inactive',
      licenseKey: license.licenseKey,
      plan: license.plan,
      product: license.product,
      periodEnd: license.periodEnd,
      // Only claim an email went out when a mail provider is actually configured.
      emailSent: Boolean(license.email) && emailConfigured(),
    },
    { headers: NO_STORE },
  );
}
