/**
 * OMEGA Integration Layer — Canon Store Tests
 * Phase 20 — v3.20.0
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CanonStore, createCanonStore } from '../../src/canon-store.js';

describe('CanonStore', () => {
  let store: CanonStore;

  beforeEach(() => {
    store = createCanonStore();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACT OPERATIONS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('addFact()', () => {
    it('adds a fact with generated id and hash', () => {
      const fact = store.addFact('Jean', 'name', 'Jean Dupont', 'user-input');

      expect(fact.id).toBe('fact_1');
      expect(fact.subject).toBe('Jean');
      expect(fact.predicate).toBe('name');
      expect(fact.value).toBe('Jean Dupont');
      expect(fact.source).toBe('user-input');
      expect(fact.confidence).toBe(1.0);
      expect(fact.hash).toHaveLength(64);
    });

    it('increments id for each fact', () => {
      const f1 = store.addFact('A', 'p', 'v', 's');
      const f2 = store.addFact('B', 'p', 'v', 's');
      const f3 = store.addFact('C', 'p', 'v', 's');

      expect(f1.id).toBe('fact_1');
      expect(f2.id).toBe('fact_2');
      expect(f3.id).toBe('fact_3');
    });

    it('generates unique hash for each fact', () => {
      const f1 = store.addFact('A', 'p', 'v1', 's');
      const f2 = store.addFact('A', 'p', 'v2', 's');

      expect(f1.hash).not.toBe(f2.hash);
    });

    it('accepts custom confidence', () => {
      const fact = store.addFact('A', 'p', 'v', 's', 0.8);
      expect(fact.confidence).toBe(0.8);
    });
  });

  describe('getFact()', () => {
    it('returns fact by id', () => {
      const added = store.addFact('A', 'p', 'v', 's');
      const retrieved = store.getFact('fact_1');

      expect(retrieved).toEqual(added);
    });

    it('returns undefined for missing id', () => {
      expect(store.getFact('nonexistent')).toBeUndefined();
    });
  });

  describe('getAllFacts()', () => {
    it('returns all facts', () => {
      store.addFact('A', 'p', 'v', 's');
      store.addFact('B', 'p', 'v', 's');

      const facts = store.getAllFacts();
      expect(facts).toHaveLength(2);
    });

    it('returns empty array for empty store', () => {
      expect(store.getAllFacts()).toHaveLength(0);
    });
  });

  describe('getFactsBySubject()', () => {
    it('filters by subject', () => {
      store.addFact('Jean', 'name', 'Jean Dupont', 's');
      store.addFact('Jean', 'age', '35', 's');
      store.addFact('Marie', 'name', 'Marie Martin', 's');

      const jeanFacts = store.getFactsBySubject('Jean');
      expect(jeanFacts).toHaveLength(2);
    });
  });

  describe('getFactsByPredicate()', () => {
    it('filters by predicate', () => {
      store.addFact('Jean', 'name', 'Jean Dupont', 's');
      store.addFact('Marie', 'name', 'Marie Martin', 's');
      store.addFact('Jean', 'age', '35', 's');

      const nameFacts = store.getFactsByPredicate('name');
      expect(nameFacts).toHaveLength(2);
    });
  });

  describe('removeFact()', () => {
    it('removes existing fact', () => {
      store.addFact('A', 'p', 'v', 's');
      expect(store.size).toBe(1);

      const removed = store.removeFact('fact_1');
      expect(removed).toBe(true);
      expect(store.size).toBe(0);
    });

    it('returns false for missing fact', () => {
      const removed = store.removeFact('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('clear()', () => {
    it('removes all facts and resets counter', () => {
      store.addFact('A', 'p', 'v', 's');
      store.addFact('B', 'p', 'v', 's');
      store.clear();

      expect(store.size).toBe(0);

      const newFact = store.addFact('C', 'p', 'v', 's');
      expect(newFact.id).toBe('fact_1'); // Counter reset
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SNAPSHOT
  // ═══════════════════════════════════════════════════════════════════════════

  describe('snapshot()', () => {
    it('creates snapshot of current state', () => {
      store.addFact('Jean', 'name', 'Jean Dupont', 'user');
      store.addFact('Jean', 'age', '35', 'user');

      const snapshot = store.snapshot();

      expect(snapshot.version).toBe('3.20.0');
      expect(snapshot.facts).toHaveLength(2);
      expect(snapshot.rootHash).toHaveLength(64);
      expect(snapshot.metadata.factCount).toBe(2);
      expect(snapshot.metadata.sources).toContain('user');
    });

    it('creates deterministic rootHash', () => {
      store.addFact('A', 'p', 'v', 's');
      const snap1 = store.snapshot();

      store.clear();
      store.addFact('A', 'p', 'v', 's');
      const snap2 = store.snapshot();

      // Same facts = same rootHash (determinism)
      expect(snap1.rootHash).toBe(snap2.rootHash);
    });

    it('creates different rootHash for different facts', () => {
      store.addFact('A', 'p', 'v1', 's');
      const snap1 = store.snapshot();

      store.clear();
      store.addFact('A', 'p', 'v2', 's');
      const snap2 = store.snapshot();

      expect(snap1.rootHash).not.toBe(snap2.rootHash);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // RESTORE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('restore()', () => {
    it('restores from valid snapshot', () => {
      store.addFact('Jean', 'name', 'Jean Dupont', 'user');
      store.addFact('Jean', 'age', '35', 'user');
      const snapshot = store.snapshot();

      const newStore = createCanonStore();
      const result = newStore.restore(snapshot);

      expect(result.success).toBe(true);
      expect(newStore.size).toBe(2);
      expect(newStore.getRootHash()).toBe(snapshot.rootHash);
    });

    it('rejects snapshot with invalid rootHash', () => {
      store.addFact('A', 'p', 'v', 's');
      const snapshot = store.snapshot();

      // Tamper with rootHash
      const tampered = { ...snapshot, rootHash: 'invalid' };

      const newStore = createCanonStore();
      const result = newStore.restore(tampered);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Root hash mismatch');
    });

    it('rejects snapshot with tampered fact hash', () => {
      store.addFact('A', 'p', 'v', 's');
      const snapshot = store.snapshot();

      // Tamper with fact hash
      const tamperedFacts = snapshot.facts.map(f => ({ ...f, hash: 'tampered' }));
      const tampered = { ...snapshot, facts: tamperedFacts };

      const newStore = createCanonStore();
      const result = newStore.restore(tampered);

      expect(result.success).toBe(false);
      // Root hash is computed from fact hashes, so tampering facts = root hash mismatch
      expect(result.error).toContain('mismatch');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPARISON
  // ═══════════════════════════════════════════════════════════════════════════

  describe('equals()', () => {
    it('returns true for stores with same facts', () => {
      const store1 = createCanonStore();
      const store2 = createCanonStore();

      store1.addFact('A', 'p', 'v', 's');
      store2.addFact('A', 'p', 'v', 's');

      expect(store1.equals(store2)).toBe(true);
    });

    it('returns false for stores with different facts', () => {
      const store1 = createCanonStore();
      const store2 = createCanonStore();

      store1.addFact('A', 'p', 'v1', 's');
      store2.addFact('A', 'p', 'v2', 's');

      expect(store1.equals(store2)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createCanonStore()', () => {
    it('creates store with default config', () => {
      const store = createCanonStore();
      expect(store).toBeInstanceOf(CanonStore);
    });

    it('accepts custom version', () => {
      const store = createCanonStore({ version: '1.0.0' });
      const snapshot = store.snapshot();
      expect(snapshot.version).toBe('1.0.0');
    });
  });
});
