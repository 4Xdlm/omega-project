/**
 * OMEGA Canon ID Factory Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-ID-01, INV-E-ID-DET-01, INV-E-ID-VALID-01
 */

import { describe, it, expect } from 'vitest';
import {
  SeededRng,
  DeterministicIdFactory,
  createTestIdFactory,
  createTestClaimId,
  createTestEntityId,
  createTestEvidenceId,
  TEST_ID_CONFIG,
} from '../../src/canon/id-factory.js';
import { createTestClock } from '../../src/shared/clock.js';
import { createTestConfigResolver } from '../../src/canon/config-symbol.js';

describe('CANON ID Factory — Phase E', () => {
  describe('SeededRng', () => {
    it('produces deterministic sequence (INV-E-ID-DET-01)', () => {
      const rng1 = new SeededRng(12345);
      const rng2 = new SeededRng(12345);

      const seq1 = [rng1.next(), rng1.next(), rng1.next()];
      const seq2 = [rng2.next(), rng2.next(), rng2.next()];

      expect(seq1).toEqual(seq2);
    });

    it('different seeds produce different sequences', () => {
      const rng1 = new SeededRng(12345);
      const rng2 = new SeededRng(54321);

      expect(rng1.next()).not.toBe(rng2.next());
    });

    it('nextHex produces hex string of correct length', () => {
      const rng = new SeededRng(12345);

      const hex4 = rng.nextHex(4);
      const hex8 = rng.nextHex(8);
      const hex16 = rng.nextHex(16);

      expect(hex4).toHaveLength(4);
      expect(hex8).toHaveLength(8);
      expect(hex16).toHaveLength(16);
      expect(hex4).toMatch(/^[0-9a-f]+$/);
      expect(hex8).toMatch(/^[0-9a-f]+$/);
      expect(hex16).toMatch(/^[0-9a-f]+$/);
    });

    it('nextHex is deterministic', () => {
      const rng1 = new SeededRng(12345);
      const rng2 = new SeededRng(12345);

      expect(rng1.nextHex(8)).toBe(rng2.nextHex(8));
      expect(rng1.nextHex(8)).toBe(rng2.nextHex(8));
    });
  });

  describe('DeterministicIdFactory', () => {
    it('creates ClaimId with correct format (INV-E-ID-01)', () => {
      const factory = createTestIdFactory();
      const id = factory.createClaimId();

      expect(id).toMatch(/^CLM-[0-9a-f]+-[0-9a-f]{8}$/);
    });

    it('creates EntityId with correct format (INV-E-ID-01)', () => {
      const factory = createTestIdFactory();
      const id = factory.createEntityId();

      expect(id).toMatch(/^ENT-[0-9a-f]+-[0-9a-f]{8}$/);
    });

    it('creates EvidenceId with correct format (INV-E-ID-01)', () => {
      const factory = createTestIdFactory();
      const id = factory.createEvidenceId();

      expect(id).toMatch(/^EVD-[0-9a-f]+-[0-9a-f]{8}$/);
    });

    it('E1-T1: ID determinism (same clock+rng seed) (INV-E-ID-DET-01)', () => {
      // Same seeds
      const factory1 = createTestIdFactory(1_000_000_000_000_000_000n, 12345);
      const factory2 = createTestIdFactory(1_000_000_000_000_000_000n, 12345);

      const id1 = factory1.createClaimId();
      const id2 = factory2.createClaimId();

      expect(id1).toBe(id2);
    });

    it('different seeds produce different IDs', () => {
      const factory1 = createTestIdFactory(1_000_000_000_000_000_000n, 12345);
      const factory2 = createTestIdFactory(1_000_000_000_000_000_000n, 54321);

      const id1 = factory1.createClaimId();
      const id2 = factory2.createClaimId();

      // Random part should be different
      expect(id1).not.toBe(id2);
    });

    it('consecutive IDs have increasing mono_ns', () => {
      const factory = createTestIdFactory();

      const id1 = factory.createClaimId();
      const id2 = factory.createClaimId();

      // Extract mono_ns hex from CLM-{mono_ns}-{random}
      const mono1 = BigInt('0x' + id1.split('-')[1]);
      const mono2 = BigInt('0x' + id2.split('-')[1]);

      expect(mono2).toBeGreaterThan(mono1);
    });

    it('validates ClaimId (INV-E-ID-VALID-01)', () => {
      const factory = createTestIdFactory();

      expect(factory.validateClaimId('CLM-deadbeef-12345678')).toBe(true);
      expect(factory.validateClaimId('CLM-abc123-abcd1234')).toBe(true);
      expect(factory.validateClaimId('INVALID')).toBe(false);
      expect(factory.validateClaimId('ENT-abc-12345678')).toBe(false);
      expect(factory.validateClaimId('CLM-abc-1234')).toBe(false); // too short random
    });

    it('validates EntityId (INV-E-ID-VALID-01)', () => {
      const factory = createTestIdFactory();

      expect(factory.validateEntityId('ENT-deadbeef-12345678')).toBe(true);
      expect(factory.validateEntityId('CLM-abc-12345678')).toBe(false);
    });

    it('validates EvidenceId (INV-E-ID-VALID-01)', () => {
      const factory = createTestIdFactory();

      expect(factory.validateEvidenceId('EVD-deadbeef-12345678')).toBe(true);
      expect(factory.validateEvidenceId('CLM-abc-12345678')).toBe(false);
    });

    it('getCurrentMonoNs returns current timestamp', () => {
      const factory = createTestIdFactory(1_000_000_000_000_000_000n);

      const mono = factory.getCurrentMonoNs();

      expect(typeof mono).toBe('bigint');
      expect(mono).toBeGreaterThanOrEqual(1_000_000_000_000_000_000n);
    });
  });

  describe('Test ID creators', () => {
    it('createTestClaimId creates valid ID', () => {
      const id = createTestClaimId('abc123', 'deadbeef');
      expect(id).toBe('CLM-abc123-deadbeef');
    });

    it('createTestEntityId creates valid ID', () => {
      const id = createTestEntityId('abc123', 'deadbeef');
      expect(id).toBe('ENT-abc123-deadbeef');
    });

    it('createTestEvidenceId creates valid ID', () => {
      const id = createTestEvidenceId('abc123', 'deadbeef');
      expect(id).toBe('EVD-abc123-deadbeef');
    });
  });

  describe('E1-T2: Config symbols resolution (INV-E-CONFIG-02)', () => {
    it('factory uses ConfigSymbols not magic numbers', () => {
      const clock = createTestClock();
      const rng = new SeededRng(12345);
      const config = createTestConfigResolver({
        ID_RNG_HEX_LEN: 16, // Different from default
        ID_FORMAT_REGEX_CLM: '^CLM-[0-9a-f]+-[0-9a-f]{16}$',
        ID_FORMAT_REGEX_ENT: '^ENT-[0-9a-f]+-[0-9a-f]{16}$',
        ID_FORMAT_REGEX_EVD: '^EVD-[0-9a-f]+-[0-9a-f]{16}$',
      });

      const factory = new DeterministicIdFactory(clock, rng, config);
      const id = factory.createClaimId();

      // Should have 16-char random part now
      const randomPart = id.split('-')[2];
      expect(randomPart).toHaveLength(16);
    });
  });
});
