/**
 * OMEGA Truth Gate — Drift Detector Tests
 *
 * Tests for narrative drift detection.
 */

import { describe, it, expect } from 'vitest';
import { NarrativeDriftDetector, createDriftDetector, DEFAULT_DRIFT_CONFIG } from '../src/drift/drift-detector.js';
import {
  createCanonTx,
  createCanonOp,
  GENESIS_HASH,
  createDeterministicId,
  type TxId,
  type OpId,
  type EntityId,
  type CanonTx,
} from '@omega/canon-kernel';

// Test helpers
const TEST_SEED = 'test-seed-drift-v1';
const TEST_NAMESPACE = 'drift-tests';

let txCounter = 0;
let opCounter = 0;

function createTestTxId(): TxId {
  return createDeterministicId('tx', TEST_SEED, TEST_NAMESPACE, { name: `tx-${++txCounter}` });
}

function createTestOpId(): OpId {
  return createDeterministicId('op', TEST_SEED, TEST_NAMESPACE, { name: `op-${++opCounter}` });
}

function createTestEntityId(name: string): EntityId {
  return createDeterministicId('ent', TEST_SEED, TEST_NAMESPACE, { name });
}

function createTestTxWithOp(entityName: string, fieldPath: string[], value: unknown): CanonTx {
  const op = createCanonOp(createTestOpId(), 'SET', createTestEntityId(entityName), {
    field_path: fieldPath,
    value,
  });
  return createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');
}

// Helper for creating tx with raw entity ID (for character consistency tests)
function createTestTxWithRawEntityId(rawEntityId: string, fieldPath: string[], value: unknown): CanonTx {
  const op = createCanonOp(createTestOpId(), 'SET', rawEntityId as EntityId, {
    field_path: fieldPath,
    value,
  });
  return createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, 'truth');
}

describe('NarrativeDriftDetector', () => {
  describe('constructor', () => {
    it('should create with default config', () => {
      const detector = new NarrativeDriftDetector();
      expect(detector).toBeDefined();
    });

    it('should create with custom config', () => {
      const detector = new NarrativeDriftDetector({
        max_drift_score: 0.5,
      });
      expect(detector).toBeDefined();
    });
  });

  describe('analyzeDrift', () => {
    it('should return no drift for first transaction', () => {
      const detector = createDriftDetector();
      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      const result = detector.analyzeDrift(tx);
      expect(result.drift_score).toBe(0);
      expect(result.drift_type).toBe('none');
      expect(result.severity).toBe('none');
    });

    it('should detect no drift for non-conflicting transactions', () => {
      const detector = createDriftDetector();

      const prevTx = createTestTxWithOp('entity1', ['name'], 'Alice');
      const tx = createTestTxWithOp('entity2', ['name'], 'Bob');

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.drift_score).toBe(0);
    });

    it('should detect factual contradiction', () => {
      const detector = createDriftDetector();

      const prevTx = createTestTxWithOp('character1', ['birth_date'], '1990-01-01');
      const tx = createTestTxWithOp('character1', ['birth_date'], '2000-01-01');

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.drift_score).toBeGreaterThan(0);
      expect(result.drift_type).toBe('factual_contradiction');
    });

    it('should detect timeline violation for reversed timestamps', () => {
      const detector = createDriftDetector();
      const now = Date.now();

      const prevOp = createCanonOp(createTestOpId(), 'SET', createTestEntityId('entity1'), {
        field_path: ['field'],
        value: 'value',
      });
      const prevTx = createCanonTx(createTestTxId(), [prevOp], 'test-actor', 'Test', GENESIS_HASH, 'truth', {
        timestamp: now,
      });

      const op = createCanonOp(createTestOpId(), 'SET', createTestEntityId('entity2'), {
        field_path: ['field'],
        value: 'value',
      });
      const tx = createCanonTx(createTestTxId(), [op], 'test-actor', 'Test', GENESIS_HASH, 'truth', {
        timestamp: now - 1000, // Earlier than previous
      });

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.drift_type).toBe('timeline_violation');
    });

    it('should detect character inconsistency', () => {
      const detector = createDriftDetector();

      const prevTx = createTestTxWithRawEntityId('character:alice', ['personality'], 'introvert');
      const tx = createTestTxWithRawEntityId('character:alice', ['personality'], 'extrovert');

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.drift_type).toBe('character_inconsistency');
    });

    it('should detect state flip as contradiction', () => {
      const detector = createDriftDetector();

      const prevTx = createTestTxWithOp('character1', ['alive'], true);
      const tx = createTestTxWithOp('character1', ['alive'], false);

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.drift_score).toBeGreaterThan(0);
    });

    it('should include source and target hashes', () => {
      const detector = createDriftDetector();

      const prevTx = createTestTxWithOp('entity1', ['field'], 'value1');
      const tx = createTestTxWithOp('entity2', ['field'], 'value2');

      const result = detector.analyzeDrift(tx, prevTx);
      expect(result.source_hash).toBeDefined();
      expect(result.target_hash).toBeDefined();
    });
  });

  describe('severity levels', () => {
    it('should map scores to correct severity', () => {
      const detector = createDriftDetector();

      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      const result = detector.analyzeDrift(tx);
      // Score 0 should be 'none'
      expect(result.severity).toBe('none');
    });
  });

  describe('createDriftDetector', () => {
    it('should create detector instance', () => {
      const detector = createDriftDetector();
      expect(detector).toBeInstanceOf(NarrativeDriftDetector);
    });

    it('should accept config options', () => {
      const detector = createDriftDetector({ max_drift_score: 0.8 });
      expect(detector).toBeDefined();
    });
  });

  describe('DEFAULT_DRIFT_CONFIG', () => {
    it('should have expected defaults', () => {
      expect(DEFAULT_DRIFT_CONFIG.max_drift_score).toBe(0.3);
      expect(DEFAULT_DRIFT_CONFIG.max_toxicity_score).toBe(0.1);
      expect(DEFAULT_DRIFT_CONFIG.enable_content_analysis).toBe(true);
      expect(DEFAULT_DRIFT_CONFIG.blocked_terms).toEqual([]);
    });
  });
});
