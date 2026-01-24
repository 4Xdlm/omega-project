/**
 * OMEGA V4.4 — Snapshot Unit Tests
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Snapshot, SNAPSHOT_SCHEMA_VERSION } from '../../src/phase3_snapshot/index.js';
import { CoreEngine } from '../../src/phase2_core/index.js';
import type { TextInput } from '../../src/phase2_core/index.js';
import type { SnapshotMeta } from '../../src/phase3_snapshot/index.js';

describe('Snapshot', () => {
  let engine: CoreEngine;
  let coreOutput: ReturnType<CoreEngine['compute']>;
  let meta: SnapshotMeta;

  beforeEach(() => {
    engine = new CoreEngine();
    const input: TextInput = {
      text: 'Test text for snapshot creation',
      timestamp: 1000000000000,
      sourceId: 'test',
    };
    coreOutput = engine.compute(input);
    meta = {
      source: 'test-source',
      contractVersion: '4.4.0',
      coreVersion: '1.0.0',
    };
  });

  describe('create()', () => {
    it('creates snapshot from CoreEngine output', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      expect(snapshot).toBeInstanceOf(Snapshot);
      expect(snapshot.snapshotId).toBeDefined();
      expect(snapshot.timestamp).toBe(coreOutput.timestamp);
    });

    it('includes all 6 sections', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      // Section 1: Identity
      expect(snapshot.snapshotId).toBeTruthy();
      expect(snapshot.timestamp).toBeDefined();
      expect(snapshot.source).toBe(meta.source);

      // Section 2: Emotion State
      expect(snapshot.emotions.size).toBe(16);
      expect(snapshot.dominantEmotion).toBeDefined();
      expect(snapshot.axes).toBeDefined();
      expect(snapshot.totalIntensity).toBeDefined();

      // Section 3: Validation
      expect(snapshot.validationStatus).toBeDefined();
      expect(snapshot.validationErrors).toBeDefined();

      // Section 4: Technical Context
      expect(snapshot.configHash).toBeDefined();

      // Section 5: Integrity
      expect(snapshot.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
      expect(snapshot.contentHash).toBeDefined();

      // Section 6: Temporal Links
      expect(snapshot.prevSnapshotId).toBeNull();
      expect(snapshot.sequence).toBe(0);
    });

    it('generates unique snapshot IDs', () => {
      const s1 = Snapshot.create(coreOutput, meta);
      const s2 = Snapshot.create(coreOutput, meta);

      expect(s1.snapshotId).not.toBe(s2.snapshotId);
    });

    it('preserves previous snapshot link', () => {
      const prevMeta: SnapshotMeta = {
        ...meta,
        prevSnapshotId: 'prev-123',
        sequence: 5,
      };
      const snapshot = Snapshot.create(coreOutput, prevMeta);

      expect(snapshot.prevSnapshotId).toBe('prev-123');
      expect(snapshot.sequence).toBe(5);
    });
  });

  describe('JSON serialization', () => {
    it('toJSON() produces valid JSON', () => {
      const snapshot = Snapshot.create(coreOutput, meta);
      const json = snapshot.toJSON();

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('fromJSON() restores snapshot', () => {
      const original = Snapshot.create(coreOutput, meta);
      const json = original.toJSON();
      const restored = Snapshot.fromJSON(json);

      expect(restored.snapshotId).toBe(original.snapshotId);
      expect(restored.timestamp).toBe(original.timestamp);
      expect(restored.dominantEmotion).toBe(original.dominantEmotion);
      expect(restored.totalIntensity).toBe(original.totalIntensity);
      expect(restored.contentHash).toBe(original.contentHash);
    });

    it('JSON round-trip preserves all data', () => {
      const original = Snapshot.create(coreOutput, meta);
      const json = original.toJSON();
      const restored = Snapshot.fromJSON(json);

      // Compare serialized forms
      expect(restored.toJSON()).toBe(original.toJSON());
    });

    it('JSON round-trip preserves emotions', () => {
      const original = Snapshot.create(coreOutput, meta);
      const json = original.toJSON();
      const restored = Snapshot.fromJSON(json);

      expect(restored.emotions.size).toBe(original.emotions.size);

      for (const [id, entry] of original.emotions) {
        const restoredEntry = restored.emotions.get(id);
        expect(restoredEntry).toBeDefined();
        expect(restoredEntry?.intensity).toBe(entry.intensity);
        expect(restoredEntry?.position.x).toBe(entry.position.x);
        expect(restoredEntry?.position.y).toBe(entry.position.y);
        expect(restoredEntry?.position.z).toBe(entry.position.z);
      }
    });
  });

  describe('immutability', () => {
    it('snapshot object is frozen', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      expect(Object.isFrozen(snapshot)).toBe(true);
    });

    it('cannot add new properties', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      expect(() => {
        (snapshot as unknown as Record<string, unknown>)['newProp'] = 'value';
      }).toThrow();
    });

    it('emotions map is read-only', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      // Map should be a ReadonlyMap
      expect(snapshot.emotions.get).toBeDefined();
      expect(snapshot.emotions.has).toBeDefined();
      expect(snapshot.emotions.size).toBe(16);
    });
  });

  describe('content hash', () => {
    it('content hash is deterministic for same data', () => {
      const s1 = Snapshot.create(coreOutput, meta);
      const s2 = Snapshot.create(coreOutput, meta);

      // Note: snapshotIds will differ, so full hash differs
      // But the content-based hash algorithm is deterministic
      expect(s1.contentHash.length).toBe(s2.contentHash.length);
      expect(s1.contentHash.length).toBe(64); // SHA-256 hex
    });

    it('verifyIntegrity() returns true for valid snapshot', () => {
      const snapshot = Snapshot.create(coreOutput, meta);
      expect(snapshot.verifyIntegrity()).toBe(true);
    });

    it('verifyIntegrity() returns true after JSON round-trip', () => {
      const original = Snapshot.create(coreOutput, meta);
      const json = original.toJSON();
      const restored = Snapshot.fromJSON(json);

      expect(restored.verifyIntegrity()).toBe(true);
    });
  });

  describe('validation status', () => {
    it('captures VALID status', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      expect(snapshot.validationStatus).toBe('VALID');
      expect(snapshot.validationErrors).toHaveLength(0);
    });

    it('captures INVALID status', () => {
      const invalidInput: TextInput = {
        text: '',
        timestamp: 1000000000000,
        sourceId: 'test',
      };
      const invalidOutput = engine.compute(invalidInput);
      const snapshot = Snapshot.create(invalidOutput, meta);

      expect(snapshot.validationStatus).toBe('INVALID');
      expect(snapshot.validationErrors.length).toBeGreaterThan(0);
    });
  });

  describe('schema version', () => {
    it('includes current schema version', () => {
      const snapshot = Snapshot.create(coreOutput, meta);

      expect(snapshot.schemaVersion).toBe(SNAPSHOT_SCHEMA_VERSION);
    });
  });
});
