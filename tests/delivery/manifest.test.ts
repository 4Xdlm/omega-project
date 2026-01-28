/**
 * OMEGA Delivery Manifest Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 bundle manifest creation and validation.
 */

import { describe, it, expect } from 'vitest';
import {
  createManifestEntry,
  createManifest,
  verifyManifest,
  verifyArtifactsAgainstManifest,
  createBundle,
  verifyBundle,
  serializeManifest,
  parseManifest,
  getManifestEntry,
  getEntriesByFormat,
  getEntriesByProfile,
} from '../../src/delivery/manifest';
import type { ManifestEntry, ManifestOptions } from '../../src/delivery/manifest';
import type {
  DeliveryArtifact,
  DeliveryManifest,
  Sha256,
  ISO8601,
  DeliveryFormat,
} from '../../src/delivery/types';
import { hashString, computeMerkleRoot, hashObject } from '../../src/delivery/hasher';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

// Helper to create test artifact
function createTestArtifact(
  filename: string,
  body: string,
  format: DeliveryFormat = 'TEXT',
  profileId: string = 'PROF-test'
): DeliveryArtifact {
  const content = body;
  const hash = hashString(content);
  const bodyHash = hashString(body);

  return Object.freeze({
    filename,
    format,
    content,
    hash,
    bodyHash,
    byteLength: Buffer.byteLength(content, 'utf-8'),
    timestamp: FIXED_TIMESTAMP,
    profileId,
  });
}

describe('Manifest — Phase H', () => {
  describe('createManifestEntry', () => {
    it('creates entry from artifact', () => {
      const artifact = createTestArtifact('test.txt', 'body content');

      const entry = createManifestEntry(artifact);

      expect(entry.filename).toBe('test.txt');
      expect(entry.format).toBe('TEXT');
      expect(entry.hash).toBe(artifact.hash);
      expect(entry.bodyHash).toBe(artifact.bodyHash);
      expect(entry.byteLength).toBe(artifact.byteLength);
      expect(entry.profileId).toBe('PROF-test');
    });

    it('returns frozen entry', () => {
      const artifact = createTestArtifact('test.txt', 'body');
      const entry = createManifestEntry(artifact);
      expect(Object.isFrozen(entry)).toBe(true);
    });
  });

  describe('createManifest', () => {
    it('creates manifest from artifacts', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.version).toBe('1.0');
      expect(manifest.created).toBe(FIXED_TIMESTAMP);
      expect(manifest.entries).toHaveLength(2);
    });

    it('computes correct artifact count', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
        createTestArtifact('c.txt', 'c'),
      ];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.artifactCount).toBe(3);
    });

    it('computes correct total bytes', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'aaa'), // 3 bytes
        createTestArtifact('b.txt', 'bb'),  // 2 bytes
      ];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.totalBytes).toBe(5);
    });

    it('computes artifacts root hash', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);
      const expected = computeMerkleRoot(artifacts.map(a => a.hash));

      expect(manifest.artifactsRoot).toBe(expected);
    });

    it('includes profilesHash if provided', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const profilesHash = hashString('profiles');

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP, { profilesHash });

      expect(manifest.profilesHash).toBe(profilesHash);
    });

    it('includes name if provided', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP, {
        name: 'custom-delivery',
      });

      expect(manifest.name).toBe('custom-delivery');
    });

    it('defaults name to delivery', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.name).toBe('delivery');
    });

    it('returns frozen manifest', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];

      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(Object.isFrozen(manifest)).toBe(true);
      expect(Object.isFrozen(manifest.entries)).toBe(true);
    });

    it('handles empty artifacts array', () => {
      const manifest = createManifest([], FIXED_TIMESTAMP);

      expect(manifest.entries).toHaveLength(0);
      expect(manifest.artifactCount).toBe(0);
      expect(manifest.totalBytes).toBe(0);
    });
  });

  describe('verifyManifest (H-INV-10)', () => {
    it('validates correct manifest', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const result = verifyManifest(manifest);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects artifact count mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered: DeliveryManifest = {
        ...manifest,
        artifactCount: 5,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('count mismatch'))).toBe(true);
    });

    it('detects total bytes mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'aaa')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered: DeliveryManifest = {
        ...manifest,
        totalBytes: 9999,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bytes mismatch'))).toBe(true);
    });

    it('detects artifacts root mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered: DeliveryManifest = {
        ...manifest,
        artifactsRoot: 'a'.repeat(64) as Sha256,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('root hash mismatch'))).toBe(true);
    });

    it('detects root hash tampering (H-INV-10)', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered: DeliveryManifest = {
        ...manifest,
        rootHash: 'b'.repeat(64) as Sha256,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('H-INV-10'))).toBe(true);
    });

    it('returns frozen result', () => {
      const manifest = createManifest([], FIXED_TIMESTAMP);
      const result = verifyManifest(manifest);
      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('verifyArtifactsAgainstManifest', () => {
    it('validates matching artifacts', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const result = verifyArtifactsAgainstManifest(manifest, artifacts);

      expect(result.valid).toBe(true);
      expect(result.matchedArtifacts).toBe(2);
    });

    it('detects missing artifact', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const result = verifyArtifactsAgainstManifest(manifest, [artifacts[0]]);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Missing artifact'))).toBe(true);
    });

    it('detects extra artifact', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const extra = createTestArtifact('extra.txt', 'extra');
      const result = verifyArtifactsAgainstManifest(manifest, [...artifacts, extra]);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Unexpected artifact'))).toBe(true);
    });

    it('detects hash mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'original')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const modified = createTestArtifact('a.txt', 'modified');
      const result = verifyArtifactsAgainstManifest(manifest, [modified]);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Hash mismatch'))).toBe(true);
    });

    it('detects byte length mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'original')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const modified = {
        ...artifacts[0],
        byteLength: 9999,
      };
      const result = verifyArtifactsAgainstManifest(manifest, [modified]);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Byte length mismatch'))).toBe(true);
    });
  });

  describe('createBundle', () => {
    it('creates bundle from manifest and artifacts', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const bundle = createBundle(manifest, artifacts);

      expect(bundle.manifest).toBe(manifest);
      expect(bundle.artifacts).toHaveLength(1);
    });

    it('returns frozen bundle', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const bundle = createBundle(manifest, artifacts);

      expect(Object.isFrozen(bundle)).toBe(true);
      expect(Object.isFrozen(bundle.artifacts)).toBe(true);
    });
  });

  describe('verifyBundle', () => {
    it('validates correct bundle', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);
      const bundle = createBundle(manifest, artifacts);

      const result = verifyBundle(bundle);

      expect(result.valid).toBe(true);
    });

    it('detects manifest tampering', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered: DeliveryManifest = {
        ...manifest,
        rootHash: 'c'.repeat(64) as Sha256,
      };
      const bundle = createBundle(tampered, artifacts);

      const result = verifyBundle(bundle);

      expect(result.valid).toBe(false);
    });

    it('detects artifact mismatch', () => {
      const artifacts = [createTestArtifact('a.txt', 'original')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const modified = [createTestArtifact('a.txt', 'modified')];
      const bundle = createBundle(manifest, modified);

      const result = verifyBundle(bundle);

      expect(result.valid).toBe(false);
    });
  });

  describe('serializeManifest', () => {
    it('produces valid JSON', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const json = serializeManifest(manifest);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('uses 2-space indentation', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const json = serializeManifest(manifest);

      expect(json).toContain('  "version"');
    });

    it('preserves all fields', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP, {
        name: 'test-delivery',
        description: 'Test description',
      });

      const json = serializeManifest(manifest);
      const parsed = JSON.parse(json);

      expect(parsed.name).toBe('test-delivery');
      expect(parsed.description).toBe('Test description');
    });
  });

  describe('parseManifest', () => {
    it('parses valid manifest', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);
      const json = serializeManifest(manifest);

      const parsed = parseManifest(json);

      expect(parsed).not.toBeNull();
      expect(parsed!.version).toBe('1.0');
      expect(parsed!.entries).toHaveLength(1);
    });

    it('returns null for invalid JSON', () => {
      expect(parseManifest('not json')).toBeNull();
    });

    it('returns null for wrong version', () => {
      const json = JSON.stringify({ version: '2.0' });
      expect(parseManifest(json)).toBeNull();
    });

    it('returns null for missing created', () => {
      const json = JSON.stringify({ version: '1.0', entries: [] });
      expect(parseManifest(json)).toBeNull();
    });

    it('returns null for invalid entry hash', () => {
      const json = JSON.stringify({
        version: '1.0',
        created: FIXED_TIMESTAMP,
        entries: [{ filename: 'a.txt', format: 'TEXT', hash: 'invalid' }],
        rootHash: 'a'.repeat(64),
      });
      expect(parseManifest(json)).toBeNull();
    });

    it('round-trips correctly', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a', 'TEXT'),
        createTestArtifact('b.md', 'b', 'MARKDOWN'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP, {
        name: 'roundtrip-test',
      });

      const json = serializeManifest(manifest);
      const parsed = parseManifest(json);

      expect(parsed).not.toBeNull();
      expect(parsed!.rootHash).toBe(manifest.rootHash);
      expect(parsed!.entries.length).toBe(manifest.entries.length);
    });

    it('returns frozen result', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);
      const json = serializeManifest(manifest);

      const parsed = parseManifest(json);

      expect(Object.isFrozen(parsed)).toBe(true);
    });
  });

  describe('getManifestEntry', () => {
    it('finds entry by filename', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entry = getManifestEntry(manifest, 'b.txt');

      expect(entry).toBeDefined();
      expect(entry!.filename).toBe('b.txt');
    });

    it('returns undefined for unknown filename', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entry = getManifestEntry(manifest, 'unknown.txt');

      expect(entry).toBeUndefined();
    });
  });

  describe('getEntriesByFormat', () => {
    it('filters entries by format', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a', 'TEXT'),
        createTestArtifact('b.md', 'b', 'MARKDOWN'),
        createTestArtifact('c.txt', 'c', 'TEXT'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const textEntries = getEntriesByFormat(manifest, 'TEXT');

      expect(textEntries).toHaveLength(2);
    });

    it('returns empty array for no matches', () => {
      const artifacts = [createTestArtifact('a.txt', 'a', 'TEXT')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entries = getEntriesByFormat(manifest, 'JSON_PACK');

      expect(entries).toHaveLength(0);
    });

    it('returns frozen array', () => {
      const artifacts = [createTestArtifact('a.txt', 'a', 'TEXT')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entries = getEntriesByFormat(manifest, 'TEXT');

      expect(Object.isFrozen(entries)).toBe(true);
    });
  });

  describe('getEntriesByProfile', () => {
    it('filters entries by profile', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a', 'TEXT', 'PROF-a'),
        createTestArtifact('b.txt', 'b', 'TEXT', 'PROF-b'),
        createTestArtifact('c.txt', 'c', 'TEXT', 'PROF-a'),
      ];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entries = getEntriesByProfile(manifest, 'PROF-a');

      expect(entries).toHaveLength(2);
    });

    it('returns empty array for no matches', () => {
      const artifacts = [createTestArtifact('a.txt', 'a', 'TEXT', 'PROF-a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const entries = getEntriesByProfile(manifest, 'PROF-unknown');

      expect(entries).toHaveLength(0);
    });
  });

  describe('Determinism (H-INV-05)', () => {
    it('produces identical manifest for identical input', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];

      const manifest1 = createManifest(artifacts, FIXED_TIMESTAMP);
      const manifest2 = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest1.rootHash).toBe(manifest2.rootHash);
    });

    it('serialization is deterministic', () => {
      const artifacts = [createTestArtifact('a.txt', 'a')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const json1 = serializeManifest(manifest);
      const json2 = serializeManifest(manifest);

      expect(json1).toBe(json2);
    });
  });

  describe('Edge cases', () => {
    it('handles artifact with special characters in filename', () => {
      const artifacts = [createTestArtifact('file with spaces.txt', 'content')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.entries[0].filename).toBe('file with spaces.txt');
    });

    it('handles very large artifact count', () => {
      const artifacts = Array.from({ length: 100 }, (_, i) =>
        createTestArtifact(`file${i}.txt`, `content${i}`)
      );
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      expect(manifest.artifactCount).toBe(100);
      expect(manifest.entries).toHaveLength(100);
    });

    it('handles UTF-8 content in artifacts', () => {
      const artifacts = [createTestArtifact('unicode.txt', 'émoji 🎉')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      // UTF-8: é=2, m=1, o=1, j=1, i=1, space=1, 🎉=4 = 11 bytes
      expect(manifest.totalBytes).toBe(11);
    });
  });
});
