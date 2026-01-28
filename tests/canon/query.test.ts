/**
 * OMEGA Canon Query Engine Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-QUERY-01, INV-E-QUERY-02, INV-E-READ-01, INV-E-READ-03
 */

import { describe, it, expect } from 'vitest';
import {
  query,
  getById,
  getByHash,
  getClaimsForSubject,
  getActiveClaimsForSubject,
  getClaimsBySubjectAndPredicate,
  getActiveClaimsBySubjectAndPredicate,
  InMemoryClaimRetriever,
} from '../../src/canon/query';
import { buildIndex, createEmptyIndex } from '../../src/canon/index-builder';
import type { CanonClaim, ClaimId, EntityId, PredicateType, MonoNs, CanonVersion, ChainHash } from '../../src/canon/types';
import { ClaimStatus, LineageSource } from '../../src/canon/types';
import { GENESIS_HASH } from '../../src/canon/lineage';
import { hashCanonical } from '../../src/shared/canonical';

function createTestClaim(
  id: string,
  subject: string,
  predicate: string,
  value: string,
  status: ClaimStatus = ClaimStatus.ACTIVE
): CanonClaim {
  const baseClaim = {
    id: `CLM-${id}-12345678` as ClaimId,
    subject: `ENT-${subject}-87654321` as EntityId,
    predicate: predicate as PredicateType,
    value,
    mono_ns: BigInt(1000000000000000000 + parseInt(id, 10)) as MonoNs,
    version: 1 as CanonVersion,
    lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
    evidence: [],
    status,
    prevHash: GENESIS_HASH,
    hash: '' as ChainHash,
  };
  const { hash, ...claimWithoutHash } = baseClaim;
  const computedHash = hashCanonical(claimWithoutHash) as ChainHash;
  return { ...baseClaim, hash: computedHash };
}

describe('CANON Query Engine — Phase E', () => {
  describe('query (INV-E-QUERY-01, INV-E-QUERY-02)', () => {
    it('E3-QUERY-01: queries by subject', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });

      expect(result.claims).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('E3-QUERY-02: queries by predicate', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
        createTestClaim('003', 'alice', 'HAS_AGE', '30'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        predicate: 'HAS_NAME' as PredicateType,
      });

      expect(result.claims).toHaveLength(2);
    });

    it('E3-QUERY-03: queries by status', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice', ClaimStatus.ACTIVE),
        createTestClaim('002', 'alice', 'HAS_NAME', 'Alice Updated', ClaimStatus.ACTIVE),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob', ClaimStatus.SUPERSEDED),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        status: ClaimStatus.ACTIVE,
      });

      expect(result.claims).toHaveLength(2);
    });

    it('E3-QUERY-04: queries by subject and predicate combined', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
      });

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].value).toBe('Alice');
    });

    it('E3-QUERY-05: applies limit', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
        createTestClaim('003', 'charlie', 'HAS_NAME', 'Charlie'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        predicate: 'HAS_NAME' as PredicateType,
        limit: 2,
      });

      expect(result.claims).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it('E3-QUERY-06: applies offset', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
        createTestClaim('003', 'charlie', 'HAS_NAME', 'Charlie'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        predicate: 'HAS_NAME' as PredicateType,
        offset: 1,
        limit: 2,
      });

      expect(result.claims).toHaveLength(2);
      expect(result.total).toBe(3);
    });

    it('E3-QUERY-07: returns deterministic hash (INV-E-QUERY-01)', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result1 = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });
      const result2 = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });

      expect(result1.queryHash).toBe(result2.queryHash);
    });

    it('E3-QUERY-08: returns empty result for no matches', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [createTestClaim('001', 'alice', 'HAS_NAME', 'Alice')];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-unknown-00000000' as EntityId,
      });

      expect(result.claims).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it('E3-QUERY-09: sorts by id ascending by default', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('003', 'alice', 'HAS_NAME', 'Charlie'),
        createTestClaim('001', 'alice', 'HAS_AGE', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_CITY', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });

      expect(result.claims[0].id).toBe('CLM-001-12345678');
      expect(result.claims[1].id).toBe('CLM-002-12345678');
      expect(result.claims[2].id).toBe('CLM-003-12345678');
    });

    it('E3-QUERY-10: sorts by timestamp when requested', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('003', 'alice', 'HAS_NAME', 'Charlie'),
        createTestClaim('001', 'alice', 'HAS_AGE', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_CITY', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
        orderBy: 'timestamp',
        orderDir: 'asc',
      });

      // Claims sorted by mono_ns (which includes id in the timestamp)
      expect(result.claims[0].id).toBe('CLM-001-12345678');
    });

    it('E3-QUERY-11: sorts descending when requested', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'alice', 'HAS_CITY', 'NYC'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
        orderBy: 'id',
        orderDir: 'desc',
      });

      expect(result.claims[0].id).toBe('CLM-003-12345678');
      expect(result.claims[2].id).toBe('CLM-001-12345678');
    });

    it('E3-QUERY-12: queries by object entity', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'KNOWS', 'ENT-bob-12345678'),
        createTestClaim('002', 'charlie', 'KNOWS', 'ENT-bob-12345678'),
        createTestClaim('003', 'alice', 'KNOWS', 'ENT-dave-12345678'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await query(index, retriever, {
        objectEntity: 'ENT-bob-12345678' as EntityId,
      });

      expect(result.claims).toHaveLength(2);
    });
  });

  describe('getById (INV-E-READ-01)', () => {
    it('returns claim by ID', async () => {
      const claim = createTestClaim('001', 'alice', 'HAS_NAME', 'Alice');
      const retriever = new InMemoryClaimRetriever([claim]);

      const result = await getById(retriever, 'CLM-001-12345678' as ClaimId);

      expect(result).not.toBeNull();
      expect(result!.value).toBe('Alice');
    });

    it('returns null for unknown ID', async () => {
      const retriever = new InMemoryClaimRetriever([]);

      const result = await getById(retriever, 'CLM-unknown-12345678' as ClaimId);

      expect(result).toBeNull();
    });
  });

  describe('getByHash', () => {
    it('returns claim by hash', async () => {
      const claim = createTestClaim('001', 'alice', 'HAS_NAME', 'Alice');
      const retriever = new InMemoryClaimRetriever([claim]);

      const result = await getByHash(retriever, claim.hash);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(claim.id);
    });

    it('returns null for unknown hash', async () => {
      const retriever = new InMemoryClaimRetriever([]);

      const result = await getByHash(retriever, 'unknown-hash' as ChainHash);

      expect(result).toBeNull();
    });
  });

  describe('getClaimsForSubject', () => {
    it('returns all claims for subject', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await getClaimsForSubject(
        index,
        retriever,
        'ENT-alice-87654321' as EntityId
      );

      expect(result).toHaveLength(2);
    });
  });

  describe('getActiveClaimsForSubject', () => {
    it('returns only active claims', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice', ClaimStatus.ACTIVE),
        createTestClaim('002', 'alice', 'HAS_NAME', 'Old Name', ClaimStatus.SUPERSEDED),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await getActiveClaimsForSubject(
        index,
        retriever,
        'ENT-alice-87654321' as EntityId
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Alice');
    });
  });

  describe('getClaimsBySubjectAndPredicate', () => {
    it('returns claims matching both subject and predicate', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await getClaimsBySubjectAndPredicate(
        index,
        retriever,
        'ENT-alice-87654321' as EntityId,
        'HAS_NAME' as PredicateType
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Alice');
    });
  });

  describe('getActiveClaimsBySubjectAndPredicate', () => {
    it('returns only active claims matching subject and predicate', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice', ClaimStatus.ACTIVE),
        createTestClaim('002', 'alice', 'HAS_NAME', 'Old Name', ClaimStatus.SUPERSEDED),
        createTestClaim('003', 'bob', 'HAS_NAME', 'Bob', ClaimStatus.ACTIVE),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await getActiveClaimsBySubjectAndPredicate(
        index,
        retriever,
        'ENT-alice-87654321' as EntityId,
        'HAS_NAME' as PredicateType
      );

      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('Alice');
    });
  });

  describe('InMemoryClaimRetriever', () => {
    it('stores and retrieves claims', async () => {
      const claim = createTestClaim('001', 'alice', 'HAS_NAME', 'Alice');
      const retriever = new InMemoryClaimRetriever([claim]);

      expect(await retriever.getById(claim.id)).toEqual(claim);
      expect(await retriever.getByHash(claim.hash)).toEqual(claim);
    });

    it('retrieves multiple claims by IDs', async () => {
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const retriever = new InMemoryClaimRetriever(claims);

      const result = await retriever.getByIds([
        'CLM-001-12345678' as ClaimId,
        'CLM-002-12345678' as ClaimId,
      ]);

      expect(result).toHaveLength(2);
    });

    it('addClaim adds new claim', async () => {
      const retriever = new InMemoryClaimRetriever([]);
      const claim = createTestClaim('001', 'alice', 'HAS_NAME', 'Alice');

      retriever.addClaim(claim);

      expect(await retriever.getById(claim.id)).toEqual(claim);
    });

    it('getAllClaims returns all claims', () => {
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'bob', 'HAS_NAME', 'Bob'),
      ];
      const retriever = new InMemoryClaimRetriever(claims);

      expect(retriever.getAllClaims()).toHaveLength(2);
    });
  });

  describe('Determinism (INV-E-READ-03)', () => {
    it('same query always returns same results', async () => {
      const timestamp = 1000000000000000000n as MonoNs;
      const claims = [
        createTestClaim('001', 'alice', 'HAS_NAME', 'Alice'),
        createTestClaim('002', 'alice', 'HAS_AGE', '30'),
      ];
      const index = buildIndex(claims, 'seg-1', timestamp);
      const retriever = new InMemoryClaimRetriever(claims);

      const result1 = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });
      const result2 = await query(index, retriever, {
        subject: 'ENT-alice-87654321' as EntityId,
      });

      expect(result1.claims.map((c) => c.id)).toEqual(result2.claims.map((c) => c.id));
      expect(result1.queryHash).toBe(result2.queryHash);
    });
  });
});
