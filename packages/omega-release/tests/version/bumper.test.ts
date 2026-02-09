/**
 * OMEGA Release — Version Bumper Tests
 * Phase G.0 — INV-G0-03: VERSION_MONOTONIC
 */

import { describe, it, expect } from 'vitest';
import { bumpVersion, bumpSemVer, setVersion } from '../../src/version/bumper.js';

describe('bumpVersion', () => {
  it('bumps patch', () => {
    expect(bumpVersion('1.0.0', 'patch')).toBe('1.0.1');
  });

  it('bumps minor (resets patch)', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0');
  });

  it('bumps major (resets minor and patch)', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0');
  });

  it('bumps from 0.x', () => {
    expect(bumpVersion('0.1.0', 'major')).toBe('1.0.0');
  });
});

describe('bumpSemVer', () => {
  it('strips prerelease on bump', () => {
    const result = bumpSemVer({ major: 1, minor: 0, patch: 0, prerelease: 'alpha' }, 'patch');
    expect(result.prerelease).toBeUndefined();
    expect(result.patch).toBe(1);
  });
});

describe('setVersion', () => {
  it('validates and returns formatted version', () => {
    expect(setVersion('  1.2.3  ')).toBe('1.2.3');
  });

  it('throws on invalid version', () => {
    expect(() => setVersion('invalid')).toThrow();
  });
});
