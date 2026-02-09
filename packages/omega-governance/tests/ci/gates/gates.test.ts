/**
 * OMEGA Governance — Gates Tests
 * Phase F — G0-G5 gate execution
 * INV-F-04: Gates execute sequentially G0→G5, fail-fast.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createTempDir, createFixtureRun } from '../../fixtures/helpers.js';
import { registerBaseline } from '../../../src/ci/baseline/register.js';
import { executeG0 } from '../../../src/ci/gates/g0-precheck.js';
import { executeG1 } from '../../../src/ci/gates/g1-replay.js';
import { executeG2 } from '../../../src/ci/gates/g2-compare.js';
import { executeG3 } from '../../../src/ci/gates/g3-drift.js';
import { executeG4 } from '../../../src/ci/gates/g4-bench.js';
import { executeG5 } from '../../../src/ci/gates/g5-certify.js';
import { DEFAULT_CI_CONFIG } from '../../../src/ci/config.js';
import type { GateContext } from '../../../src/ci/gates/types.js';
import type { BaselineThresholds } from '../../../src/ci/baseline/types.js';

function setupTestEnv() {
  const tmp = createTempDir('gates');
  const baselinesDir = join(tmp, 'baselines');
  mkdirSync(baselinesDir, { recursive: true });

  // Create run directory for baseline registration
  const runDir = join(tmp, 'run');
  mkdirSync(runDir, { recursive: true });
  const intent = join(runDir, 'intent_minimal');
  mkdirSync(intent, { recursive: true });
  writeFileSync(join(intent, 'intent.json'), JSON.stringify({ title: 'Minimal' }), 'utf-8');

  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, '2026-01-15T10:00:00.000Z');

  // Create identical baseline and candidate ProofPacks
  const baseDir = createTempDir('gates-base');
  const candDir = createTempDir('gates-cand');
  const baselineRunDir = createFixtureRun(baseDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });
  const candidateRunDir = createFixtureRun(candDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });

  const ctx: GateContext = {
    baselineDir: baselineRunDir,
    candidateDir: candidateRunDir,
    baselinesDir,
    baselineVersion: 'v1.0.0',
    seed: 'omega-ci',
  };

  return { ctx, baselinesDir, baselineRunDir, candidateRunDir };
}

describe('Gate G0 — Pre-check', () => {
  it('passes when baseline exists and is certified', () => {
    const { ctx } = setupTestEnv();
    const result = executeG0(ctx);
    expect(result.gate).toBe('G0');
    expect(result.verdict).toBe('PASS');
  });

  it('fails when baseline version not in registry', () => {
    const { ctx, baselinesDir } = setupTestEnv();
    const badCtx = { ...ctx, baselineVersion: 'v99.0.0' };
    const result = executeG0(badCtx);
    expect(result.verdict).toBe('FAIL');
  });

  it('reports checks', () => {
    const { ctx } = setupTestEnv();
    const result = executeG0(ctx);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});

describe('Gate G1 — Replay', () => {
  it('passes for identical runs', () => {
    const { ctx } = setupTestEnv();
    const result = executeG1(ctx, DEFAULT_CI_CONFIG);
    expect(result.gate).toBe('G1');
    expect(result.verdict).toBe('PASS');
  });

  it('fails for different runs', () => {
    const { ctx } = setupTestEnv();
    const diffDir = createTempDir('gates-diff');
    const diffRun = createFixtureRun(diffDir, { runId: 'bbbb000000000002', seed: 'omega-ci', forgeScore: 0.50 });
    const diffCtx = { ...ctx, candidateDir: diffRun };
    const result = executeG1(diffCtx, DEFAULT_CI_CONFIG);
    expect(result.verdict).toBe('FAIL');
  });
});

describe('Gate G2 — Compare', () => {
  it('passes for identical runs', () => {
    const { ctx } = setupTestEnv();
    const result = executeG2(ctx);
    expect(result.gate).toBe('G2');
    expect(result.verdict).toBe('PASS');
  });

  it('fails for different runs', () => {
    const { ctx } = setupTestEnv();
    const diffDir = createTempDir('g2-diff');
    const diffRun = createFixtureRun(diffDir, { runId: 'cccc000000000003', seed: 'omega-ci', forgeScore: 0.50 });
    const diffCtx = { ...ctx, candidateDir: diffRun };
    const result = executeG2(diffCtx);
    expect(result.verdict).toBe('FAIL');
  });
});

describe('Gate G3 — Drift', () => {
  it('passes for identical runs (NO_DRIFT)', () => {
    const { ctx } = setupTestEnv();
    const result = executeG3(ctx, DEFAULT_CI_CONFIG);
    expect(result.gate).toBe('G3');
    expect(result.verdict).toBe('PASS');
  });

  it('reports drift details', () => {
    const { ctx } = setupTestEnv();
    const result = executeG3(ctx, DEFAULT_CI_CONFIG);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});

describe('Gate G4 — Benchmark', () => {
  it('passes when scores match', () => {
    const { ctx } = setupTestEnv();
    const result = executeG4(ctx, DEFAULT_CI_CONFIG);
    expect(result.gate).toBe('G4');
    expect(result.verdict).toBe('PASS');
  });

  it('fails when candidate has no forge report', () => {
    const { ctx } = setupTestEnv();
    const noForgeDir = createTempDir('g4-noforge');
    const noForgeRun = createFixtureRun(noForgeDir, { runId: 'dddd000000000004', includeForge: false });
    const noForgeCtx = { ...ctx, candidateDir: noForgeRun };
    const result = executeG4(noForgeCtx, DEFAULT_CI_CONFIG);
    expect(result.verdict).toBe('FAIL');
  });
});

describe('Gate G5 — Certify', () => {
  it('passes for valid run', () => {
    const { ctx } = setupTestEnv();
    const result = executeG5(ctx, DEFAULT_CI_CONFIG);
    expect(result.gate).toBe('G5');
    expect(result.verdict).toBe('PASS');
  });

  it('reports certificate checks', () => {
    const { ctx } = setupTestEnv();
    const result = executeG5(ctx, DEFAULT_CI_CONFIG);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});
