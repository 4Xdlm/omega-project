import { describe, it, expect } from 'vitest';
import { runStyleEmergence } from '../src/engine.js';
import {
  getScribeOutputA, getScribeOutputB,
  SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS,
  SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS,
  getDefaultEConfig, TIMESTAMP,
} from './fixtures.js';

const config = getDefaultEConfig();

describe('Determinism', () => {
  it('scenario A: same output_hash on 2 runs', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('scenario A: same profile_hash', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.global_profile.profile_hash).toBe(r2.output.global_profile.profile_hash);
  });

  it('scenario A: same tournament_hash', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.tournament.tournament_hash).toBe(r2.output.tournament.tournament_hash);
  });

  it('scenario A: same report verdict', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.verdict).toBe(r2.report.verdict);
  });

  it('scenario A: same evidence chain_hash', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.evidence.chain_hash).toBe(r2.report.evidence.chain_hash);
  });

  it('scenario B: same output_hash on 2 runs', () => {
    const scribe = getScribeOutputB();
    const r1 = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('config_hash deterministic', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.report.config_hash).toBe(r2.report.config_hash);
  });

  it('ia_detection deterministic', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.ia_detection.score).toBe(r2.output.ia_detection.score);
  });

  it('genre_detection deterministic', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.genre_detection.specificity).toBe(r2.output.genre_detection.specificity);
  });

  it('banality_result deterministic', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.banality_result.total_banality).toBe(r2.output.banality_result.total_banality);
  });

  it('scenario A: same paragraph count', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.paragraphs.length).toBe(r2.output.paragraphs.length);
  });

  it('scenario A: same total_word_count', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.total_word_count).toBe(r2.output.total_word_count);
  });

  it('scenario B: same tournament rounds', () => {
    const scribe = getScribeOutputB();
    const r1 = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_B_GENOME, SCENARIO_B_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.tournament.total_rounds).toBe(r2.output.tournament.total_rounds);
  });
});
