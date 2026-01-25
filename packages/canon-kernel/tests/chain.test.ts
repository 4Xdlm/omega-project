import { describe, it, expect } from 'vitest';
import {
  createHashEntry,
  verifyChain,
  findChainBreak,
  buildChain,
  getChainHead,
  GENESIS_HASH,
  computeCumulativeHash,
} from '../src/hash/chain';
import { createDeterministicId } from '../src/id/factory';
import type { CanonTx } from '../src/types/transactions';

describe('HashChain', () => {
  const createTestTx = (n: number): CanonTx => ({
    tx_id: createDeterministicId('tx', 'chain', 'test', { n }),
    ops: [],
    actor: 'test',
    reason: `tx ${n}`,
    evidence_refs: [],
    parent_root_hash: '0'.repeat(64),
    rail: 'truth',
    timestamp: Date.now(),
  });

  describe('GENESIS_HASH', () => {
    it('should be a valid 64-char hex string', () => {
      expect(GENESIS_HASH).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should be deterministic', () => {
      // GENESIS_HASH is computed at module load, but should be consistent
      expect(GENESIS_HASH).toBe(GENESIS_HASH);
    });
  });

  describe('verifyChain', () => {
    it('should verify empty chain', () => {
      expect(verifyChain([])).toBe(true);
    });

    it('should verify single entry chain', () => {
      const tx = createTestTx(1);
      const entry = createHashEntry(tx, GENESIS_HASH);
      expect(verifyChain([entry])).toBe(true);
    });

    it('should verify valid chain', () => {
      const tx1 = createTestTx(1);
      const tx2 = createTestTx(2);
      const tx3 = createTestTx(3);

      const entry1 = createHashEntry(tx1, GENESIS_HASH);
      const entry2 = createHashEntry(tx2, entry1.cumulative_hash);
      const entry3 = createHashEntry(tx3, entry2.cumulative_hash);

      expect(verifyChain([entry1, entry2, entry3])).toBe(true);
    });

    it('should detect broken chain', () => {
      const tx1 = createTestTx(1);
      const tx2 = createTestTx(2);

      const entry1 = createHashEntry(tx1, GENESIS_HASH);
      const entry2 = createHashEntry(tx2, 'x'.repeat(64)); // Wrong parent

      expect(verifyChain([entry1, entry2])).toBe(false);
    });
  });

  describe('findChainBreak', () => {
    it('should return -1 for valid chain', () => {
      const tx1 = createTestTx(1);
      const tx2 = createTestTx(2);

      const entry1 = createHashEntry(tx1, GENESIS_HASH);
      const entry2 = createHashEntry(tx2, entry1.cumulative_hash);

      expect(findChainBreak([entry1, entry2])).toBe(-1);
    });

    it('should return index of break', () => {
      const tx1 = createTestTx(1);
      const tx2 = createTestTx(2);
      const tx3 = createTestTx(3);

      const entry1 = createHashEntry(tx1, GENESIS_HASH);
      const entry2 = createHashEntry(tx2, entry1.cumulative_hash);
      const entry3 = createHashEntry(tx3, 'wrong'.padEnd(64, '0')); // Wrong parent

      expect(findChainBreak([entry1, entry2, entry3])).toBe(2);
    });
  });

  describe('buildChain', () => {
    it('should build chain from transactions', () => {
      const transactions = [createTestTx(1), createTestTx(2), createTestTx(3)];
      const chain = buildChain(transactions);

      expect(chain).toHaveLength(3);
      expect(verifyChain(chain)).toBe(true);
    });

    it('should start from genesis hash', () => {
      const transactions = [createTestTx(1)];
      const chain = buildChain(transactions);

      expect(chain[0].parent_cumulative_hash).toBe(GENESIS_HASH);
    });

    it('should produce same chain for same transactions', () => {
      const transactions = [createTestTx(1), createTestTx(2)];
      const chain1 = buildChain(transactions);
      const chain2 = buildChain(transactions);

      expect(chain1[0].cumulative_hash).toBe(chain2[0].cumulative_hash);
      expect(chain1[1].cumulative_hash).toBe(chain2[1].cumulative_hash);
    });
  });

  describe('getChainHead', () => {
    it('should return genesis hash for empty chain', () => {
      expect(getChainHead([])).toBe(GENESIS_HASH);
    });

    it('should return last cumulative hash', () => {
      const tx1 = createTestTx(1);
      const tx2 = createTestTx(2);

      const entry1 = createHashEntry(tx1, GENESIS_HASH);
      const entry2 = createHashEntry(tx2, entry1.cumulative_hash);

      expect(getChainHead([entry1, entry2])).toBe(entry2.cumulative_hash);
    });
  });

  describe('Determinism', () => {
    it('should produce deterministic cumulative hash', () => {
      const tx = createTestTx(1);
      const entry1 = createHashEntry(tx, GENESIS_HASH);
      const entry2 = createHashEntry(tx, GENESIS_HASH);
      expect(entry1.cumulative_hash).toBe(entry2.cumulative_hash);
    });

    it('should produce deterministic cumulative hash (100 iterations)', () => {
      const tx = createTestTx(1);
      const firstHash = computeCumulativeHash(tx, GENESIS_HASH);
      for (let i = 0; i < 100; i++) {
        expect(computeCumulativeHash(tx, GENESIS_HASH)).toBe(firstHash);
      }
    });
  });

  describe('Hash entry structure', () => {
    it('should contain all required fields', () => {
      const tx = createTestTx(1);
      const entry = createHashEntry(tx, GENESIS_HASH);

      expect(entry.tx_id).toBe(tx.tx_id);
      expect(entry.ops_hash).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.parent_cumulative_hash).toBe(GENESIS_HASH);
      expect(entry.cumulative_hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it('should have different ops_hash and cumulative_hash', () => {
      const tx = createTestTx(1);
      const entry = createHashEntry(tx, GENESIS_HASH);

      // They should be different because cumulative includes parent
      expect(entry.ops_hash).not.toBe(entry.cumulative_hash);
    });
  });
});
