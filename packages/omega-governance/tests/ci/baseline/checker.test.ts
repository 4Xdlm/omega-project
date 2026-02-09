/**
 * OMEGA Governance — Baseline Checker Tests
 * Phase F — Integrity verification
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createTempDir } from '../../fixtures/helpers.js';
import { checkBaselineIntegrity, readBaselineManifest } from '../../../src/ci/baseline/checker.js';
import { registerBaseline } from '../../../src/ci/baseline/register.js';
import { readRegistry, findBaseline } from '../../../src/ci/baseline/registry.js';
import type { BaselineThresholds, BaselineEntry } from '../../../src/ci/baseline/types.js';

function createRunDir(baseDir: string): string {
  const runDir = join(baseDir, 'run');
  mkdirSync(runDir, { recursive: true });
  const intent1 = join(runDir, 'intent_minimal');
  mkdirSync(intent1, { recursive: true });
  writeFileSync(join(intent1, 'intent.json'), JSON.stringify({ title: 'Minimal' }), 'utf-8');
  return runDir;
}

describe('Baseline Checker', () => {
  let baselinesDir: string;
  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  const timestamp = '2026-01-15T10:00:00.000Z';

  beforeEach(() => {
    const tmp = createTempDir('checker');
    baselinesDir = join(tmp, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    const runDir = createRunDir(tmp);
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
  });

  it('passes integrity check for valid baseline', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const result = checkBaselineIntegrity(baselinesDir, entry);
    expect(result.valid).toBe(true);
  });

  it('fails when directory missing', () => {
    const entry: BaselineEntry = {
      version: 'v99.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [],
    };
    const result = checkBaselineIntegrity(baselinesDir, entry);
    expect(result.valid).toBe(false);
    expect(result.checks.some((c) => c.check === 'DIR_EXISTS' && c.status === 'FAIL')).toBe(true);
  });

  it('fails when manifest missing', () => {
    const vDir = join(baselinesDir, 'v2.0.0');
    mkdirSync(vDir, { recursive: true });
    const entry: BaselineEntry = {
      version: 'v2.0.0', path: '', created_at: '', manifest_hash: '', certified: true, intents: [],
    };
    const result = checkBaselineIntegrity(baselinesDir, entry);
    expect(result.valid).toBe(false);
    expect(result.checks.some((c) => c.check === 'MANIFEST_EXISTS' && c.status === 'FAIL')).toBe(true);
  });

  it('fails on manifest hash mismatch', () => {
    const registry = readRegistry(baselinesDir);
    const entry: BaselineEntry = {
      ...registry.baselines[0],
      manifest_hash: 'ff'.repeat(32),
    };
    const result = checkBaselineIntegrity(baselinesDir, entry);
    expect(result.checks.some((c) => c.check === 'MANIFEST_HASH' && c.status === 'FAIL')).toBe(true);
  });

  it('checks intent presence', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const result = checkBaselineIntegrity(baselinesDir, entry);
    const intentChecks = result.checks.filter((c) => c.check.startsWith('INTENT:'));
    expect(intentChecks.length).toBeGreaterThan(0);
    expect(intentChecks.every((c) => c.status === 'PASS')).toBe(true);
  });

  it('checks thresholds file presence', () => {
    const registry = readRegistry(baselinesDir);
    const entry = findBaseline(registry, 'v1.0.0')!;
    const result = checkBaselineIntegrity(baselinesDir, entry);
    expect(result.checks.some((c) => c.check === 'THRESHOLDS' && c.status === 'PASS')).toBe(true);
  });
});

describe('readBaselineManifest', () => {
  it('reads manifest from disk', () => {
    const tmp = createTempDir('manifest-reader');
    const baselinesDir = join(tmp, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    const runDir = createRunDir(tmp);
    const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, '2026-01-15T10:00:00.000Z');

    const manifest = readBaselineManifest(baselinesDir, 'v1.0.0');
    expect(manifest.version).toBe('v1.0.0');
    expect(manifest.hash).toHaveLength(64);
  });
});
