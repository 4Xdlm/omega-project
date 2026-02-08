import { describe, it, expect } from 'vitest';
import { validateConstraints } from '../../src/validators/constraints-validator.js';
import { TIMESTAMP, SCENARIO_A_CONSTRAINTS } from '../fixtures.js';

describe('Constraints Validator', () => {
  it('should FAIL when pov is invalid', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, pov: 'invalid' }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when tense is invalid', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, tense: 'future' }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when max_dialogue_ratio > 1', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, max_dialogue_ratio: 1.5 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when max_dialogue_ratio < 0', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, max_dialogue_ratio: -0.1 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when max_scenes < min_scenes', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, max_scenes: 2, min_scenes: 5 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when min_scenes <= 0', () => {
    const result = validateConstraints({ ...SCENARIO_A_CONSTRAINTS, min_scenes: 0 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS with valid constraints (scenario A)', () => {
    const result = validateConstraints(SCENARIO_A_CONSTRAINTS, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS when banned arrays are empty', () => {
    const result = validateConstraints({
      ...SCENARIO_A_CONSTRAINTS, banned_words: [], banned_topics: [], forbidden_cliches: [],
    }, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });
});
