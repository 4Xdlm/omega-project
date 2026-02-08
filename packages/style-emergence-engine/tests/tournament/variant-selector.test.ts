import { describe, it, expect } from 'vitest';
import { selectVariant } from '../../src/tournament/variant-selector.js';
import type { VariantScore } from '../../src/types.js';

function makeScore(overrides: Partial<VariantScore> & { variant_id: string }): VariantScore {
  return {
    genome_compliance: 0.8,
    anti_ia_score: 0.9,
    anti_genre_score: 0.7,
    anti_banality_score: 0.8,
    cadence_score: 0.6,
    lexical_score: 0.7,
    composite_score: 0.8,
    ...overrides,
  };
}

describe('Variant Selector', () => {
  it('highest composite wins', () => {
    const scores = [
      makeScore({ variant_id: 'V1', composite_score: 0.9 }),
      makeScore({ variant_id: 'V2', composite_score: 0.7 }),
    ];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('V1');
  });

  it('tiebreak: anti-IA', () => {
    const scores = [
      makeScore({ variant_id: 'V1', composite_score: 0.8, anti_ia_score: 0.7 }),
      makeScore({ variant_id: 'V2', composite_score: 0.8, anti_ia_score: 0.9 }),
    ];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('V2');
    expect(result.reason).toContain('anti_ia');
  });

  it('tiebreak: genome compliance', () => {
    const scores = [
      makeScore({ variant_id: 'V1', composite_score: 0.8, anti_ia_score: 0.8, genome_compliance: 0.6 }),
      makeScore({ variant_id: 'V2', composite_score: 0.8, anti_ia_score: 0.8, genome_compliance: 0.9 }),
    ];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('V2');
    expect(result.reason).toContain('genome_compliance');
  });

  it('tiebreak: lexicographic', () => {
    const scores = [
      makeScore({ variant_id: 'V2', composite_score: 0.8, anti_ia_score: 0.8, genome_compliance: 0.8 }),
      makeScore({ variant_id: 'V1', composite_score: 0.8, anti_ia_score: 0.8, genome_compliance: 0.8 }),
    ];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('V1');
    expect(result.reason).toContain('lexicographic');
  });

  it('single variant', () => {
    const scores = [makeScore({ variant_id: 'V1' })];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('V1');
  });

  it('two equal variants', () => {
    const scores = [
      makeScore({ variant_id: 'VA', composite_score: 0.5, anti_ia_score: 0.5, genome_compliance: 0.5 }),
      makeScore({ variant_id: 'VB', composite_score: 0.5, anti_ia_score: 0.5, genome_compliance: 0.5 }),
    ];
    const result = selectVariant(scores);
    expect(result.selected_id).toBe('VA');
  });

  it('is deterministic', () => {
    const scores = [
      makeScore({ variant_id: 'V1', composite_score: 0.9 }),
      makeScore({ variant_id: 'V2', composite_score: 0.7 }),
    ];
    const r1 = selectVariant(scores);
    const r2 = selectVariant(scores);
    expect(r1.selected_id).toBe(r2.selected_id);
  });

  it('provides reason', () => {
    const scores = [
      makeScore({ variant_id: 'V1', composite_score: 0.9 }),
      makeScore({ variant_id: 'V2', composite_score: 0.7 }),
    ];
    const result = selectVariant(scores);
    expect(result.reason).toBeTruthy();
  });
});
