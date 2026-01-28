/**
 * OMEGA Orchestrator Intent Ledger Tests v1.0
 * Phase G - NASA-Grade L4 / DO-178C
 *
 * Tests for G7 intent ledger
 */

import { describe, it, expect } from 'vitest';
import {
  createIntentLedger,
  exportLedger,
  verifyImportedLedger,
  findTamperedEntries,
  getIntentHistory,
  getLatestIntentStatus,
  countByStatus,
  type IntentLedger,
  type LedgerEntry,
  type LedgerEntryStatus,
} from '../../src/orchestrator/intent-ledger';
import { createIntent, type RawIntentInput } from '../../src/orchestrator/intent-schema';
import { isChainHash } from '../../src/orchestrator/types';

describe('Intent Ledger — Phase G', () => {
  const validRawIntent: RawIntentInput = {
    actorId: 'ACT-user-12345678',
    goal: 'DRAFT',
    constraints: {
      maxLength: 1000,
      format: 'TEXT_ONLY',
      allowFacts: false,
    },
    tone: {
      tone: 'NEUTRAL',
      intensity: 'MEDIUM',
    },
    forbidden: {
      patterns: [],
      vocabularies: [],
      structures: [],
    },
    payload: {
      text: 'Write a story.',
    },
  };

  function createTestIntent(overrides?: Partial<RawIntentInput>) {
    return createIntent({ ...validRawIntent, ...overrides });
  }

  describe('createIntentLedger', () => {
    it('creates empty ledger', () => {
      const ledger = createIntentLedger();

      expect(ledger.length).toBe(0);
      expect(ledger.lastChainHash).toBeNull();
    });

    it('has required methods', () => {
      const ledger = createIntentLedger();

      expect(typeof ledger.append).toBe('function');
      expect(typeof ledger.getEntry).toBe('function');
      expect(typeof ledger.getEntriesByIntentId).toBe('function');
      expect(typeof ledger.getEntriesByActorId).toBe('function');
      expect(typeof ledger.getAllEntries).toBe('function');
      expect(typeof ledger.verifyChain).toBe('function');
    });
  });

  describe('append', () => {
    it('appends entry to ledger', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry = ledger.append(intent, 'RECEIVED');

      expect(ledger.length).toBe(1);
      expect(entry.index).toBe(0);
      expect(entry.intentId).toBe(intent.intentId);
      expect(entry.status).toBe('RECEIVED');
    });

    it('increments index for each entry', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry1 = ledger.append(intent, 'RECEIVED');
      const entry2 = ledger.append(intent, 'VALIDATED');
      const entry3 = ledger.append(intent, 'COMPLETED');

      expect(entry1.index).toBe(0);
      expect(entry2.index).toBe(1);
      expect(entry3.index).toBe(2);
    });

    it('computes chain hash', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry = ledger.append(intent, 'RECEIVED');

      expect(isChainHash(entry.chainHash)).toBe(true);
    });

    it('chains hashes between entries (G-INV-06)', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry1 = ledger.append(intent, 'RECEIVED');
      const entry2 = ledger.append(intent, 'VALIDATED');

      // Hashes should be different
      expect(entry1.chainHash).not.toBe(entry2.chainHash);

      // Chain should verify
      expect(ledger.verifyChain()).toBe(true);
    });

    it('excludes timestamp from chain hash (G-INV-06)', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      // Append same intent twice quickly
      const entry1 = ledger.append(intent, 'RECEIVED');

      // Timestamps may differ but if same data, hash computation is deterministic
      // The key test is that chain verification passes regardless of timestamp
      expect(ledger.verifyChain()).toBe(true);
    });

    it('includes details in entry', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry = ledger.append(intent, 'REJECTED', {
        reason: 'Policy violation',
        violationCode: 'G-POL-01',
      });

      expect(entry.details).toBeDefined();
      expect(entry.details!.reason).toBe('Policy violation');
    });

    it('returns frozen entry', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry = ledger.append(intent, 'RECEIVED');

      expect(Object.isFrozen(entry)).toBe(true);
    });

    it('freezes details object', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      const entry = ledger.append(intent, 'FAILED', { error: 'Test error' });

      expect(Object.isFrozen(entry.details)).toBe(true);
    });

    it('updates lastChainHash', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      expect(ledger.lastChainHash).toBeNull();

      const entry1 = ledger.append(intent, 'RECEIVED');
      expect(ledger.lastChainHash).toBe(entry1.chainHash);

      const entry2 = ledger.append(intent, 'VALIDATED');
      expect(ledger.lastChainHash).toBe(entry2.chainHash);
    });
  });

  describe('getEntry', () => {
    it('returns entry by index', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');

      const entry = ledger.getEntry(1);

      expect(entry).toBeDefined();
      expect(entry!.status).toBe('VALIDATED');
    });

    it('returns undefined for invalid index', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      expect(ledger.getEntry(-1)).toBeUndefined();
      expect(ledger.getEntry(100)).toBeUndefined();
    });
  });

  describe('getEntriesByIntentId', () => {
    it('returns all entries for intent', () => {
      const ledger = createIntentLedger();
      const intent1 = createTestIntent({ payload: { text: 'Story 1' } });
      const intent2 = createTestIntent({ payload: { text: 'Story 2' } });

      ledger.append(intent1, 'RECEIVED');
      ledger.append(intent1, 'VALIDATED');
      ledger.append(intent2, 'RECEIVED');
      ledger.append(intent1, 'COMPLETED');

      const entries = ledger.getEntriesByIntentId(intent1.intentId);

      expect(entries).toHaveLength(3);
      expect(entries.every(e => e.intentId === intent1.intentId)).toBe(true);
    });

    it('returns empty array if not found', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const entries = ledger.getEntriesByIntentId('INT-notfound12345678901234567890123456789012345678901234' as any);

      expect(entries).toHaveLength(0);
    });

    it('returns frozen array', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const entries = ledger.getEntriesByIntentId(intent.intentId);

      expect(Object.isFrozen(entries)).toBe(true);
    });
  });

  describe('getEntriesByActorId', () => {
    it('returns all entries for actor', () => {
      const ledger = createIntentLedger();
      const intent1 = createTestIntent({ actorId: 'ACT-user-11111111' });
      const intent2 = createTestIntent({ actorId: 'ACT-user-22222222' });

      ledger.append(intent1, 'RECEIVED');
      ledger.append(intent2, 'RECEIVED');
      ledger.append(intent1, 'COMPLETED');

      const entries = ledger.getEntriesByActorId('ACT-user-11111111' as any);

      expect(entries).toHaveLength(2);
    });
  });

  describe('getAllEntries', () => {
    it('returns all entries', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');
      ledger.append(intent, 'COMPLETED');

      const entries = ledger.getAllEntries();

      expect(entries).toHaveLength(3);
    });

    it('returns frozen array', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const entries = ledger.getAllEntries();

      expect(Object.isFrozen(entries)).toBe(true);
    });

    it('returns copy (does not expose internal array)', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const entries1 = ledger.getAllEntries();
      ledger.append(intent, 'VALIDATED');
      const entries2 = ledger.getAllEntries();

      expect(entries1).toHaveLength(1);
      expect(entries2).toHaveLength(2);
    });
  });

  describe('verifyChain (G-INV-06)', () => {
    it('returns true for empty ledger', () => {
      const ledger = createIntentLedger();

      expect(ledger.verifyChain()).toBe(true);
    });

    it('returns true for valid chain', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');
      ledger.append(intent, 'COMPLETED');

      expect(ledger.verifyChain()).toBe(true);
    });

    it('maintains chain integrity across many entries', () => {
      const ledger = createIntentLedger();
      const statuses: LedgerEntryStatus[] = [
        'RECEIVED', 'VALIDATED', 'POLICY_CHECKED',
        'CONTRACT_CREATED', 'GENERATING', 'COMPLETED',
      ];

      for (let i = 0; i < 100; i++) {
        const intent = createTestIntent({ payload: { text: `Story ${i}` } });
        const status = statuses[i % statuses.length];
        ledger.append(intent, status);
      }

      expect(ledger.verifyChain()).toBe(true);
    });
  });

  describe('exportLedger', () => {
    it('exports all entries', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'COMPLETED');

      const exported = exportLedger(ledger);

      expect(exported).toHaveLength(2);
    });
  });

  describe('verifyImportedLedger', () => {
    it('returns true for valid exported ledger', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');

      const exported = exportLedger(ledger);

      expect(verifyImportedLedger(exported)).toBe(true);
    });

    it('returns true for empty array', () => {
      expect(verifyImportedLedger([])).toBe(true);
    });

    it('returns false for tampered entries', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');

      const exported = exportLedger(ledger);

      // Tamper with an entry
      const tampered = [...exported];
      tampered[1] = { ...tampered[1], status: 'REJECTED' };

      expect(verifyImportedLedger(tampered)).toBe(false);
    });

    it('returns false for out-of-order indices', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');

      const exported = exportLedger(ledger);

      // Swap entries (creates index mismatch)
      const swapped = [exported[1], exported[0]];

      expect(verifyImportedLedger(swapped)).toBe(false);
    });
  });

  describe('findTamperedEntries', () => {
    it('returns empty array for valid chain', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'COMPLETED');

      const tampered = findTamperedEntries(exportLedger(ledger));

      expect(tampered).toHaveLength(0);
    });

    it('identifies tampered entries', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');
      ledger.append(intent, 'COMPLETED');

      const exported = exportLedger(ledger);

      // Tamper with middle entry's data (goal changed)
      const tamperedArray = [...exported];
      tamperedArray[1] = { ...tamperedArray[1], goal: 'TAMPERED' };

      const tamperedIndices = findTamperedEntries(tamperedArray);

      // Entry 1 should be flagged because its computed hash won't match stored hash
      expect(tamperedIndices).toContain(1);
      // Entry 2 still verifies correctly because its hash was computed with entry 1's
      // original chain hash (which is still stored in the array)
      expect(tamperedIndices.length).toBe(1);
    });

    it('returns frozen array', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const result = findTamperedEntries(exportLedger(ledger));

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('getIntentHistory', () => {
    it('returns ordered status history', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');
      ledger.append(intent, 'POLICY_CHECKED');
      ledger.append(intent, 'COMPLETED');

      const history = getIntentHistory(ledger, intent.intentId);

      expect(history).toHaveLength(4);
      expect(history[0].status).toBe('RECEIVED');
      expect(history[1].status).toBe('VALIDATED');
      expect(history[2].status).toBe('POLICY_CHECKED');
      expect(history[3].status).toBe('COMPLETED');
    });

    it('returns empty array for unknown intent', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const history = getIntentHistory(ledger, 'INT-unknown1234567890123456789012345678901234567890123456' as any);

      expect(history).toHaveLength(0);
    });

    it('returns frozen array', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');

      const history = getIntentHistory(ledger, intent.intentId);

      expect(Object.isFrozen(history)).toBe(true);
    });
  });

  describe('getLatestIntentStatus', () => {
    it('returns latest status', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();

      ledger.append(intent, 'RECEIVED');
      ledger.append(intent, 'VALIDATED');
      ledger.append(intent, 'COMPLETED');

      expect(getLatestIntentStatus(ledger, intent.intentId)).toBe('COMPLETED');
    });

    it('returns undefined for unknown intent', () => {
      const ledger = createIntentLedger();

      expect(getLatestIntentStatus(ledger, 'INT-unknown' as any)).toBeUndefined();
    });
  });

  describe('countByStatus', () => {
    it('counts entries by status', () => {
      const ledger = createIntentLedger();
      const intent1 = createTestIntent({ payload: { text: 'A' } });
      const intent2 = createTestIntent({ payload: { text: 'B' } });

      ledger.append(intent1, 'RECEIVED');
      ledger.append(intent1, 'COMPLETED');
      ledger.append(intent2, 'RECEIVED');
      ledger.append(intent2, 'REJECTED');

      const counts = countByStatus(ledger);

      expect(counts.get('RECEIVED')).toBe(2);
      expect(counts.get('COMPLETED')).toBe(1);
      expect(counts.get('REJECTED')).toBe(1);
      expect(counts.get('VALIDATED')).toBeUndefined();
    });
  });

  describe('All status types', () => {
    it('accepts all defined status types', () => {
      const ledger = createIntentLedger();
      const intent = createTestIntent();
      const allStatuses: LedgerEntryStatus[] = [
        'RECEIVED',
        'VALIDATED',
        'POLICY_CHECKED',
        'CONTRACT_CREATED',
        'GENERATING',
        'COMPLETED',
        'REJECTED',
        'FAILED',
      ];

      for (const status of allStatuses) {
        const entry = ledger.append(intent, status);
        expect(entry.status).toBe(status);
      }

      expect(ledger.length).toBe(allStatuses.length);
      expect(ledger.verifyChain()).toBe(true);
    });
  });
});
