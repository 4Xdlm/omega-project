import { describe, it, expect } from 'vitest';
import { runScribe } from '../src/engine.js';
import {
  getPlanA, getPlanB, getPlanC,
  SCENARIO_A_CANON, SCENARIO_A_CONSTRAINTS, SCENARIO_A_GENOME, SCENARIO_A_EMOTION,
  SCENARIO_B_CANON, SCENARIO_B_CONSTRAINTS, SCENARIO_B_GENOME, SCENARIO_B_EMOTION,
  SCENARIO_C_CANON, SCENARIO_C_CONSTRAINTS, SCENARIO_C_GENOME, SCENARIO_C_EMOTION,
  getDefaultSConfig, TIMESTAMP,
} from './fixtures.js';

describe('Determinism (S-INV-07)', () => {
  it('scenario A: 2 runs -> same output_hash', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('scenario A: same skeleton_hash', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.skeleton_hash).toBe(r2.output.skeleton_hash);
  });

  it('scenario A: same report_hash', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.output_hash).toBe(r2.report.output_hash);
  });

  it('scenario A: same evidence_hash', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.evidence.chain_hash).toBe(r2.report.evidence.chain_hash);
  });

  it('scenario B: 2 runs -> same output_hash', () => {
    const { plan } = getPlanB();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_B_CANON, SCENARIO_B_GENOME, SCENARIO_B_EMOTION, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_B_CANON, SCENARIO_B_GENOME, SCENARIO_B_EMOTION, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('scenario C: 2 runs -> same output_hash', () => {
    const { plan } = getPlanC();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_C_CANON, SCENARIO_C_GENOME, SCENARIO_C_EMOTION, SCENARIO_C_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_C_CANON, SCENARIO_C_GENOME, SCENARIO_C_EMOTION, SCENARIO_C_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('config_hash deterministic', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.config_hash).toBe(r2.report.config_hash);
  });

  it('rewrite_hash deterministic', () => {
    const { plan } = getPlanA();
    const config = getDefaultSConfig();
    const r1 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runScribe(plan, SCENARIO_A_CANON, SCENARIO_A_GENOME, SCENARIO_A_EMOTION, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.rewrite_history.rewrite_hash).toBe(r2.output.rewrite_history.rewrite_hash);
  });
});
