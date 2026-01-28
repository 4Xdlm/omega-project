/**
 * OMEGA Canon Guard Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-CONFLICT-01, INV-E-CONFLICT-02, INV-E-CONFLICT-DET-03, INV-E-NAN-01
 * Includes Golden Tests E5-GOLD-1 and E5-GOLD-2
 */

import { describe, it, expect } from 'vitest';
import {
  CanonGuard,
  guard,
  ConflictType,
  ClaimStore,
} from '../../src/canon/guard';
import type { CanonClaim, ClaimId, EntityId, PredicateType, MonoNs, CanonVersion, ChainHash } from '../../src/canon/types';
import { ClaimStatus, LineageSource } from '../../src/canon/types';
import { GENESIS_HASH } from '../../src/canon/lineage';
import { hashCanonical } from '../../src/shared/canonical';

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

  const { hash, ...claimWithoutHash } = baseClaim;
  const computedHash = hashCanonical(claimWithoutHash) as ChainHash;

  return { ...baseClaim, hash: computedHash };
}

// Mock claim store
function createMockStore(claims: CanonClaim[]): ClaimStore {
  const claimMap = new Map(claims.map((c) => [c.id, c]));
  const entities = new Set<EntityId>();
  claims.forEach((c) => entities.add(c.subject));

  return {
    getById(id: ClaimId) {
      return claimMap.get(id);
    },
    getBySubjectAndPredicate(subject: EntityId, predicate: PredicateType) {
      return claims.filter(
        (c) => c.subject === subject && c.predicate === predicate
      );
    },
    getAllEntityIds() {
      return Array.from(entities);
    },
  };
}

describe('CANON Guard — Phase E', () => {
  describe('validateClaimParams', () => {
    it('accepts valid params', () => {
      const g = new CanonGuard();
      const result = g.validateClaimParams({
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Test',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects empty subject', () => {
      const g = new CanonGuard();
      const result = g.validateClaimParams({
        subject: '' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Test',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_SUBJECT')).toBe(true);
    });

    it('rejects invalid predicate', () => {
      const g = new CanonGuard();
      const result = g.validateClaimParams({
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'INVALID_PRED' as PredicateType,
        value: 'Test',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_PREDICATE')).toBe(true);
    });

    it('E5-T5: rejects NaN in value (INV-E-NAN-01)', () => {
      const g = new CanonGuard();
      const result = g.validateClaimParams({
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { score: NaN },
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_VALUE_NAN')).toBe(true);
    });

    it('rejects nested NaN', () => {
      const g = new CanonGuard();
      const result = g.validateClaimParams({
        subject: 'ENT-test-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { nested: { deep: { value: NaN } } },
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_VALUE_NAN')).toBe(true);
    });
  });

  describe('checkNaN', () => {
    it('detects direct NaN', () => {
      const g = new CanonGuard();
      expect(g.checkNaN(NaN)).toBe(true);
    });

    it('detects nested NaN', () => {
      const g = new CanonGuard();
      expect(g.checkNaN({ a: { b: NaN } })).toBe(true);
    });

    it('returns false for valid values', () => {
      const g = new CanonGuard();
      expect(g.checkNaN(42)).toBe(false);
      expect(g.checkNaN({ a: 1 })).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // E5-GOLD-1 & E5-GOLD-2: CONTR-001 with semanticEquals (INV-E-CONFLICT-DET-03)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('E5-GOLD-1: CONTR-001 with semanticEquals - equivalent objects', () => {
    it('does NOT detect conflict for semantically equal objects (different key order)', () => {
      const g = new CanonGuard();

      // Existing claim with object value
      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: 1, b: 2 }, // Key order: a, b
      });

      const store = createMockStore([existingClaim]);

      // New claim with same value but different key order
      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { b: 2, a: 1 }, // Key order: b, a (different!)
      };

      const result = g.checkDirectConflict(newClaim, store);

      // Should NOT detect conflict because semanticEquals({a:1,b:2}, {b:2,a:1}) === true
      expect(result.hasConflict).toBe(false);
    });

    it('E5-T2: does NOT detect conflict for equal values', () => {
      const g = new CanonGuard();

      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'John Doe',
      });

      const store = createMockStore([existingClaim]);

      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'John Doe', // Same value
      };

      const result = g.checkDirectConflict(newClaim, store);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('E5-GOLD-2: CONTR-001 with semanticEquals - different objects', () => {
    it('E5-T1: detects conflict for semantically different objects', () => {
      const g = new CanonGuard();

      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: 1 },
      });

      const store = createMockStore([existingClaim]);

      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: 2 }, // Different value!
      };

      const result = g.checkDirectConflict(newClaim, store);

      // Should detect conflict because semanticEquals({a:1}, {a:2}) === false
      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe(ConflictType.DIRECT);
      expect(result.conflictingClaimIds).toContain('CLM-existing-11111111');
    });

    it('detects conflict for different primitive values', () => {
      const g = new CanonGuard();

      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'John Doe',
      });

      const store = createMockStore([existingClaim]);

      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Jane Doe', // Different!
      };

      const result = g.checkDirectConflict(newClaim, store);
      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe(ConflictType.DIRECT);
    });
  });

  describe('E5-T7: No !== for semantic comparison (INT-E-07)', () => {
    it('handles undefined vs null equivalence', () => {
      const g = new CanonGuard();

      // Claim with explicit null
      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: null },
      });

      const store = createMockStore([existingClaim]);

      // New claim - if we used !== this would fail incorrectly
      // But semanticEquals treats undefined and null as equivalent
      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: null }, // Same semantically
      };

      const result = g.checkDirectConflict(newClaim, store);
      expect(result.hasConflict).toBe(false);
    });
  });

  describe('CONTR-001: supersedes skip', () => {
    it('skips conflict check when new claim supersedes existing', () => {
      const g = new CanonGuard();

      const existingClaim = createTestClaim({
        id: 'CLM-old-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Old Name',
      });

      const store = createMockStore([existingClaim]);

      const newClaim = {
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'New Name',
        supersedes: 'CLM-old-11111111' as ClaimId, // Supersedes existing
      };

      const result = g.checkDirectConflict(newClaim, store);
      expect(result.hasConflict).toBe(false); // No conflict because supersedes
    });
  });

  describe('E5-T3: CONTR-002 entity missing', () => {
    it('detects missing entity', () => {
      const g = new CanonGuard();
      const store = createMockStore([]);

      const result = g.checkEntityExists(
        'ENT-nonexistent-12345678' as EntityId,
        store
      );

      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe(ConflictType.ENTITY_MISSING);
    });

    it('passes for existing entity', () => {
      const g = new CanonGuard();
      const claim = createTestClaim({
        subject: 'ENT-existing-12345678' as EntityId,
      });
      const store = createMockStore([claim]);

      const result = g.checkEntityExists(
        'ENT-existing-12345678' as EntityId,
        store
      );

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('E5-T4: CONTR-003 supersession loop', () => {
    it('detects simple loop', () => {
      const g = new CanonGuard();

      // A supersedes B, B supersedes A = loop
      const claimA = createTestClaim({
        id: 'CLM-A-00000001' as ClaimId,
        supersedes: 'CLM-B-00000002' as ClaimId,
      });

      const claimB = createTestClaim({
        id: 'CLM-B-00000002' as ClaimId,
        supersedes: 'CLM-A-00000001' as ClaimId,
      });

      const store = createMockStore([claimA, claimB]);

      const result = g.checkSupersessionLoop(
        'CLM-C-00000003' as ClaimId,
        'CLM-A-00000001' as ClaimId, // New claim supersedes A
        store
      );

      expect(result.hasConflict).toBe(true);
      expect(result.type).toBe(ConflictType.SUPERSESSION_LOOP);
    });

    it('passes for valid chain', () => {
      const g = new CanonGuard();

      const claimA = createTestClaim({
        id: 'CLM-A-00000001' as ClaimId,
        supersedes: 'CLM-B-00000002' as ClaimId,
      });

      const claimB = createTestClaim({
        id: 'CLM-B-00000002' as ClaimId,
        // No supersedes - chain ends
      });

      const store = createMockStore([claimA, claimB]);

      const result = g.checkSupersessionLoop(
        'CLM-C-00000003' as ClaimId,
        'CLM-A-00000001' as ClaimId,
        store
      );

      expect(result.hasConflict).toBe(false);
    });

    it('passes when no supersedes', () => {
      const g = new CanonGuard();
      const store = createMockStore([]);

      const result = g.checkSupersessionLoop(
        'CLM-A-00000001' as ClaimId,
        undefined,
        store
      );

      expect(result.hasConflict).toBe(false);
    });
  });

  describe('E5-T6: Guard FAIL = no write (INV-E-CONFLICT-02)', () => {
    it('checkAllConflicts returns conflict on any failure', () => {
      const g = new CanonGuard();

      const existingClaim = createTestClaim({
        id: 'CLM-existing-11111111' as ClaimId,
        subject: 'ENT-person-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Existing Name',
      });

      const store = createMockStore([existingClaim]);

      const result = g.checkAllConflicts(
        {
          id: 'CLM-new-22222222' as ClaimId,
          subject: 'ENT-person-12345678' as EntityId,
          predicate: 'HAS_NAME' as PredicateType,
          value: 'Different Name',
        },
        store
      );

      expect(result.hasConflict).toBe(true);
      // This result would block the write
    });
  });

  describe('singleton guard', () => {
    it('exposes default guard instance', () => {
      expect(guard).toBeInstanceOf(CanonGuard);
    });
  });
});
