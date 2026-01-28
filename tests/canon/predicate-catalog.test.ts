/**
 * OMEGA Canon Predicate Catalog Tests v1.0
 * Phase E - NASA-Grade L4 / DO-178C
 *
 * Tests INV-E-PRED-01, INV-E-PRED-02, INV-E-PRED-03, INV-E-PRED-04
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BUILT_IN_CATALOG,
  loadCatalog,
  getCatalog,
  resetCatalog,
  validatePredicate,
  getPredicateDefinition,
  asPredicateType,
  getAllPredicateIds,
  getCatalogHash,
  getCatalogVersion,
  hasSupersedesPredicate,
  PredicateCatalog,
} from '../../src/canon/predicate-catalog';

describe('CANON Predicate Catalog — Phase E', () => {
  beforeEach(() => {
    resetCatalog();
  });

  describe('BUILT_IN_CATALOG', () => {
    it('has version 1.0.0', () => {
      expect(BUILT_IN_CATALOG.version).toBe('1.0.0');
    });

    it('has core predicates plus test predicates', () => {
      // Core predicates (4) + test predicates (9) = 13
      expect(BUILT_IN_CATALOG.predicates.length).toBeGreaterThanOrEqual(4);
      // Verify core predicates exist
      expect(BUILT_IN_CATALOG.predicates.find((p) => p.id === 'IS_A')).toBeDefined();
      expect(BUILT_IN_CATALOG.predicates.find((p) => p.id === 'HAS_NAME')).toBeDefined();
      expect(BUILT_IN_CATALOG.predicates.find((p) => p.id === 'HAS_ATTRIBUTE')).toBeDefined();
      expect(BUILT_IN_CATALOG.predicates.find((p) => p.id === 'RELATED_TO')).toBeDefined();
    });

    it('contains IS_A predicate', () => {
      const isA = BUILT_IN_CATALOG.predicates.find((p) => p.id === 'IS_A');
      expect(isA).toBeDefined();
      expect(isA?.transitive).toBe(true);
    });

    it('E2-T6: does NOT contain SUPERSEDES predicate (R22)', () => {
      const supersedes = BUILT_IN_CATALOG.predicates.find(
        (p) => p.id === 'SUPERSEDES'
      );
      expect(supersedes).toBeUndefined();
      expect(hasSupersedesPredicate()).toBe(false);
    });
  });

  describe('validatePredicate (INV-E-PRED-01)', () => {
    it('E2-T2: returns false for unknown predicate', () => {
      expect(validatePredicate('UNKNOWN_PREDICATE')).toBe(false);
      expect(validatePredicate('')).toBe(false);
      expect(validatePredicate('SUPERSEDES')).toBe(false);
    });

    it('returns true for valid predicates', () => {
      expect(validatePredicate('IS_A')).toBe(true);
      expect(validatePredicate('HAS_NAME')).toBe(true);
      expect(validatePredicate('HAS_ATTRIBUTE')).toBe(true);
      expect(validatePredicate('RELATED_TO')).toBe(true);
    });
  });

  describe('getPredicateDefinition', () => {
    it('returns definition for valid predicate', () => {
      const def = getPredicateDefinition('IS_A');
      expect(def).toBeDefined();
      expect(def?.id).toBe('IS_A');
      expect(def?.subject_type).toBe('ENTITY');
    });

    it('returns undefined for invalid predicate', () => {
      expect(getPredicateDefinition('INVALID')).toBeUndefined();
    });
  });

  describe('asPredicateType', () => {
    it('returns typed predicate for valid ID', () => {
      const pred = asPredicateType('IS_A');
      expect(pred).toBe('IS_A');
    });

    it('throws for invalid predicate', () => {
      expect(() => asPredicateType('INVALID')).toThrow('INVALID_PREDICATE');
    });
  });

  describe('getAllPredicateIds', () => {
    it('returns all predicate IDs', () => {
      const ids = getAllPredicateIds();
      expect(ids).toContain('IS_A');
      expect(ids).toContain('HAS_NAME');
      expect(ids).toContain('HAS_ATTRIBUTE');
      expect(ids).toContain('RELATED_TO');
      expect(ids).not.toContain('SUPERSEDES');
    });
  });

  describe('E2-T1: loadCatalog determinism (INV-E-PRED-03)', () => {
    it('loads catalog deterministically', () => {
      const customCatalog: PredicateCatalog = {
        version: '2.0.0',
        predicates: [
          {
            id: 'CUSTOM_PRED',
            description: 'Custom predicate',
            subject_type: 'ENTITY',
            object_type: 'PRIMITIVE',
            symmetric: false,
            transitive: false,
            introduced_version: 2,
          },
        ],
      };

      loadCatalog(customCatalog);
      expect(getCatalogVersion()).toBe('2.0.0');
      expect(validatePredicate('CUSTOM_PRED')).toBe(true);
      expect(validatePredicate('IS_A')).toBe(false);
    });

    it('rejects catalog with SUPERSEDES predicate (R22)', () => {
      const invalidCatalog: PredicateCatalog = {
        version: '1.0.0',
        predicates: [
          {
            id: 'SUPERSEDES',
            description: 'Should not be allowed',
            subject_type: 'ENTITY',
            object_type: 'CLAIM',
            symmetric: false,
            transitive: false,
            introduced_version: 1,
          },
        ],
      };

      expect(() => loadCatalog(invalidCatalog)).toThrow('R22');
    });
  });

  describe('E2-T3: getCatalogHash stable (INV-E-PRED-04)', () => {
    it('produces deterministic hash', () => {
      const hash1 = getCatalogHash();
      const hash2 = getCatalogHash();
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
    });

    it('different catalog produces different hash', () => {
      const hash1 = getCatalogHash();

      loadCatalog({
        version: '2.0.0',
        predicates: [],
      });

      const hash2 = getCatalogHash();
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('resetCatalog', () => {
    it('resets to built-in catalog', () => {
      loadCatalog({
        version: '2.0.0',
        predicates: [],
      });
      expect(getCatalogVersion()).toBe('2.0.0');

      resetCatalog();
      expect(getCatalogVersion()).toBe('1.0.0');
      expect(getCatalog().predicates.length).toBeGreaterThanOrEqual(4);
    });
  });
});
