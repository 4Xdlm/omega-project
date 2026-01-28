/**
 * OMEGA Canon Index Builder Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-IDX-01, INV-E-IDX-02, INV-E-IDX-03
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  buildIndex,
  mergeIndexes,
  createEmptyIndex,
  verifyIndex,
  saveIndex,
  loadIndex,
  getClaimIdsBySubject,
  getClaimIdsByPredicate,
  getClaimIdsByStatus,
  getClaimIdsBySubjectAndPredicate,
  getClaimOffset,
  hasClaimId,
} from '../../src/canon/index-builder';
import type { CanonClaim, ClaimId, EntityId, PredicateType, MonoNs, CanonVersion, ChainHash } from '../../src/canon/types';
import { ClaimStatus, LineageSource } from '../../src/canon/types';
import { GENESIS_HASH } from '../../src/canon/lineage';
import { hashCanonical } from '../../src/shared/canonical';

const TEST_DIR = join(process.cwd(), '.test_index_builder');

function createTestClaim(id: string, subject: string, predicate: string, value: string): CanonClaim {
  const baseClaim = {
    id: `CLM-${id}-12345678` as ClaimId,
    subject: `ENT-${subject}-87654321` as EntityId,
    predicate: predicate as PredicateType,
    value,
    mono_ns: 1000000000000000000n as MonoNs,
    version: 1 as CanonVersion,
    lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
    evidence: [],
    status: ClaimStatus.ACTIVE,
    prevHash: GENESIS_HASH,
    hash: '' as ChainHash,
  };
  const { hash, ...claimWithoutHash } = baseClaim;
  const computedHash = hashCanonical(claimWithoutHash) as ChainHash;
  return { ...baseClaim, hash: computedHash };
}

describe('CANON Index Builder — Phase E', () => {
  beforeEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
    await mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    if (existsSync(TEST_DIR)) {
      await rm(TEST_DIR, { recursive: true });
    }
  });

  describe('buildIndex (INV-E-IDX-01)', () => {
    it('E3-IDX-01: builds index from claims', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];

      const index = buildIndex(claims, 'seg-1', timestamp);

      expect(index.claimCount).toBe(3);
      expect(index.bySubject.size).toBe(2);
      expect(index.byPredicate.size).toBe(2);
    });

    it('E3-IDX-02: indexes by subject correctly', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
      ];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const aliceClaims = getClaimIdsBySubject(index, 'ENT-alice-87654321' as EntityId);
      expect(aliceClaims).toHaveLength(2);
    });

    it('E3-IDX-03: indexes by predicate correctly', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const nameClaims = getClaimIdsByPredicate(index, 'HAS_NAME' as PredicateType);
      expect(nameClaims).toHaveLength(2);
    });

    it('E3-IDX-04: indexes by status correctly', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const activeClaims = getClaimIdsByStatus(index, ClaimStatus.ACTIVE);
      expect(activeClaims).toHaveLength(1);
    });

    it('E3-IDX-05: indexes by object entity when value is entity', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'KNOWS', 'ENT-bob-12345678')];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const objectClaims = index.byObjectEntity.get('ENT-bob-12345678');
      expect(objectClaims).toHaveLength(1);
    });
  });

  describe('getClaimOffset (INV-E-IDX-02)', () => {
    it('returns correct offset for claim', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const offset = getClaimOffset(index, 'CLM-001-12345678' as ClaimId);
      expect(offset).toEqual({ segmentId: 'seg-1', lineNumber: 0 });

      const offset2 = getClaimOffset(index, 'CLM-002-12345678' as ClaimId);
      expect(offset2).toEqual({ segmentId: 'seg-1', lineNumber: 1 });
    });

    it('returns undefined for unknown claim', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const index = createEmptyIndex(timestamp);

      expect(getClaimOffset(index, 'CLM-unknown-12345678' as ClaimId)).toBeUndefined();
    });
  });

  describe('hasClaimId', () => {
    it('returns true for indexed claim', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];

      const index = buildIndex(claims, 'seg-1', timestamp);

      expect(hasClaimId(index, 'CLM-001-12345678' as ClaimId)).toBe(true);
    });

    it('returns false for unknown claim', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const index = createEmptyIndex(timestamp);

      expect(hasClaimId(index, 'CLM-unknown-12345678' as ClaimId)).toBe(false);
    });
  });

  describe('getClaimIdsBySubjectAndPredicate', () => {
    it('returns intersection of subject and predicate', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];

      const index = buildIndex(claims, 'seg-1', timestamp);

      const result = getClaimIdsBySubjectAndPredicate(
        index,
        'ENT-alice-87654321' as EntityId,
        'HAS_NAME' as PredicateType
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toBe('CLM-001-12345678');
    });
  });

  describe('mergeIndexes (INV-E-IDX-03)', () => {
    it('E3-MERGE-01: merges two indexes correctly', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims1 = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const claims2 = [createTestClaim('002', 'bob', 'HAS_NAME', 'Bob')];

      const index1 = buildIndex(claims1, 'seg-1', timestamp);
      const index2 = buildIndex(claims2, 'seg-2', timestamp);

      const merged = mergeIndexes(index1, index2, timestamp);

      expect(merged.claimCount).toBe(2);
      expect(hasClaimId(merged, 'CLM-001-12345678' as ClaimId)).toBe(true);
      expect(hasClaimId(merged, 'CLM-002-12345678' as ClaimId)).toBe(true);
    });

    it('E3-MERGE-02: merge is deterministic', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims1 = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const claims2 = [createTestClaim('002', 'bob', 'HAS_NAME', 'Bob')];

      const index1 = buildIndex(claims1, 'seg-1', timestamp);
      const index2 = buildIndex(claims2, 'seg-2', timestamp);

      const merged1 = mergeIndexes(index1, index2, timestamp);
      const merged2 = mergeIndexes(index1, index2, timestamp);

      expect(merged1.indexHash).toBe(merged2.indexHash);
    });

    it('E3-MERGE-03: preserves all claim offsets', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims1 = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const claims2 = [createTestClaim('002', 'bob', 'HAS_NAME', 'Bob')];

      const index1 = buildIndex(claims1, 'seg-1', timestamp);
      const index2 = buildIndex(claims2, 'seg-2', timestamp);

      const merged = mergeIndexes(index1, index2, timestamp);

      expect(getClaimOffset(merged, 'CLM-001-12345678' as ClaimId)?.segmentId).toBe('seg-1');
      expect(getClaimOffset(merged, 'CLM-002-12345678' as ClaimId)?.segmentId).toBe('seg-2');
    });
  });

  describe('verifyIndex', () => {
    it('returns true for valid index', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];

      const index = buildIndex(claims, 'seg-1', timestamp);

      expect(verifyIndex(index)).toBe(true);
    });

    it('returns true for empty index', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const index = createEmptyIndex(timestamp);

      expect(verifyIndex(index)).toBe(true);
    });
  });

  describe('createEmptyIndex', () => {
    it('creates empty index with correct structure', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const index = createEmptyIndex(timestamp);

      expect(index.claimCount).toBe(0);
      expect(index.bySubject.size).toBe(0);
      expect(index.byPredicate.size).toBe(0);
      expect(index.byStatus.size).toBe(0);
      expect(index.builtAt).toBe(timestamp);
      expect(index.indexHash).toBeDefined();
    });
  });

  describe('Persistence', () => {
    it('E3-PERSIST-01: saveIndex writes to disk', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const index = buildIndex(claims, 'seg-1', timestamp);

      await saveIndex(TEST_DIR, index);

      expect(existsSync(join(TEST_DIR, 'index.json'))).toBe(true);
    });

    it('E3-PERSIST-02: loadIndex reads from disk', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const index = buildIndex(claims, 'seg-1', timestamp);

      await saveIndex(TEST_DIR, index);
      const loaded = await loadIndex(TEST_DIR);

      expect(loaded).not.toBeNull();
      expect(loaded!.claimCount).toBe(1);
      expect(hasClaimId(loaded!, 'CLM-001-12345678' as ClaimId)).toBe(true);
    });

    it('E3-PERSIST-03: loadIndex returns null for missing file', async () => {
      const loaded = await loadIndex(TEST_DIR);
      expect(loaded).toBeNull();
    });

    it('E3-PERSIST-04: round-trip preserves index hash', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);

      await saveIndex(TEST_DIR, index);
      const loaded = await loadIndex(TEST_DIR);

      expect(loaded!.indexHash).toBe(index.indexHash);
    });
  });

  describe('Determinism (INV-E-IDX-03)', () => {
    it('E3-DET-01: same claims produce same index hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];

      const index1 = buildIndex(claims, 'seg-1', timestamp);
      const index2 = buildIndex(claims, 'seg-1', timestamp);

      expect(index1.indexHash).toBe(index2.indexHash);
    });

    it('E3-DET-02: different claims produce different hash', () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims1 = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const claims2 = [createTestClaim('002', 'bob', 'HAS_NAME', 'Bob')];

      const index1 = buildIndex(claims1, 'seg-1', timestamp);
      const index2 = buildIndex(claims2, 'seg-1', timestamp);

      expect(index1.indexHash).not.toBe(index2.indexHash);
    });
  });
});
