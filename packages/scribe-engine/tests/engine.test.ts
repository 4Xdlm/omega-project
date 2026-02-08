import { describe, it, expect } from 'vitest';
import { runScribe } from '../src/engine.js';
import {
  getPlanA, getPlanB, getPlanC,
  SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
  SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS, SCENARIO_C_GENOME, SCENARIO_C_EMOTION,
  getDefaultSConfig, TIMESTAMP,
} from './fixtures.js';

describe('Engine', () => {
  it('happy path scenario A', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_id).toBeTruthy();
    expect(result.output.output_hash).toHaveLength(64);
  });

  it('happy path scenario B', () => {
    const { plan } = getPlanB();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_B_CANON, SCENARIO_B_GENOME, SCENARIO_B_EMOTION, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_id).toBeTruthy();
  });

  it('invalid plan -> FAIL', () => {
    const emptyPlan = {
      plan_id: 'EMPTY', plan_hash: '', version: '1.0.0' as const,
      intent_hash: '', canon_hash: '', constraints_hash: '', genome_hash: '', emotion_hash: '',
      arcs: [], seed_registry: [], tension_curve: [], emotion_trajectory: [],
      scene_count: 0, beat_count: 0, estimated_word_count: 0,
    };
    const config = getDefaultSConfig();
    const result = runScribe(emptyPlan as any, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.verdict).toBe('FAIL');
  });

  it('pipeline stages traced in evidence', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const steps = result.report.evidence.steps;
    expect(steps.some((s) => s.step === 'validate-inputs')).toBe(true);
    expect(steps.some((s) => s.step === 'segment-plan')).toBe(true);
    expect(steps.some((s) => s.step === 'build-skeleton')).toBe(true);
    expect(steps.some((s) => s.step === 'weave-prose')).toBe(true);
  });

  it('evidence chain present', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.evidence.chain_hash).toBeTruthy();
    expect(result.report.evidence.steps.length).toBeGreaterThan(0);
  });

  it('output_hash in output', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_hash).toHaveLength(64);
  });

  it('report generated', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.timestamp_deterministic).toBe(TIMESTAMP);
  });

  it('metrics computed', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.metrics.total_words).toBeGreaterThan(0);
  });

  it('gate ordering correct', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const gateIds = result.output.gate_result.gate_results.map((g) => g.gate_id);
    if (gateIds.length >= 2) {
      const expectedOrder = ['TRUTH_GATE', 'NECESSITY_GATE', 'BANALITY_GATE', 'STYLE_GATE', 'EMOTION_GATE', 'DISCOMFORT_GATE', 'QUALITY_GATE'];
      for (let i = 0; i < gateIds.length; i++) {
        expect(gateIds[i]).toBe(expectedOrder[i]);
      }
    }
  });

  it('oracle min verdict', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const oracleVerdicts = result.output.oracle_result.oracle_results.map((o) => o.verdict);
    if (oracleVerdicts.includes('FAIL')) {
      expect(result.output.oracle_result.verdict).toBe('FAIL');
    }
  });

  it('FAIL on gate triggers rewrite attempt', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.rewrite_history.total_passes).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });
});
