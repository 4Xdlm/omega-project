import { describe, it, expect } from 'vitest';
import { toHashableView, hashTx, verifyTimestampExclusion, inspectHashableFields } from '../src/hash/hashable-view';
import { createDeterministicId } from '../src/id/factory';
import type { CanonTx } from '../src/types/transactions';
import type { CanonOp } from '../src/types/operations';
import type { EvidenceRef } from '../src/types/evidence';

describe('HashableTxView', () => {
  const createTestOp = (n: number): CanonOp => ({
    op_id: createDeterministicId('op', 'seed', 'test', { o: n }),
    type: 'SET',
    target: createDeterministicId('ent', 'seed', 'test', { e: n }),
    evidence_refs: [],
  });

  const createTestTx = (timestamp: number): CanonTx => ({
    tx_id: createDeterministicId('tx', 'seed', 'test', { n: 1 }),
    ops: [createTestOp(2), createTestOp(1)], // Deliberately unsorted
    actor: 'test',
    reason: 'test transaction',
    evidence_refs: [
      { type: 'file', path: 'b.txt', description: 'file b' },
      { type: 'file', path: 'a.txt', description: 'file a' },
    ] as EvidenceRef[],
    parent_root_hash: '0'.repeat(64),
    rail: 'truth',
    timestamp,
  });

  describe('Timestamp exclusion', () => {
    it('should exclude timestamp from hash', () => {
      const tx1 = createTestTx(1000);
      const tx2 = createTestTx(9999);
      expect(hashTx(tx1)).toBe(hashTx(tx2));
    });

    it('should verify timestamp exclusion', () => {
      const tx1 = createTestTx(1000);
      const tx2 = createTestTx(2000);
      expect(verifyTimestampExclusion(tx1, tx2)).toBe(true);
    });

    it('should not include timestamp in hashable view', () => {
      const tx = createTestTx(1000);
      const view = toHashableView(tx);
      expect('timestamp' in view).toBe(false);
    });
  });

  describe('Sorting', () => {
    it('should sort ops by op_id', () => {
      const tx = createTestTx(1000);
      const view = toHashableView(tx);
      const opIds = view.ops.map(o => o.op_id);
      const sorted = [...opIds].sort();
      expect(opIds).toEqual(sorted);
    });

    it('should sort evidence_refs by path', () => {
      const tx = createTestTx(1000);
      const view = toHashableView(tx);
      const paths = view.evidence_refs.map(e => e.path);
      const sorted = [...paths].sort();
      expect(paths).toEqual(sorted);
    });
  });

  describe('Determinism', () => {
    it('should be deterministic (100 iterations)', () => {
      const tx = createTestTx(Date.now());
      const firstHash = hashTx(tx);
      for (let i = 0; i < 100; i++) {
        expect(hashTx(tx)).toBe(firstHash);
      }
    });

    it('should produce same hash for equivalent transactions', () => {
      const tx1 = createTestTx(1000);
      const tx2 = createTestTx(1000);
      expect(hashTx(tx1)).toBe(hashTx(tx2));
    });
  });

  describe('inspectHashableFields', () => {
    it('should list included and excluded fields', () => {
      const tx = createTestTx(1000);
      const result = inspectHashableFields(tx);

      expect(result.included).toContain('tx_id');
      expect(result.included).toContain('ops');
      expect(result.included).toContain('actor');
      expect(result.included).not.toContain('timestamp');

      expect(result.excluded).toContain('timestamp');
    });
  });

  describe('Different content produces different hash', () => {
    it('should produce different hash for different actor', () => {
      const tx1 = createTestTx(1000);
      const tx2 = { ...tx1, actor: 'different' };
      expect(hashTx(tx1)).not.toBe(hashTx(tx2));
    });

    it('should produce different hash for different reason', () => {
      const tx1 = createTestTx(1000);
      const tx2 = { ...tx1, reason: 'different reason' };
      expect(hashTx(tx1)).not.toBe(hashTx(tx2));
    });

    it('should produce different hash for different rail', () => {
      const tx1 = createTestTx(1000);
      const tx2 = { ...tx1, rail: 'interpretation' as const };
      expect(hashTx(tx1)).not.toBe(hashTx(tx2));
    });
  });
});
