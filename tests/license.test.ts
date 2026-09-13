import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { issueLicense, normalizeLicenseKey, verifyLicense } from '@/lib/license';

const ORIGINAL_SECRET = process.env.LICENSE_SECRET;

beforeAll(() => {
  process.env.LICENSE_SECRET = 'test-secret-value-long-enough';
});

afterAll(() => {
  process.env.LICENSE_SECRET = ORIGINAL_SECRET;
});

describe('licensing', () => {
  it('round-trips an issued key', () => {
    const key = issueLicense('pro');
    expect(key).toMatch(/^CITE-PRO-[0-9A-F]{20}-[0-9A-F]{24}$/);
    expect(verifyLicense(key)?.plan).toBe('pro');
  });

  it('issues agency keys distinctly and never repeats a key', () => {
    const first = issueLicense('agency');
    expect(verifyLicense(first)?.plan).toBe('agency');
    expect(issueLicense('agency')).not.toBe(first);
  });

  it('accepts keys pasted with spaces or in lower case', () => {
    const key = issueLicense('pro');
    expect(verifyLicense(`  ${key.toLowerCase()} `)?.plan).toBe('pro');
    expect(normalizeLicenseKey(' cite-pro-a b ')).toBe('CITE-PRO-AB');
  });

  it('rejects a tampered plan segment', () => {
    const forged = issueLicense('pro').replace('-PRO-', '-AGENCY-');
    expect(verifyLicense(forged)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const parts = issueLicense('pro').split('-');
    parts[3] = 'A'.repeat(24);
    expect(verifyLicense(parts.join('-'))).toBeNull();
  });

  it('rejects garbage, including non-ASCII look-alikes', () => {
    expect(verifyLicense('')).toBeNull();
    expect(verifyLicense(null)).toBeNull();
    expect(verifyLicense('not-a-key')).toBeNull();
    expect(verifyLicense('CITE-PRO-AAAA-BBBB')).toBeNull();
    expect(verifyLicense(`CITE-PRO-${'A'.repeat(20)}-${'Ä'.repeat(24)}`)).toBeNull();
  });

  it('cannot verify anything once the secret is rotated', () => {
    const key = issueLicense('pro');
    process.env.LICENSE_SECRET = 'a-different-secret-entirely';
    expect(verifyLicense(key)).toBeNull();
    process.env.LICENSE_SECRET = 'test-secret-value-long-enough';
  });

  it('refuses to issue keys without a strong secret', () => {
    process.env.LICENSE_SECRET = 'short';
    expect(() => issueLicense('pro')).toThrow();
    process.env.LICENSE_SECRET = 'test-secret-value-long-enough';
  });
});
