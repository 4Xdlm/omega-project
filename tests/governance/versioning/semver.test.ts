/**
 * PHASE I — SEMVER TESTS
 * Tests for semantic version parsing and comparison.
 */

import { describe, it, expect } from 'vitest';
import {
  parseSemver,
  formatSemver,
  isValidSemver,
  compareSemver,
  compareVersionStrings,
  detectBumpType,
  isDowngrade
} from '../../../GOVERNANCE/versioning/index.js';

// ─────────────────────────────────────────────────────────────
// PARSING TESTS
// ─────────────────────────────────────────────────────────────

describe('parseSemver', () => {
  it('parses simple version', () => {
    const v = parseSemver('1.2.3');

    expect(v).not.toBeNull();
    expect(v?.major).toBe(1);
    expect(v?.minor).toBe(2);
    expect(v?.patch).toBe(3);
    expect(v?.prerelease).toBeUndefined();
    expect(v?.build).toBeUndefined();
  });

  it('parses version with prerelease', () => {
    const v = parseSemver('1.0.0-alpha');

    expect(v).not.toBeNull();
    expect(v?.prerelease).toBe('alpha');
  });

  it('parses version with complex prerelease', () => {
    const v = parseSemver('1.0.0-alpha.1.beta.2');

    expect(v).not.toBeNull();
    expect(v?.prerelease).toBe('alpha.1.beta.2');
  });

  it('parses version with build metadata', () => {
    const v = parseSemver('1.0.0+build123');

    expect(v).not.toBeNull();
    expect(v?.build).toBe('build123');
  });

  it('parses version with prerelease and build', () => {
    const v = parseSemver('1.0.0-rc.1+20260204');

    expect(v).not.toBeNull();
    expect(v?.prerelease).toBe('rc.1');
    expect(v?.build).toBe('20260204');
  });

  it('returns null for invalid version', () => {
    expect(parseSemver('')).toBeNull();
    expect(parseSemver('1.0')).toBeNull();
    expect(parseSemver('v1.0.0')).toBeNull();
    expect(parseSemver('1.0.0.0')).toBeNull();
    expect(parseSemver('a.b.c')).toBeNull();
  });

  it('handles large version numbers', () => {
    const v = parseSemver('100.200.300');

    expect(v?.major).toBe(100);
    expect(v?.minor).toBe(200);
    expect(v?.patch).toBe(300);
  });
});

// ─────────────────────────────────────────────────────────────
// FORMATTING TESTS
// ─────────────────────────────────────────────────────────────

describe('formatSemver', () => {
  it('formats simple version', () => {
    expect(formatSemver({ major: 1, minor: 2, patch: 3 })).toBe('1.2.3');
  });

  it('formats version with prerelease', () => {
    expect(formatSemver({ major: 1, minor: 0, patch: 0, prerelease: 'alpha' })).toBe('1.0.0-alpha');
  });

  it('formats version with build', () => {
    expect(formatSemver({ major: 1, minor: 0, patch: 0, build: 'build123' })).toBe('1.0.0+build123');
  });

  it('formats version with both prerelease and build', () => {
    expect(formatSemver({ major: 1, minor: 0, patch: 0, prerelease: 'rc.1', build: '123' })).toBe('1.0.0-rc.1+123');
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATION TESTS
// ─────────────────────────────────────────────────────────────

describe('isValidSemver', () => {
  it('validates correct versions', () => {
    expect(isValidSemver('0.0.0')).toBe(true);
    expect(isValidSemver('1.0.0')).toBe(true);
    expect(isValidSemver('1.2.3')).toBe(true);
    expect(isValidSemver('1.0.0-alpha')).toBe(true);
    expect(isValidSemver('1.0.0+build')).toBe(true);
  });

  it('rejects invalid versions', () => {
    expect(isValidSemver('')).toBe(false);
    expect(isValidSemver('1')).toBe(false);
    expect(isValidSemver('1.0')).toBe(false);
    expect(isValidSemver('v1.0.0')).toBe(false);
    expect(isValidSemver('1.0.0.0')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// COMPARISON TESTS
// ─────────────────────────────────────────────────────────────

describe('compareSemver', () => {
  it('compares by major version', () => {
    const v1 = parseSemver('1.0.0')!;
    const v2 = parseSemver('2.0.0')!;

    expect(compareSemver(v1, v2)).toBe(-1);
    expect(compareSemver(v2, v1)).toBe(1);
  });

  it('compares by minor version', () => {
    const v1 = parseSemver('1.1.0')!;
    const v2 = parseSemver('1.2.0')!;

    expect(compareSemver(v1, v2)).toBe(-1);
    expect(compareSemver(v2, v1)).toBe(1);
  });

  it('compares by patch version', () => {
    const v1 = parseSemver('1.0.1')!;
    const v2 = parseSemver('1.0.2')!;

    expect(compareSemver(v1, v2)).toBe(-1);
    expect(compareSemver(v2, v1)).toBe(1);
  });

  it('equal versions return 0', () => {
    const v1 = parseSemver('1.2.3')!;
    const v2 = parseSemver('1.2.3')!;

    expect(compareSemver(v1, v2)).toBe(0);
  });

  it('prerelease is less than release', () => {
    const pre = parseSemver('1.0.0-alpha')!;
    const rel = parseSemver('1.0.0')!;

    expect(compareSemver(pre, rel)).toBe(-1);
    expect(compareSemver(rel, pre)).toBe(1);
  });

  it('compares prereleases lexically', () => {
    const alpha = parseSemver('1.0.0-alpha')!;
    const beta = parseSemver('1.0.0-beta')!;

    expect(compareSemver(alpha, beta)).toBe(-1);
  });
});

describe('compareVersionStrings', () => {
  it('compares valid version strings', () => {
    expect(compareVersionStrings('1.0.0', '2.0.0')).toBe(-1);
    expect(compareVersionStrings('2.0.0', '1.0.0')).toBe(1);
    expect(compareVersionStrings('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns null for invalid versions', () => {
    expect(compareVersionStrings('invalid', '1.0.0')).toBeNull();
    expect(compareVersionStrings('1.0.0', 'invalid')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// BUMP DETECTION TESTS
// ─────────────────────────────────────────────────────────────

describe('detectBumpType', () => {
  it('detects major bump', () => {
    expect(detectBumpType('1.0.0', '2.0.0')).toBe('major');
    expect(detectBumpType('1.9.9', '2.0.0')).toBe('major');
  });

  it('detects minor bump', () => {
    expect(detectBumpType('1.0.0', '1.1.0')).toBe('minor');
    expect(detectBumpType('1.0.9', '1.1.0')).toBe('minor');
  });

  it('detects patch bump', () => {
    expect(detectBumpType('1.0.0', '1.0.1')).toBe('patch');
    expect(detectBumpType('1.0.0', '1.0.10')).toBe('patch');
  });

  it('returns null for downgrade', () => {
    expect(detectBumpType('2.0.0', '1.0.0')).toBeNull();
  });

  it('returns null for same version', () => {
    expect(detectBumpType('1.0.0', '1.0.0')).toBeNull();
  });

  it('returns null for invalid versions', () => {
    expect(detectBumpType('invalid', '1.0.0')).toBeNull();
    expect(detectBumpType('1.0.0', 'invalid')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// DOWNGRADE DETECTION TESTS
// ─────────────────────────────────────────────────────────────

describe('isDowngrade', () => {
  it('detects major downgrade', () => {
    expect(isDowngrade('2.0.0', '1.0.0')).toBe(true);
    expect(isDowngrade('2.0.0', '1.9.9')).toBe(true);
  });

  it('detects minor downgrade', () => {
    expect(isDowngrade('1.2.0', '1.1.0')).toBe(true);
    expect(isDowngrade('1.2.0', '1.1.9')).toBe(true);
  });

  it('detects patch downgrade', () => {
    expect(isDowngrade('1.0.2', '1.0.1')).toBe(true);
  });

  it('upgrade is not downgrade', () => {
    expect(isDowngrade('1.0.0', '1.0.1')).toBe(false);
    expect(isDowngrade('1.0.0', '1.1.0')).toBe(false);
    expect(isDowngrade('1.0.0', '2.0.0')).toBe(false);
  });

  it('same version is not downgrade', () => {
    expect(isDowngrade('1.0.0', '1.0.0')).toBe(false);
  });
});
