/**
 * OMEGA Provider Factory Tests
 * Phase K - NASA-Grade L4
 */
import { describe, it, expect } from 'vitest';
import { createProvider, MockProvider } from '../../src/providers';

describe('Phase K — Provider Factory', () => {
  describe('K-INV-01: Default path no network', () => {
    it('default provider is mock (no network)', () => {
      const result = createProvider();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.provider.id).toBe('mock');
      }
    });

    it('explicit mock provider works', () => {
      const result = createProvider({ providerId: 'mock' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.provider.id).toBe('mock');
      }
    });
  });

  describe('K-INV-02: Real provider requires API key', () => {
    it('claude without API key fails with NO_API_KEY', () => {
      const result = createProvider({ providerId: 'claude' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NO_API_KEY');
      }
    });

    it('gemini without API key fails with NO_API_KEY', () => {
      const result = createProvider({ providerId: 'gemini' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.code).toBe('NO_API_KEY');
      }
    });
  });

  describe('K-INV-03: Mock provider deterministic', () => {
    it('mock provider generates deterministic response', async () => {
      const provider = new MockProvider();
      const response = await provider.generate({ prompt: 'test prompt' });
      expect(response.text).toContain('[MOCK]');
      expect(response.finishReason).toBe('stop');
    });
  });
});
