/**
 * OMEGA Provider Lock Verifier Tests
 * Phase K - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { verifyProviderLock, loadProviderConfig } from '../../src/providers';

describe('Phase K — Provider Lock Verifier', () => {
  describe('K-INV-01: Lock verification', () => {
    it('verifyProviderLock returns valid result structure', () => {
      const result = verifyProviderLock();
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('expectedHash');
      expect(result).toHaveProperty('actualHash');
    });

    it('lock verification passes with correct lock file', () => {
      const result = verifyProviderLock();
      expect(result.valid).toBe(true);
    });
  });

  describe('K-INV-02: Config loading', () => {
    it('loadProviderConfig succeeds when lock valid', () => {
      const result = loadProviderConfig();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.config.version).toBe('1.0.0');
        expect(result.config.default).toBe('mock');
      }
    });
  });
});
