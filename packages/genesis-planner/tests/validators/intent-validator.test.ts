import { describe, it, expect } from 'vitest';
import { validateIntent } from '../../src/validators/intent-validator.js';
import { TIMESTAMP, SCENARIO_A_INTENT } from '../fixtures.js';

describe('Intent Validator', () => {
  it('should FAIL when intent is null', () => {
    const result = validateIntent(null, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should FAIL when intent is empty object', () => {
    const result = validateIntent({}, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when title is missing', () => {
    const result = validateIntent({ ...SCENARIO_A_INTENT, title: '' }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
    expect(result.errors.some((e) => e.path === 'intent.title')).toBe(true);
  });

  it('should FAIL when target_word_count is 0', () => {
    const result = validateIntent({ ...SCENARIO_A_INTENT, target_word_count: 0 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when target_word_count is negative', () => {
    const result = validateIntent({ ...SCENARIO_A_INTENT, target_word_count: -100 }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS with valid intent (scenario A)', () => {
    const result = validateIntent(SCENARIO_A_INTENT, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
    expect(result.errors.length).toBe(0);
  });

  it('should PASS with minimal valid intent', () => {
    const minimal = {
      title: 'T', premise: 'P', themes: ['t'], core_emotion: 'e',
      target_audience: 'a', message: 'm', target_word_count: 1,
    };
    const result = validateIntent(minimal, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should FAIL when themes is empty array', () => {
    const result = validateIntent({ ...SCENARIO_A_INTENT, themes: [] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });
});
