/**
 * Serialization Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Manifest, Snapshot } from '../src/types.js';
import {
  serializeManifest,
  deserializeManifest,
  serializeSnapshot,
  deserializeSnapshot,
  saveManifest,
  loadManifest,
  saveSnapshot,
  loadSnapshot,
} from '../src/serialize.js';
import { ProofDeserializeError } from '../src/errors.js';

describe('Serialization', () => {
  const testDir = join(tmpdir(), 'proof-utils-serialize-' + Date.now());
  const manifestFile = join(testDir, 'manifest.json');
  const snapshotFile = join(testDir, 'snapshot.json');

  beforeAll(() => {
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    try {
      if (existsSync(manifestFile)) unlinkSync(manifestFile);
      if (existsSync(snapshotFile)) unlinkSync(snapshotFile);
    } catch {
      // Ignore cleanup errors
    }
  });

  const sampleManifest: Manifest = Object.freeze({
    version: '1.0.0',
    timestamp: 1234567890,
    entries: Object.freeze([
      Object.freeze({ path: '/file1.txt', size: 100, sha256: 'abc123' }),
      Object.freeze({ path: '/file2.txt', size: 200, sha256: 'def456' }),
    ]),
  });

  const sampleSnapshot: Snapshot = Object.freeze({
    id: 'snap-1',
    name: 'test-snapshot',
    timestamp: 1234567890,
    metadata: Object.freeze({ phase: 'testing' }),
    entries: Object.freeze([
      Object.freeze({
        path: '/file.txt',
        sha256: 'abc123',
        size: 11,
        content: 'dGVzdCBjb250ZW50', // "test content" in base64
      }),
    ]),
  });

  describe('Manifest serialization', () => {
    it('serializeManifest produces valid JSON', () => {
      const json = serializeManifest(sampleManifest);
      const parsed = JSON.parse(json);

      expect(parsed.version).toBe('1.0.0');
      expect(parsed.timestamp).toBe(1234567890);
      expect(parsed.entries.length).toBe(2);
    });

    it('deserializeManifest restores manifest', () => {
      const json = serializeManifest(sampleManifest);
      const restored = deserializeManifest(json);

      expect(restored.version).toBe(sampleManifest.version);
      expect(restored.timestamp).toBe(sampleManifest.timestamp);
      expect(restored.entries.length).toBe(2);
    });

    it('round-trip preserves data', () => {
      const json = serializeManifest(sampleManifest);
      const restored = deserializeManifest(json);

      expect(restored.entries[0]?.path).toBe('/file1.txt');
      expect(restored.entries[0]?.sha256).toBe('abc123');
    });

    it('deserializeManifest throws on invalid JSON', () => {
      expect(() => deserializeManifest('not json')).toThrow(ProofDeserializeError);
    });

    it('deserializeManifest throws on missing version', () => {
      expect(() => deserializeManifest('{"timestamp":1,"entries":[]}')).toThrow(
        ProofDeserializeError
      );
    });

    it('deserializeManifest throws on invalid entries', () => {
      expect(() =>
        deserializeManifest('{"version":"1","timestamp":1,"entries":[{}]}')
      ).toThrow(ProofDeserializeError);
    });

    it('freezes deserialized manifest', () => {
      const json = serializeManifest(sampleManifest);
      const restored = deserializeManifest(json);

      expect(() => {
        (restored as { version: string }).version = 'modified';
      }).toThrow();
    });
  });

  describe('Snapshot serialization', () => {
    it('serializeSnapshot produces valid JSON', () => {
      const json = serializeSnapshot(sampleSnapshot);
      const parsed = JSON.parse(json);

      expect(parsed.id).toBe('snap-1');
      expect(parsed.name).toBe('test-snapshot');
      expect(parsed.entries.length).toBe(1);
    });

    it('deserializeSnapshot restores snapshot', () => {
      const json = serializeSnapshot(sampleSnapshot);
      const restored = deserializeSnapshot(json);

      expect(restored.id).toBe('snap-1');
      expect(restored.name).toBe('test-snapshot');
      expect(restored.metadata).toEqual({ phase: 'testing' });
    });

    it('round-trip preserves content', () => {
      const json = serializeSnapshot(sampleSnapshot);
      const restored = deserializeSnapshot(json);

      expect(restored.entries[0]?.content).toBe('dGVzdCBjb250ZW50');
    });

    it('deserializeSnapshot throws on missing id', () => {
      expect(() =>
        deserializeSnapshot('{"name":"x","timestamp":1,"entries":[]}')
      ).toThrow(ProofDeserializeError);
    });
  });

  describe('File operations', () => {
    it('saveManifest and loadManifest work', () => {
      saveManifest(sampleManifest, manifestFile);
      const loaded = loadManifest(manifestFile);

      expect(loaded.version).toBe(sampleManifest.version);
      expect(loaded.entries.length).toBe(2);
    });

    it('saveSnapshot and loadSnapshot work', () => {
      saveSnapshot(sampleSnapshot, snapshotFile);
      const loaded = loadSnapshot(snapshotFile);

      expect(loaded.id).toBe('snap-1');
      expect(loaded.name).toBe('test-snapshot');
    });

    it('loadManifest throws on non-existent file', () => {
      expect(() => loadManifest('/nonexistent/manifest.json')).toThrow(
        ProofDeserializeError
      );
    });

    it('loadSnapshot throws on non-existent file', () => {
      expect(() => loadSnapshot('/nonexistent/snapshot.json')).toThrow(
        ProofDeserializeError
      );
    });
  });
});
