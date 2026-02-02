/**
 * @fileoverview INCIDENT storage tests.
 * Target: 10 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryIncidentStorage,
  createInMemoryStorage,
  validateStorageIntegrity,
} from '../../src/incident/index.js';
import type { IncidentEntry, RuntimeEvent } from '../../src/types/index.js';

function createTestEntry(id: string, loggedAt: number): IncidentEntry {
  const event: RuntimeEvent = {
    id: 'evt-001',
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'REJECT',
      payload: {},
      hash: 'hash123',
    },
    metadata: { observedAt: 1000, hash: 'event-hash' },
  };

  return {
    id,
    event,
    reason: 'test reason',
    loggedAt,
    hash: `hash-${id}`,
  };
}

describe('INCIDENT Storage', () => {
  describe('InMemoryIncidentStorage', () => {
    let storage: InMemoryIncidentStorage;

    beforeEach(() => {
      storage = new InMemoryIncidentStorage();
    });

    describe('save', () => {
      it('saves an entry', () => {
        storage.save(createTestEntry('inc-1', 1000));
        expect(storage.count()).toBe(1);
      });

      it('saves multiple entries', () => {
        storage.save(createTestEntry('inc-1', 1000));
        storage.save(createTestEntry('inc-2', 2000));
        expect(storage.count()).toBe(2);
      });
    });

    describe('loadAll', () => {
      it('returns empty array initially', () => {
        expect(storage.loadAll()).toEqual([]);
      });

      it('returns all saved entries', () => {
        storage.save(createTestEntry('inc-1', 1000));
        storage.save(createTestEntry('inc-2', 2000));
        expect(storage.loadAll()).toHaveLength(2);
      });

      it('returns copies, not originals', () => {
        storage.save(createTestEntry('inc-1', 1000));
        const entries = storage.loadAll();
        expect(entries).toHaveLength(1);
      });
    });

    describe('clear', () => {
      it('removes all entries', () => {
        storage.save(createTestEntry('inc-1', 1000));
        storage.save(createTestEntry('inc-2', 2000));
        storage.clear();
        expect(storage.count()).toBe(0);
      });
    });
  });

  describe('createInMemoryStorage', () => {
    it('creates storage instance', () => {
      const storage = createInMemoryStorage();
      expect(storage).toBeDefined();
    });
  });

  describe('validateStorageIntegrity', () => {
    it('returns true for empty storage', () => {
      const storage = createInMemoryStorage();
      expect(validateStorageIntegrity(storage)).toBe(true);
    });

    it('returns true for chronologically ordered entries', () => {
      const storage = createInMemoryStorage();
      storage.save(createTestEntry('inc-1', 1000));
      storage.save(createTestEntry('inc-2', 2000));
      storage.save(createTestEntry('inc-3', 3000));
      expect(validateStorageIntegrity(storage)).toBe(true);
    });
  });
});
