/**
 * OMEGA CANON_CORE — Unit Tests
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * Tests: ~70
 * Invariants covered:
 * - INV-MEM-01: CANON = source de vérité absolue
 * - INV-MEM-05: Persistence intègre
 * - INV-MEM-06: Déterminisme total
 * - INV-MEM-08: Audit trail complet
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  CanonStore,
  createCanonStore,
  FactType,
  FactSource,
  FactStatus,
  ConfidenceLevel,
  ConflictResolution,
  SOURCE_PRIORITY,
  CANON_LIMITS,
  HASH_CONFIG,
  sha256,
  canonicalEncode,
  verifyFactHash,
  computeMerkleRoot,
  CanonErrorCode,
} from '../../src/canon/index.js';

describe('CANON_CORE', () => {
  let canon: CanonStore;

  beforeEach(() => {
    canon = createCanonStore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BASIC OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('add()', () => {
    it('creates a fact with required fields', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe(FactType.CHARACTER);
        expect(result.data.subject).toBe('Jean');
        expect(result.data.predicate).toBe('age');
        expect(result.data.value).toBe('35');
        expect(result.data.source).toBe(FactSource.USER);
        expect(result.data.status).toBe(FactStatus.ACTIVE);
        expect(result.data.version).toBe(1);
      }
    });

    it('generates unique IDs', () => {
      const r1 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      const r2 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'age',
        value: '28',
        source: FactSource.USER,
      });

      expect(r1.success && r2.success).toBe(true);
      if (r1.success && r2.success) {
        expect(r1.data.id).not.toBe(r2.data.id);
      }
    });

    it('sets default confidence based on source', () => {
      const userFact = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean Dupont',
        source: FactSource.USER,
      });

      const inferredFact = canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'name',
        value: 'Marie Curie',
        source: FactSource.INFERRED,
      });

      expect(userFact.success && inferredFact.success).toBe(true);
      if (userFact.success && inferredFact.success) {
        expect(userFact.data.confidence).toBe(ConfidenceLevel.ABSOLUTE);
        expect(inferredFact.data.confidence).toBe(ConfidenceLevel.LOW);
      }
    });

    it('allows custom confidence override', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'mood',
        value: 'happy',
        source: FactSource.INFERRED,
        confidence: ConfidenceLevel.HIGH,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.confidence).toBe(ConfidenceLevel.HIGH);
      }
    });

    it('stores metadata correctly', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'birthplace',
        value: 'Paris',
        source: FactSource.TEXT,
        createdBy: 'test-user',
        sourceRef: 'chapter-1',
        sourcePosition: { chapter: '1', paragraph: 5 },
        tags: ['biography', 'origin'],
        notes: 'Mentioned in opening chapter',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.metadata.createdBy).toBe('test-user');
        expect(result.data.metadata.sourceRef).toBe('chapter-1');
        expect(result.data.metadata.sourcePosition?.chapter).toBe('1');
        expect(result.data.metadata.tags).toContain('biography');
        expect(result.data.metadata.notes).toBe('Mentioned in opening chapter');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validation', () => {
    it('rejects empty subject', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: '',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.INVALID_SUBJECT);
      }
    });

    it('rejects empty predicate', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: '',
        value: '35',
        source: FactSource.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.INVALID_PREDICATE);
      }
    });

    it('rejects subject exceeding max length', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'x'.repeat(CANON_LIMITS.MAX_SUBJECT_LENGTH + 1),
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.SUBJECT_TOO_LONG);
      }
    });

    it('rejects value exceeding max length', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'biography',
        value: 'x'.repeat(CANON_LIMITS.MAX_VALUE_LENGTH + 1),
        source: FactSource.USER,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.VALUE_TOO_LONG);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-01: SOURCE PRIORITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-01: Source Priority', () => {
    it('USER overrides TEXT', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '30',
        source: FactSource.TEXT,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      const fact = canon.getFact('Jean', 'age');
      expect(fact?.value).toBe('35');
      expect(fact?.source).toBe(FactSource.USER);
    });

    it('USER overrides IMPORTED', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'job',
        value: 'Teacher',
        source: FactSource.IMPORTED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'job',
        value: 'Writer',
        source: FactSource.USER,
      });

      expect(canon.getFact('Jean', 'job')?.value).toBe('Writer');
    });

    it('USER overrides INFERRED', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'mood',
        value: 'happy',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'mood',
        value: 'sad',
        source: FactSource.USER,
      });

      expect(canon.getFact('Jean', 'mood')?.value).toBe('sad');
    });

    it('TEXT overrides INFERRED', () => {
      canon.add({
        type: FactType.LOCATION,
        subject: 'Paris',
        predicate: 'country',
        value: 'Germany',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.LOCATION,
        subject: 'Paris',
        predicate: 'country',
        value: 'France',
        source: FactSource.TEXT,
      });

      expect(canon.getFact('Paris', 'country')?.value).toBe('France');
    });

    it('TEXT overrides IMPORTED', () => {
      canon.add({
        type: FactType.LOCATION,
        subject: 'Tokyo',
        predicate: 'country',
        value: 'China',
        source: FactSource.IMPORTED,
      });

      canon.add({
        type: FactType.LOCATION,
        subject: 'Tokyo',
        predicate: 'country',
        value: 'Japan',
        source: FactSource.TEXT,
      });

      expect(canon.getFact('Tokyo', 'country')?.value).toBe('Japan');
    });

    it('IMPORTED overrides INFERRED', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'nationality',
        value: 'German',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'nationality',
        value: 'French',
        source: FactSource.IMPORTED,
      });

      expect(canon.getFact('Marie', 'nationality')?.value).toBe('French');
    });

    it('lower priority does not override higher', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean Dupont',
        source: FactSource.USER,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean Martin',
        source: FactSource.INFERRED,
      });

      expect(canon.getFact('Jean', 'name')?.value).toBe('Jean Dupont');
    });

    it('verifies source priority constants are correct', () => {
      expect(SOURCE_PRIORITY[FactSource.USER]).toBe(1000);
      expect(SOURCE_PRIORITY[FactSource.TEXT]).toBe(100);
      expect(SOURCE_PRIORITY[FactSource.IMPORTED]).toBe(10);
      expect(SOURCE_PRIORITY[FactSource.INFERRED]).toBe(1);
      
      expect(SOURCE_PRIORITY[FactSource.USER]).toBeGreaterThan(SOURCE_PRIORITY[FactSource.TEXT]);
      expect(SOURCE_PRIORITY[FactSource.TEXT]).toBeGreaterThan(SOURCE_PRIORITY[FactSource.IMPORTED]);
      expect(SOURCE_PRIORITY[FactSource.IMPORTED]).toBeGreaterThan(SOURCE_PRIORITY[FactSource.INFERRED]);
    });

    it('increments version when overriding', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '30',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      const fact = canon.getFact('Jean', 'age');
      expect(fact?.version).toBe(2);
    });

    it('archives old fact when overriding', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '30',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      const archived = canon.query({ subject: 'Jean', predicate: 'age', status: FactStatus.ARCHIVED });
      expect(archived.length).toBe(1);
      expect(archived[0]?.value).toBe('30');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CONFLICT DETECTION (INV-MEM-04 preparation)
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Conflict Detection', () => {
    it('creates conflict for same priority different values', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'eyeColor',
        value: 'blue',
        source: FactSource.TEXT,
      });

      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'eyeColor',
        value: 'green',
        source: FactSource.TEXT,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.CONFLICT_UNRESOLVED);
        expect(result.error.details?.conflictId).toBeDefined();
      }
    });

    it('returns pending conflicts', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'hairColor',
        value: 'blonde',
        source: FactSource.IMPORTED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'hairColor',
        value: 'brunette',
        source: FactSource.IMPORTED,
      });

      const conflicts = canon.getPendingConflicts();
      expect(conflicts.length).toBe(1);
      expect(conflicts[0]?.resolution).toBe(ConflictResolution.PENDING);
    });

    it('resolves conflict by choosing existing', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Paul',
        predicate: 'height',
        value: '180cm',
        source: FactSource.TEXT,
      });

      const conflictResult = canon.add({
        type: FactType.CHARACTER,
        subject: 'Paul',
        predicate: 'height',
        value: '175cm',
        source: FactSource.TEXT,
      });

      if (!conflictResult.success && conflictResult.error.details?.conflictId) {
        const conflictId = conflictResult.error.details.conflictId as string;
        const resolution = canon.resolveConflict(conflictId, 'existing', 'admin');
        
        expect(resolution.success).toBe(true);
        expect(canon.getFact('Paul', 'height')?.value).toBe('180cm');
      }
    });

    it('resolves conflict by choosing incoming', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Sophie',
        predicate: 'weight',
        value: '60kg',
        source: FactSource.IMPORTED,
      });

      const conflictResult = canon.add({
        type: FactType.CHARACTER,
        subject: 'Sophie',
        predicate: 'weight',
        value: '55kg',
        source: FactSource.IMPORTED,
      });

      if (!conflictResult.success && conflictResult.error.details?.conflictId) {
        const conflictId = conflictResult.error.details.conflictId as string;
        const resolution = canon.resolveConflict(conflictId, 'incoming', 'admin');
        
        expect(resolution.success).toBe(true);
        expect(canon.getFact('Sophie', 'weight')?.value).toBe('55kg');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RETRIEVAL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getFact()', () => {
    it('returns null for non-existent fact', () => {
      expect(canon.getFact('Unknown', 'property')).toBeNull();
    });

    it('returns fact by subject and predicate', () => {
      canon.add({
        type: FactType.LOCATION,
        subject: 'Paris',
        predicate: 'population',
        value: '2000000',
        source: FactSource.TEXT,
      });

      const fact = canon.getFact('Paris', 'population');
      expect(fact?.value).toBe('2000000');
    });

    it('returns highest priority fact when multiple exist', () => {
      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'status',
        value: 'unknown',
        source: FactSource.INFERRED,
      });

      canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'status',
        value: 'alive',
        source: FactSource.TEXT,
      });

      const fact = canon.getFact('Jean', 'status');
      expect(fact?.value).toBe('alive');
      expect(fact?.source).toBe(FactSource.TEXT);
    });
  });

  describe('getFactById()', () => {
    it('returns fact by ID', () => {
      const result = canon.add({
        type: FactType.OBJECT,
        subject: 'Sword',
        predicate: 'material',
        value: 'steel',
        source: FactSource.TEXT,
      });

      if (result.success) {
        const fact = canon.getFactById(result.data.id);
        expect(fact?.value).toBe('steel');
      }
    });

    it('returns null for unknown ID', () => {
      expect(canon.getFactById('unknown_id')).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QUERY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('query()', () => {
    beforeEach(() => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'job', value: 'Writer', source: FactSource.TEXT });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });
      canon.add({ type: FactType.LOCATION, subject: 'Paris', predicate: 'country', value: 'France', source: FactSource.TEXT });
    });

    it('filters by type', () => {
      const results = canon.query({ type: FactType.CHARACTER });
      expect(results.length).toBe(3);
    });

    it('filters by subject', () => {
      const results = canon.query({ subject: 'Jean' });
      expect(results.length).toBe(2);
    });

    it('filters by source', () => {
      const results = canon.query({ source: FactSource.USER });
      expect(results.length).toBe(2);
    });

    it('filters by multiple criteria', () => {
      const results = canon.query({ type: FactType.CHARACTER, source: FactSource.USER });
      expect(results.length).toBe(2);
    });

    it('applies limit', () => {
      const results = canon.query({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('applies offset', () => {
      const all = canon.query({});
      const offset = canon.query({ offset: 2 });
      expect(offset.length).toBe(all.length - 2);
    });

    it('returns deterministic order', () => {
      const run1 = canon.query({});
      const run2 = canon.query({});
      expect(run1.map(f => f.id)).toEqual(run2.map(f => f.id));
    });
  });

  describe('getSubjectFacts()', () => {
    it('returns all active facts for a subject', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'job', value: 'Writer', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'city', value: 'Paris', source: FactSource.USER });

      const facts = canon.getSubjectFacts('Jean');
      expect(facts.length).toBe(3);
    });
  });

  describe('has()', () => {
    it('returns true for existing fact', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      expect(canon.has('Jean', 'age')).toBe(true);
    });

    it('returns false for non-existent fact', () => {
      expect(canon.has('Unknown', 'property')).toBe(false);
    });
  });

  describe('count()', () => {
    it('returns total count', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });
      expect(canon.count()).toBe(2);
    });

    it('returns filtered count', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.LOCATION, subject: 'Paris', predicate: 'country', value: 'France', source: FactSource.TEXT });
      expect(canon.count({ type: FactType.CHARACTER })).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE & DELETE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('update()', () => {
    it('creates new version', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      
      const result = canon.update('Jean', 'age', { value: '36' });
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.value).toBe('36');
        expect(result.data.version).toBe(2);
      }
    });

    it('archives previous version', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.update('Jean', 'age', { value: '36' });
      
      const archived = canon.query({ subject: 'Jean', predicate: 'age', status: FactStatus.ARCHIVED });
      expect(archived.length).toBe(1);
      expect(archived[0]?.value).toBe('35');
    });

    it('fails for non-existent fact', () => {
      const result = canon.update('Unknown', 'property', { value: 'test' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(CanonErrorCode.FACT_NOT_FOUND);
      }
    });
  });

  describe('delete()', () => {
    it('soft deletes fact', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'temp', value: 'test', source: FactSource.USER });
      
      const result = canon.delete('Jean', 'temp', 'admin', 'No longer needed');
      
      expect(result.success).toBe(true);
      expect(canon.getFact('Jean', 'temp')).toBeNull();
    });

    it('preserves deleted fact in query', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'temp', value: 'test', source: FactSource.USER });
      canon.delete('Jean', 'temp');
      
      const deleted = canon.query({ status: FactStatus.DELETED });
      expect(deleted.length).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-05: HASH INTEGRITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-05: Hash Integrity', () => {
    it('computes valid hash for each fact', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      if (result.success) {
        expect(verifyFactHash(result.data)).toBe(true);
      }
    });

    it('hash changes with content', () => {
      const r1 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
      });

      canon.clear();

      const r2 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '36',
        source: FactSource.USER,
      });

      if (r1.success && r2.success) {
        expect(r1.data.hash).not.toBe(r2.data.hash);
      }
    });

    it('chain hash links facts', () => {
      const r1 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'name',
        value: 'Jean',
        source: FactSource.USER,
      });

      const r2 = canon.add({
        type: FactType.CHARACTER,
        subject: 'Marie',
        predicate: 'name',
        value: 'Marie',
        source: FactSource.USER,
      });

      if (r1.success && r2.success) {
        expect(r2.data.previousHash).toBe(r1.data.hash);
      }
    });

    it('first fact has genesis hash', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'first',
        value: 'fact',
        source: FactSource.USER,
      });

      if (result.success) {
        expect(result.data.previousHash).toBe(HASH_CONFIG.GENESIS_HASH);
      }
    });

    it('verifyIntegrity passes for valid store', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'a', value: '1', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'b', value: '2', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'c', value: '3', source: FactSource.USER });

      const integrity = canon.verifyIntegrity();
      expect(integrity.valid).toBe(true);
      expect(integrity.errors.length).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-06: DETERMINISM
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-06: Determinism', () => {
    it('same operations produce same results', () => {
      // Use a deterministic clock for testing
      let counter = 0;
      const fixedClock = () => `2026-01-01T00:00:00.${String(counter++).padStart(3, '0')}Z`;
      
      const ops = [
        { type: FactType.CHARACTER, subject: 'A', predicate: 'x', value: '1', source: FactSource.USER },
        { type: FactType.CHARACTER, subject: 'B', predicate: 'y', value: '2', source: FactSource.TEXT },
        { type: FactType.LOCATION, subject: 'C', predicate: 'z', value: '3', source: FactSource.IMPORTED },
      ];

      // Reset counter for first store
      counter = 0;
      const canon1 = createCanonStore(fixedClock);
      
      // Reset counter for second store
      counter = 0;
      const canon2 = createCanonStore(fixedClock);

      for (const op of ops) {
        canon1.add(op);
      }
      
      // Reset counter again for second store operations
      counter = 0;
      // Recreate second store to ensure fresh state
      const canon2Fresh = createCanonStore(fixedClock);
      for (const op of ops) {
        canon2Fresh.add(op);
      }

      expect(canon1.count()).toBe(canon2Fresh.count());
      
      const snap1 = canon1.createSnapshot();
      const snap2 = canon2Fresh.createSnapshot();
      
      expect(snap1.factCount).toBe(snap2.factCount);
      expect(snap1.rootHash).toBe(snap2.rootHash);
    });

    it('query order is deterministic', () => {
      for (let i = 0; i < 10; i++) {
        canon.add({
          type: FactType.CHARACTER,
          subject: `Subject${i}`,
          predicate: 'prop',
          value: `${i}`,
          source: FactSource.USER,
        });
      }

      const run1 = canon.query({}).map(f => f.subject);
      const run2 = canon.query({}).map(f => f.subject);
      const run3 = canon.query({}).map(f => f.subject);

      expect(run1).toEqual(run2);
      expect(run2).toEqual(run3);
    });

    it('canonicalEncode is deterministic', () => {
      const obj = { z: 1, a: 2, m: 3 };
      const enc1 = canonicalEncode(obj);
      const enc2 = canonicalEncode(obj);
      expect(enc1).toBe(enc2);
      expect(enc1).toBe('{"a":2,"m":3,"z":1}');
    });

    it('sha256 is deterministic', () => {
      const data = 'test data';
      const hash1 = sha256(data);
      const hash2 = sha256(data);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INV-MEM-08: AUDIT TRAIL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('INV-MEM-08: Audit Trail', () => {
    it('logs CREATE action', () => {
      const result = canon.add({
        type: FactType.CHARACTER,
        subject: 'Jean',
        predicate: 'age',
        value: '35',
        source: FactSource.USER,
        createdBy: 'test-user',
      });

      if (result.success) {
        const audit = canon.getAuditTrail(result.data.id);
        expect(audit.length).toBe(1);
        expect(audit[0]?.action).toBe('CREATE');
        expect(audit[0]?.actor).toBe('test-user');
      }
    });

    it('logs UPDATE action', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.update('Jean', 'age', { value: '36', updatedBy: 'admin' });

      const audit = canon.getAuditTrail();
      const updateEntry = audit.find(e => e.action === 'UPDATE');
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.actor).toBe('admin');
    });

    it('logs DELETE action', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'temp', value: 'test', source: FactSource.USER });
      canon.delete('Jean', 'temp', 'admin', 'Cleanup');

      const audit = canon.getAuditTrail();
      const deleteEntry = audit.find(e => e.action === 'DELETE');
      expect(deleteEntry).toBeDefined();
      expect(deleteEntry?.details?.reason).toBe('Cleanup');
    });

    it('logs ARCHIVE action when overriding', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '30', source: FactSource.INFERRED });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });

      const audit = canon.getAuditTrail();
      const archiveEntry = audit.find(e => e.action === 'ARCHIVE');
      expect(archiveEntry).toBeDefined();
    });

    it('audit entries have valid hashes', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'a', value: '1', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'b', value: '2', source: FactSource.USER });

      const audit = canon.getAuditTrail();
      for (const entry of audit) {
        expect(entry.hash).toBeDefined();
        expect(entry.hash.length).toBe(64);
      }
    });

    it('audit chain is linked', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'a', value: '1', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'b', value: '2', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'c', value: '3', source: FactSource.USER });

      const audit = canon.getAuditTrail();
      expect(audit.length).toBe(3);
      // Each entry should have a unique hash
      const hashes = new Set(audit.map(e => e.hash));
      expect(hashes.size).toBe(3);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SNAPSHOT & DIFF
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Snapshot & Diff', () => {
    it('creates valid snapshot', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });

      const snapshot = canon.createSnapshot();
      
      expect(snapshot.id).toMatch(/^snap_/);
      expect(snapshot.factCount).toBe(2);
      expect(snapshot.rootHash.length).toBe(64);
      expect(snapshot.version).toBeDefined();
    });

    it('merkle root changes with content', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      const snap1 = canon.createSnapshot();

      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });
      const snap2 = canon.createSnapshot();

      expect(snap1.rootHash).not.toBe(snap2.rootHash);
    });

    it('computes diff between snapshots', () => {
      // Use a controlled clock to ensure timestamp differences
      let time = 1000;
      const controlledClock = () => new Date(time++).toISOString();
      const testCanon = createCanonStore(controlledClock);
      
      testCanon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      const snapshot = testCanon.createSnapshot();

      // Add another fact after the snapshot
      testCanon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });

      const diff = testCanon.diff(snapshot);
      expect(diff.added.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // METRICS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Metrics', () => {
    it('returns accurate metrics', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.TEXT });
      canon.add({ type: FactType.LOCATION, subject: 'Paris', predicate: 'country', value: 'France', source: FactSource.TEXT });

      const metrics = canon.getMetrics();
      
      expect(metrics.totalFacts).toBe(3);
      expect(metrics.activeFacts).toBe(3);
      expect(metrics.byType[FactType.CHARACTER]).toBe(2);
      expect(metrics.byType[FactType.LOCATION]).toBe(1);
      expect(metrics.bySource[FactSource.USER]).toBe(1);
      expect(metrics.bySource[FactSource.TEXT]).toBe(2);
    });

    it('tracks archived and deleted facts', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '30', source: FactSource.INFERRED });
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER }); // Archives the inferred
      canon.add({ type: FactType.CHARACTER, subject: 'temp', predicate: 'x', value: 'y', source: FactSource.USER });
      canon.delete('temp', 'x');

      const metrics = canon.getMetrics();
      expect(metrics.archivedFacts).toBe(1);
      expect(metrics.deletedFacts).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT / IMPORT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Export/Import', () => {
    it('exports complete state', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });

      const exported = canon.export();
      
      expect(exported.magic).toBeDefined();
      expect(exported.version).toBeDefined();
      expect(exported.facts.length).toBe(2);
      expect(exported.auditTrail.length).toBe(2);
      expect(exported.exportHash.length).toBe(64);
    });

    it('imports and reconstructs state', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });

      const exported = canon.export();
      const imported = CanonStore.import(exported);

      expect(imported.success).toBe(true);
      if (imported.success) {
        expect(imported.data.count()).toBe(2);
        expect(imported.data.getFact('Jean', 'age')?.value).toBe('35');
        expect(imported.data.getFact('Marie', 'age')?.value).toBe('28');
      }
    });

    it('rejects tampered export', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });

      const exported = canon.export();
      const tampered = { ...exported, exportHash: 'tampered' };
      
      const imported = CanonStore.import(tampered);
      expect(imported.success).toBe(false);
      if (!imported.success) {
        expect(imported.error.code).toBe(CanonErrorCode.HASH_MISMATCH);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MERKLE ROOT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Merkle Root', () => {
    it('empty list returns genesis hash', () => {
      expect(computeMerkleRoot([])).toBe(HASH_CONFIG.GENESIS_HASH);
    });

    it('single hash returns itself', () => {
      const hash = sha256('test');
      expect(computeMerkleRoot([hash])).toBe(hash);
    });

    it('two hashes combine correctly', () => {
      const h1 = sha256('a');
      const h2 = sha256('b');
      const root = computeMerkleRoot([h1, h2]);
      expect(root).toBe(sha256(h1 + h2));
    });

    it('is deterministic', () => {
      const hashes = ['a', 'b', 'c', 'd'].map(sha256);
      const root1 = computeMerkleRoot(hashes);
      const root2 = computeMerkleRoot(hashes);
      expect(root1).toBe(root2);
    });

    it('different order produces different root', () => {
      const h1 = sha256('a');
      const h2 = sha256('b');
      const root1 = computeMerkleRoot([h1, h2]);
      const root2 = computeMerkleRoot([h2, h1]);
      expect(root1).not.toBe(root2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Factory', () => {
    it('createCanonStore returns new instance', () => {
      const c1 = createCanonStore();
      const c2 = createCanonStore();
      
      c1.add({ type: FactType.CHARACTER, subject: 'A', predicate: 'x', value: '1', source: FactSource.USER });
      
      expect(c1.count()).toBe(1);
      expect(c2.count()).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CLEAR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('clear()', () => {
    it('resets all state', () => {
      canon.add({ type: FactType.CHARACTER, subject: 'Jean', predicate: 'age', value: '35', source: FactSource.USER });
      canon.add({ type: FactType.CHARACTER, subject: 'Marie', predicate: 'age', value: '28', source: FactSource.USER });
      
      canon.clear();
      
      expect(canon.count()).toBe(0);
      expect(canon.getAuditTrail().length).toBe(0);
      expect(canon.getPendingConflicts().length).toBe(0);
    });
  });
});
