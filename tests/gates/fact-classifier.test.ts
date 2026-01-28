/**
 * OMEGA Truth Gate Fact Classifier Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F3-INV-01 to F3-INV-03
 */

import { describe, it, expect } from 'vitest';
import {
  classifyFacts,
  classifyFact,
  getStrictFacts,
  getDerivedFacts,
  getNonFactualFacts,
  getClassificationStats,
  allFactsClassified,
  containsNonFactualIndicator,
  isDerivedPredicate,
  isStrictPredicate,
  NON_FACTUAL_INDICATORS,
  DERIVED_PREDICATES,
  STRICT_PREDICATES,
} from '../../src/gates/fact-classifier';
import { createFact } from '../../src/gates/fact-extractor';
import { FactClass } from '../../src/gates/types';
import type { CanonicalFact, ClassifiedFact } from '../../src/gates/types';

describe('Fact Classifier — Phase F', () => {
  describe('F3-INV-01: Classification is exhaustive', () => {
    it('every fact is classified', () => {
      const facts = [
        createFact('Alice', 'HAS_NAME', 'Alice Smith', 'Alice is Alice Smith'),
        createFact('Bob', 'IMPLIES', 'something', 'Bob implies something'),
        createFact('Charlie', 'UNKNOWN_PRED', 'value', 'Charlie maybe has value'),
      ];
      const classified = classifyFacts(facts);
      expect(classified).toHaveLength(3);
      expect(allFactsClassified(classified)).toBe(true);
    });

    it('no fact is left unclassified', () => {
      const facts = Array.from({ length: 100 }, (_, i) =>
        createFact(`Entity${i}`, i % 2 === 0 ? 'HAS_NAME' : 'IMPLIES', `value${i}`, `text${i}`)
      );
      const classified = classifyFacts(facts);
      expect(classified.every(f => f.classification !== undefined)).toBe(true);
    });

    it('classification is one of three valid values', () => {
      const facts = [
        createFact('A', 'HAS_NAME', 'V', 'text'),
        createFact('B', 'IMPLIES', 'V', 'text'),
        createFact('C', 'UNKNOWN', 'V', 'maybe text'),
      ];
      const classified = classifyFacts(facts);
      for (const fact of classified) {
        expect([
          FactClass.FACT_STRICT,
          FactClass.FACT_DERIVED,
          FactClass.NON_FACTUAL,
        ]).toContain(fact.classification);
      }
    });
  });

  describe('F3-INV-02: Classification is deterministic', () => {
    it('same fact produces same classification', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is named Smith');
      const classified1 = classifyFact(fact);
      const classified2 = classifyFact(fact);
      expect(classified1.classification).toBe(classified2.classification);
      expect(classified1.classificationReason).toBe(classified2.classificationReason);
    });

    it('classification is deterministic across 100 runs', () => {
      const facts = [
        createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith'),
        createFact('Bob', 'IMPLIES', 'fact', 'Bob implies fact'),
        createFact('Charlie', 'UNKNOWN', 'val', 'Charlie maybe has val'),
      ];
      const first = classifyFacts(facts);
      for (let i = 0; i < 100; i++) {
        const result = classifyFacts(facts);
        expect(result.map(f => f.classification)).toEqual(first.map(f => f.classification));
      }
    });

    it('order of facts does not affect individual classification', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const fact2 = createFact('Bob', 'IMPLIES', 'data', 'text');

      const order1 = classifyFacts([fact1, fact2]);
      const order2 = classifyFacts([fact2, fact1]);

      expect(order1[0].classification).toBe(order2[1].classification);
      expect(order1[1].classification).toBe(order2[0].classification);
    });
  });

  describe('F3-INV-03: Only FACT_STRICT goes to F4', () => {
    it('getStrictFacts returns only FACT_STRICT', () => {
      const facts = [
        createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith'),
        createFact('Bob', 'IMPLIES', 'data', 'Bob implies data'),
        createFact('Charlie', 'HAS_AGE', '30', 'Charlie is 30'),
      ];
      const classified = classifyFacts(facts);
      const strict = getStrictFacts(classified);
      expect(strict.every(f => f.classification === FactClass.FACT_STRICT)).toBe(true);
    });

    it('FACT_DERIVED not in getStrictFacts', () => {
      const facts = [
        createFact('A', 'IMPLIES', 'V', 'text'),
        createFact('B', 'DERIVED', 'V', 'text'),
        createFact('C', 'INFERRED', 'V', 'text'),
      ];
      const classified = classifyFacts(facts);
      const strict = getStrictFacts(classified);
      expect(strict).toHaveLength(0);
    });

    it('NON_FACTUAL not in getStrictFacts', () => {
      const facts = [
        createFact('A', 'UNKNOWN', 'V', 'maybe text'),
      ];
      const classified = classifyFacts(facts);
      const strict = getStrictFacts(classified);
      expect(strict).toHaveLength(0);
    });
  });

  describe('Classification Rules', () => {
    describe('NON_FACTUAL classification', () => {
      it('classifies fact with "maybe" as NON_FACTUAL', () => {
        const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'Alice maybe is Smith');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.NON_FACTUAL);
      });

      it('classifies fact with "probably" as NON_FACTUAL', () => {
        const fact = createFact('Bob', 'HAS_AGE', '30', 'Bob probably is 30');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.NON_FACTUAL);
      });

      it('classifies fact with "think" as NON_FACTUAL', () => {
        const fact = createFact('I', 'HAS_NAME', 'Smith', 'I think Alice is Smith');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.NON_FACTUAL);
      });

      it('all NON_FACTUAL_INDICATORS trigger NON_FACTUAL', () => {
        for (const indicator of NON_FACTUAL_INDICATORS) {
          const fact = createFact('X', 'HAS_NAME', 'Y', `text ${indicator} text`);
          const classified = classifyFact(fact);
          expect(classified.classification).toBe(FactClass.NON_FACTUAL);
        }
      });
    });

    describe('FACT_DERIVED classification', () => {
      it('classifies IMPLIES predicate as FACT_DERIVED', () => {
        const fact = createFact('Alice', 'IMPLIES', 'something', 'Alice implies something');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.FACT_DERIVED);
      });

      it('all DERIVED_PREDICATES trigger FACT_DERIVED', () => {
        for (const pred of DERIVED_PREDICATES) {
          const fact = createFact('X', pred, 'Y', `X ${pred} Y`);
          const classified = classifyFact(fact);
          expect(classified.classification).toBe(FactClass.FACT_DERIVED);
        }
      });
    });

    describe('FACT_STRICT classification', () => {
      it('classifies HAS_NAME as FACT_STRICT', () => {
        const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'Alice is Smith');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.FACT_STRICT);
      });

      it('classifies IS_A as FACT_STRICT', () => {
        const fact = createFact('Alice', 'IS_A', 'Developer', 'Alice is a Developer');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.FACT_STRICT);
      });

      it('classifies HAS_AGE as FACT_STRICT', () => {
        const fact = createFact('Bob', 'HAS_AGE', '30', 'Bob is 30');
        const classified = classifyFact(fact);
        expect(classified.classification).toBe(FactClass.FACT_STRICT);
      });

      it('all STRICT_PREDICATES trigger FACT_STRICT', () => {
        for (const pred of STRICT_PREDICATES) {
          const fact = createFact('X', pred, 'Y', `X ${pred} Y`);
          const classified = classifyFact(fact);
          expect(classified.classification).toBe(FactClass.FACT_STRICT);
        }
      });

      it('classifies HAS_* predicates as FACT_STRICT', () => {
        const predicates = ['HAS_EMAIL', 'HAS_PHONE', 'HAS_ADDRESS'];
        for (const pred of predicates) {
          const fact = createFact('X', pred, 'Y', `X ${pred} Y`);
          const classified = classifyFact(fact);
          expect(classified.classification).toBe(FactClass.FACT_STRICT);
        }
      });
    });
  });

  describe('Helper Functions', () => {
    describe('containsNonFactualIndicator', () => {
      it('returns true for text with indicators', () => {
        expect(containsNonFactualIndicator('maybe true')).toBe(true);
        expect(containsNonFactualIndicator('probably right')).toBe(true);
        expect(containsNonFactualIndicator('I think so')).toBe(true);
      });

      it('returns false for text without indicators', () => {
        expect(containsNonFactualIndicator('Alice is here')).toBe(false);
        expect(containsNonFactualIndicator('Bob has a car')).toBe(false);
      });

      it('is case insensitive', () => {
        expect(containsNonFactualIndicator('MAYBE true')).toBe(true);
        expect(containsNonFactualIndicator('Perhaps')).toBe(true);
      });
    });

    describe('isDerivedPredicate', () => {
      it('returns true for derived predicates', () => {
        expect(isDerivedPredicate('IMPLIES')).toBe(true);
        expect(isDerivedPredicate('INFERRED')).toBe(true);
        expect(isDerivedPredicate('DERIVED')).toBe(true);
      });

      it('returns false for non-derived predicates', () => {
        expect(isDerivedPredicate('HAS_NAME')).toBe(false);
        expect(isDerivedPredicate('IS_A')).toBe(false);
      });

      it('is case insensitive', () => {
        expect(isDerivedPredicate('implies')).toBe(true);
        expect(isDerivedPredicate('Derived')).toBe(true);
      });
    });

    describe('isStrictPredicate', () => {
      it('returns true for strict predicates', () => {
        expect(isStrictPredicate('HAS_NAME')).toBe(true);
        expect(isStrictPredicate('IS_A')).toBe(true);
        expect(isStrictPredicate('KNOWS')).toBe(true);
      });

      it('returns true for HAS_* pattern', () => {
        expect(isStrictPredicate('HAS_CUSTOM')).toBe(true);
        expect(isStrictPredicate('HAS_ANYTHING')).toBe(true);
      });

      it('returns false for unknown predicates', () => {
        expect(isStrictPredicate('UNKNOWN_PRED')).toBe(false);
        expect(isStrictPredicate('RANDOM')).toBe(false);
      });
    });
  });

  describe('Filter Functions', () => {
    it('getDerivedFacts returns only FACT_DERIVED', () => {
      const facts = [
        createFact('A', 'HAS_NAME', 'V', 'text'),
        createFact('B', 'IMPLIES', 'V', 'text'),
        createFact('C', 'INFERRED', 'V', 'text'),
      ];
      const classified = classifyFacts(facts);
      const derived = getDerivedFacts(classified);
      expect(derived).toHaveLength(2);
      expect(derived.every(f => f.classification === FactClass.FACT_DERIVED)).toBe(true);
    });

    it('getNonFactualFacts returns only NON_FACTUAL', () => {
      const facts = [
        createFact('A', 'HAS_NAME', 'V', 'maybe text'),
        createFact('B', 'UNKNOWN', 'V', 'probably text'),
        createFact('C', 'HAS_NAME', 'V', 'clear text'),
      ];
      const classified = classifyFacts(facts);
      const nonFactual = getNonFactualFacts(classified);
      expect(nonFactual).toHaveLength(2);
      expect(nonFactual.every(f => f.classification === FactClass.NON_FACTUAL)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('getClassificationStats returns correct counts', () => {
      const facts = [
        createFact('A', 'HAS_NAME', 'V', 'text1'),
        createFact('B', 'HAS_AGE', 'V', 'text2'),
        createFact('C', 'IMPLIES', 'V', 'text3'),
        createFact('D', 'UNKNOWN', 'V', 'maybe text4'),
      ];
      const classified = classifyFacts(facts);
      const stats = getClassificationStats(classified);
      expect(stats.total).toBe(4);
      expect(stats.strict).toBe(2);
      expect(stats.derived).toBe(1);
      expect(stats.nonFactual).toBe(1);
    });

    it('stats sum equals total', () => {
      const facts = Array.from({ length: 50 }, (_, i) =>
        createFact(`E${i}`, i % 3 === 0 ? 'HAS_NAME' : i % 3 === 1 ? 'IMPLIES' : 'UNKNOWN', `V${i}`, `text${i}`)
      );
      const classified = classifyFacts(facts);
      const stats = getClassificationStats(classified);
      expect(stats.strict + stats.derived + stats.nonFactual).toBe(stats.total);
    });
  });

  describe('Classification Reason', () => {
    it('FACT_STRICT has reason mentioning predicate', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const classified = classifyFact(fact);
      expect(classified.classificationReason).toContain('HAS_NAME');
    });

    it('FACT_DERIVED has reason mentioning predicate', () => {
      const fact = createFact('Alice', 'IMPLIES', 'data', 'text');
      const classified = classifyFact(fact);
      expect(classified.classificationReason).toContain('IMPLIES');
    });

    it('NON_FACTUAL from indicator has appropriate reason', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'maybe text');
      const classified = classifyFact(fact);
      expect(classified.classificationReason).toContain('uncertainty');
    });
  });

  describe('Priority Rules', () => {
    it('NON_FACTUAL indicator takes priority over strict predicate', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'Alice probably is Smith');
      const classified = classifyFact(fact);
      expect(classified.classification).toBe(FactClass.NON_FACTUAL);
    });

    it('NON_FACTUAL indicator takes priority over derived predicate', () => {
      const fact = createFact('Alice', 'IMPLIES', 'data', 'Alice maybe implies data');
      const classified = classifyFact(fact);
      expect(classified.classification).toBe(FactClass.NON_FACTUAL);
    });

    it('DERIVED predicate takes priority over unknown', () => {
      const fact = createFact('Alice', 'IMPLIES', 'data', 'Alice implies data');
      const classified = classifyFact(fact);
      expect(classified.classification).toBe(FactClass.FACT_DERIVED);
    });
  });
});
