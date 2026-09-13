import { NextResponse } from 'next/server';
import { getStore } from '@/lib/db';
import { emailConfigured } from '@/lib/email';
import { licenseSecret } from '@/lib/license';
import { activeProvider } from '@/lib/payments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Configuration health check — reports WHICH integrations are active, never
 * their values. Open /api/health after a deploy to confirm your env vars landed.
 */
export async function GET(): Promise<Response> {
  const store = getStore();
  let database: 'ok' | 'error' | 'memory' = store.kind === 'memory' ? 'memory' : 'ok';
  if (store.kind === 'postgres') {
    try {
      await store.stats();
    } catch (error) {
      console.error('[health] database check failed', error);
      database = 'error';
    }
  }

  return NextResponse.json(
    {
      ok: database !== 'error',
      database,
      payments: activeProvider() ?? 'not_configured',
      licensing: licenseSecret() ? 'ok' : 'missing_LICENSE_SECRET',
      email: emailConfigured() ? 'ok' : 'not_configured',
      admin: process.env.ADMIN_PASSWORD?.trim() ? 'ok' : 'missing_ADMIN_PASSWORD',
    },
    { headers: { 'cache-control': 'no-store' } },
  );
}
