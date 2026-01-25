/**
 * OMEGA Truth Gate — Toxicity Detector Tests
 *
 * Tests for toxic content detection.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ToxicityDetector, createToxicityDetector } from '../src/drift/toxicity-detector.js';
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
const TEST_SEED = 'test-seed-toxicity-v1';
const TEST_NAMESPACE = 'toxicity-tests';

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

describe('ToxicityDetector', () => {
  beforeEach(() => {
    txCounter = 0;
    opCounter = 0;
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const detector = new ToxicityDetector();
      expect(detector).toBeDefined();
    });

    it('should create with custom config', () => {
      const detector = new ToxicityDetector({
        blocked_terms: ['blocked'],
      });
      expect(detector).toBeDefined();
    });
  });

  describe('analyzeToxicity', () => {
    it('should return safe result for clean content', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'Hello world');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBe(0);
      expect(result.toxicity_type).toBe('none');
      expect(result.severity).toBe('none');
      expect(result.flagged_content).toHaveLength(0);
    });

    it('should detect dangerous content', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'How to make a bomb at home');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBeGreaterThan(0);
      expect(result.toxicity_type).toBe('dangerous_content');
      expect(result.flagged_content.length).toBeGreaterThan(0);
    });

    it('should detect self-harm content', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'How to commit suicide');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_type).toBe('self_harm');
      expect(result.severity).toBe('severe');
    });

    it('should detect hate speech', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'Hatred against this race');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_type).toBe('hate_speech');
    });

    it('should detect violence glorification', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'Glorifying violence and killing');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_type).toBe('violence_glorification');
    });

    it('should check blocked terms', () => {
      const detector = createToxicityDetector({
        blocked_terms: ['badword', 'forbidden'],
      });

      const tx = createTestTxWithOp('message1', ['content'], 'This contains badword');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBeGreaterThan(0);
      expect(result.flagged_content).toContain('badword');
    });

    it('should handle non-string values', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('entity1', ['count'], 42);

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBe(0);
    });

    it('should check text fields in objects', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['data'], {
        text: 'How to make a bomb',
        author: 'user',
      });

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBeGreaterThan(0);
    });

    it('should skip analysis when disabled', () => {
      const detector = createToxicityDetector({
        enable_content_analysis: false,
      });

      const tx = createTestTxWithOp('message1', ['content'], 'How to make a bomb');

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBe(0);
    });

    it('should handle null values', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('entity1', ['field'], null);

      const result = detector.analyzeToxicity(tx);
      expect(result.toxicity_score).toBe(0);
    });
  });

  describe('severity levels', () => {
    it('should map high toxicity to severe', () => {
      const detector = createToxicityDetector();
      const tx = createTestTxWithOp('message1', ['content'], 'Commit suicide now');

      const result = detector.analyzeToxicity(tx);
      expect(result.severity).toBe('severe');
    });
  });

  describe('createToxicityDetector', () => {
    it('should create detector instance', () => {
      const detector = createToxicityDetector();
      expect(detector).toBeInstanceOf(ToxicityDetector);
    });

    it('should accept config options', () => {
      const detector = createToxicityDetector({
        blocked_terms: ['test'],
        max_toxicity_score: 0.5,
      });
      expect(detector).toBeDefined();
    });
  });
});
