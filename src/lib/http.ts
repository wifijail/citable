import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { DEFAULT_LOCALE, isLocale, matchLocale, type Locale } from '@/i18n/config';
import { randomBytes } from 'node:crypto';

/** Parses and validates a JSON body; returns a ready 400 response on failure. */
export async function readJson<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<{ data: z.infer<T>; error: null } | { data: null; error: Response }> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return { data: null, error: NextResponse.json({ error: 'invalid_json' }, { status: 400 }) };
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return {
      data: null,
      error: NextResponse.json({ error: 'invalid_body', issues: parsed.error.flatten() }, { status: 400 }),
    };
  }
  return { data: parsed.data, error: null };
}

/** Locale from an explicit value, then the Accept-Language header. */
export function requestLocale(request: Request, explicit?: string | null): Locale {
  if (isLocale(explicit)) return explicit;
  return matchLocale(request.headers.get('accept-language')) ?? DEFAULT_LOCALE;
}

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** URL-safe random id with ~71 bits of entropy at the default length. */
export function randomId(length = 12): string {
  const bytes = randomBytes(length);
  let id = '';
  for (const byte of bytes) id += ALPHABET[byte % ALPHABET.length];
  return id;
}
