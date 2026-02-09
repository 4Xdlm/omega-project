/**
 * OMEGA Governance — CI Integration Tests
 * Phase F — End-to-end CI pipeline
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { createTempDir, createFixtureRun } from '../fixtures/helpers.js';
import { registerBaseline } from '../../src/ci/baseline/register.js';
import { executeGates } from '../../src/ci/gates/orchestrator.js';
import { generateJSONReport } from '../../src/ci/reporter/json-reporter.js';
import { generateMarkdownReport } from '../../src/ci/reporter/markdown-reporter.js';
import { generateBadge } from '../../src/ci/badge/generator.js';
import { DEFAULT_CI_CONFIG, createCIConfig } from '../../src/ci/config.js';
import { checkGatesSequential, checkBadgeReflectsVerdict, checkCIDeterministic } from '../../src/invariants/ci-invariants.js';
import type { GateContext } from '../../src/ci/gates/types.js';
import type { CIResult } from '../../src/ci/types.js';
import type { BaselineThresholds } from '../../src/ci/baseline/types.js';

function setupFullEnv() {
  const tmp = createTempDir('integration');
  const baselinesDir = join(tmp, 'baselines');
  mkdirSync(baselinesDir, { recursive: true });

  const runDir = join(tmp, 'run');
  mkdirSync(runDir, { recursive: true });
  const intent = join(runDir, 'intent_minimal');
  mkdirSync(intent, { recursive: true });
  writeFileSync(join(intent, 'intent.json'), JSON.stringify({ title: 'Minimal' }), 'utf-8');

  const thresholds: BaselineThresholds = { min_forge_score: 0.7, max_duration_ms: 60000, max_variance: 5 };
  registerBaseline(baselinesDir, 'v1.0.0', runDir, thresholds, '2026-01-15T10:00:00.000Z');

  const baseDir = createTempDir('int-base');
  const candDir = createTempDir('int-cand');
  const baselineRunDir = createFixtureRun(baseDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });
  const candidateRunDir = createFixtureRun(candDir, { runId: 'abcdef0123456789', seed: 'omega-ci' });

  const ctx: GateContext = {
    baselineDir: baselineRunDir,
    candidateDir: candidateRunDir,
    baselinesDir,
    baselineVersion: 'v1.0.0',
    seed: 'omega-ci',
  };

  return ctx;
}

function buildCIResult(ctx: GateContext, orch: ReturnType<typeof executeGates>): CIResult {
  return {
    run_id: 'integration-test-001',
    baseline_version: ctx.baselineVersion,
    started_at: '2026-01-15T10:00:00.000Z',
    completed_at: '2026-01-15T10:00:01.000Z',
    duration_ms: orch.duration_ms,
    verdict: orch.verdict,
    gates: orch.gates,
    failed_gate: orch.failed_gate,
    config: DEFAULT_CI_CONFIG,
  };
}

describe('CI Integration — Full Pipeline', () => {
  it('runs full pipeline with identical runs and all gates pass', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    expect(orch.verdict).toBe('PASS');
    expect(orch.gates).toHaveLength(6);
  });

  it('generates JSON report from pipeline result', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    const result = buildCIResult(ctx, orch);
    const report = generateJSONReport(result);
    expect(report.format).toBe('json');
    const parsed = JSON.parse(report.content);
    expect(parsed.result.verdict).toBe('PASS');
  });

  it('generates Markdown report from pipeline result', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    const result = buildCIResult(ctx, orch);
    const report = generateMarkdownReport(result);
    expect(report.content).toContain('# OMEGA CI Report');
  });

  it('generates badge from pipeline result', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    const result = buildCIResult(ctx, orch);
    const badge = generateBadge(result);
    expect(badge.status).toBe('passing');
  });

  it('INV-F-04: gate order verified', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    const invResult = checkGatesSequential(orch.gates);
    expect(invResult.status).toBe('PASS');
  });

  it('INV-F-09: badge matches verdict', () => {
    const ctx = setupFullEnv();
    const orch = executeGates(ctx, DEFAULT_CI_CONFIG);
    const result = buildCIResult(ctx, orch);
    const badge = generateBadge(result);
    const invResult = checkBadgeReflectsVerdict(result, badge);
    expect(invResult.status).toBe('PASS');
  });

  it('INV-F-10: deterministic pipeline (same inputs = same verdicts)', () => {
    const ctx = setupFullEnv();
    const orch1 = executeGates(ctx, DEFAULT_CI_CONFIG);
    const orch2 = executeGates(ctx, DEFAULT_CI_CONFIG);

    // Compare verdicts (excluding timing)
    const hash1 = createHash('sha256').update(JSON.stringify(orch1.gates.map((g) => ({ gate: g.gate, verdict: g.verdict })))).digest('hex');
    const hash2 = createHash('sha256').update(JSON.stringify(orch2.gates.map((g) => ({ gate: g.gate, verdict: g.verdict })))).digest('hex');
    const invResult = checkCIDeterministic(hash1, hash2);
    expect(invResult.status).toBe('PASS');
  });

  it('handles failing pipeline with fail-fast', () => {
    const ctx = setupFullEnv();
    const badCtx = { ...ctx, baselineVersion: 'v99.0.0' };
    const orch = executeGates(badCtx, DEFAULT_CI_CONFIG);
    expect(orch.verdict).toBe('FAIL');
    expect(orch.failed_gate).toBe('G0');
  });
});
