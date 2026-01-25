/**
 * OMEGA Truth Gate — Narrative Analyzer Tests
 *
 * Tests for combined drift and toxicity analysis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { NarrativeAnalyzer, createNarrativeAnalyzer } from '../src/drift/narrative-analyzer.js';
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
const TEST_SEED = 'test-seed-analyzer-v1';
const TEST_NAMESPACE = 'analyzer-tests';

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

describe('NarrativeAnalyzer', () => {
  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const analyzer = new NarrativeAnalyzer();
      expect(analyzer).toBeDefined();
    });

    it('should create with custom config', () => {
      const analyzer = new NarrativeAnalyzer({
        max_drift_score: 0.5,
        max_toxicity_score: 0.2,
      });
      expect(analyzer).toBeDefined();
    });
  });

  describe('analyze', () => {
    it('should return passing result for clean content', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['name'], 'Alice');

      const result = analyzer.analyze(tx);
      expect(result.pass).toBe(true);
      expect(result.drift.drift_score).toBe(0);
      expect(result.toxicity.toxicity_score).toBe(0);
    });

    it('should fail for toxic content', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('message1', ['content'], 'How to make a bomb');

      const result = analyzer.analyze(tx);
      expect(result.pass).toBe(false);
      expect(result.toxicity.toxicity_score).toBeGreaterThan(0);
    });

    it('should compute overall score', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      const result = analyzer.analyze(tx);
      expect(result.overall_score).toBeDefined();
      expect(result.overall_score).toBeGreaterThanOrEqual(0);
      expect(result.overall_score).toBeLessThanOrEqual(1);
    });

    it('should provide recommendations', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('message1', ['content'], 'How to make a bomb');

      const result = analyzer.analyze(tx);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect drift with previous tx', () => {
      const analyzer = createNarrativeAnalyzer();

      const prevTx = createTestTxWithOp('character1', ['birth_date'], '1990-01-01');
      const tx = createTestTxWithOp('character1', ['birth_date'], '2000-01-01');

      const result = analyzer.analyze(tx, prevTx);
      expect(result.drift.drift_score).toBeGreaterThan(0);
    });

    it('should pass with positive recommendations when clean', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['name'], 'Alice');

      const result = analyzer.analyze(tx);
      expect(result.recommendations).toContain('Content passes all checks');
    });
  });

  describe('wouldPass', () => {
    it('should return true for clean content', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      expect(analyzer.wouldPass(tx)).toBe(true);
    });

    it('should return false for toxic content', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('message1', ['content'], 'How to make a bomb');

      expect(analyzer.wouldPass(tx)).toBe(false);
    });
  });

  describe('getDriftScore', () => {
    it('should return drift score only', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      const score = analyzer.getDriftScore(tx);
      expect(score).toBe(0);
    });
  });

  describe('getToxicityScore', () => {
    it('should return toxicity score only', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('entity1', ['field'], 'value');

      const score = analyzer.getToxicityScore(tx);
      expect(score).toBe(0);
    });

    it('should detect toxic content', () => {
      const analyzer = createNarrativeAnalyzer();
      const tx = createTestTxWithOp('message1', ['content'], 'Commit suicide');

      const score = analyzer.getToxicityScore(tx);
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('createNarrativeAnalyzer', () => {
    it('should create analyzer instance', () => {
      const analyzer = createNarrativeAnalyzer();
      expect(analyzer).toBeInstanceOf(NarrativeAnalyzer);
    });

    it('should accept config options', () => {
      const analyzer = createNarrativeAnalyzer({
        max_drift_score: 0.5,
        max_toxicity_score: 0.2,
      });
      expect(analyzer).toBeDefined();
    });
  });
});
