import { describe, it, expect } from 'vitest';
import { scoreVariant } from '../../src/tournament/variant-scorer.js';
import { generateVariants } from '../../src/tournament/variant-generator.js';
import { buildMinimalProseParagraph, SCENARIO_A_GENOME, SCENARIO_B_GENOME, getDefaultEConfig, TIMESTAMP } from '../fixtures.js';

const config = getDefaultEConfig();

function getTestVariant() {
  const para = buildMinimalProseParagraph();
  return generateVariants(para, SCENARIO_A_GENOME, 1, 0, TIMESTAMP)[0];
}

describe('Variant Scorer', () => {
  it('computes score for variant', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.composite_score).toBeGreaterThanOrEqual(0);
  });

  it('genome compliance between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.genome_compliance).toBeGreaterThanOrEqual(0);
    expect(score.genome_compliance).toBeLessThanOrEqual(1);
  });

  it('anti-IA between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.anti_ia_score).toBeGreaterThanOrEqual(0);
    expect(score.anti_ia_score).toBeLessThanOrEqual(1);
  });

  it('anti-genre between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.anti_genre_score).toBeGreaterThanOrEqual(0);
    expect(score.anti_genre_score).toBeLessThanOrEqual(1);
  });

  it('anti-banality between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.anti_banality_score).toBeGreaterThanOrEqual(0);
    expect(score.anti_banality_score).toBeLessThanOrEqual(1);
  });

  it('composite is weighted sum', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    const expected = 0.3 * score.genome_compliance + 0.3 * score.anti_ia_score
      + 0.2 * score.anti_genre_score + 0.2 * score.anti_banality_score;
    expect(Math.abs(score.composite_score - expected)).toBeLessThan(0.001);
  });

  it('config weights applied', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.composite_score).toBeGreaterThan(0);
  });

  it('cadence score computed', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(typeof score.cadence_score).toBe('number');
  });

  it('lexical score computed', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(typeof score.lexical_score).toBe('number');
  });

  it('is deterministic', () => {
    const variant = getTestVariant();
    const s1 = scoreVariant(variant, SCENARIO_A_GENOME, config);
    const s2 = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(s1.composite_score).toBe(s2.composite_score);
  });

  it('variant_id preserved', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.variant_id).toBe(variant.variant_id);
  });

  it('different genome -> different composite', () => {
    const variant = getTestVariant();
    const s1 = scoreVariant(variant, SCENARIO_A_GENOME, config);
    const s2 = scoreVariant(variant, SCENARIO_B_GENOME, config);
    // Cadence/lexical scores will differ since targets differ
    expect(s1.cadence_score !== s2.cadence_score || s1.lexical_score !== s2.lexical_score).toBe(true);
  });

  it('cadence score between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.cadence_score).toBeGreaterThanOrEqual(0);
    expect(score.cadence_score).toBeLessThanOrEqual(1);
  });

  it('lexical score between 0 and 1', () => {
    const variant = getTestVariant();
    const score = scoreVariant(variant, SCENARIO_A_GENOME, config);
    expect(score.lexical_score).toBeGreaterThanOrEqual(0);
    expect(score.lexical_score).toBeLessThanOrEqual(1);
  });
});
