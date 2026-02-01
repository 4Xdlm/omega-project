/**
 * DRIFT DETECTOR TESTS
 * Phase E.1 — TDD strict: tests BEFORE implementation
 *
 * Tests the minimal detector implementation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// Import detector (will be implemented after tests)
import {
  DriftDetector,
  computeHash,
  validateHash,
  compareHashes
} from '../../src/governance/drift/detector';

import type { DriftEvent, DriftPolicy } from '../../src/drift/DRIFT_TYPES.spec';

// Load policy for tests
const POLICY: DriftPolicy = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../src/governance/drift/E_POLICY.json'), 'utf-8')
);

// Test manifest reference
const TEST_MANIFEST_REF = {
  tag: 'phase-e-spec-sealed',
  manifest_sha256: 'A'.repeat(64)
};

describe('Drift Detector', () => {
  let detector: DriftDetector;

  beforeEach(() => {
    detector = new DriftDetector(POLICY);
  });

  describe('Hash utilities', () => {
    it('computes deterministic SHA256 hash', () => {
      const content = 'test content';
      const hash1 = computeHash(content);
      const hash2 = computeHash(content);

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[A-F0-9]{64}$/);
    });

    it('produces different hashes for different content', () => {
      const hash1 = computeHash('content A');
      const hash2 = computeHash('content B');

      expect(hash1).not.toBe(hash2);
    });

    it('validates correct hash format', () => {
      expect(validateHash('A'.repeat(64))).toBe(true);
      expect(validateHash('a'.repeat(64))).toBe(true);
      expect(validateHash('AbCdEf'.repeat(10) + 'AAAA')).toBe(true);
    });

    it('rejects invalid hash format', () => {
      expect(validateHash('')).toBe(false);
      expect(validateHash('A'.repeat(63))).toBe(false);
      expect(validateHash('A'.repeat(65))).toBe(false);
      expect(validateHash('G'.repeat(64))).toBe(false);
      expect(validateHash(null)).toBe(false);
      expect(validateHash(undefined)).toBe(false);
    });

    it('compares hashes case-insensitively', () => {
      const upper = 'ABCDEF1234567890'.repeat(4);
      const lower = 'abcdef1234567890'.repeat(4);

      expect(compareHashes(upper, lower)).toBe(true);
      expect(compareHashes(upper, upper)).toBe(true);
      expect(compareHashes(lower, lower)).toBe(true);
    });
  });

  describe('Single artifact detection', () => {
    it('returns null when hash matches (no drift)', () => {
      const content = 'stable content';
      const expectedHash = computeHash(content);

      const result = detector.detectSingle(
        content,
        expectedHash,
        '/test/file.ts',
        TEST_MANIFEST_REF
      );

      expect(result).toBeNull();
    });

    it('returns HASH_DEVIATION event when hash differs', () => {
      const content = 'changed content';
      const expectedHash = 'A'.repeat(64); // Different from actual

      const result = detector.detectSingle(
        content,
        expectedHash,
        '/test/file.ts',
        TEST_MANIFEST_REF
      );

      expect(result).not.toBeNull();
      expect(result!.drift_type).toBe('HASH_DEVIATION');
      expect(result!.escalation).toBe('CRITICAL');
      expect(result!.source.file_path).toBe('/test/file.ts');
      expect(result!.source.expected_hash).toBe(expectedHash);
      expect(result!.manifest_ref).toEqual(TEST_MANIFEST_REF);
    });

    it('includes event_id and timestamp in drift event', () => {
      const result = detector.detectSingle(
        'content',
        'A'.repeat(64),
        '/test/file.ts',
        TEST_MANIFEST_REF
      );

      expect(result!.event_id).toMatch(/^drift-/);
      expect(result!.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(result!.event_type).toBe('drift_event');
      expect(result!.schema_version).toBe('1.0.0');
    });
  });

  describe('Batch detection', () => {
    it('returns empty events when no drift', () => {
      const artifacts = [
        { content: 'file1', path: '/a.ts' },
        { content: 'file2', path: '/b.ts' }
      ].map(a => ({
        ...a,
        expectedHash: computeHash(a.content)
      }));

      const result = detector.detectBatch(artifacts, TEST_MANIFEST_REF);

      expect(result.detected).toBe(false);
      expect(result.events).toHaveLength(0);
      expect(result.summary.total_checks).toBe(2);
      expect(result.summary.drifts_found).toBe(0);
      expect(result.summary.max_escalation).toBeNull();
    });

    it('detects multiple drifts', () => {
      const artifacts = [
        { content: 'file1', path: '/a.ts', expectedHash: 'A'.repeat(64) },
        { content: 'file2', path: '/b.ts', expectedHash: 'B'.repeat(64) }
      ];

      const result = detector.detectBatch(artifacts, TEST_MANIFEST_REF);

      expect(result.detected).toBe(true);
      expect(result.events).toHaveLength(2);
      expect(result.summary.drifts_found).toBe(2);
      expect(result.summary.max_escalation).toBe('CRITICAL');
    });

    it('calculates max escalation level correctly', () => {
      const artifacts = [
        { content: 'file1', path: '/a.ts', expectedHash: 'A'.repeat(64) }
      ];

      const result = detector.detectBatch(artifacts, TEST_MANIFEST_REF);

      expect(result.summary.max_escalation).toBe('CRITICAL');
    });
  });

  describe('Chain validation', () => {
    it('validates empty chain', () => {
      const result = detector.validateChain([]);
      expect(result).toBeNull();
    });

    it('validates single event with null prev_hash', () => {
      const event: DriftEvent = {
        event_type: 'drift_event',
        schema_version: '1.0.0',
        event_id: 'drift-001',
        timestamp: '2026-02-01T10:00:00Z',
        drift_type: 'HASH_DEVIATION',
        escalation: 'CRITICAL',
        source: { file_path: '/test.ts' },
        manifest_ref: TEST_MANIFEST_REF,
        details: 'Test',
        log_chain_prev_hash: null
      };

      const result = detector.validateChain([event]);
      expect(result).toBeNull();
    });

    it('detects chain break (INV-DRIFT-004)', () => {
      const event1: DriftEvent = {
        event_type: 'drift_event',
        schema_version: '1.0.0',
        event_id: 'drift-001',
        timestamp: '2026-02-01T10:00:00Z',
        drift_type: 'HASH_DEVIATION',
        escalation: 'CRITICAL',
        source: { file_path: '/test.ts' },
        manifest_ref: TEST_MANIFEST_REF,
        details: 'Test',
        log_chain_prev_hash: null
      };

      const event2: DriftEvent = {
        event_type: 'drift_event',
        schema_version: '1.0.0',
        event_id: 'drift-002',
        timestamp: '2026-02-01T10:05:00Z',
        drift_type: 'HASH_DEVIATION',
        escalation: 'CRITICAL',
        source: { file_path: '/test2.ts' },
        manifest_ref: TEST_MANIFEST_REF,
        details: 'Test',
        log_chain_prev_hash: 'WRONG_HASH_' + 'A'.repeat(53) // Invalid chain
      };

      const result = detector.validateChain([event1, event2]);

      expect(result).not.toBeNull();
      expect(result!.drift_type).toBe('CHAIN_BREAK');
      expect(result!.escalation).toBe('HALT'); // INV-DRIFT-004
    });

    it('validates correct chain', () => {
      const event1: DriftEvent = {
        event_type: 'drift_event',
        schema_version: '1.0.0',
        event_id: 'drift-001',
        timestamp: '2026-02-01T10:00:00Z',
        drift_type: 'HASH_DEVIATION',
        escalation: 'CRITICAL',
        source: { file_path: '/test.ts' },
        manifest_ref: TEST_MANIFEST_REF,
        details: 'Test',
        log_chain_prev_hash: null
      };

      // Compute correct hash for event1
      const event1Copy = { ...event1 };
      delete (event1Copy as Record<string, unknown>).log_chain_prev_hash;
      const event1Hash = computeHash(JSON.stringify(event1Copy, Object.keys(event1Copy).sort()));

      const event2: DriftEvent = {
        event_type: 'drift_event',
        schema_version: '1.0.0',
        event_id: 'drift-002',
        timestamp: '2026-02-01T10:05:00Z',
        drift_type: 'HASH_DEVIATION',
        escalation: 'CRITICAL',
        source: { file_path: '/test2.ts' },
        manifest_ref: TEST_MANIFEST_REF,
        details: 'Test',
        log_chain_prev_hash: event1Hash
      };

      const result = detector.validateChain([event1, event2]);
      expect(result).toBeNull();
    });
  });

  describe('Policy integration', () => {
    it('uses policy thresholds (INV-DRIFT-002)', () => {
      expect(detector.getPolicy().thresholds.τ_drift_warning).toBe(0.05);
      expect(detector.getPolicy().thresholds.τ_drift_critical).toBe(0.15);
      expect(detector.getPolicy().thresholds.τ_drift_halt).toBe(0.30);
    });

    it('uses escalation matrix from spec', () => {
      // HASH_DEVIATION should be CRITICAL
      const result = detector.detectSingle(
        'content',
        'A'.repeat(64),
        '/test.ts',
        TEST_MANIFEST_REF
      );

      expect(result!.escalation).toBe('CRITICAL');
    });
  });

  describe('Read-only guarantee (INV-DRIFT-001)', () => {
    it('detector has no write methods', () => {
      // Verify detector interface has no mutation methods
      const detectorMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(detector));
      const writeMethods = ['write', 'save', 'modify', 'update', 'delete', 'remove', 'mutate'];

      for (const method of detectorMethods) {
        for (const writeWord of writeMethods) {
          expect(method.toLowerCase()).not.toContain(writeWord);
        }
      }
    });
  });
});
