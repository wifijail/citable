import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { issueLicense, planFromKey, verifyLicense } from '@/lib/license';

const ORIGINAL_SECRET = process.env.LICENSE_SECRET;

beforeAll(() => {
  process.env.LICENSE_SECRET = 'test-secret-value-long-enough';
});

afterAll(() => {
  process.env.LICENSE_SECRET = ORIGINAL_SECRET;
});

describe('licensing', () => {
  it('round-trips an issued key', () => {
    const key = issueLicense('pro', 'cus_12345');
    const info = verifyLicense(key);
    expect(info?.plan).toBe('pro');
    expect(info?.reference).toBe('cus_12345');
  });

  it('issues agency keys distinctly', () => {
    expect(verifyLicense(issueLicense('agency', 'cus_9'))?.plan).toBe('agency');
  });

  it('rejects a tampered plan segment', () => {
    const key = issueLicense('pro', 'cus_1');
    const forged = key.replace('-PRO-', '-AGENCY-');
    expect(verifyLicense(forged)).toBeNull();
  });

  it('rejects a tampered signature', () => {
    const key = issueLicense('pro', 'cus_1');
    const parts = key.split('-');
    parts[3] = 'A'.repeat(parts[3]?.length ?? 32);
    expect(verifyLicense(parts.join('-'))).toBeNull();
  });

  it('rejects garbage and empty input', () => {
    expect(verifyLicense('')).toBeNull();
    expect(verifyLicense(null)).toBeNull();
    expect(verifyLicense('not-a-key')).toBeNull();
    expect(verifyLicense('CITE-PRO-AAAA-BBBB')).toBeNull();
  });

  it('falls back to the free plan for invalid keys', () => {
    expect(planFromKey('nonsense')).toBe('free');
    expect(planFromKey(issueLicense('pro', 'cus_2'))).toBe('pro');
  });

  it('cannot verify anything once the secret is rotated', () => {
    const key = issueLicense('pro', 'cus_3');
    process.env.LICENSE_SECRET = 'a-different-secret-entirely';
    expect(verifyLicense(key)).toBeNull();
    process.env.LICENSE_SECRET = 'test-secret-value-long-enough';
  });
});
