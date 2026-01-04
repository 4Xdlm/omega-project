/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Phase 14 — Provider Registry Tests
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Tests for provider registration and health management.
 * 
 * Total: 6 tests
 * 
 * @module router/tests/provider_registry.test
 * @version 3.14.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProviderRegistry, RegistryError, validateProvider } from '../provider_registry.js';
import type { ProviderStatic } from '../types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER
// ═══════════════════════════════════════════════════════════════════════════════

function mkProvider(id: string, overrides?: Partial<ProviderStatic>): ProviderStatic {
  return {
    id,
    name: `Provider ${id}`,
    caps: {
      tier: 'CLOUD',
      quality: 'BALANCED',
      max_input_chars: 100000,
      max_output_tokens: 4096,
      supports_json: true,
      supports_tools: true,
      supports_streaming: true,
    },
    pricing: {
      cost_per_1k_in: 0.01,
      cost_per_1k_out: 0.03,
      daily_limit: 0,
    },
    baseline_latency_ms: 200,
    weight: 50,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Provider Registry', () => {
  let registry: ProviderRegistry;
  
  beforeEach(() => {
    registry = new ProviderRegistry();
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1: Registration (2 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Registration', () => {
    it('registers and retrieves providers', () => {
      registry.register(mkProvider('A'));
      registry.register(mkProvider('B'));
      
      expect(registry.size()).toBe(2);
      expect(registry.has('A')).toBe(true);
      expect(registry.has('B')).toBe(true);
      expect(registry.has('C')).toBe(false);
      
      const a = registry.get('A');
      expect(a.static.id).toBe('A');
      expect(a.health.up).toBe(true);
    });
    
    it('rejects duplicate registration', () => {
      registry.register(mkProvider('A'));
      expect(() => registry.register(mkProvider('A'))).toThrow(RegistryError);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2: Health Management (3 tests)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Health Management', () => {
    it('markDown/markUp updates health', () => {
      registry.register(mkProvider('A'));
      
      registry.markDown('A', 1000);
      expect(registry.get('A').health.up).toBe(false);
      expect(registry.get('A').health.consecutive_failures).toBe(1);
      
      registry.markUp('A', 2000);
      expect(registry.get('A').health.up).toBe(true);
      expect(registry.get('A').health.consecutive_failures).toBe(0);
    });
    
    it('recordSuccess updates latency EMA', () => {
      registry.register(mkProvider('A', { baseline_latency_ms: 200 }));
      
      // First success: EMA = 0.2 * 100 + 0.8 * 200 = 180
      registry.recordSuccess('A', 100, 1000);
      const h1 = registry.get('A').health;
      expect(h1.observed_latency_ms).toBe(180);
      expect(h1.consecutive_successes).toBe(1);
      
      // Second success: EMA = 0.2 * 100 + 0.8 * 180 = 164
      registry.recordSuccess('A', 100, 2000);
      const h2 = registry.get('A').health;
      expect(h2.observed_latency_ms).toBe(164);
    });
    
    it('listAvailable excludes down providers', () => {
      registry.register(mkProvider('A'));
      registry.register(mkProvider('B'));
      registry.register(mkProvider('C'));
      
      registry.markDown('B', 1000);
      
      const available = registry.listAvailable();
      expect(available.length).toBe(2);
      expect(available.map(p => p.static.id)).toEqual(['A', 'C']);
    });
  });
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3: Validation (1 test)
  // ═══════════════════════════════════════════════════════════════════════════
  
  describe('Validation', () => {
    it('validateProvider rejects invalid providers', () => {
      expect(() => validateProvider({ ...mkProvider('A'), id: '' })).toThrow();
      expect(() => validateProvider({ ...mkProvider('A'), baseline_latency_ms: 0 })).toThrow();
      expect(() => validateProvider({ ...mkProvider('A'), weight: 0 })).toThrow();
      expect(() => validateProvider({ ...mkProvider('A'), weight: 101 })).toThrow();
    });
  });
});
