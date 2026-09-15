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
import { sendRejectionEmail } from '@/lib/email';
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
    // Active with an end date: access stops after it (plus a short grace period)
    // unless the license is extended from the licenses table.
    status: 'active',
    periodEnd,
    claimToken: null,
    fallbackRef: randomId(16),
    locale: localeFrom(formData),
    note: note ?? null,
  });

  return { ok: true, message: 'issued', licenseKey: license.licenseKey };
}

function idFrom(formData: FormData): number | null {
  const id = Number(formData.get('id'));
  return Number.isInteger(id) && id > 0 ? id : null;
}

/** Monthly plans bought outside a subscription system run for one paid month. */
const MANUAL_PERIOD_DAYS = 31;

/**
 * Approves an external payment: issues the license on the request's claim token,
 * so the buyer's status page shows the key, and emails it when email is set up.
 */
export async function approvePaymentAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = idFrom(formData);
  const store = getStore();
  const request = id ? await store.getPaymentRequest(id) : null;

  if (request && request.status === 'pending' && licenseSecret()) {
    const periodEnd =
      request.product === 'lifetime' ? null : new Date(Date.now() + MANUAL_PERIOD_DAYS * 86_400_000).toISOString();
    const { license } = await grantLicense({
      provider: 'manual',
      product: request.product,
      email: request.email,
      customerRef: null,
      subscriptionRef: null,
      status: 'active',
      periodEnd,
      claimToken: request.claimToken,
      fallbackRef: request.claimToken,
      locale: request.locale,
      note: `paid as: ${request.reference}`.slice(0, 300),
    });
    await store.decidePaymentRequest(request.id, 'approved', license.id);
  }
  redirect(`/${localeFrom(formData)}/admin#payments`);
}

export async function rejectPaymentAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = idFrom(formData);
  const store = getStore();
  const request = id ? await store.getPaymentRequest(id) : null;
  if (request && (await store.decidePaymentRequest(request.id, 'rejected', null))) {
    await sendRejectionEmail({ to: request.email, locale: request.locale });
  }
  redirect(`/${localeFrom(formData)}/admin#payments`);
}

/** Records one more paid month (e.g. the buyer's Boosty subscription renewed). */
export async function extendLicenseAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = idFrom(formData);
  if (id) await getStore().extendLicense(id, MANUAL_PERIOD_DAYS);
  redirect(`/${localeFrom(formData)}/admin#licenses`);
}

const EraseSchema = z.object({ email: z.string().trim().toLowerCase().email().max(200) });

/** Handles a data-deletion request received by email or through the contact form. */
export async function eraseDataAction(_previous: ActionState, formData: FormData): Promise<ActionState> {
  if (!(await isAdmin())) return { ok: false, message: 'unauthorized' };
  const parsed = EraseSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, message: 'invalid_input' };
  const result = await getStore().eraseByEmail(parsed.data.email);
  return {
    ok: true,
    message: `leads: ${result.leads}, messages: ${result.contacts}, payment requests: ${result.requests}, licenses anonymised: ${result.licensesAnonymised}`,
  };
}

export async function revokeLicenseAction(formData: FormData): Promise<void> {
  if (!(await isAdmin())) return;
  const id = Number(formData.get('id'));
  if (Number.isInteger(id) && id > 0) {
    await getStore().setLicenseStatusById(id, 'expired');
  }
  redirect(`/${localeFrom(formData)}/admin#licenses`);
}
