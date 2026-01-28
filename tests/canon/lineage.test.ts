/**
 * OMEGA Canon Lineage Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-LINEAGE-01, INV-E-LINEAGE-02
 */

import { describe, it, expect } from 'vitest';
import {
  GENESIS_HASH,
  createLineage,
  computePrevHash,
  computeLineageHash,
  verifyLineageChain,
  getParentClaim,
  buildHashIndex,
  verifyClaimHash,
  verifyAllClaimHashes,
} from '../../src/canon/lineage';
import { sha256, hashCanonical } from '../../src/shared/canonical';
import type { CanonClaim, ChainHash, ClaimId, EntityId, PredicateType, MonoNs, CanonVersion } from '../../src/canon/types';
import { ClaimStatus, LineageSource, EvidenceType } from '../../src/canon/types';

// Helper to create test claims
function createTestClaim(overrides: Partial<CanonClaim> = {}): CanonClaim {
  const baseClaim = {
    id: 'CLM-test-12345678' as ClaimId,
    subject: 'ENT-subject-87654321' as EntityId,
    predicate: 'HAS_NAME' as PredicateType,
    value: 'Test Value',
    mono_ns: 1000000000000000000n as MonoNs,
    version: 1 as CanonVersion,
    lineage: {
      source: LineageSource.SYSTEM,
      confidence: 1.0,
    },
    evidence: [],
    status: ClaimStatus.ACTIVE,
    prevHash: GENESIS_HASH,
    hash: '' as ChainHash,
    ...overrides,
  };

  // Compute hash
  const { hash, ...claimWithoutHash } = baseClaim;
  const computedHash = hashCanonical(claimWithoutHash) as ChainHash;

  return { ...baseClaim, hash: computedHash };
}

describe('CANON Lineage — Phase E', () => {
  describe('GENESIS_HASH', () => {
    it('is SHA256 of "GENESIS"', () => {
      expect(GENESIS_HASH).toBe(sha256('GENESIS'));
    });

    it('is deterministic', () => {
      expect(GENESIS_HASH).toBe(sha256('GENESIS'));
      expect(GENESIS_HASH).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('createLineage', () => {
    it('creates valid lineage with defaults', () => {
      const lineage = createLineage({
        source: LineageSource.SYSTEM,
      });

      expect(lineage.source).toBe('SYSTEM');
      expect(lineage.confidence).toBe(1.0);
    });

    it('creates lineage with all fields', () => {
      const lineage = createLineage({
        source: LineageSource.USER_INPUT,
        sourceId: 'user-123',
        confidence: 0.95,
        metadata: { key: 'value' },
      });

      expect(lineage.source).toBe('USER_INPUT');
      expect(lineage.sourceId).toBe('user-123');
      expect(lineage.confidence).toBe(0.95);
      expect(lineage.metadata).toEqual({ key: 'value' });
    });

    it('throws for invalid source', () => {
      expect(() =>
        createLineage({
          source: 'INVALID' as LineageSource,
        })
      ).toThrow('INVALID_LINEAGE');
    });

    it('throws for invalid confidence', () => {
      expect(() =>
        createLineage({
          source: LineageSource.SYSTEM,
          confidence: 1.5,
        })
      ).toThrow('INVALID_LINEAGE');

      expect(() =>
        createLineage({
          source: LineageSource.SYSTEM,
          confidence: -0.1,
        })
      ).toThrow('INVALID_LINEAGE');
    });
  });

  describe('E2-T5: computePrevHash GENESIS (INV-E-LINEAGE-01)', () => {
    it('returns GENESIS_HASH for null parent', () => {
      const hash = computePrevHash(null);
      expect(hash).toBe(GENESIS_HASH);
    });

    it('returns parent hash for existing parent', () => {
      const parentClaim = createTestClaim();
      const hash = computePrevHash(parentClaim);
      expect(hash).toBe(parentClaim.hash);
    });
  });

  describe('E2-T4: computeLineageHash (INV-E-LINEAGE-01)', () => {
    it('returns GENESIS hash for null parent', () => {
      const hash = computeLineageHash(null);
      expect(hash).toBe(sha256('GENESIS'));
    });

    it('returns hash of parent claim', () => {
      const parentClaim = createTestClaim();
      const hash = computeLineageHash(parentClaim);
      expect(hash).toBe(hashCanonical(parentClaim));
    });
  });

  describe('verifyLineageChain (INV-E-LINEAGE-02)', () => {
    it('returns valid for empty chain', () => {
      const result = verifyLineageChain([]);
      expect(result.valid).toBe(true);
    });

    it('validates single genesis claim', () => {
      const claim = createTestClaim({ prevHash: GENESIS_HASH });
      const result = verifyLineageChain([claim]);
      expect(result.valid).toBe(true);
    });

    it('fails if first claim has wrong prevHash', () => {
      const claim = createTestClaim({ prevHash: 'wrong-hash' as ChainHash });
      const result = verifyLineageChain([claim]);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(0);
    });

    it('validates chain of claims', () => {
      const claim1 = createTestClaim({
        id: 'CLM-1-00000001' as ClaimId,
        mono_ns: 1n as MonoNs,
        prevHash: GENESIS_HASH,
      });

      const claim2 = createTestClaim({
        id: 'CLM-2-00000002' as ClaimId,
        mono_ns: 2n as MonoNs,
        prevHash: claim1.hash,
      });

      const claim3 = createTestClaim({
        id: 'CLM-3-00000003' as ClaimId,
        mono_ns: 3n as MonoNs,
        prevHash: claim2.hash,
      });

      const result = verifyLineageChain([claim1, claim2, claim3]);
      expect(result.valid).toBe(true);
    });

    it('detects broken chain', () => {
      const claim1 = createTestClaim({
        id: 'CLM-1-00000001' as ClaimId,
        mono_ns: 1n as MonoNs,
        prevHash: GENESIS_HASH,
      });

      const claim2 = createTestClaim({
        id: 'CLM-2-00000002' as ClaimId,
        mono_ns: 2n as MonoNs,
        prevHash: 'wrong-hash' as ChainHash, // Broken!
      });

      const result = verifyLineageChain([claim1, claim2]);
      expect(result.valid).toBe(false);
      expect(result.brokenAt).toBe(1);
      expect(result.expectedHash).toBe(claim1.hash);
    });
  });

  describe('getParentClaim', () => {
    it('returns null for genesis claim', () => {
      const claim = createTestClaim({ prevHash: GENESIS_HASH });
      const index = new Map<ChainHash, CanonClaim>();

      const parent = getParentClaim(claim, index);
      expect(parent).toBeNull();
    });

    it('returns parent from index', () => {
      const parentClaim = createTestClaim({
        id: 'CLM-parent-12345678' as ClaimId,
      });

      const childClaim = createTestClaim({
        id: 'CLM-child-87654321' as ClaimId,
        prevHash: parentClaim.hash,
      });

      const index = buildHashIndex([parentClaim]);
      const parent = getParentClaim(childClaim, index);

      expect(parent).toBe(parentClaim);
    });

    it('returns null if parent not in index', () => {
      const childClaim = createTestClaim({
        prevHash: 'missing-parent-hash' as ChainHash,
      });

      const index = new Map<ChainHash, CanonClaim>();
      const parent = getParentClaim(childClaim, index);

      expect(parent).toBeNull();
    });
  });

  describe('buildHashIndex', () => {
    it('builds index from claims', () => {
      const claim1 = createTestClaim({ id: 'CLM-1-00000001' as ClaimId });
      const claim2 = createTestClaim({ id: 'CLM-2-00000002' as ClaimId });

      const index = buildHashIndex([claim1, claim2]);

      expect(index.get(claim1.hash)).toBe(claim1);
      expect(index.get(claim2.hash)).toBe(claim2);
      expect(index.size).toBe(2);
    });
  });

  describe('verifyClaimHash', () => {
    it('returns true for valid hash', () => {
      const claim = createTestClaim();
      expect(verifyClaimHash(claim)).toBe(true);
    });

    it('returns false for tampered claim', () => {
      const claim = createTestClaim();
      const tampered = { ...claim, value: 'Tampered!' };
      expect(verifyClaimHash(tampered)).toBe(false);
    });
  });

  describe('verifyAllClaimHashes', () => {
    it('returns -1 for all valid', () => {
      const claims = [
        createTestClaim({ id: 'CLM-1-00000001' as ClaimId }),
        createTestClaim({ id: 'CLM-2-00000002' as ClaimId }),
      ];
      expect(verifyAllClaimHashes(claims)).toBe(-1);
    });

    it('returns index of first invalid', () => {
      const claim1 = createTestClaim({ id: 'CLM-1-00000001' as ClaimId });
      const claim2 = createTestClaim({ id: 'CLM-2-00000002' as ClaimId });
      const tampered = { ...claim2, value: 'Tampered!' };

      expect(verifyAllClaimHashes([claim1, tampered])).toBe(1);
    });
  });
});
