/**
 * OMEGA Release — Version Comparator Tests
 * Phase G.0 — INV-G0-03: VERSION_MONOTONIC
 */

import { describe, it, expect } from 'vitest';
import { compareSemVer, isGreaterThan, isEqual, sortVersions } from '../../src/version/comparator.js';
import { parseSemVer } from '../../src/version/parser.js';

describe('compareSemVer', () => {
  it('equal versions return 0', () => {
    expect(compareSemVer(parseSemVer('1.0.0'), parseSemVer('1.0.0'))).toBe(0);
  });

  it('major version difference', () => {
    expect(compareSemVer(parseSemVer('2.0.0'), parseSemVer('1.0.0'))).toBe(1);
    expect(compareSemVer(parseSemVer('1.0.0'), parseSemVer('2.0.0'))).toBe(-1);
  });

  it('minor version difference', () => {
    expect(compareSemVer(parseSemVer('1.2.0'), parseSemVer('1.1.0'))).toBe(1);
  });

  it('patch version difference', () => {
    expect(compareSemVer(parseSemVer('1.0.2'), parseSemVer('1.0.1'))).toBe(1);
  });

  it('release > prerelease', () => {
    expect(compareSemVer(parseSemVer('1.0.0'), parseSemVer('1.0.0-alpha'))).toBe(1);
  });

  it('prerelease < release', () => {
    expect(compareSemVer(parseSemVer('1.0.0-alpha'), parseSemVer('1.0.0'))).toBe(-1);
  });

  it('alpha < beta', () => {
    expect(compareSemVer(parseSemVer('1.0.0-alpha'), parseSemVer('1.0.0-beta'))).toBe(-1);
  });

  it('numeric prerelease comparison', () => {
    expect(compareSemVer(parseSemVer('1.0.0-1'), parseSemVer('1.0.0-2'))).toBe(-1);
  });
});

describe('isGreaterThan', () => {
  it('with strings', () => {
    expect(isGreaterThan('2.0.0', '1.0.0')).toBe(true);
    expect(isGreaterThan('1.0.0', '2.0.0')).toBe(false);
  });

  it('equal is not greater', () => {
    expect(isGreaterThan('1.0.0', '1.0.0')).toBe(false);
  });
});

describe('isEqual', () => {
  it('equal versions', () => {
    expect(isEqual('1.0.0', '1.0.0')).toBe(true);
  });

  it('different versions', () => {
    expect(isEqual('1.0.0', '1.0.1')).toBe(false);
  });
});

describe('sortVersions', () => {
  it('sorts ascending', () => {
    const sorted = sortVersions(['2.0.0', '1.0.0', '1.1.0', '0.9.0']);
    expect(sorted).toEqual(['0.9.0', '1.0.0', '1.1.0', '2.0.0']);
  });

  it('handles prerelease', () => {
    const sorted = sortVersions(['1.0.0', '1.0.0-alpha', '1.0.0-beta']);
    expect(sorted).toEqual(['1.0.0-alpha', '1.0.0-beta', '1.0.0']);
  });
});
