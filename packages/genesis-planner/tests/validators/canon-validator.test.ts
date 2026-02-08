import { describe, it, expect } from 'vitest';
import { validateCanon } from '../../src/validators/canon-validator.js';
import { TIMESTAMP, SCENARIO_A_CANON } from '../fixtures.js';

describe('Canon Validator', () => {
  it('should FAIL when canon is null', () => {
    const result = validateCanon(null, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when entries is empty', () => {
    const result = validateCanon({ entries: [] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when entry has no id', () => {
    const result = validateCanon({ entries: [{ id: '', category: 'world', statement: 'test', immutable: true }] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when category is invalid', () => {
    const result = validateCanon({ entries: [{ id: 'C1', category: 'invalid', statement: 'test', immutable: true }] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should FAIL when entry ids are duplicated', () => {
    const result = validateCanon({
      entries: [
        { id: 'C1', category: 'world', statement: 'a', immutable: true },
        { id: 'C1', category: 'world', statement: 'b', immutable: true },
      ],
    }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('should PASS with valid canon (scenario A)', () => {
    const result = validateCanon(SCENARIO_A_CANON, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should PASS with 100 valid entries', () => {
    const entries = Array.from({ length: 100 }, (_, i) => ({
      id: `C-${i}`, category: 'world' as const, statement: `Statement ${i}`, immutable: true,
    }));
    const result = validateCanon({ entries }, TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('should FAIL when statement is empty', () => {
    const result = validateCanon({ entries: [{ id: 'C1', category: 'world', statement: '', immutable: true }] }, TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });
});
