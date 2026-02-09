/**
 * OMEGA Governance — Badge Tests
 * Phase F — INV-F-09: Badge reflects the REAL gate verdict
 */

import { describe, it, expect } from 'vitest';
import { generateBadge, generateUnknownBadge } from '../../../src/ci/badge/generator.js';
import { DEFAULT_CI_CONFIG } from '../../../src/ci/config.js';
import type { CIResult } from '../../../src/ci/types.js';

function createResult(verdict: 'PASS' | 'FAIL'): CIResult {
  return {
    run_id: 'badge-test',
    baseline_version: 'v1.0.0',
    started_at: '2026-01-15T10:00:00.000Z',
    completed_at: '2026-01-15T10:00:01.000Z',
    duration_ms: 100,
    verdict,
    gates: [],
    config: DEFAULT_CI_CONFIG,
  };
}

describe('Badge Generator', () => {
  it('generates passing badge for PASS verdict', () => {
    const result = createResult('PASS');
    const badge = generateBadge(result);
    expect(badge.status).toBe('passing');
    expect(badge.svg).toContain('passing');
    expect(badge.svg).toContain('<svg');
  });

  it('generates failing badge for FAIL verdict', () => {
    const result = createResult('FAIL');
    const badge = generateBadge(result);
    expect(badge.status).toBe('failing');
    expect(badge.svg).toContain('failing');
  });

  it('INV-F-09: badge status matches verdict', () => {
    const passResult = createResult('PASS');
    const passBadge = generateBadge(passResult);
    expect(passBadge.status).toBe('passing');

    const failResult = createResult('FAIL');
    const failBadge = generateBadge(failResult);
    expect(failBadge.status).toBe('failing');
  });

  it('generates valid SVG', () => {
    const result = createResult('PASS');
    const badge = generateBadge(result);
    expect(badge.svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(badge.svg).toContain('</svg>');
  });

  it('includes shield URL', () => {
    const result = createResult('PASS');
    const badge = generateBadge(result);
    expect(badge.shield_url).toContain('img.shields.io');
  });

  it('includes alt text', () => {
    const result = createResult('PASS');
    const badge = generateBadge(result);
    expect(badge.alt_text).toContain('OMEGA CI');
  });

  it('generates unknown badge', () => {
    const badge = generateUnknownBadge();
    expect(badge.status).toBe('unknown');
    expect(badge.svg).toContain('unknown');
  });

  it('unknown badge has gray color', () => {
    const badge = generateUnknownBadge();
    expect(badge.svg).toContain('#9f9f9f');
  });

  it('badge is deterministic', () => {
    const result = createResult('PASS');
    const badge1 = generateBadge(result);
    const badge2 = generateBadge(result);
    expect(badge1.svg).toBe(badge2.svg);
  });
});
