import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getStore } from '@/lib/db';
import { randomId, readJson, requestLocale } from '@/lib/http';
import { licenseSecret } from '@/lib/license';
import { activeProvider, CheckoutError, createCheckout } from '@/lib/payments';
import { siteUrl } from '@/lib/plans';

export const runtime = 'nodejs';

const BodySchema = z.object({
  plan: z.enum(['pro', 'agency', 'lifetime']),
  email: z.string().trim().toLowerCase().email().max(200).optional(),
  locale: z.string().max(5).optional(),
});

/**
 * Starts a hosted checkout with whichever payment provider is configured.
 *
 * A random claim token is created first and passed through the provider. The
 * webhook attaches the license to it, and the success page uses it to show the
 * buyer their key — no account or login required.
 */
export async function POST(request: Request): Promise<Response> {
  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  const provider = activeProvider();
  if (!provider || !licenseSecret()) {
    return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 });
  }

  const locale = requestLocale(request, body.data.locale);
  const claimToken = randomId(32);

  try {
    await getStore().createCheckout({
      claimToken,
      product: body.data.plan,
      provider,
      locale,
      email: body.data.email ?? null,
    });

    const url = await createCheckout(provider, {
      product: body.data.plan,
      claimToken,
      locale,
      email: body.data.email ?? null,
      successUrl: `${siteUrl()}/${locale}/checkout/success?claim=${claimToken}`,
      cancelUrl: `${siteUrl()}/${locale}/pricing?checkout=cancelled`,
    });
    return NextResponse.json({ url });
  } catch (error) {
    if (error instanceof CheckoutError && error.code === 'not_configured') {
      return NextResponse.json({ error: 'checkout_unavailable' }, { status: 503 });
    }
    console.error('[checkout] failed', error);
    return NextResponse.json({ error: 'checkout_failed' }, { status: 502 });
  }
}
