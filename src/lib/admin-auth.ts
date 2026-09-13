import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'citable_admin';
const SESSION_SECONDS = 12 * 60 * 60;

export function adminPassword(): string | null {
  const value = process.env.ADMIN_PASSWORD?.trim();
  return value && value.length >= 10 ? value : null;
}

function sign(payload: string, password: string): string {
  return createHmac('sha256', `citable-admin:${password}`).update(payload).digest('hex');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function passwordMatches(candidate: string): boolean {
  const password = adminPassword();
  if (!password) return false;
  // Compare HMACs so the comparison is constant-time regardless of input length.
  return safeEqual(sign(candidate, 'compare'), sign(password, 'compare'));
}

/** Session cookie value: `<expiry>.<hmac>`, bound to the current password. */
export function createSessionValue(now = Date.now()): string {
  const password = adminPassword();
  if (!password) throw new Error('ADMIN_PASSWORD is not configured');
  const expires = String(Math.floor(now / 1000) + SESSION_SECONDS);
  return `${expires}.${sign(expires, password)}`;
}

export function sessionIsValid(value: string | undefined, now = Date.now()): boolean {
  const password = adminPassword();
  if (!password || !value) return false;
  const [expires, signature] = value.split('.');
  if (!expires || !signature) return false;
  if (Number(expires) * 1000 < now) return false;
  return safeEqual(signature, sign(expires, password));
}

export async function isAdmin(): Promise<boolean> {
  const store = await cookies();
  return sessionIsValid(store.get(ADMIN_COOKIE)?.value);
}

export const SESSION_MAX_AGE = SESSION_SECONDS;
