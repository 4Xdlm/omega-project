/**
 * OMEGA Release — Version Validator Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { validateVersion, validatePrerelease } from '../../src/version/validator.js';

describe('validateVersion', () => {
  it('accepts valid SemVer', () => {
    const result = validateVersion('1.0.0');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects empty string', () => {
    const result = validateVersion('');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('rejects v-prefix', () => {
    const result = validateVersion('v1.0.0');
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('v'))).toBe(true);
  });

  it('rejects non-SemVer', () => {
    const result = validateVersion('not.valid');
    expect(result.valid).toBe(false);
  });

  it('accepts version with prerelease', () => {
    const result = validateVersion('1.0.0-alpha.1');
    expect(result.valid).toBe(true);
  });
});

describe('validatePrerelease', () => {
  it('accepts valid prerelease', () => {
    expect(validatePrerelease('alpha.1')).toBe(true);
  });

  it('accepts empty (no prerelease)', () => {
    expect(validatePrerelease('')).toBe(true);
  });

  it('rejects leading-zero numeric', () => {
    expect(validatePrerelease('01')).toBe(false);
  });
});
