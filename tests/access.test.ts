import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveAccess } from '@/lib/access';
import { getStore } from '@/lib/db';

const KEY = 'ABCDEF01-23456789-ABCDEF01-23456789';

function gumroadReplies(purchase: Record<string, unknown> | null) {
  return vi.fn(async () =>
    purchase
      ? new Response(JSON.stringify({ success: true, purchase: { product_id: 'prod_pro', license_key: KEY, sale_id: 'sale_9', ...purchase } }))
      : new Response(JSON.stringify({ success: false }), { status: 404 }),
  );
}

describe('resolveAccess with Gumroad keys', () => {
  beforeEach(() => {
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', 'prod_pro');
    vi.stubEnv('GUMROAD_URL_PRO', 'https://seller.gumroad.com/l/pro');
    vi.stubEnv('GUMROAD_PRODUCT_ID_AGENCY', '');
    vi.stubEnv('GUMROAD_PRODUCT_ID_LIFETIME', '');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('grants the plan, caches the verdict and does not ask Gumroad again right away', async () => {
    const fetchMock = gumroadReplies({});
    vi.stubGlobal('fetch', fetchMock);

    const first = await resolveAccess(KEY.toLowerCase());
    expect(first.plan).toBe('pro');
    expect(first.license?.provider).toBe('gumroad');
    expect(first.license?.email).toBeNull();

    const second = await resolveAccess(KEY);
    expect(second.plan).toBe('pro');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the last known verdict when Gumroad is unreachable', async () => {
    const cached = await getStore().findLicenseByKey(KEY);
    expect(cached).not.toBeNull();
    // Make the cached verdict stale so a re-check is attempted.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 7 * 60 * 60 * 1000);
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('down'))));
    expect((await resolveAccess(KEY)).plan).toBe('pro');
    vi.useRealTimers();
  });

  it('rejects keys Gumroad does not know', async () => {
    vi.stubGlobal('fetch', gumroadReplies(null));
    const access = await resolveAccess('11111111-22222222-33333333-44444444');
    expect(access).toMatchObject({ plan: 'free', keyProblem: 'invalid' });
  });

  it('treats Gumroad-shaped keys as invalid when Gumroad is not configured', async () => {
    vi.stubEnv('GUMROAD_PRODUCT_ID_PRO', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    expect((await resolveAccess(KEY)).keyProblem).toBe('invalid');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
