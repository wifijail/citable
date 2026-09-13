import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminPassword, createSessionValue, passwordMatches, sessionIsValid } from '@/lib/admin-auth';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('admin authentication', () => {
  it('is disabled without a sufficiently long password', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'short');
    expect(adminPassword()).toBeNull();
    expect(passwordMatches('short')).toBe(false);
    expect(sessionIsValid('123.abc')).toBe(false);
  });

  it('accepts only the exact password', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-horse-battery');
    expect(passwordMatches('correct-horse-battery')).toBe(true);
    expect(passwordMatches('correct-horse-battery ')).toBe(false);
    expect(passwordMatches('')).toBe(false);
  });

  it('issues sessions that verify until they expire', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-horse-battery');
    const now = Date.now();
    const session = createSessionValue(now);
    expect(sessionIsValid(session, now)).toBe(true);
    expect(sessionIsValid(session, now + 13 * 60 * 60 * 1000)).toBe(false);
  });

  it('rejects tampered sessions and invalidates all sessions when the password changes', () => {
    vi.stubEnv('ADMIN_PASSWORD', 'correct-horse-battery');
    const session = createSessionValue();
    const [expires, signature] = session.split('.');
    expect(sessionIsValid(`${Number(expires) + 99999}.${signature}`)).toBe(false);
    expect(sessionIsValid(undefined)).toBe(false);

    vi.stubEnv('ADMIN_PASSWORD', 'a-brand-new-password');
    expect(sessionIsValid(session)).toBe(false);
  });
});
