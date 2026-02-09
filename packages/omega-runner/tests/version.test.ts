/**
 * OMEGA Runner — Version Tests
 * Phase D.1 — 6 tests for version management
 */

import { describe, it, expect } from 'vitest';
import { RUNNER_VERSION, getVersionMap } from '../src/version.js';

describe('version', () => {
  it('RUNNER_VERSION is semver format', () => {
    expect(RUNNER_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('getVersionMap returns all 6 entries', () => {
    const map = getVersionMap();
    expect(Object.keys(map)).toHaveLength(6);
    expect(map.runner).toBeDefined();
    expect(map.genesis).toBeDefined();
    expect(map.scribe).toBeDefined();
    expect(map.style).toBeDefined();
    expect(map.creation).toBeDefined();
    expect(map.forge).toBeDefined();
  });

  it('getVersionMap values are semver', () => {
    const map = getVersionMap();
    for (const value of Object.values(map)) {
      expect(value).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it('getVersionMap is deterministic', () => {
    const map1 = getVersionMap();
    const map2 = getVersionMap();
    expect(map1).toEqual(map2);
  });

  it('runner version matches', () => {
    const map = getVersionMap();
    expect(map.runner).toBe(RUNNER_VERSION);
  });

  it('all versions are 0.1.0 for D.1', () => {
    const map = getVersionMap();
    for (const value of Object.values(map)) {
      expect(value).toBe('0.1.0');
    }
  });
});
