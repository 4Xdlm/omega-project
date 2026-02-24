/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — Validation Runner Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Phase VALIDATION — Offline Mock Runner
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Invariants couverts:
 * - INV-VAL-01: Determinism (same config → same result)
 * - INV-VAL-02: sealed + rejected + failed = total_runs
 * - INV-VAL-04: model_id = "offline-mock"
 * - INV-VAL-05: 0 modification to sealed engine
 * - INV-VAL-06: Reproducibility (same summary_hash)
 * - INV-VAL-07: baseline.value=null → mean_improvement=null
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect } from 'vitest';
import { runExperiment } from '../../src/validation/validation-runner.js';
import { MockLLMProvider } from '../../src/validation/mock-llm-provider.js';
import { createTestPacket } from '../helpers/test-packet-factory.js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import type { ValidationConfig } from '../../src/validation/validation-types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const TEST_CORPUS = [
  'Le fer brûlait encore sous ses doigts. Elle serra le poing, sentit la chaleur monter dans son avant-bras.\n\nUn bruit sec. Pas à l\'étage. Elle se figea.\n\nLes mots de son père résonnaient dans sa tête.',
  'La pluie martelait le toit de tôle. Le silence qui suivit n\'était pas un vrai silence. C\'était l\'attente.\n\nQuelqu\'un frappa trois coups à la porte. Elle ne bougea pas.',
  'Son cœur battait la chamade. Un frisson parcourut son échine. Le temps sembla s\'arrêter.\n\nElle remarqua que ses mains tremblaient. Les larmes coulèrent sur ses joues.',
];

const provider = new MockLLMProvider(TEST_CORPUS);
const testPacket1 = createTestPacket();
const testPacket2 = createTestPacket();
// Give packet2 a different ID so seeds differ
(testPacket2 as any).packet_id = 'PKT_TEST_PROMPT_002';

const testConfig: ValidationConfig = {
  mode: 'offline',
  llm_provider: {
    name: 'claude',
    mode: 'offline',
    model_lock: 'offline-mock',
  },
  run_count_per_experiment: 4,
  seed_strategy: 'sha256',
  thresholds: {
    target_reject_rate_min: 0.30,
    target_reject_rate_max: 0.50,
    target_s_score: 92,
    target_corr_14d: 0.70,
    target_mean_improvement: 15,
  },
  baseline: {
    source_commit: null,
    mode: null,
    corpus: null,
    value: null,
  },
  paths: {
    inputs_dir: 'validation/cases',
    outputs_dir: 'validation/outputs',
    reports_dir: 'validation/reports',
    logs_dir: 'validation/logs',
  },
};

describe('ValidationRunner — Phase VALIDATION', () => {
  // T01: runExperiment returns valid ExperimentSummary
  it('T01: runExperiment returns valid ExperimentSummary', async () => {
    const summary = await runExperiment('TEST_EXP_01', [testPacket1], provider, testConfig);
    expect(summary.experiment_id).toBe('TEST_EXP_01');
    expect(summary.total_runs).toBeGreaterThan(0);
    expect(typeof summary.mean_s_score_sealed).toBe('number');
    expect(summary.summary_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(summary.mode).toBe('offline');
  });

  // T02: sealed_count + rejected_count + failed_count === total_runs [INV-VAL-02]
  it('T02: sealed + rejected + failed === total_runs [INV-VAL-02]', async () => {
    const summary = await runExperiment('TEST_EXP_02', [testPacket1, testPacket2], provider, testConfig);
    expect(summary.sealed_count + summary.rejected_count + summary.failed_count).toBe(summary.total_runs);
  });

  // T03: reject_rate = rejected_count / total_runs
  it('T03: reject_rate = rejected_count / total_runs', async () => {
    const summary = await runExperiment('TEST_EXP_03', [testPacket1], provider, testConfig);
    const expected = summary.rejected_count / summary.total_runs;
    expect(summary.reject_rate).toBeCloseTo(expected, 10);
  });

  // T04: determinism — same config + corpus → same summary_hash [INV-VAL-06]
  it('T04: determinism — same config → same summary_hash [INV-VAL-06]', async () => {
    const s1 = await runExperiment('TEST_DETERM', [testPacket1], provider, testConfig);
    const s2 = await runExperiment('TEST_DETERM', [testPacket1], provider, testConfig);
    expect(s1.summary_hash).toBe(s2.summary_hash);
  });

  // T05: metamorphic — 2x execution → identical summary_hash [INV-VAL-06]
  it('T05: metamorphic — 2x → identical summary_hash + scores [INV-VAL-06]', async () => {
    const s1 = await runExperiment('TEST_META', [testPacket1], provider, testConfig);
    const s2 = await runExperiment('TEST_META', [testPacket1], provider, testConfig);
    expect(s1.summary_hash).toBe(s2.summary_hash);
    expect(s1.mean_s_score_sealed).toBe(s2.mean_s_score_sealed);
    expect(s1.sealed_count).toBe(s2.sealed_count);
    expect(s1.rejected_count).toBe(s2.rejected_count);
  });

  // T06: model_id="offline-mock" in summary [INV-VAL-04]
  it('T06: model_id="offline-mock" in summary [INV-VAL-04]', async () => {
    const summary = await runExperiment('TEST_MODEL', [testPacket1], provider, testConfig);
    expect(summary.model_id).toBe('offline-mock');
  });

  // T07: baseline.value=null → mean_improvement=null [INV-VAL-07]
  it('T07: baseline.value=null → mean_improvement=null [INV-VAL-07]', async () => {
    const summary = await runExperiment('TEST_BASELINE', [testPacket1], provider, testConfig);
    expect(summary.baseline.value).toBeNull();
    expect(summary.baseline.mean_improvement).toBeNull();
  });

  // T08: proofpack HASHES.sha256 matches disk [INV-VAL-05]
  it('T08: sealed pipeline source unchanged [INV-VAL-05]', () => {
    const hashesPath = resolve(__dirname, '../../proofpack/phase-s-sealed/HASHES.sha256');
    const hashesContent = readFileSync(hashesPath, 'utf-8');
    const lines = hashesContent.trim().split('\n');

    for (const line of lines) {
      const [expectedHash, relPath] = line.split('  ');
      const filePath = resolve(__dirname, '../..', relPath);
      const content = readFileSync(filePath);
      const actualHash = createHash('sha256').update(content).digest('hex');
      expect(actualHash, `Hash mismatch for ${relPath}`).toBe(expectedHash);
    }
  });

  // T09: experiment criteria override — E2 uses anti_cliche criteria [CalibV2]
  it('T09: experiment criteria override — E2 anti_cliche [CalibV2]', async () => {
    const criteriaConfig: ValidationConfig = {
      ...testConfig,
      experiment_criteria: {
        'E2_TEST': {
          primary_axis: 'anti_cliche',
          primary_axis_min: 0.95,
          composite_min: 80,
        },
      },
    };
    const summary = await runExperiment('E2_TEST', [testPacket1], provider, criteriaConfig);
    expect(summary.sealed_count + summary.rejected_count + summary.failed_count).toBe(summary.total_runs);
    for (const run of summary.runs) {
      if (run.verdict === 'SEAL') {
        const acAxis = run.s_score_final.axes.find((a) => a.name === 'anti_cliche');
        expect(acAxis).toBeDefined();
        expect(acAxis!.raw).toBeGreaterThanOrEqual(0.95);
        expect(run.s_score_final.composite).toBeGreaterThanOrEqual(80);
      }
    }
  });

  // T10: experiment criteria override — E1 uses tension_14d criteria [CalibV2]
  it('T10: experiment criteria override — E1 tension_14d [CalibV2]', async () => {
    const criteriaConfig: ValidationConfig = {
      ...testConfig,
      experiment_criteria: {
        'E1_TEST': {
          primary_axis: 'tension_14d',
          primary_axis_min: 0.65,
          composite_min: 85,
        },
      },
    };
    const summary = await runExperiment('E1_TEST', [testPacket1], provider, criteriaConfig);
    expect(summary.sealed_count + summary.rejected_count + summary.failed_count).toBe(summary.total_runs);
    for (const run of summary.runs) {
      if (run.verdict === 'SEAL') {
        const tensionAxis = run.s_score_final.axes.find((a) => a.name === 'tension_14d');
        expect(tensionAxis).toBeDefined();
        expect(tensionAxis!.raw).toBeGreaterThanOrEqual(0.65);
        expect(run.s_score_final.composite).toBeGreaterThanOrEqual(85);
      }
    }
  });

  // T11: E2 composite recomputed WITHOUT tension_14d [CalibV3]
  it('T11: composite_axes_excluded — E2 sans tension_14d [CalibV3]', async () => {
    const criteriaConfig: ValidationConfig = {
      ...testConfig,
      experiment_criteria: {
        'E2_EXCL_TEST': {
          primary_axis: 'anti_cliche',
          primary_axis_min: 0.95,
          composite_min: 80,
          composite_axes_excluded: ['tension_14d'],
        },
      },
    };
    const summary = await runExperiment('E2_EXCL_TEST', [testPacket1], provider, criteriaConfig);
    expect(summary.sealed_count + summary.rejected_count + summary.failed_count).toBe(summary.total_runs);
  });

  // T12: E2 run contains axes_info_only with tension_14d [CalibV3]
  it('T12: axes_info_only contains excluded axis value [CalibV3]', async () => {
    const criteriaConfig: ValidationConfig = {
      ...testConfig,
      experiment_criteria: {
        'E2_INFO_TEST': {
          primary_axis: 'anti_cliche',
          primary_axis_min: 0.95,
          composite_min: 80,
          composite_axes_excluded: ['tension_14d'],
        },
      },
    };
    const summary = await runExperiment('E2_INFO_TEST', [testPacket1], provider, criteriaConfig);
    for (const run of summary.runs) {
      if (run.verdict !== 'EXECUTION_FAIL') {
        expect(run.axes_info_only).toBeDefined();
        expect(typeof run.axes_info_only!.tension_14d).toBe('number');
      }
    }
  });

  // T13: E1/E3 composite WITH all axes (no exclusion) [CalibV3]
  it('T13: no composite_axes_excluded — all axes in composite [CalibV3]', async () => {
    const criteriaConfig: ValidationConfig = {
      ...testConfig,
      experiment_criteria: {
        'E3_FULL_TEST': {
          primary_axis: 'necessite_m8',
          primary_axis_min: 0.75,
          composite_min: 85,
        },
      },
    };
    const summary = await runExperiment('E3_FULL_TEST', [testPacket1], provider, criteriaConfig);
    expect(summary.sealed_count + summary.rejected_count + summary.failed_count).toBe(summary.total_runs);
    for (const run of summary.runs) {
      if (run.verdict !== 'EXECUTION_FAIL') {
        expect(run.axes_info_only).toBeUndefined();
      }
    }
  });

  // T14: composite_p75 computed correctly [CalibV4]
  it('T14: composite_p75 = 75th percentile of non-failed composites [CalibV4]', async () => {
    const summary = await runExperiment('TEST_P75', [testPacket1, testPacket2], provider, testConfig);
    expect(typeof summary.composite_p75).toBe('number');
    // Verify P75: sort composites, take 75th percentile
    const composites = summary.runs
      .filter((r) => r.verdict !== 'EXECUTION_FAIL')
      .map((r) => r.s_score_final.composite)
      .sort((a, b) => a - b);
    const expectedP75 = composites.length > 0
      ? composites[Math.ceil(composites.length * 0.75) - 1]
      : 0;
    expect(summary.composite_p75).toBe(expectedP75);
  });

  // T15: prompt_hash present in RunResult [CalibV4]
  it('T15: prompt_hash present in all RunResults [CalibV4]', async () => {
    const summary = await runExperiment('TEST_PROMPT_HASH', [testPacket1], provider, testConfig);
    for (const run of summary.runs) {
      expect(run.prompt_hash).toMatch(/^[a-f0-9]{64}$/);
    }
  });
});
