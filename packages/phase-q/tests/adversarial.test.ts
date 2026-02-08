import { describe, it, expect } from 'vitest';
import {
  generateNegation,
  generatePermutation,
  generateInjection,
  generateTruncation,
  generateSubstitution,
  generateAllVariants,
} from '../src/adversarial.js';

describe('Phase Q — Adversarial Generator', () => {
  const sampleOutput = 'The system is valid.\n\nAll tests have passed.\n\nThe result is correct.';
  const seed = 42;

  describe('generateNegation', () => {
    it('should produce a variant different from original', () => {
      const variant = generateNegation(sampleOutput, seed);
      expect(variant.strategy).toBe('NEGATION');
      expect(variant.mutated_output).not.toBe(sampleOutput);
    });

    it('should be deterministic (same seed = same output)', () => {
      const v1 = generateNegation(sampleOutput, seed);
      const v2 = generateNegation(sampleOutput, seed);
      expect(v1.mutated_output).toBe(v2.mutated_output);
      expect(v1.mutated_hash).toBe(v2.mutated_hash);
    });
  });

  describe('generatePermutation', () => {
    it('should reorder segments', () => {
      const variant = generatePermutation(sampleOutput, seed);
      expect(variant.strategy).toBe('PERMUTATION');
    });

    it('should handle single-segment output gracefully', () => {
      const variant = generatePermutation('Single segment only', seed);
      expect(variant.mutated_output).toBe('Single segment only');
    });

    it('should be deterministic', () => {
      const v1 = generatePermutation(sampleOutput, seed);
      const v2 = generatePermutation(sampleOutput, seed);
      expect(v1.mutated_output).toBe(v2.mutated_output);
    });
  });

  describe('generateInjection', () => {
    it('should add noise to the output', () => {
      const variant = generateInjection(sampleOutput, seed);
      expect(variant.strategy).toBe('INJECTION');
      expect(variant.mutated_output.length).toBeGreaterThan(sampleOutput.length);
    });

    it('should be deterministic', () => {
      const v1 = generateInjection(sampleOutput, seed);
      const v2 = generateInjection(sampleOutput, seed);
      expect(v1.mutated_output).toBe(v2.mutated_output);
    });
  });

  describe('generateTruncation', () => {
    it('should produce shorter output', () => {
      const variant = generateTruncation(sampleOutput, seed);
      expect(variant.strategy).toBe('TRUNCATION');
      expect(variant.mutated_output.length).toBeLessThanOrEqual(sampleOutput.length);
    });

    it('should be deterministic', () => {
      const v1 = generateTruncation(sampleOutput, seed);
      const v2 = generateTruncation(sampleOutput, seed);
      expect(v1.mutated_output).toBe(v2.mutated_output);
    });
  });

  describe('generateSubstitution', () => {
    it('should substitute terms', () => {
      const variant = generateSubstitution(sampleOutput, seed);
      expect(variant.strategy).toBe('SUBSTITUTION');
      expect(variant.mutated_output).not.toBe(sampleOutput);
    });

    it('should be deterministic', () => {
      const v1 = generateSubstitution(sampleOutput, seed);
      const v2 = generateSubstitution(sampleOutput, seed);
      expect(v1.mutated_output).toBe(v2.mutated_output);
    });
  });

  describe('generateAllVariants', () => {
    it('should return exactly 5 variants', () => {
      const variants = generateAllVariants(sampleOutput, seed);
      expect(variants).toHaveLength(5);
    });

    it('should include all 5 strategies', () => {
      const variants = generateAllVariants(sampleOutput, seed);
      const strategies = variants.map(v => v.strategy);
      expect(strategies).toContain('NEGATION');
      expect(strategies).toContain('PERMUTATION');
      expect(strategies).toContain('INJECTION');
      expect(strategies).toContain('TRUNCATION');
      expect(strategies).toContain('SUBSTITUTION');
    });

    it('should compute valid hashes for all variants', () => {
      const variants = generateAllVariants(sampleOutput, seed);
      for (const v of variants) {
        expect(v.original_hash).toHaveLength(64);
        expect(v.mutated_hash).toHaveLength(64);
      }
    });

    it('should be fully deterministic', () => {
      const run1 = generateAllVariants(sampleOutput, seed);
      const run2 = generateAllVariants(sampleOutput, seed);
      for (let i = 0; i < 5; i++) {
        expect(run1[i]!.mutated_hash).toBe(run2[i]!.mutated_hash);
      }
    });

    it('should produce different results with different seeds', () => {
      const run1 = generateAllVariants(sampleOutput, 42);
      const run2 = generateAllVariants(sampleOutput, 1000);
      const permutation1 = run1.find(v => v.strategy === 'PERMUTATION')!;
      const permutation2 = run2.find(v => v.strategy === 'PERMUTATION')!;
      expect(permutation1.mutated_hash).not.toBe(permutation2.mutated_hash);
    });
  });
});
