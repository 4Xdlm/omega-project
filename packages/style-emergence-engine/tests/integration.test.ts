import { describe, it, expect } from 'vitest';
import { runStyleEmergence } from '../src/engine.js';
import { verifyEEvidenceChain } from '../src/evidence.js';
import {
  getScribeOutputA, getScribeOutputB, getScribeOutputC,
  SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS,
  SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS,
  SCENARIO_C_GENOME, SCENARIO_C_CONSTRAINTS,
  getDefaultEConfig, TIMESTAMP,
} from './fixtures.js';

const config = getDefaultEConfig();

describe('Integration', () => {
  it('scenario A complete pipeline', () => {
    const scribe = getScribeOutputA();
    const { output, report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id.startsWith('EOUT-')).toBe(true);
    expect(output.paragraphs.length).toBeGreaterThan(0);
    expect(report.invariants_checked.length).toBe(10);
  });

  it('scenario B complete pipeline', () => {
    const scribe = getScribeOutputB();
    const { output, report } = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id.startsWith('EOUT-')).toBe(true);
    expect(report.invariants_checked.length).toBe(10);
  });

  it('scenario C complete pipeline', () => {
    const scribe = getScribeOutputC();
    const { output, report } = runStyleEmergence(scribe, SCENARIO_C_GENOME, SCENARIO_C_CONSTRAINTS, config, TIMESTAMP);
    expect(output.output_id.startsWith('EOUT-')).toBe(true);
    expect(report.invariants_checked.length).toBe(10);
  });

  it('output text is non-empty', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const para of output.paragraphs) {
      expect(para.text.length).toBeGreaterThan(0);
    }
  });

  it('plan -> scribe -> style output traced', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.scribe_output_id).toBe(scribe.output_id);
    expect(output.scribe_output_hash).toBe(scribe.output_hash);
    expect(output.plan_id).toBe(scribe.plan_id);
  });

  it('tournament rounds counted', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.tournament.total_rounds).toBe(output.paragraphs.length);
  });

  it('profile computed for all axes', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.global_profile.cadence).toBeTruthy();
    expect(output.global_profile.lexical).toBeTruthy();
    expect(output.global_profile.syntactic).toBeTruthy();
    expect(output.global_profile.density).toBeTruthy();
    expect(output.global_profile.coherence).toBeTruthy();
    expect(output.global_profile.genome_deviation).toBeTruthy();
  });

  it('IA score below threshold', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.ia_detection.score).toBeLessThanOrEqual(0.3);
  });

  it('genre not locked', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(output.genre_detection.specificity).toBeLessThanOrEqual(0.6);
  });

  it('evidence chain verifiable', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(verifyEEvidenceChain(report.evidence)).toBe(true);
  });

  it('all paragraphs have non-empty text', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const p of output.paragraphs) {
      expect(p.text.trim().length).toBeGreaterThan(0);
    }
  });

  it('genome deviation computed for all axes', () => {
    const scribe = getScribeOutputA();
    const { output } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const dev = output.global_profile.genome_deviation;
    expect(typeof dev.burstiness_delta).toBe('number');
    expect(typeof dev.lexical_richness_delta).toBe('number');
    expect(typeof dev.sentence_length_delta).toBe('number');
    expect(typeof dev.dialogue_ratio_delta).toBe('number');
    expect(typeof dev.description_density_delta).toBe('number');
  });

  it('scenario B tournament has rounds', () => {
    const scribe = getScribeOutputB();
    const { output } = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(output.tournament.total_rounds).toBeGreaterThan(0);
  });

  it('scenario C IA detection in bounds', () => {
    const scribe = getScribeOutputC();
    const { output } = runStyleEmergence(scribe, SCENARIO_C_GENOME, SCENARIO_C_CONSTRAINTS, config, TIMESTAMP);
    expect(output.ia_detection.score).toBeGreaterThanOrEqual(0);
    expect(output.ia_detection.score).toBeLessThanOrEqual(1);
  });

  it('scenario A report includes all invariants', () => {
    const scribe = getScribeOutputA();
    const { report } = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(report.invariants_checked).toContain('E-INV-01');
    expect(report.invariants_checked).toContain('E-INV-10');
  });
});
