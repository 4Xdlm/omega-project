import { describe, it, expect } from 'vitest';
import { classifyNumericDrift, classifyHashDrift, classifyStructuralDrift, maxDriftLevel } from '../../src/drift/rules.js';
import { DEFAULT_GOV_CONFIG } from '../../src/core/config.js';

describe('Drift Rules', () => {
  describe('classifyNumericDrift', () => {
    it('NO_DRIFT for zero delta', () => {
      const result = classifyNumericDrift(0, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('NO_DRIFT');
    });

    it('NO_DRIFT for small delta below soft threshold', () => {
      const result = classifyNumericDrift(0.03, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('NO_DRIFT');
    });

    it('SOFT_DRIFT at soft threshold', () => {
      const result = classifyNumericDrift(0.05, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('SOFT_DRIFT');
    });

    it('HARD_DRIFT at hard threshold', () => {
      const result = classifyNumericDrift(0.15, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('HARD_DRIFT');
    });

    it('CRITICAL_DRIFT at critical threshold', () => {
      const result = classifyNumericDrift(0.30, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('CRITICAL_DRIFT');
    });

    it('handles negative deltas', () => {
      const result = classifyNumericDrift(-0.20, DEFAULT_GOV_CONFIG);
      expect(result.level).toBe('HARD_DRIFT');
    });

    it('rule string contains threshold value', () => {
      const result = classifyNumericDrift(0.10, DEFAULT_GOV_CONFIG);
      expect(result.rule).toContain('DRIFT_SOFT_THRESHOLD');
    });
  });

  describe('classifyHashDrift', () => {
    it('NO_DRIFT for identical hashes', () => {
      const result = classifyHashDrift('abc', 'abc');
      expect(result.level).toBe('NO_DRIFT');
    });

    it('HARD_DRIFT for different hashes', () => {
      const result = classifyHashDrift('abc', 'def');
      expect(result.level).toBe('HARD_DRIFT');
    });
  });

  describe('classifyStructuralDrift', () => {
    it('NO_DRIFT for identical structure', () => {
      const result = classifyStructuralDrift('root1', 'root1', 6, 6);
      expect(result.level).toBe('NO_DRIFT');
    });

    it('CRITICAL_DRIFT for different stage counts', () => {
      const result = classifyStructuralDrift('root1', 'root2', 6, 5);
      expect(result.level).toBe('CRITICAL_DRIFT');
    });

    it('HARD_DRIFT for different merkle roots with same stage count', () => {
      const result = classifyStructuralDrift('root1', 'root2', 6, 6);
      expect(result.level).toBe('HARD_DRIFT');
    });
  });

  describe('maxDriftLevel', () => {
    it('returns NO_DRIFT for empty array', () => {
      expect(maxDriftLevel([])).toBe('NO_DRIFT');
    });

    it('returns highest level', () => {
      expect(maxDriftLevel(['NO_DRIFT', 'SOFT_DRIFT', 'HARD_DRIFT'])).toBe('HARD_DRIFT');
    });

    it('CRITICAL trumps all', () => {
      expect(maxDriftLevel(['SOFT_DRIFT', 'CRITICAL_DRIFT', 'NO_DRIFT'])).toBe('CRITICAL_DRIFT');
    });
  });
});
