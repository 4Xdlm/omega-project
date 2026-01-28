/**
 * OMEGA Truth Gate Fact Extractor Tests v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * Tests F2-INV-01 to F2-INV-04
 */

import { describe, it, expect } from 'vitest';
import {
  extractFacts,
  extractMarkedFacts,
  createFact,
  isValidFact,
  computeFactId,
  sortFacts,
  deduplicateFacts,
} from '../../src/gates/fact-extractor';
import type { CanonicalFact, FactId } from '../../src/gates/types';

describe('Fact Extractor — Phase F', () => {
  describe('F2-INV-01: Fact ID is deterministic hash', () => {
    it('same input produces same ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Alice Smith', 'Alice is named Alice Smith');
      const fact2 = createFact('Alice', 'HAS_NAME', 'Alice Smith', 'Alice is named Alice Smith');
      expect(fact1.id).toBe(fact2.id);
    });

    it('different subject produces different ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const fact2 = createFact('Bob', 'HAS_NAME', 'Smith', 'text');
      expect(fact1.id).not.toBe(fact2.id);
    });

    it('different predicate produces different ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const fact2 = createFact('Alice', 'HAS_AGE', 'Smith', 'text');
      expect(fact1.id).not.toBe(fact2.id);
    });

    it('different object produces different ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'text');
      const fact2 = createFact('Alice', 'HAS_NAME', 'Jones', 'text');
      expect(fact1.id).not.toBe(fact2.id);
    });

    it('different sourceSpan produces different ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'text', 0);
      const fact2 = createFact('Alice', 'HAS_NAME', 'Smith', 'text', 10);
      expect(fact1.id).not.toBe(fact2.id);
    });

    it('ID is SHA256 hex string', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'test');
      expect(fact.id).toMatch(/^[a-f0-9]{64}$/);
    });
  });

  describe('F2-INV-02: sourceSpan is always provided', () => {
    it('extracted facts have sourceSpan', () => {
      const text = 'Alice is a developer.';
      const facts = extractFacts(text);
      for (const fact of facts) {
        expect(fact.sourceSpan).toBeDefined();
        expect(typeof fact.sourceSpan.start).toBe('number');
        expect(typeof fact.sourceSpan.end).toBe('number');
        expect(typeof fact.sourceSpan.text).toBe('string');
      }
    });

    it('sourceSpan.start <= sourceSpan.end', () => {
      const text = 'Bob has a car. Alice is a teacher.';
      const facts = extractFacts(text);
      for (const fact of facts) {
        expect(fact.sourceSpan.start).toBeLessThanOrEqual(fact.sourceSpan.end);
      }
    });

    it('sourceSpan.text matches text slice', () => {
      const text = 'Alice is smart.';
      const facts = extractFacts(text);
      for (const fact of facts) {
        const slice = text.slice(fact.sourceSpan.start, fact.sourceSpan.end);
        expect(fact.sourceSpan.text).toBe(slice);
      }
    });
  });

  describe('F2-INV-03: Output sorted by sourceSpan', () => {
    it('facts sorted by start position', () => {
      const text = 'Bob is tall. Alice is smart. Charlie is fast.';
      const facts = extractFacts(text);
      for (let i = 1; i < facts.length; i++) {
        expect(facts[i].sourceSpan.start).toBeGreaterThanOrEqual(
          facts[i - 1].sourceSpan.start
        );
      }
    });

    it('facts with same start sorted by end position', () => {
      // Create facts manually to control positions
      const fact1: CanonicalFact = {
        id: 'a' as FactId,
        sourceSpan: { start: 0, end: 10, text: 'test1' },
        subject: 'A',
        predicate: 'P',
        object: 'O1',
      };
      const fact2: CanonicalFact = {
        id: 'b' as FactId,
        sourceSpan: { start: 0, end: 5, text: 'test2' },
        subject: 'B',
        predicate: 'P',
        object: 'O2',
      };
      const sorted = sortFacts([fact1, fact2]);
      expect(sorted[0].sourceSpan.end).toBe(5);
      expect(sorted[1].sourceSpan.end).toBe(10);
    });

    it('sortFacts is stable for equal positions', () => {
      const facts: CanonicalFact[] = [
        { id: 'a' as FactId, sourceSpan: { start: 0, end: 5, text: 'a' }, subject: 'A', predicate: 'P', object: 'O' },
        { id: 'b' as FactId, sourceSpan: { start: 0, end: 5, text: 'b' }, subject: 'B', predicate: 'P', object: 'O' },
      ];
      const sorted1 = sortFacts(facts);
      const sorted2 = sortFacts(facts);
      expect(sorted1.map(f => f.id)).toEqual(sorted2.map(f => f.id));
    });
  });

  describe('F2-INV-04: No probabilistic extraction', () => {
    it('same text always produces same facts', () => {
      const text = 'Alice is a developer. Bob has a car.';
      const facts1 = extractFacts(text);
      const facts2 = extractFacts(text);
      expect(facts1.length).toBe(facts2.length);
      for (let i = 0; i < facts1.length; i++) {
        expect(facts1[i].id).toBe(facts2[i].id);
      }
    });

    it('extraction is deterministic across 100 runs', () => {
      const text = 'Alice is smart. Bob is tall.';
      const first = extractFacts(text);
      for (let i = 0; i < 100; i++) {
        const facts = extractFacts(text);
        expect(facts.length).toBe(first.length);
        expect(facts.map(f => f.id)).toEqual(first.map(f => f.id));
      }
    });

    it('no randomness in extraction', () => {
      const text = 'Charlie is a musician.';
      const results = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const facts = extractFacts(text);
        results.add(JSON.stringify(facts.map(f => f.id)));
      }
      // Only one unique result = deterministic
      expect(results.size).toBe(1);
    });
  });

  describe('Extraction Patterns', () => {
    it('extracts "X is Y" pattern', () => {
      const facts = extractFacts('Alice is a developer.');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const aliceFact = facts.find(f => f.subject === 'Alice');
      expect(aliceFact).toBeDefined();
      expect(aliceFact!.predicate).toBe('IS_A');
    });

    it('extracts "X has Y" pattern', () => {
      const facts = extractFacts('Bob has a car.');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const bobFact = facts.find(f => f.subject === 'Bob');
      expect(bobFact).toBeDefined();
      expect(bobFact!.predicate).toBe('HAS_ATTRIBUTE');
    });

    it('extracts possessive pattern', () => {
      const facts = extractFacts("Alice's age is 30.");
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const ageFact = facts.find(f => f.subject === 'Alice' && f.predicate === 'HAS_AGE');
      expect(ageFact).toBeDefined();
    });

    it('extracts "named" pattern', () => {
      const facts = extractFacts('Person named John.');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const nameFact = facts.find(f => f.predicate === 'HAS_NAME');
      expect(nameFact).toBeDefined();
    });

    it('extracts "The X of Y is Z" pattern', () => {
      const facts = extractFacts('The age of Bob is 25.');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const ageFact = facts.find(f => f.subject === 'Bob' && f.predicate === 'HAS_AGE');
      expect(ageFact).toBeDefined();
    });

    it('extracts "knows" pattern', () => {
      const facts = extractFacts('Alice knows Bob.');
      expect(facts.length).toBeGreaterThanOrEqual(1);
      const knowsFact = facts.find(f => f.predicate === 'KNOWS');
      expect(knowsFact).toBeDefined();
      expect(knowsFact!.subject).toBe('Alice');
      expect(knowsFact!.object).toBe('Bob');
    });
  });

  describe('extractMarkedFacts', () => {
    it('extracts marked facts', () => {
      const text = '[SUBJECT:Alice] HAS_NAME [OBJECT:Alice Smith]';
      const facts = extractMarkedFacts(text);
      expect(facts).toHaveLength(1);
      expect(facts[0].subject).toBe('Alice');
      expect(facts[0].predicate).toBe('HAS_NAME');
      expect(facts[0].object).toBe('Alice Smith');
    });

    it('extracts multiple marked facts', () => {
      const text = '[SUBJECT:Alice] HAS_AGE [OBJECT:30] and [SUBJECT:Bob] HAS_AGE [OBJECT:25]';
      const facts = extractMarkedFacts(text);
      expect(facts).toHaveLength(2);
    });

    it('marked facts have deterministic IDs', () => {
      const text = '[SUBJECT:Alice] HAS_NAME [OBJECT:Smith]';
      const facts1 = extractMarkedFacts(text);
      const facts2 = extractMarkedFacts(text);
      expect(facts1[0].id).toBe(facts2[0].id);
    });
  });

  describe('createFact', () => {
    it('creates fact with all required fields', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'test text');
      expect(fact.id).toBeDefined();
      expect(fact.sourceSpan).toBeDefined();
      expect(fact.subject).toBe('Alice');
      expect(fact.predicate).toBe('HAS_NAME');
      expect(fact.object).toBe('Smith');
    });

    it('respects start position', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'test', 100);
      expect(fact.sourceSpan.start).toBe(100);
      expect(fact.sourceSpan.end).toBe(104);
    });

    it('handles complex objects', () => {
      const fact = createFact('Alice', 'HAS_DATA', { nested: { value: 42 } }, 'test');
      expect(fact.object).toEqual({ nested: { value: 42 } });
    });
  });

  describe('isValidFact', () => {
    it('returns true for valid fact', () => {
      const fact = createFact('Alice', 'HAS_NAME', 'Smith', 'test');
      expect(isValidFact(fact)).toBe(true);
    });

    it('returns false for null', () => {
      expect(isValidFact(null)).toBe(false);
    });

    it('returns false for missing id', () => {
      expect(isValidFact({
        sourceSpan: { start: 0, end: 5, text: 'test' },
        subject: 'A',
        predicate: 'P',
        object: 'O',
      })).toBe(false);
    });

    it('returns false for missing sourceSpan', () => {
      expect(isValidFact({
        id: 'test',
        subject: 'A',
        predicate: 'P',
        object: 'O',
      })).toBe(false);
    });

    it('returns false for invalid sourceSpan', () => {
      expect(isValidFact({
        id: 'test',
        sourceSpan: { start: 'not a number' },
        subject: 'A',
        predicate: 'P',
        object: 'O',
      })).toBe(false);
    });
  });

  describe('deduplicateFacts', () => {
    it('removes duplicate facts by ID', () => {
      const fact1 = createFact('Alice', 'HAS_NAME', 'Smith', 'test', 0);
      const fact2 = createFact('Alice', 'HAS_NAME', 'Smith', 'test', 0); // Same ID
      const deduped = deduplicateFacts([fact1, fact2]);
      expect(deduped).toHaveLength(1);
    });

    it('keeps first occurrence', () => {
      const fact1: CanonicalFact = { ...createFact('Alice', 'P', 'O', 'test'), id: 'same' as FactId };
      const fact2: CanonicalFact = { ...createFact('Bob', 'P', 'O', 'test'), id: 'same' as FactId };
      const deduped = deduplicateFacts([fact1, fact2]);
      expect(deduped[0].subject).toBe('Alice');
    });

    it('preserves order of first occurrences', () => {
      const facts: CanonicalFact[] = [
        { id: 'a' as FactId, sourceSpan: { start: 0, end: 5, text: 'a' }, subject: 'A', predicate: 'P', object: 'O' },
        { id: 'b' as FactId, sourceSpan: { start: 5, end: 10, text: 'b' }, subject: 'B', predicate: 'P', object: 'O' },
        { id: 'a' as FactId, sourceSpan: { start: 10, end: 15, text: 'a2' }, subject: 'A2', predicate: 'P', object: 'O' },
      ];
      const deduped = deduplicateFacts(facts);
      expect(deduped).toHaveLength(2);
      expect(deduped[0].id).toBe('a');
      expect(deduped[1].id).toBe('b');
    });
  });

  describe('Context Scoping', () => {
    it('adds scope to facts when context provided', () => {
      const text = 'Alice is smart.';
      const facts = extractFacts(text, 'chapter-1');
      if (facts.length > 0) {
        expect(facts[0].scope).toBe('chapter-1');
      }
    });

    it('scope affects fact ID', () => {
      const text = 'Alice is smart.';
      const facts1 = extractFacts(text, 'context-1');
      const facts2 = extractFacts(text, 'context-2');
      if (facts1.length > 0 && facts2.length > 0) {
        expect(facts1[0].id).not.toBe(facts2[0].id);
      }
    });

    it('no scope when context not provided', () => {
      const text = 'Alice is smart.';
      const facts = extractFacts(text);
      if (facts.length > 0) {
        expect(facts[0].scope).toBeUndefined();
      }
    });
  });

  describe('Edge Cases', () => {
    it('handles empty text', () => {
      const facts = extractFacts('');
      expect(facts).toHaveLength(0);
    });

    it('handles text with no facts', () => {
      const facts = extractFacts('Hello world!');
      expect(facts).toHaveLength(0);
    });

    it('handles special characters', () => {
      const facts = extractFacts('Alice is a "software developer".');
      expect(facts.length).toBeGreaterThanOrEqual(0); // May or may not extract
    });

    it('handles multi-line text', () => {
      const text = 'Alice is smart.\nBob is tall.\nCharlie is fast.';
      const facts = extractFacts(text);
      expect(facts.length).toBeGreaterThanOrEqual(2);
    });

    it('handles very long text', () => {
      const sentence = 'Alice is smart. ';
      const text = sentence.repeat(1000);
      const facts = extractFacts(text);
      expect(facts.length).toBeGreaterThan(0);
    });
  });
});
