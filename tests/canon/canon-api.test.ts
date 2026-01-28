/**
 * OMEGA Canon API Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-PIPELINE-01, INV-E-PIPELINE-02, INV-E-CONFLICT-02
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  DefaultCanonAPI,
  createCanonAPI,
  createTestCanonAPI,
} from '../../src/canon/canon-api';
import type { ClaimId, EntityId, PredicateType, MonoNs, ChainHash } from '../../src/canon/types';
import { ClaimStatus, LineageSource, CanonErrorCode } from '../../src/canon/types';
import { createTestClock } from '../../src/shared/clock';
import { GENESIS_HASH } from '../../src/canon/lineage';

const TEST_DIR = join(process.cwd(), '.test_canon_api');

describe('CANON API — Phase E', () => {
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

  describe('Initialization', () => {
    it('E3-INIT-01: init creates storage directory', async () => {
      const newDir = join(TEST_DIR, 'new_storage');
      const api = new DefaultCanonAPI({ storageDir: newDir });

      await api.init();

      expect(existsSync(newDir)).toBe(true);
      await api.close();
    });

    it('E3-INIT-02: init is idempotent', async () => {
      const api = new DefaultCanonAPI({ storageDir: TEST_DIR });

      await api.init();
      await api.init(); // Second call should not fail

      await api.close();
    });

    it('E3-INIT-03: operations fail before init', async () => {
      const api = new DefaultCanonAPI({ storageDir: TEST_DIR });

      await expect(api.getClaim('CLM-test-12345678' as ClaimId)).rejects.toThrow(
        'not initialized'
      );
    });
  });

  describe('createClaim (INV-E-PIPELINE-01)', () => {
    it('E3-CREATE-01: creates claim successfully', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.subject).toBe('ENT-alice-12345678');
        expect(result.value.predicate).toBe('HAS_NAME');
        expect(result.value.value).toBe('Alice');
        expect(result.value.status).toBe(ClaimStatus.ACTIVE);
        expect(result.value.hash).toBeDefined();
      }

      await api.close();
    });

    it('E3-CREATE-02: claim has correct prevHash for first claim', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.prevHash).toBe(GENESIS_HASH);
      }

      await api.close();
    });

    it('E3-CREATE-03: claim has correct prevHash chaining', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result1 = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const result2 = await api.createClaim({
        subject: 'ENT-bob-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result1.ok).toBe(true);
      expect(result2.ok).toBe(true);
      if (result1.ok && result2.ok) {
        expect(result2.value.prevHash).toBe(result1.value.hash);
      }

      await api.close();
    });

    it('E3-CREATE-04: rejects invalid subject', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.createClaim({
        subject: '' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CanonErrorCode.INVALID_SUBJECT);
      }

      await api.close();
    });

    it('E3-CREATE-05: rejects invalid predicate', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: '' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CanonErrorCode.INVALID_PREDICATE);
      }

      await api.close();
    });

    it('E3-CREATE-06: normalizes undefined to null', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: { name: 'Alice', nickname: undefined } as unknown,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        const value = result.value.value as { name: string; nickname: null };
        expect(value.nickname).toBeNull();
      }

      await api.close();
    });
  });

  describe('Conflict Detection (INV-E-CONFLICT-02)', () => {
    it('E3-CONFLICT-01: detects direct conflict (CONTR-001)', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Create first claim
      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Try to create conflicting claim
      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Not Alice', // Different value = conflict
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe(CanonErrorCode.CONTRADICTION_DIRECT);
      }

      await api.close();
    });

    it('E3-CONFLICT-02: allows same value (no conflict)', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Create first claim
      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Create claim with same value
      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice', // Same value = no conflict
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);

      await api.close();
    });

    it('E3-CONFLICT-03: checkConflicts API works', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Create first claim
      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Check for conflict
      const conflictResult = await api.checkConflicts({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Different',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(conflictResult.hasConflict).toBe(true);

      await api.close();
    });

    it('E3-CONFLICT-04: guard disabled allows conflicts', async () => {
      const api = await createCanonAPI({
        storageDir: TEST_DIR,
        guardEnabled: false,
      });

      // Create first claim
      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Create conflicting claim (should succeed with guard disabled)
      const result = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Not Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);

      await api.close();
    });
  });

  describe('Supersession', () => {
    it('E3-SUPER-01: supersession marks old claim as SUPERSEDED', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Create first claim
      const result1 = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result1.ok).toBe(true);
      if (!result1.ok) return;

      // Create superseding claim
      const result2 = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice Updated',
        supersedes: result1.value.id,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result2.ok).toBe(true);

      // Check old claim is superseded
      const oldClaim = await api.getClaim(result1.value.id);
      expect(oldClaim?.status).toBe(ClaimStatus.SUPERSEDED);

      await api.close();
    });
  });

  describe('Read Operations', () => {
    it('E3-READ-01: getClaim returns claim by ID', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const createResult = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(createResult.ok).toBe(true);
      if (!createResult.ok) return;

      const claim = await api.getClaim(createResult.value.id);

      expect(claim).not.toBeNull();
      expect(claim!.value).toBe('Alice');

      await api.close();
    });

    it('E3-READ-02: getClaim returns null for unknown ID', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const claim = await api.getClaim('CLM-unknown-12345678' as ClaimId);

      expect(claim).toBeNull();

      await api.close();
    });

    it('E3-READ-03: getClaimsForSubject returns all claims', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_AGE' as PredicateType,
        value: 30,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const claims = await api.getClaimsForSubject('ENT-alice-12345678' as EntityId);

      expect(claims).toHaveLength(2);

      await api.close();
    });

    it('E3-READ-04: getActiveClaimsBySubjectAndPredicate filters correctly', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Create and supersede a claim
      const result1 = await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Old Name',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      if (!result1.ok) return;

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'New Name',
        supersedes: result1.value.id,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const activeClaims = await api.getActiveClaimsBySubjectAndPredicate(
        'ENT-alice-12345678' as EntityId,
        'HAS_NAME' as PredicateType
      );

      expect(activeClaims).toHaveLength(1);
      expect(activeClaims[0].value).toBe('New Name');

      await api.close();
    });

    it('E3-READ-05: getAllClaims returns all claims', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api.createClaim({
        subject: 'ENT-bob-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const claims = await api.getAllClaims();

      expect(claims).toHaveLength(2);

      await api.close();
    });
  });

  describe('Query', () => {
    it('E3-QUERY-01: query by subject', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api.createClaim({
        subject: 'ENT-bob-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const result = await api.query({
        subject: 'ENT-alice-12345678' as EntityId,
      });

      expect(result.claims).toHaveLength(1);
      expect(result.claims[0].value).toBe('Alice');

      await api.close();
    });

    it('E3-QUERY-02: query with pagination', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      for (let i = 0; i < 5; i++) {
        await api.createClaim({
          subject: 'ENT-alice-12345678' as EntityId,
          predicate: `ATTR_${i}` as PredicateType,
          value: `Value ${i}`,
          lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
          evidence: [],
        });
      }

      const result = await api.query({
        subject: 'ENT-alice-12345678' as EntityId,
        limit: 2,
        offset: 1,
      });

      expect(result.claims).toHaveLength(2);
      expect(result.total).toBe(5);
      expect(result.hasMore).toBe(true);

      await api.close();
    });
  });

  describe('Integrity Verification', () => {
    it('E3-INTEGRITY-01: verifyIntegrity returns valid for correct chain', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api.createClaim({
        subject: 'ENT-bob-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const result = await api.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.claimCount).toBe(2);

      await api.close();
    });

    it('E3-INTEGRITY-02: verifyIntegrity returns valid for empty chain', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      const result = await api.verifyIntegrity();

      expect(result.valid).toBe(true);
      expect(result.claimCount).toBe(0);

      await api.close();
    });
  });

  describe('Statistics', () => {
    it('E3-STATS-01: getStats returns correct counts', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      await api.createClaim({
        subject: 'ENT-bob-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Bob',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const stats = await api.getStats();

      expect(stats.claimCount).toBe(2);
      expect(stats.chainValid).toBe(true);
      expect(stats.lastClaimAt).not.toBeNull();

      await api.close();
    });
  });

  describe('Lifecycle', () => {
    it('E3-CLOSE-01: close is idempotent', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      await api.close();
      await api.close(); // Second call should not fail
    });
  });

  describe('Factory Functions', () => {
    it('createCanonAPI initializes automatically', async () => {
      const api = await createCanonAPI({ storageDir: TEST_DIR });

      // Should work immediately (already initialized)
      const result = await api.createClaim({
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'TEST' as PredicateType,
        value: 'test',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.ok).toBe(true);

      await api.close();
    });

    it('createTestCanonAPI creates test instance', () => {
      const api = createTestCanonAPI(TEST_DIR);

      expect(api).toBeInstanceOf(DefaultCanonAPI);
    });
  });
});
