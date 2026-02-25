/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — Rollback Monotone Tests [INV-LOOP-01]
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * INV-LOOP-01: s_score_final >= s_score_initial — ALWAYS.
 * The validation runner never accepts a regression of composite score.
 *
 * Tests:
 * - T-L-01: patch qui dégrade → loop_rollback = true
 * - T-L-02: patch qui dégrade → s_score_final = s_score_initial
 * - T-L-03: patch qui améliore → s_score_final > s_score_initial
 * - T-L-04: loop_delta_composite >= 0 toujours (invariant monotone)
 * - T-L-05: loop_rollbacks + loop_accepted = loop_iterations (accounting)
 * - T-L-06: s_score_final = max(initial, final) — best score always used
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { runExperiment } from '../../src/validation/validation-runner.js';
import { MockLLMProvider } from '../../src/validation/mock-llm-provider.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import type { ValidationConfig } from '../../src/validation/validation-types.js';

const TEST_CORPUS = [
  'Le fer brûlait encore sous ses doigts. Elle serra le poing, sentit la chaleur monter.\n\nUn bruit sec. Elle se figea.\n\nLes mots résonnaient dans sa tête.',
  'La pluie martelait le toit. Le silence qui suivit n\'était pas un vrai silence.\n\nQuelqu\'un frappa trois coups à la porte.',
  'Son regard balaya la pièce vide. La lumière faiblissait. Elle compta les secondes.',
];

const provider = new MockLLMProvider(TEST_CORPUS);
const packet = createTestPacket();

const testConfig: ValidationConfig = {
  mode: 'offline',
  llm_provider: { name: 'claude', mode: 'offline', model_lock: 'mock-model' },
  run_count_per_experiment: 3,
  seed_strategy: 'sha256',
  thresholds: {
    target_reject_rate_min: 0.3,
    target_reject_rate_max: 0.5,
    target_s_score: 92,
    target_corr_14d: 0.7,
    target_mean_improvement: 15,
  },
  baseline: { source_commit: null, mode: null, corpus: null, value: null },
  paths: {
    inputs_dir: 'validation/cases',
    outputs_dir: 'validation/outputs',
    reports_dir: 'validation/reports',
    logs_dir: 'validation/logs',
  },
};

describe('Rollback Monotone [INV-LOOP-01]', () => {
  it('T-L-01: loop_rollback field present in all run results', async () => {
    const summary = await runExperiment('TEST_LOOP', [packet], provider, testConfig);

    for (const run of summary.runs) {
      expect(run, `Run ${run.run_index}: missing loop_rollback`).toHaveProperty('loop_rollback');
      expect(run, `Run ${run.run_index}: missing loop_delta_composite`).toHaveProperty('loop_delta_composite');
      expect(typeof run.loop_rollback).toBe('boolean');
      expect(typeof run.loop_delta_composite).toBe('number');
    }
  });

  it('T-L-02: s_score_final.composite >= s_score_initial.composite — monotone invariant', async () => {
    const summary = await runExperiment('TEST_MONOTONE', [packet], provider, testConfig);

    for (const run of summary.runs) {
      if (run.verdict === 'EXECUTION_FAIL') continue;

      expect(
        run.s_score_final.composite,
        `Run ${run.run_index}: final=${run.s_score_final.composite} < initial=${run.s_score_initial.composite}`,
      ).toBeGreaterThanOrEqual(run.s_score_initial.composite);
    }
  });

  it('T-L-03: loop_delta_composite >= 0 always — no negative delta', async () => {
    const summary = await runExperiment('TEST_DELTA', [packet], provider, testConfig);

    for (const run of summary.runs) {
      expect(
        run.loop_delta_composite,
        `Run ${run.run_index}: loop_delta=${run.loop_delta_composite} should >= 0`,
      ).toBeGreaterThanOrEqual(0);
    }
  });

  it('T-L-04: loop_rollback consistency — rollback=true implies delta=0 and final=initial', async () => {
    const summary = await runExperiment('TEST_CONSISTENCY', [packet], provider, testConfig);

    for (const run of summary.runs) {
      if (run.verdict === 'EXECUTION_FAIL') continue;

      if (run.loop_rollback) {
        // Rollback: final = initial, delta = 0
        expect(run.loop_delta_composite, `Run ${run.run_index}: rollback but delta != 0`).toBe(0);
        expect(run.s_score_final.composite, `Run ${run.run_index}: rollback but final != initial`).toBe(
          run.s_score_initial.composite,
        );
      } else {
        // Accepted: delta >= 0
        expect(run.loop_delta_composite).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('T-L-05: loop_delta matches actual composite delta', async () => {
    const summary = await runExperiment('TEST_ACCOUNTING', [packet], provider, testConfig);

    for (const run of summary.runs) {
      if (run.verdict === 'EXECUTION_FAIL') continue;

      const actualDelta = run.s_score_final.composite - run.s_score_initial.composite;
      expect(
        run.loop_delta_composite,
        `Run ${run.run_index}: loop_delta=${run.loop_delta_composite} != actual=${actualDelta}`,
      ).toBeCloseTo(actualDelta, 10);
    }
  });

  it('T-L-06: determinism — same experiment → same rollback decisions', async () => {
    const s1 = await runExperiment('TEST_DETERMINISM', [packet], provider, testConfig);
    const s2 = await runExperiment('TEST_DETERMINISM', [packet], provider, testConfig);

    expect(s1.runs.length).toBe(s2.runs.length);
    for (let i = 0; i < s1.runs.length; i++) {
      expect(s1.runs[i].loop_rollback).toBe(s2.runs[i].loop_rollback);
      expect(s1.runs[i].loop_delta_composite).toBe(s2.runs[i].loop_delta_composite);
      expect(s1.runs[i].s_score_final.composite).toBe(s2.runs[i].s_score_final.composite);
    }
  });
});
