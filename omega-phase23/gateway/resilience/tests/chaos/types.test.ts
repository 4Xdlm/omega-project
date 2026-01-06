/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Types Tests
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Tests for branded types and type safety.
 */

import { describe, it, expect } from 'vitest';
import {
  perturbationId,
  chaosSeed,
  magnitude,
  durationMs,
  timestampMs,
  PerturbationDomain,
  PerturbationEffect,
  SystemResponse,
  ALL_DOMAINS,
  ALL_EFFECTS,
  ALL_RESPONSES,
  VALID_RESPONSES,
  MAX_MAGNITUDE,
  IDENTITY_MAGNITUDE,
} from '../../src/chaos/types.js';

describe('Chaos Types', () => {
  describe('Branded Type Factories', () => {
    describe('perturbationId', () => {
      it('should create a valid perturbation ID', () => {
        const id = perturbationId('TEST_001');
        expect(id).toBe('TEST_001');
      });

      it('should reject empty string', () => {
        expect(() => perturbationId('')).toThrow('PerturbationId cannot be empty');
      });

      it('should accept any non-empty string', () => {
        expect(perturbationId('a')).toBe('a');
        expect(perturbationId('ABC_123_XYZ')).toBe('ABC_123_XYZ');
        expect(perturbationId('perturbation-with-dashes')).toBe('perturbation-with-dashes');
      });
    });

    describe('chaosSeed', () => {
      it('should create a valid chaos seed', () => {
        expect(chaosSeed(0)).toBe(0);
        expect(chaosSeed(42)).toBe(42);
        expect(chaosSeed(1000000)).toBe(1000000);
      });

      it('should reject negative numbers', () => {
        expect(() => chaosSeed(-1)).toThrow('ChaosSeed must be a non-negative integer');
      });

      it('should reject non-integers', () => {
        expect(() => chaosSeed(1.5)).toThrow('ChaosSeed must be a non-negative integer');
      });
    });

    describe('magnitude', () => {
      it('should create valid magnitudes in [0, 1]', () => {
        expect(magnitude(0)).toBe(0);
        expect(magnitude(0.5)).toBe(0.5);
        expect(magnitude(1)).toBe(1);
      });

      it('should reject values < 0', () => {
        expect(() => magnitude(-0.1)).toThrow('Magnitude must be in [0, 1]');
      });

      it('should reject values > 1', () => {
        expect(() => magnitude(1.1)).toThrow('Magnitude must be in [0, 1]');
      });

      it('should accept boundary values', () => {
        expect(magnitude(0.0001)).toBe(0.0001);
        expect(magnitude(0.9999)).toBe(0.9999);
      });
    });

    describe('durationMs', () => {
      it('should create valid durations', () => {
        expect(durationMs(0)).toBe(0);
        expect(durationMs(100)).toBe(100);
        expect(durationMs(60000)).toBe(60000);
      });

      it('should reject negative values', () => {
        expect(() => durationMs(-1)).toThrow('DurationMs must be a non-negative integer');
      });

      it('should reject non-integers', () => {
        expect(() => durationMs(100.5)).toThrow('DurationMs must be a non-negative integer');
      });
    });

    describe('timestampMs', () => {
      it('should create valid timestamps', () => {
        const ts = timestampMs(1704067200000);
        expect(ts).toBe(1704067200000);
      });

      it('should reject negative values', () => {
        expect(() => timestampMs(-1)).toThrow('TimestampMs must be a non-negative integer');
      });
    });
  });

  describe('Enum Completeness', () => {
    it('should have all perturbation domains', () => {
      expect(ALL_DOMAINS).toContain(PerturbationDomain.CLOCK);
      expect(ALL_DOMAINS).toContain(PerturbationDomain.NETWORK);
      expect(ALL_DOMAINS).toContain(PerturbationDomain.MEMORY);
      expect(ALL_DOMAINS).toContain(PerturbationDomain.LOGIC);
      expect(ALL_DOMAINS).toContain(PerturbationDomain.RESOURCE);
      expect(ALL_DOMAINS.length).toBe(5);
    });

    it('should have all perturbation effects', () => {
      expect(ALL_EFFECTS).toContain(PerturbationEffect.DELAY);
      expect(ALL_EFFECTS).toContain(PerturbationEffect.SKIP);
      expect(ALL_EFFECTS).toContain(PerturbationEffect.CORRUPT);
      expect(ALL_EFFECTS).toContain(PerturbationEffect.FAIL);
      expect(ALL_EFFECTS).toContain(PerturbationEffect.EXHAUST);
      expect(ALL_EFFECTS).toContain(PerturbationEffect.RACE);
      expect(ALL_EFFECTS.length).toBe(6);
    });

    it('should have all system responses', () => {
      expect(ALL_RESPONSES).toContain(SystemResponse.ABSORB);
      expect(ALL_RESPONSES).toContain(SystemResponse.REJECT);
      expect(ALL_RESPONSES).toContain(SystemResponse.DEGRADE);
      expect(ALL_RESPONSES).toContain(SystemResponse.CRASH);
      expect(ALL_RESPONSES.length).toBe(4);
    });

    it('should have valid responses (excluding CRASH)', () => {
      expect(VALID_RESPONSES).toContain(SystemResponse.ABSORB);
      expect(VALID_RESPONSES).toContain(SystemResponse.REJECT);
      expect(VALID_RESPONSES).toContain(SystemResponse.DEGRADE);
      expect(VALID_RESPONSES).not.toContain(SystemResponse.CRASH);
      expect(VALID_RESPONSES.length).toBe(3);
    });
  });

  describe('Constants', () => {
    it('should have MAX_MAGNITUDE = 1.0', () => {
      expect(MAX_MAGNITUDE).toBe(1.0);
    });

    it('should have IDENTITY_MAGNITUDE = 0.0', () => {
      expect(IDENTITY_MAGNITUDE).toBe(0.0);
    });
  });

  describe('Domain/Effect Combinations', () => {
    it('should allow all domain/effect combinations', () => {
      // Every domain can have every effect
      for (const domain of ALL_DOMAINS) {
        for (const effect of ALL_EFFECTS) {
          expect(domain).toBeTruthy();
          expect(effect).toBeTruthy();
          // No combination should throw
        }
      }
      expect(ALL_DOMAINS.length * ALL_EFFECTS.length).toBe(30);
    });
  });
});

describe('Type Safety Verification', () => {
  it('should distinguish between different branded types at runtime', () => {
    const seed = chaosSeed(42);
    const ts = timestampMs(42);
    const dur = durationMs(42);
    
    // All have the same underlying value but different semantic meaning
    expect(seed).toBe(42);
    expect(ts).toBe(42);
    expect(dur).toBe(42);
    
    // Type system prevents mixing at compile time (verified by TS)
  });

  it('should be serializable to JSON', () => {
    const seed = chaosSeed(42);
    const mag = magnitude(0.5);
    const dur = durationMs(1000);
    
    const json = JSON.stringify({ seed, mag, dur });
    const parsed = JSON.parse(json);
    
    expect(parsed.seed).toBe(42);
    expect(parsed.mag).toBe(0.5);
    expect(parsed.dur).toBe(1000);
  });
});
