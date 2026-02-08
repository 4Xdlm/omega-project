import { describe, it, expect } from 'vitest';
import { runScribe } from '../src/engine.js';
import {
  getPlanA, getPlanB, getPlanC,
  SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
  SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS, SCENARIO_C_GENOME, SCENARIO_C_EMOTION,
  getDefaultSConfig, TIMESTAMP,
} from './fixtures.js';

describe('Integration', () => {
  it('scenario A complete pipeline', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_id).toBeTruthy();
    expect(result.output.output_hash).toHaveLength(64);
    expect(result.report.verdict).toMatch(/^(PASS|FAIL)$/);
  });

  it('scenario B complete pipeline', () => {
    const { plan } = getPlanB();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_B_CANON, SCENARIO_B_GENOME, SCENARIO_B_EMOTION, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_id).toBeTruthy();
    expect(result.output.output_hash).toHaveLength(64);
  });

  it('scenario C complete pipeline', () => {
    const { plan } = getPlanC();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_C_CANON, SCENARIO_C_GENOME, SCENARIO_C_EMOTION, SCENARIO_C_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.output_id).toBeTruthy();
    expect(result.output.output_hash).toHaveLength(64);
  });

  it('output usable (text non-empty)', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.final_prose.total_word_count).toBeGreaterThan(0);
    expect(result.output.final_prose.paragraphs.length).toBeGreaterThan(0);
  });

  it('plan -> output trace', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.plan_id).toBe(plan.plan_id);
    expect(result.output.plan_hash).toBe(plan.plan_hash);
    expect(Object.keys(result.output.segment_to_paragraph_map).length).toBeGreaterThan(0);
  });

  it('gate chain in order', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const gates = result.output.gate_result.gate_results;
    if (gates.length >= 2) {
      const order = ['TRUTH_GATE', 'NECESSITY_GATE', 'BANALITY_GATE', 'STYLE_GATE', 'EMOTION_GATE', 'DISCOMFORT_GATE', 'QUALITY_GATE'];
      for (let i = 0; i < gates.length; i++) {
        expect(gates[i].gate_id).toBe(order[i]);
      }
    }
  });

  it('oracle verdict = min', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const oracleVerdicts = result.output.oracle_result.oracle_results.map((o) => o.verdict);
    if (oracleVerdicts.includes('FAIL')) {
      expect(result.output.oracle_result.verdict).toBe('FAIL');
    } else {
      expect(result.output.oracle_result.verdict).toBe('PASS');
    }
  });

  it('segment_to_paragraph_map populated', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const mapKeys = Object.keys(result.output.segment_to_paragraph_map);
    expect(mapKeys.length).toBeGreaterThan(0);
  });

  it('evidence chain verifiable', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.evidence.chain_hash).toHaveLength(64);
    expect(result.report.evidence.steps.length).toBeGreaterThan(0);
  });

  it('rewrite history tracked', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const result = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.rewrite_history.total_passes).toBeGreaterThanOrEqual(1);
    expect(result.output.rewrite_history.candidates.length).toBeGreaterThanOrEqual(1);
    expect(result.output.rewrite_history.rewrite_hash).toHaveLength(64);
  });
});
