import { describe, it, expect } from 'vitest';
import { validateGenome } from '../../src/validators/genome-validator.js';
import { TIMESTAMP, SCENARIO_A_GENOME } from '../fixtures.js';

describe('Genome Validator', () => {
  it('should FAIL when burstiness > 1', () => {
    const result = validateGenome({ ...SCENARIO_A_GENOME, target_burstiness: 1.1 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when burstiness < 0', () => {
    const result = validateGenome({ ...SCENARIO_A_GENOME, target_burstiness: -0.1 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when lexical_richness out of bounds', () => {
    const result = validateGenome({ ...SCENARIO_A_GENOME, target_lexical_richness: 2.0 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when avg_sentence_length <= 0', () => {
    const result = validateGenome({ ...SCENARIO_A_GENOME, target_avg_sentence_length: 0 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when signature_traits is empty', () => {
    const result = validateGenome({ ...SCENARIO_A_GENOME, signature_traits: [] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS with valid genome (scenario A)', () => {
    const result = validateGenome(SCENARIO_A_GENOME, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS at edge 0.0', () => {
    const result = validateGenome({
      ...SCENARIO_A_GENOME,
      target_burstiness: 0.0, target_lexical_richness: 0.0,
      target_dialogue_ratio: 0.0, target_description_density: 0.0,
    }, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS at edge 1.0', () => {
    const result = validateGenome({
      ...SCENARIO_A_GENOME,
      target_burstiness: 1.0, target_lexical_richness: 1.0,
      target_dialogue_ratio: 1.0, target_description_density: 1.0,
    }, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });
});
