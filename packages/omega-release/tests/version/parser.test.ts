/**
 * OMEGA Release — Version Parser Tests
 * Phase G.0 — INV-G0-02: SEMVER_VALID
 */

import { describe, it, expect } from 'vitest';
import { parseSemVer, parseVersionInfo, formatSemVer, isSemVer } from '../../src/version/parser.js';

describe('parseSemVer', () => {
  it('parses simple version', () => {
    const v = parseSemVer('1.0.0');
    expect(v.major).toBe(1);
    expect(v.minor).toBe(0);
    expect(v.patch).toBe(0);
  });

  it('parses version with prerelease', () => {
    const v = parseSemVer('1.0.0-alpha.1');
    expect(v.major).toBe(1);
    expect(v.prerelease).toBe('alpha.1');
  });

  it('parses version with build metadata', () => {
    const v = parseSemVer('1.0.0+build.42');
    expect(v.build).toBe('build.42');
  });

  it('parses version with prerelease and build', () => {
    const v = parseSemVer('2.1.3-beta.2+sha.abc');
    expect(v.major).toBe(2);
    expect(v.minor).toBe(1);
    expect(v.patch).toBe(3);
    expect(v.prerelease).toBe('beta.2');
    expect(v.build).toBe('sha.abc');
  });

  it('trims whitespace', () => {
    const v = parseSemVer('  1.2.3  ');
    expect(v.major).toBe(1);
    expect(v.minor).toBe(2);
    expect(v.patch).toBe(3);
  });

  it('throws on invalid version', () => {
    expect(() => parseSemVer('not-a-version')).toThrow('Invalid SemVer');
  });

  it('throws on v-prefix', () => {
    expect(() => parseSemVer('v1.0.0')).toThrow('Invalid SemVer');
  });

  it('throws on empty string', () => {
    expect(() => parseSemVer('')).toThrow('Invalid SemVer');
  });

  it('parses 0.0.0', () => {
    const v = parseSemVer('0.0.0');
    expect(v.major).toBe(0);
    expect(v.minor).toBe(0);
    expect(v.patch).toBe(0);
  });

  it('parses large numbers', () => {
    const v = parseSemVer('999.888.777');
    expect(v.major).toBe(999);
    expect(v.minor).toBe(888);
    expect(v.patch).toBe(777);
  });
});

describe('formatSemVer', () => {
  it('formats simple version', () => {
    expect(formatSemVer({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
  });

  it('formats with prerelease', () => {
    expect(formatSemVer({ major: 1, minor: 0, patch: 0, prerelease: 'alpha' })).toBe('1.0.0-alpha');
  });

  it('formats with build', () => {
    expect(formatSemVer({ major: 1, minor: 0, patch: 0, build: 'build.1' })).toBe('1.0.0+build.1');
  });

  it('roundtrips parse -> format', () => {
    const version = '2.3.4-beta.1+sha.abc';
    expect(formatSemVer(parseSemVer(version))).toBe(version);
  });
});

describe('isSemVer', () => {
  it('accepts valid versions', () => {
    expect(isSemVer('1.0.0')).toBe(true);
    expect(isSemVer('0.1.0-alpha')).toBe(true);
    expect(isSemVer('10.20.30+build')).toBe(true);
  });

  it('rejects invalid versions', () => {
    expect(isSemVer('v1.0.0')).toBe(false);
    expect(isSemVer('1.0')).toBe(false);
    expect(isSemVer('abc')).toBe(false);
    expect(isSemVer('')).toBe(false);
  });
});

describe('parseVersionInfo', () => {
  it('returns prerelease flag', () => {
    const info = parseVersionInfo('1.0.0-rc.1');
    expect(info.isPrerelease).toBe(true);
    expect(info.raw).toBe('1.0.0-rc.1');
  });

  it('returns no prerelease for stable', () => {
    const info = parseVersionInfo('1.0.0');
    expect(info.isPrerelease).toBe(false);
  });
});
