/**
 * OMEGA Governance — Baseline Registration Tests
 * Phase F — INV-F-08: Baselines are immutable once registered
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir } from '../../fixtures/helpers.js';
import { registerBaseline } from '../../../src/ci/baseline/register.js';
import { readRegistry } from '../../../src/ci/baseline/registry.js';
import type { BaselineThresholds } from '../../../src/ci/baseline/types.js';

function createRunDir(baseDir: string): string {
  const runDir = join(baseDir, 'run');
  mkdirSync(runDir, { recursive: true });

  const intent1 = join(runDir, 'intent_minimal');
  mkdirSync(intent1, { recursive: true });
  writeFileSync(join(intent1, 'intent.json'), JSON.stringify({ title: 'Minimal', themes: ['test'] }), 'utf-8');

  const intent2 = join(runDir, 'intent_standard');
  mkdirSync(intent2, { recursive: true });
  writeFileSync(join(intent2, 'intent.json'), JSON.stringify({ title: 'Standard', themes: ['test', 'narrative'] }), 'utf-8');

  return runDir;
}

describe('Baseline Registration', () => {
  let baselinesDir: string;
  let runDir: string;
  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  const timestamp = '2026-01-15T10:00:00.000Z';

  beforeEach(() => {
    const tmp = createTempDir('register');
    baselinesDir = join(tmp, 'baselines');
    mkdirSync(baselinesDir, { recursive: true });
    runDir = createRunDir(tmp);
  });

  it('registers a new baseline successfully', () => {
    const entry = registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    expect(entry.version).toBe('v1.0.0');
    expect(entry.certified).toBe(true);
    expect(entry.intents.length).toBeGreaterThan(0);
    expect(entry.manifest_hash).toHaveLength(64);
  });

  it('creates baseline directory with manifest files', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    expect(existsSync(join(baselinesDir, 'v1.0.0', 'baseline.manifest.json'))).toBe(true);
    expect(existsSync(join(baselinesDir, 'v1.0.0', 'baseline.manifest.sha256'))).toBe(true);
    expect(existsSync(join(baselinesDir, 'v1.0.0', 'thresholds.json'))).toBe(true);
  });

  it('copies intent files to baseline directory', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    expect(existsSync(join(baselinesDir, 'v1.0.0', 'intent_minimal', 'intent.json'))).toBe(true);
    expect(existsSync(join(baselinesDir, 'v1.0.0', 'intent_standard', 'intent.json'))).toBe(true);
  });

  it('updates registry with new entry', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    const registry = readRegistry(baselinesDir);
    expect(registry.baselines).toHaveLength(1);
    expect(registry.baselines[0].version).toBe('v1.0.0');
  });

  it('manifest hash matches stored SHA256 file', () => {
    const entry = registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    const storedHash = readFileSync(join(baselinesDir, 'v1.0.0', 'baseline.manifest.sha256'), 'utf-8');
    expect(storedHash).toBe(entry.manifest_hash);
  });

  it('INV-F-08: throws on duplicate registration (immutability)', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    expect(() => registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp)).toThrow(/immutable/);
  });

  it('supports multiple baselines', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    registerBaseline(baselinesDir, 'v2.0.0', runDir, thresholds, timestamp);
    const registry = readRegistry(baselinesDir);
    expect(registry.baselines).toHaveLength(2);
  });

  it('stores thresholds correctly', () => {
    registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, timestamp);
    const stored = JSON.parse(readFileSync(join(baselinesDir, 'v1.0.0', 'thresholds.json'), 'utf-8'));
    expect(stored.min_forge_score).toBe(0.7);
    expect(stored.max_duration_ms).toBe(60000);
    expect(stored.max_variance).toBe(5);
  });
});
