/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14.4 — MUSE PRNG Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for deterministic pseudo-random number generation.
 * INV-MUSE-04: Same seed = same sequence.
 * 
 * @version 1.0.0
 */

import { describe, it, expect } from 'vitest';
import {
  createPRNG,
  nextFloat,
  nextInt,
  nextBool,
  shuffle,
  pickN,
  pickOne,
  nextGaussian,
  generateId,
  clonePRNG,
  resetPRNG,
  getPRNGFingerprint,
} from '../prng';

describe('PRNG: Determinism', () => {
  it('same seed produces same sequence', () => {
    const prng1 = createPRNG(42);
    const prng2 = createPRNG(42);
    
    const seq1 = [nextFloat(prng1), nextFloat(prng1), nextFloat(prng1)];
    const seq2 = [nextFloat(prng2), nextFloat(prng2), nextFloat(prng2)];
    
    expect(seq1).toEqual(seq2);
  });
  
  it('different seeds produce different sequences', () => {
    const prng1 = createPRNG(42);
    const prng2 = createPRNG(43);
    
    const val1 = nextFloat(prng1);
    const val2 = nextFloat(prng2);
    
    expect(val1).not.toBe(val2);
  });
  
  it('tracks call count', () => {
    const prng = createPRNG(42);
    expect(prng.calls).toBe(0);
    
    nextFloat(prng);
    expect(prng.calls).toBe(1);
    
    nextFloat(prng);
    nextFloat(prng);
    expect(prng.calls).toBe(3);
  });
});

describe('PRNG: nextFloat', () => {
  it('returns values in [0, 1)', () => {
    const prng = createPRNG(12345);
    
    for (let i = 0; i < 1000; i++) {
      const val = nextFloat(prng);
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
});

describe('PRNG: nextInt', () => {
  it('returns values in range [min, max]', () => {
    const prng = createPRNG(12345);
    
    for (let i = 0; i < 100; i++) {
      const val = nextInt(prng, 5, 10);
      expect(val).toBeGreaterThanOrEqual(5);
      expect(val).toBeLessThanOrEqual(10);
    }
  });
  
  it('handles single value range', () => {
    const prng = createPRNG(42);
    const val = nextInt(prng, 5, 5);
    expect(val).toBe(5);
  });
});

describe('PRNG: nextBool', () => {
  it('returns booleans', () => {
    const prng = createPRNG(42);
    const val = nextBool(prng);
    expect(typeof val).toBe('boolean');
  });
  
  it('respects probability', () => {
    const prng = createPRNG(42);
    let trueCount = 0;
    const trials = 1000;
    
    for (let i = 0; i < trials; i++) {
      if (nextBool(createPRNG(i), 0.3)) trueCount++;
    }
    
    // Should be roughly 30% true (with some variance)
    const ratio = trueCount / trials;
    expect(ratio).toBeGreaterThan(0.2);
    expect(ratio).toBeLessThan(0.4);
  });
});

describe('PRNG: shuffle', () => {
  it('preserves all elements', () => {
    const prng = createPRNG(42);
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(prng, arr);
    
    expect(shuffled.length).toBe(arr.length);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
  
  it('is deterministic', () => {
    const arr = ['a', 'b', 'c', 'd', 'e'];
    
    const shuffled1 = shuffle(createPRNG(42), arr);
    const shuffled2 = shuffle(createPRNG(42), arr);
    
    expect(shuffled1).toEqual(shuffled2);
  });
  
  it('does not mutate original', () => {
    const prng = createPRNG(42);
    const arr = [1, 2, 3];
    const original = [...arr];
    
    shuffle(prng, arr);
    
    expect(arr).toEqual(original);
  });
});

describe('PRNG: pickN', () => {
  it('picks correct number of items', () => {
    const prng = createPRNG(42);
    const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    const picked = pickN(prng, arr, 3);
    expect(picked.length).toBe(3);
  });
  
  it('handles n > array length', () => {
    const prng = createPRNG(42);
    const arr = [1, 2, 3];
    
    const picked = pickN(prng, arr, 10);
    expect(picked.length).toBe(3);
  });
});

describe('PRNG: pickOne', () => {
  it('returns element from array', () => {
    const prng = createPRNG(42);
    const arr = ['a', 'b', 'c'];
    
    const picked = pickOne(prng, arr);
    expect(arr).toContain(picked);
  });
  
  it('returns undefined for empty array', () => {
    const prng = createPRNG(42);
    const picked = pickOne(prng, []);
    expect(picked).toBeUndefined();
  });
});

describe('PRNG: nextGaussian', () => {
  it('returns roughly normal distribution', () => {
    const prng = createPRNG(42);
    const values: number[] = [];
    
    for (let i = 0; i < 1000; i++) {
      values.push(nextGaussian(prng, 0, 1));
    }
    
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    
    // Mean should be close to 0
    expect(Math.abs(mean)).toBeLessThan(0.2);
    // Variance should be close to 1
    expect(Math.abs(variance - 1)).toBeLessThan(0.3);
  });
});

describe('PRNG: generateId', () => {
  it('generates UUID-like string', () => {
    const prng = createPRNG(42);
    const id = generateId(prng);
    
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
  
  it('is deterministic', () => {
    const id1 = generateId(createPRNG(42));
    const id2 = generateId(createPRNG(42));
    
    expect(id1).toBe(id2);
  });
});

describe('PRNG: clonePRNG', () => {
  it('creates independent copy', () => {
    const prng1 = createPRNG(42);
    nextFloat(prng1);
    nextFloat(prng1);
    
    const prng2 = clonePRNG(prng1);
    
    // Should have same state
    const val1 = nextFloat(prng1);
    const val2 = nextFloat(prng2);
    
    expect(val1).toBe(val2);
  });
});

describe('PRNG: resetPRNG', () => {
  it('resets to initial state', () => {
    const prng = createPRNG(42);
    const firstVal = nextFloat(prng);
    nextFloat(prng);
    nextFloat(prng);
    
    resetPRNG(prng, 42);
    const resetVal = nextFloat(prng);
    
    expect(resetVal).toBe(firstVal);
    expect(prng.calls).toBe(1);
  });
});

describe('PRNG: getPRNGFingerprint', () => {
  it('includes seed and call count', () => {
    const prng = createPRNG(42);
    nextFloat(prng);
    nextFloat(prng);
    
    const fp = getPRNGFingerprint(prng);
    
    expect(fp).toContain('prng:');
    expect(fp).toContain(':2'); // 2 calls
  });
});
