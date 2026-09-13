'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { isLocale } from '@/i18n/config';
import { clientIp, hashIp } from '@/lib/access';
import {
  ADMIN_COOKIE,
  createSessionValue,
  isAdmin,
  passwordMatches,
  SESSION_MAX_AGE,
} from '@/lib/admin-auth';
import { getStore } from '@/lib/db';
import { grantLicense } from '@/lib/fulfillment';
import { randomId } from '@/lib/http';
import { licenseSecret } from '@/lib/license';
import { consumeQuota } from '@/lib/ratelimit';

export interface ActionState {
  ok: boolean;
  message: string;
  licenseKey?: string;
}

function localeFrom(formData: FormData): string {
  const value = formData.get('locale');
  return isLocale(value) ? value : 'en';
}

export async function loginAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  const ip = hashIp(clientIp(await headers()));
  if (!consumeQuota(`admin-login:${ip}`, 5, 15 * 60 * 1000).allowed) {
    return { ok: false, message: 'rate_limited' };
  }

  if (!passwordMatches(String(formData.get('password') ?? ''))) {
    return { ok: false, message: 'wrong_password' };
  }

  (await cookies()).set(ADMIN_COOKIE, createSessionValue(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
  redirect(`/${localeFrom(formData)}/admin`);
}

export async function logoutAction(formData: FormData): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect(`/${localeFrom(formData)}/admin`);
}

const IssueSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  product: z.enum(['pro', 'agency', 'lifetime']),
  days: z.coerce.number().int().min(0).max(3650),
  note: z.string().trim().max(300).optional(),
});

/**
 * Issues a license by hand — for payments received outside the checkout (bank
 * transfer, invoice, local payment methods) or for giveaways.
 */
export async function issueLicenseAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, message: 'unauthorized' };
  if (!licenseSecret()) return { ok: false, message: 'missing_license_secret' };

  const parsed = IssueSchema.safeParse({
    email: formData.get('email'),
    product: formData.get('product'),
    days: formData.get('days') || 0,
    note: formData.get('note') || undefined,
  });
  if (!parsed.success) return { ok: false, message: 'invalid_input' };

  const { email, product, days, note } = parsed.data;
  const periodEnd =
    product === 'lifetime' || days === 0 ? null : new Date(Date.now() + days * 86_400_000).toISOString();

  const { license } = await grantLicense({
    provider: 'manual',
    product,
    email,
    customerRef: null,
    subscriptionRef: null,
    // A cancelled status with an end date expires on its own, no renewal needed.
    status: periodEnd ? 'cancelled' : 'active',
    periodEnd,
    claimToken: null,
    fallbackRef: randomId(16),
    locale: localeFrom(formData),
    note: note ?? null,
  });

  return { ok: true, message: 'issued', licenseKey: license.licenseKey };
}

export async function revokeLicenseAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(formData.get('id'));
  if (Number.isInteger(id) && id > 0) {
    await getStore().setLicenseStatusById(id, 'expired');
  }
  redirect(`/${localeFrom(formData)}/admin#licenses`);
}
