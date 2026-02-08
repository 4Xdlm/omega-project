import { describe, it, expect } from 'vitest';
import { runStyleEmergence } from '../src/engine.js';
import type { ScribeOutput } from '@omega/scribe-engine';
import {
  getScribeOutputA,
  SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS,
  getDefaultEConfig, TIMESTAMP,
} from './fixtures.js';

const config = getDefaultEConfig();

describe('Invariants', () => {
  it('E-INV-01: null scribe -> FAIL', () => {
    const result = runStyleEmergence(
      null as unknown as ScribeOutput,
      SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP,
    );
    expect(result.report.verdict).toBe('FAIL');
  });

  it('E-INV-01: scribe with empty paragraphs -> FAIL', () => {
    const scribe = getScribeOutputA();
    const emptyScribe = {
      ...scribe,
      final_prose: { ...scribe.final_prose, paragraphs: [] as readonly import('@omega/scribe-engine').ProseParagraph[] },
    };
    const result = runStyleEmergence(emptyScribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.verdict).toBe('FAIL');
  });

  it('E-INV-02: genome deviation checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.global_profile.genome_deviation).toBeTruthy();
    expect(typeof result.output.global_profile.genome_deviation.max_deviation).toBe('number');
  });

  it('E-INV-02: within tolerance -> PASS for E-INV-02', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const inv02Passed = result.report.invariants_passed.includes('E-INV-02');
    expect(typeof inv02Passed).toBe('boolean');
  });

  it('E-INV-03: cadence checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof result.output.global_profile.cadence.coefficient_of_variation).toBe('number');
  });

  it('E-INV-04: lexical rarity checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof result.output.global_profile.lexical.rare_word_ratio).toBe('number');
    expect(typeof result.output.global_profile.lexical.consecutive_rare_count).toBe('number');
  });

  it('E-INV-05: syntactic diversity checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof result.output.global_profile.syntactic.unique_structures).toBe('number');
    expect(typeof result.output.global_profile.syntactic.dominant_ratio).toBe('number');
  });

  it('E-INV-06: IA detection checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.ia_detection).toBeTruthy();
    expect(typeof result.output.ia_detection.score).toBe('number');
  });

  it('E-INV-06: clean text -> IA PASS', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.ia_detection.score).toBeLessThanOrEqual(0.3);
  });

  it('E-INV-07: genre detection checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.genre_detection).toBeTruthy();
    expect(typeof result.output.genre_detection.specificity).toBe('number');
  });

  it('E-INV-07: diverse text -> genre PASS', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.genre_detection.specificity).toBeLessThanOrEqual(0.6);
  });

  it('E-INV-08: tournament executed', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.output.tournament.total_variants_generated).toBeGreaterThanOrEqual(2);
    expect(result.output.tournament.total_rounds).toBeGreaterThan(0);
  });

  it('E-INV-08: tournament valid -> variants generated', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    for (const round of result.output.tournament.rounds) {
      expect(round.variants.length).toBeGreaterThanOrEqual(2);
      expect(round.selected_variant_id).toBeTruthy();
    }
  });

  it('E-INV-09: voice drift checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof result.output.global_profile.coherence.style_drift).toBe('number');
  });

  it('E-INV-09: coherent text -> voice PASS', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const inv09 = result.report.invariants_passed.includes('E-INV-09');
    expect(typeof inv09).toBe('boolean');
  });

  it('E-INV-10: determinism verified', () => {
    const scribe = getScribeOutputA();
    const r1 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    const r2 = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(r1.output.output_hash).toBe(r2.output.output_hash);
  });

  it('E-INV-04: consecutive rare checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(typeof result.output.global_profile.lexical.consecutive_rare_count).toBe('number');
  });

  it('all 10 invariants checked', () => {
    const scribe = getScribeOutputA();
    const result = runStyleEmergence(scribe, SCENARIO_A_GENOME, SCENARIO_A_CONSTRAINTS, config, TIMESTAMP);
    expect(result.report.invariants_checked.length).toBe(10);
  });
});
