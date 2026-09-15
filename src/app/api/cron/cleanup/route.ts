import { timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  // Without a secret the job still runs: it only deletes what the Privacy Policy
  // already promises to delete, so an outside call cannot do harm.
  if (!secret) return true;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Daily retention job, scheduled in vercel.json. Vercel sends
 * `Authorization: Bearer $CRON_SECRET` automatically when that variable is set.
 */
export async function GET(request: Request): Promise<Response> {
  if (!authorised(request)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  try {
    const result = await getStore().purgeExpired();
    return NextResponse.json({ ok: true, ...result }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[cron/cleanup] failed', error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
