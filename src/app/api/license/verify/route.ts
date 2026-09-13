import { NextResponse } from 'next/server';
import { z } from 'zod';
import { clientIp, hashIp, resolveAccess } from '@/lib/access';
import { readJson } from '@/lib/http';
import { consumeQuota } from '@/lib/ratelimit';

export const runtime = 'nodejs';

const BodySchema = z.object({ key: z.string().min(1).max(200) });

/** Lets the UI confirm a pasted key before the visitor runs a scan with it. */
export async function POST(request: Request): Promise<Response> {
  if (!consumeQuota(`verify:${hashIp(clientIp(request.headers))}`, 30, 60 * 60 * 1000).allowed) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const body = await readJson(request, BodySchema);
  if (body.error) return body.error;

  const access = await resolveAccess(body.data.key);
  return NextResponse.json({
    plan: access.plan,
    valid: access.plan !== 'free',
    problem: access.keyProblem,
    periodEnd: access.license?.periodEnd ?? null,
  });
}
