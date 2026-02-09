/**
 * OMEGA Release — Manifest Tests
 * Phase G.0 — INV-G0-10: MANIFEST_INTEGRITY
 */

import { describe, it, expect } from 'vitest';
import { generateManifest, validateManifest, REQUIRED_MANIFEST_FIELDS } from '../../src/release/manifest.js';

describe('generateManifest', () => {
  it('generates manifest with all fields', () => {
    const manifest = generateManifest({
      version: '1.0.0',
      commit: 'abc123',
      platforms: ['win-x64', 'linux-x64'],
      artifacts: [],
      testTotal: 120,
      testPassed: 120,
      invariantTotal: 10,
      invariantVerified: 10,
    });

    expect(manifest.version).toBe('1.0.0');
    expect(manifest.commit).toBe('abc123');
    expect(manifest.tag).toBe('v1.0.0');
    expect(manifest.node_minimum).toBe('18.0.0');
    expect(manifest.hash).toHaveLength(64);
  });

  it('hash is deterministic', () => {
    const params = {
      version: '1.0.0',
      commit: 'abc',
      platforms: ['win-x64'] as const,
      artifacts: [],
      testTotal: 0,
      testPassed: 0,
      invariantTotal: 0,
      invariantVerified: 0,
    };
    const m1 = generateManifest(params);
    const m2 = generateManifest(params);
    expect(m1.hash).toBe(m2.hash);
  });

  it('different params produce different hash', () => {
    const base = {
      commit: 'abc',
      platforms: ['win-x64'] as const,
      artifacts: [],
      testTotal: 0,
      testPassed: 0,
      invariantTotal: 0,
      invariantVerified: 0,
    };
    const m1 = generateManifest({ ...base, version: '1.0.0' });
    const m2 = generateManifest({ ...base, version: '2.0.0' });
    expect(m1.hash).not.toBe(m2.hash);
  });
});

describe('validateManifest', () => {
  it('validates complete manifest', () => {
    const manifest = generateManifest({
      version: '1.0.0',
      commit: 'abc',
      platforms: ['win-x64'],
      artifacts: [],
      testTotal: 0,
      testPassed: 0,
      invariantTotal: 0,
      invariantVerified: 0,
    });
    const result = validateManifest(manifest);
    expect(result.valid).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('has all required fields defined', () => {
    expect(REQUIRED_MANIFEST_FIELDS.length).toBeGreaterThan(0);
  });
});
