/**
 * OMEGA Truth Gate Canon Matcher Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F4-INV-01 to F4-INV-04
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import {
  matchAgainstCanon,
  matchSingleFact,
  matchFactComprehensive,
  checkPredicateValid,
  checkValueContradiction,
  createViolation,
  type CanonReader,
} from '../../src/gates/canon-matcher';
import { createFact } from '../../src/gates/fact-extractor';
import { classifyFact } from '../../src/gates/fact-classifier';
import { ViolationCode, FactClass } from '../../src/gates/types';
import type { ClassifiedFact, CanonViolation } from '../../src/gates/types';
import {
  createTestCanonAPI,
  LineageSource,
  type CanonClaim,
  type EntityId,
  type PredicateType,
} from '../../src/canon';

const TEST_DIR = join(process.cwd(), '.test_canon_matcher');

// Helper to create a mock CANON reader
function createMockReader(claims: readonly CanonClaim[]): CanonReader {
  return {
    async getClaimsForSubject(subject: EntityId) {
      return claims.filter(c => c.subject === subject);
    },
    async getActiveClaimsBySubjectAndPredicate(subject: EntityId, predicate: PredicateType) {
      return claims.filter(c => c.subject === subject && c.predicate === predicate && c.status === 'ACTIVE');
    },
    async getAllClaims() {
      return claims;
    },
  };
}

// Helper to create classified fact (forces FACT_STRICT for testing)
function createClassifiedFact(
  subject: string,
  predicate: string,
  object: unknown,
  text: string,
  classification: FactClass = FactClass.FACT_STRICT
): ClassifiedFact {
  const fact = createFact(subject, predicate, object, text);
  // Force specific classification for testing
  return {
    ...fact,
    classification,
    classificationReason: `Test classification: ${classification}`,
  };
}

describe('Canon Matcher — Phase F', () => {
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

  describe('F4-INV-01: Reads CANON only (no writes)', () => {
    it('matchAgainstCanon only calls read methods', async () => {
      const readCalls: string[] = [];
      const mockReader: CanonReader = {
        async getClaimsForSubject(subject) {
          readCalls.push(`getClaimsForSubject:${subject}`);
          return [];
        },
        async getActiveClaimsBySubjectAndPredicate(subject, predicate) {
          readCalls.push(`getActiveClaimsBySubjectAndPredicate:${subject}:${predicate}`);
          return [];
        },
        async getAllClaims() {
          readCalls.push('getAllClaims');
          return [];
        },
      };

      const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith');
      await matchAgainstCanon([fact], mockReader);

      // Should only have read calls, no write calls
      expect(readCalls.every(c => c.startsWith('get') || c === 'getAllClaims')).toBe(true);
    });

    it('no createClaim calls made during matching', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      const initialClaimsCount = (await api.getAllClaims()).length;
      const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith');

      await matchAgainstCanon([fact], api);

      const finalClaimsCount = (await api.getAllClaims()).length;
      expect(finalClaimsCount).toBe(initialClaimsCount);

      await api.close();
    });
  });

  describe('F4-INV-02: Matching is deterministic', () => {
    it('same input produces same violations', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      // Add a claim to CANON
      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice Smith',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Create contradicting fact
      const fact = createClassifiedFact('alice', 'HAS_NAME', 'Alice Jones', 'Alice is Jones');

      const violations1 = await matchAgainstCanon([fact], api);
      const violations2 = await matchAgainstCanon([fact], api);

      expect(violations1.length).toBe(violations2.length);
      if (violations1.length > 0) {
        expect(violations1[0].code).toBe(violations2[0].code);
      }

      await api.close();
    });

    it('deterministic across 100 runs', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith');

      const first = await matchAgainstCanon([fact], reader);
      for (let i = 0; i < 100; i++) {
        const result = await matchAgainstCanon([fact], reader);
        expect(result.length).toBe(first.length);
      }
    });
  });

  describe('F4-INV-03: All violations have required fields', () => {
    it('violation has code field', () => {
      const fact = createClassifiedFact('Alice', 'UNKNOWN_PRED', 'value', 'text');
      const violation = checkPredicateValid(fact);
      expect(violation).not.toBeNull();
      expect(violation!.code).toBeDefined();
      expect(Object.values(ViolationCode)).toContain(violation!.code);
    });

    it('violation has fact field', () => {
      const fact = createClassifiedFact('Alice', 'UNKNOWN_PRED', 'value', 'text');
      const violation = checkPredicateValid(fact);
      expect(violation).not.toBeNull();
      expect(violation!.fact).toBeDefined();
      expect(violation!.fact.id).toBe(fact.id);
    });

    it('violation has message field', () => {
      const fact = createClassifiedFact('Alice', 'UNKNOWN_PRED', 'value', 'text');
      const violation = checkPredicateValid(fact);
      expect(violation).not.toBeNull();
      expect(typeof violation!.message).toBe('string');
      expect(violation!.message.length).toBeGreaterThan(0);
    });

    it('createViolation includes all fields', () => {
      const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const violation = createViolation(
        ViolationCode.CONTRADICTORY_VALUE,
        fact,
        'Test message',
        'CLM-123',
        'expected',
        'actual'
      );
      expect(violation.code).toBe(ViolationCode.CONTRADICTORY_VALUE);
      expect(violation.fact).toBe(fact);
      expect(violation.message).toBe('Test message');
      expect(violation.relatedClaimId).toBe('CLM-123');
      expect(violation.expectedValue).toBe('expected');
      expect(violation.actualValue).toBe('actual');
    });
  });

  describe('F4-INV-04: Uses semanticEquals for value comparison', () => {
    it('detects contradictory values', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_AGE' as PredicateType,
        value: 30,
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const fact = createClassifiedFact('alice', 'HAS_AGE', 25, 'Alice is 25');
      const violations = await matchAgainstCanon([fact], api);

      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].code).toBe(ViolationCode.CONTRADICTORY_VALUE);

      await api.close();
    });

    it('same value produces no violation', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice Smith',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const fact = createClassifiedFact('alice', 'HAS_NAME', 'Alice Smith', 'Alice is Smith');
      const violations = await matchAgainstCanon([fact], api);

      const valueViolations = violations.filter(v => v.code === ViolationCode.CONTRADICTORY_VALUE);
      expect(valueViolations).toHaveLength(0);

      await api.close();
    });

    it('object equality via semanticEquals', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      await api.createClaim({
        subject: 'ENT-data-12345678' as EntityId,
        predicate: 'HAS_ATTRIBUTE' as PredicateType,
        value: { a: 1, b: 2 },
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      // Same value, different key order
      const fact = createClassifiedFact('data', 'HAS_ATTRIBUTE', { b: 2, a: 1 }, 'data has attr');
      const violations = await matchAgainstCanon([fact], api);

      const valueViolations = violations.filter(v => v.code === ViolationCode.CONTRADICTORY_VALUE);
      expect(valueViolations).toHaveLength(0);

      await api.close();
    });
  });

  describe('Violation Codes', () => {
    describe('C-02 FORBIDDEN_PREDICATE', () => {
      it('detects unknown predicate', () => {
        const fact = createClassifiedFact('Alice', 'COMPLETELY_UNKNOWN', 'value', 'text');
        const violation = checkPredicateValid(fact);
        expect(violation).not.toBeNull();
        expect(violation!.code).toBe(ViolationCode.FORBIDDEN_PREDICATE);
      });

      it('valid predicate produces no violation', () => {
        const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'text');
        const violation = checkPredicateValid(fact);
        expect(violation).toBeNull();
      });
    });

    describe('C-03 CONTRADICTORY_VALUE', () => {
      it('detects value contradiction', async () => {
        const api = createTestCanonAPI(TEST_DIR);
        await api.init();

        await api.createClaim({
          subject: 'ENT-bob-12345678' as EntityId,
          predicate: 'HAS_NAME' as PredicateType,
          value: 'Robert',
          lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
          evidence: [],
        });

        const fact = createClassifiedFact('bob', 'HAS_NAME', 'Bobby', 'Bob is Bobby');
        const violation = await checkValueContradiction(fact, api);

        expect(violation).not.toBeNull();
        expect(violation!.code).toBe(ViolationCode.CONTRADICTORY_VALUE);
        expect(violation!.expectedValue).toBe('Robert');
        expect(violation!.actualValue).toBe('Bobby');

        await api.close();
      });
    });
  });

  describe('matchSingleFact', () => {
    it('returns violation for invalid predicate', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'INVALID', 'value', 'text');
      const violation = await matchSingleFact(fact, reader);
      expect(violation).not.toBeNull();
      expect(violation!.code).toBe(ViolationCode.FORBIDDEN_PREDICATE);
    });

    it('returns null for valid fact with no contradiction', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const violation = await matchSingleFact(fact, reader);
      expect(violation).toBeNull();
    });

    it('skips non-FACT_STRICT facts', async () => {
      const reader = createMockReader([]);
      // Create a fact with FACT_DERIVED classification
      const fact = createClassifiedFact('Alice', 'IMPLIES', 'data', 'Alice implies data', FactClass.FACT_DERIVED);
      expect(fact.classification).toBe(FactClass.FACT_DERIVED);

      const violation = await matchSingleFact(fact, reader);
      expect(violation).toBeNull();
    });
  });

  describe('matchFactComprehensive', () => {
    it('returns multiple violations for comprehensive check', async () => {
      const api = createTestCanonAPI(TEST_DIR);
      await api.init();

      await api.createClaim({
        subject: 'ENT-alice-12345678' as EntityId,
        predicate: 'HAS_NAME' as PredicateType,
        value: 'Alice',
        lineage: { source: LineageSource.SYSTEM, confidence: 1.0 },
        evidence: [],
      });

      const fact = createClassifiedFact('bob', 'INVALID_PRED', 'value', 'Bob has value');
      const violations = await matchFactComprehensive(fact, api);

      expect(violations.length).toBeGreaterThanOrEqual(1);

      await api.close();
    });

    it('skips non-FACT_STRICT facts', async () => {
      const reader = createMockReader([]);
      // Create a fact with FACT_DERIVED classification
      const fact = createClassifiedFact('Alice', 'IMPLIES', 'data', 'text', FactClass.FACT_DERIVED);

      const violations = await matchFactComprehensive(fact, reader);
      expect(violations).toHaveLength(0);
    });
  });

  describe('matchAgainstCanon', () => {
    it('processes only FACT_STRICT facts', async () => {
      const reader = createMockReader([]);
      const facts = [
        createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'text', FactClass.FACT_STRICT),
        createClassifiedFact('Bob', 'IMPLIES', 'data', 'text', FactClass.FACT_DERIVED),
        createClassifiedFact('Charlie', 'UNKNOWN', 'val', 'text', FactClass.NON_FACTUAL),
      ];

      const violations = await matchAgainstCanon(facts, reader);
      // Only FACT_STRICT should be processed (if any violations)
      expect(violations.every(v => v.fact.classification === FactClass.FACT_STRICT)).toBe(true);
    });

    it('returns empty array for valid facts', async () => {
      const reader = createMockReader([]);
      const facts = [
        createClassifiedFact('Alice', 'HAS_NAME', 'Smith', 'text'),
        createClassifiedFact('Bob', 'HAS_AGE', '30', 'text'),
      ];

      const violations = await matchAgainstCanon(facts, reader);
      expect(violations).toHaveLength(0);
    });

    it('returns violations for invalid predicates', async () => {
      const reader = createMockReader([]);
      const facts = [
        createClassifiedFact('Alice', 'COMPLETELY_INVALID_PREDICATE', 'value', 'text'),
      ];

      const violations = await matchAgainstCanon(facts, reader);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].code).toBe(ViolationCode.FORBIDDEN_PREDICATE);
    });

    it('handles empty facts array', async () => {
      const reader = createMockReader([]);
      const violations = await matchAgainstCanon([], reader);
      expect(violations).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('handles fact with complex object value', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'HAS_ATTRIBUTE', { nested: { value: 42 } }, 'text');
      const violations = await matchAgainstCanon([fact], reader);
      expect(Array.isArray(violations)).toBe(true);
    });

    it('handles fact with array value', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'HAS_ATTRIBUTE', [1, 2, 3], 'text');
      const violations = await matchAgainstCanon([fact], reader);
      expect(Array.isArray(violations)).toBe(true);
    });

    it('handles fact with null value', async () => {
      const reader = createMockReader([]);
      const fact = createClassifiedFact('Alice', 'HAS_ATTRIBUTE', null, 'text');
      const violations = await matchAgainstCanon([fact], reader);
      expect(Array.isArray(violations)).toBe(true);
    });
  });
});
