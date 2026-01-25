/**
 * OMEGA Truth Gate — Verdict Ledger Tests
 *
 * Tests for the append-only verdict ledger.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VerdictLedger, createVerdictLedger } from '../src/ledger/verdict-ledger.js';
import { LEDGER_GENESIS_HASH } from '../src/ledger/types.js';
import { createGateVerdict, createValidatorResult } from '../src/gate/verdict-factory.js';
import type { GateVerdict, ValidatorId, PolicyId } from '../src/gate/types.js';

function createMockVerdict(txId: string, verdict: 'ALLOW' | 'DENY' | 'DEFER' = 'ALLOW'): GateVerdict {
  const results = [createValidatorResult('V-TEST' as ValidatorId, verdict, [], 1)];
  const rules = { deny_on_any_deny: true, defer_on_any_defer: true };
  return createGateVerdict(txId, results, 'P-TEST-v1' as PolicyId, rules);
}

describe('VerdictLedger', () => {
  let ledger: VerdictLedger;

  beforeEach(() => {
    ledger = new VerdictLedger();
  });

  describe('constructor', () => {
    it('should initialize with genesis hash', () => {
      expect(ledger.getHeadHash()).toBe(LEDGER_GENESIS_HASH);
    });

    it('should initialize with zero entries', () => {
      expect(ledger.getEntryCount()).toBe(0);
    });
  });

  describe('append', () => {
    it('should append verdict to ledger', () => {
      const verdict = createMockVerdict('tx-1');
      const entry = ledger.append(verdict);
      expect(entry.index).toBe(0);
      expect(entry.verdict).toBe(verdict);
      expect(ledger.getEntryCount()).toBe(1);
    });

    it('should update head hash after append', () => {
      const verdict = createMockVerdict('tx-1');
      ledger.append(verdict);
      expect(ledger.getHeadHash()).not.toBe(LEDGER_GENESIS_HASH);
    });

    it('should chain entries with parent hash', () => {
      const verdict1 = createMockVerdict('tx-1');
      const verdict2 = createMockVerdict('tx-2');

      const entry1 = ledger.append(verdict1);
      const entry2 = ledger.append(verdict2);

      expect(entry2.parent_hash).toBe(entry1.cumulative_hash);
    });

    it('should increment index for each entry', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));
      ledger.append(createMockVerdict('tx-3'));

      expect(ledger.getEntry(0)?.index).toBe(0);
      expect(ledger.getEntry(1)?.index).toBe(1);
      expect(ledger.getEntry(2)?.index).toBe(2);
    });

    it('should index verdicts by tx_id', () => {
      const verdict = createMockVerdict('tx-1');
      ledger.append(verdict);
      expect(ledger.getVerdictsByTxId('tx-1')).toHaveLength(1);
    });
  });

  describe('getEntry', () => {
    it('should return entry by index', () => {
      const verdict = createMockVerdict('tx-1');
      ledger.append(verdict);
      const entry = ledger.getEntry(0);
      expect(entry).toBeDefined();
      expect(entry?.verdict).toBe(verdict);
    });

    it('should return undefined for invalid index', () => {
      expect(ledger.getEntry(999)).toBeUndefined();
    });
  });

  describe('getAllEntries', () => {
    it('should return all entries in order', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));
      ledger.append(createMockVerdict('tx-3'));

      const entries = ledger.getAllEntries();
      expect(entries).toHaveLength(3);
      expect(entries[0].verdict.tx_id).toBe('tx-1');
      expect(entries[1].verdict.tx_id).toBe('tx-2');
      expect(entries[2].verdict.tx_id).toBe('tx-3');
    });
  });

  describe('getAllVerdicts', () => {
    it('should return all verdicts', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));

      const verdicts = ledger.getAllVerdicts();
      expect(verdicts).toHaveLength(2);
    });
  });

  describe('getVerdictsByTxId', () => {
    it('should return verdicts for specific tx_id', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));
      ledger.append(createMockVerdict('tx-1')); // Same tx validated again

      expect(ledger.getVerdictsByTxId('tx-1')).toHaveLength(2);
      expect(ledger.getVerdictsByTxId('tx-2')).toHaveLength(1);
    });

    it('should return empty array for unknown tx_id', () => {
      expect(ledger.getVerdictsByTxId('unknown')).toHaveLength(0);
    });
  });

  describe('getVerdictsByType', () => {
    it('should filter by verdict type', () => {
      ledger.append(createMockVerdict('tx-1', 'ALLOW'));
      ledger.append(createMockVerdict('tx-2', 'DENY'));
      ledger.append(createMockVerdict('tx-3', 'ALLOW'));
      ledger.append(createMockVerdict('tx-4', 'DEFER'));

      expect(ledger.getVerdictsByType('ALLOW')).toHaveLength(2);
      expect(ledger.getVerdictsByType('DENY')).toHaveLength(1);
      expect(ledger.getVerdictsByType('DEFER')).toHaveLength(1);
    });
  });

  describe('getLatestVerdict', () => {
    it('should return most recent verdict for tx_id', () => {
      const v1 = createMockVerdict('tx-1', 'DENY');
      const v2 = createMockVerdict('tx-1', 'ALLOW');

      ledger.append(v1);
      ledger.append(v2);

      const latest = ledger.getLatestVerdict('tx-1');
      expect(latest?.final_verdict).toBe('ALLOW');
    });

    it('should return undefined for unknown tx_id', () => {
      expect(ledger.getLatestVerdict('unknown')).toBeUndefined();
    });
  });

  describe('hasVerdict', () => {
    it('should return true if tx has verdict', () => {
      ledger.append(createMockVerdict('tx-1'));
      expect(ledger.hasVerdict('tx-1')).toBe(true);
    });

    it('should return false if tx has no verdict', () => {
      expect(ledger.hasVerdict('unknown')).toBe(false);
    });
  });

  describe('countByType', () => {
    it('should count verdicts by type', () => {
      ledger.append(createMockVerdict('tx-1', 'ALLOW'));
      ledger.append(createMockVerdict('tx-2', 'ALLOW'));
      ledger.append(createMockVerdict('tx-3', 'DENY'));

      expect(ledger.countByType('ALLOW')).toBe(2);
      expect(ledger.countByType('DENY')).toBe(1);
      expect(ledger.countByType('DEFER')).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return ledger snapshot', () => {
      ledger.append(createMockVerdict('tx-1', 'ALLOW'));
      ledger.append(createMockVerdict('tx-2', 'DENY'));

      const snapshot = ledger.getSnapshot();
      expect(snapshot.entry_count).toBe(2);
      expect(snapshot.allow_count).toBe(1);
      expect(snapshot.deny_count).toBe(1);
      expect(snapshot.defer_count).toBe(0);
      expect(snapshot.head_hash).toBe(ledger.getHeadHash());
      expect(snapshot.first_entry_timestamp).toBeGreaterThan(0);
      expect(snapshot.last_entry_timestamp).toBeGreaterThan(0);
    });

    it('should handle empty ledger', () => {
      const snapshot = ledger.getSnapshot();
      expect(snapshot.entry_count).toBe(0);
      expect(snapshot.first_entry_timestamp).toBeNull();
      expect(snapshot.last_entry_timestamp).toBeNull();
    });
  });

  describe('verifyIntegrity', () => {
    it('should return true for empty ledger', () => {
      expect(ledger.verifyIntegrity()).toBe(true);
    });

    it('should return true for valid ledger', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));
      ledger.append(createMockVerdict('tx-3'));

      expect(ledger.verifyIntegrity()).toBe(true);
    });

    it('should verify hash chain continuity', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));

      // Integrity should pass for normal operation
      expect(ledger.verifyIntegrity()).toBe(true);
    });
  });

  describe('verifyReplay', () => {
    it('should return true for empty ledger', () => {
      expect(ledger.verifyReplay()).toBe(true);
    });

    it('should return true when replay matches', () => {
      ledger.append(createMockVerdict('tx-1'));
      ledger.append(createMockVerdict('tx-2'));

      expect(ledger.verifyReplay()).toBe(true);
    });
  });

  describe('getEntriesInRange', () => {
    it('should return entries in time range', async () => {
      const start = Date.now();
      ledger.append(createMockVerdict('tx-1'));
      await new Promise(r => setTimeout(r, 10));
      ledger.append(createMockVerdict('tx-2'));
      const end = Date.now();

      const entries = ledger.getEntriesInRange(start, end);
      expect(entries).toHaveLength(2);
    });

    it('should return empty for out of range', () => {
      ledger.append(createMockVerdict('tx-1'));
      const entries = ledger.getEntriesInRange(0, 1000);
      expect(entries).toHaveLength(0);
    });
  });

  describe('getEntryByVerdictId', () => {
    it('should find entry by verdict_id', () => {
      const verdict = createMockVerdict('tx-1');
      ledger.append(verdict);

      const entry = ledger.getEntryByVerdictId(verdict.verdict_id);
      expect(entry).toBeDefined();
      expect(entry?.verdict.verdict_id).toBe(verdict.verdict_id);
    });

    it('should return undefined for unknown verdict_id', () => {
      expect(ledger.getEntryByVerdictId('unknown')).toBeUndefined();
    });
  });

  describe('createVerdictLedger', () => {
    it('should create new ledger instance', () => {
      const newLedger = createVerdictLedger();
      expect(newLedger).toBeInstanceOf(VerdictLedger);
      expect(newLedger.getEntryCount()).toBe(0);
    });
  });
});
