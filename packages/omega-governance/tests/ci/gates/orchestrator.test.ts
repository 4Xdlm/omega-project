/**
 * OMEGA Governance — Orchestrator Tests
 * Phase F — INV-F-04: Gates execute sequentially G0→G5, fail-fast.
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, createFixtureRun } from '../../fixtures/helpers.js';
import { registerBaseline } from '../../../src/ci/baseline/register.js';
import { executeGates } from '../../../src/ci/gates/orchestrator.js';
import { DEFAULT_CI_CONFIG, createCIConfig } from '../../../src/ci/config.js';
import { GATE_ORDER } from '../../../src/ci/gates/types.js';
import type { GateContext } from '../../../src/ci/gates/types.js';
import type { BaselineThresholds } from '../../../src/ci/baseline/types.js';

function setupIdenticalEnv() {
  const tmp = createTempDir('orch');
  const baselinesDir = join(tmp, 'baselines');
  mkdirSync(baselinesDir, { recursive: true });

  const runDir = join(tmp, 'run');
  mkdirSync(runDir, { recursive: true });
  const intent = join(runDir, 'intent_minimal');
  mkdirSync(intent, { recursive: true });
  writeFileSync(join(intent, 'intent.json'), JSON.stringify({ title: 'Minimal' }), 'utf-8');

  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, '2026-01-15T10:00:00.000Z');

  const baseDir = createTempDir('orch-base');
  const candDir = createTempDir('orch-cand');
  const baselineRunDir = createFixtureRun(baseDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });
  const candidateRunDir = createFixtureRun(candDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });

  return {
    ctx: {
      baselineDir: baselineRunDir,
      candidateDir: candidateRunDir,
      baselinesDir,
      baselineVersion: 'v1.0.0',
      seed: 'omega-ci',
    } as GateContext,
  };
}

describe('Gate Orchestrator', () => {
  it('all gates pass for identical runs', () => {
    const { ctx } = setupIdenticalEnv();
    const result = executeGates(ctx, DEFAULT_CI_CONFIG);
    expect(result.verdict).toBe('PASS');
    expect(result.gates).toHaveLength(6);
    expect(result.gates.every((g) => g.verdict === 'PASS')).toBe(true);
  });

  it('INV-F-04: gates execute in order G0→G5', () => {
    const { ctx } = setupIdenticalEnv();
    const result = executeGates(ctx, DEFAULT_CI_CONFIG);
    for (let i = 0; i < GATE_ORDER.length; i++) {
      expect(result.gates[i].gate).toBe(GATE_ORDER[i]);
    }
  });

  it('INV-F-04: fail-fast skips remaining gates', () => {
    const { ctx } = setupIdenticalEnv();
    const badCtx = { ...ctx, baselineVersion: 'v99.0.0' };
    const result = executeGates(badCtx, DEFAULT_CI_CONFIG);
    expect(result.verdict).toBe('FAIL');
    expect(result.failed_gate).toBe('G0');
    // G0 FAIL, G1-G5 SKIPPED
    expect(result.gates[0].verdict).toBe('FAIL');
    for (let i = 1; i < result.gates.length; i++) {
      expect(result.gates[i].verdict).toBe('SKIPPED');
    }
  });

  it('without fail-fast, continues after failure', () => {
    const { ctx } = setupIdenticalEnv();
    const noFailFast = createCIConfig({ FAIL_FAST: false });
    const badCtx = { ...ctx, baselineVersion: 'v99.0.0' };
    const result = executeGates(badCtx, noFailFast);
    expect(result.verdict).toBe('FAIL');
    // G0 should fail but other gates should still attempt to run
    expect(result.gates[0].verdict).toBe('FAIL');
  });

  it('reports duration_ms', () => {
    const { ctx } = setupIdenticalEnv();
    const result = executeGates(ctx, DEFAULT_CI_CONFIG);
    expect(result.duration_ms).toBeGreaterThanOrEqual(0);
  });

  it('fail-fast with G1 failure skips G2-G5', () => {
    const { ctx } = setupIdenticalEnv();
    const diffDir = createTempDir('orch-diff');
    const diffRun = createFixtureRun(diffDir, { runId: 'bbbb000000000002', seed: 'omega-ci', forgeScore: 0.50 });
    const diffCtx = { ...ctx, candidateDir: diffRun };
    const result = executeGates(diffCtx, DEFAULT_CI_CONFIG);
    expect(result.verdict).toBe('FAIL');
    expect(result.failed_gate).toBe('G1');
    const skipped = result.gates.filter((g) => g.verdict === 'SKIPPED');
    expect(skipped.length).toBeGreaterThanOrEqual(3);
  });
});
