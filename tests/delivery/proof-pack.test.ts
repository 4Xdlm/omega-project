/**
 * OMEGA Delivery Proof Pack Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H2 ZIP-based proof pack builder.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidPath,
  normalizePath,
  createEntries,
  buildProofPack,
  verifyProofPack,
  toZipEntries,
  getPackSize,
  listPackPaths,
  getPackEntry,
} from '../../src/delivery/proof-pack';
import type { ProofPack, ProofPackEntry } from '../../src/delivery/proof-pack';
import type {
  DeliveryArtifact,
  Sha256,
  ISO8601,
  DeliveryFormat,
} from '../../src/delivery/types';
import { hashString } from '../../src/delivery/hasher';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

// Helper to create test artifact
function createTestArtifact(
  filename: string,
  body: string,
  format: DeliveryFormat = 'TEXT'
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
    profileId: 'PROF-test',
  });
}

describe('Proof Pack — Phase H', () => {
  describe('isValidPath (H-INV-08)', () => {
    it('accepts simple filename', () => {
      expect(isValidPath('file.txt')).toBe(true);
    });

    it('accepts nested path', () => {
      expect(isValidPath('dir/subdir/file.txt')).toBe(true);
    });

    it('rejects empty path', () => {
      expect(isValidPath('')).toBe(false);
    });

    it('rejects absolute path (Unix)', () => {
      expect(isValidPath('/etc/passwd')).toBe(false);
    });

    it('rejects absolute path (Windows)', () => {
      expect(isValidPath('\\Windows\\System32')).toBe(false);
    });

    it('rejects drive letter path', () => {
      expect(isValidPath('C:\\Windows')).toBe(false);
      expect(isValidPath('D:/data')).toBe(false);
    });

    it('rejects parent traversal', () => {
      expect(isValidPath('../parent/file.txt')).toBe(false);
      expect(isValidPath('dir/../file.txt')).toBe(false);
      expect(isValidPath('dir/subdir/../../file.txt')).toBe(false);
    });

    it('rejects current directory reference', () => {
      expect(isValidPath('./file.txt')).toBe(false);
      expect(isValidPath('dir/./file.txt')).toBe(false);
    });

    it('rejects null bytes', () => {
      expect(isValidPath('file\0.txt')).toBe(false);
    });

    it('accepts path with spaces', () => {
      expect(isValidPath('my file.txt')).toBe(true);
    });

    it('accepts path with unicode', () => {
      expect(isValidPath('données/fichier.txt')).toBe(true);
    });
  });

  describe('normalizePath', () => {
    it('converts backslashes to forward slashes', () => {
      expect(normalizePath('dir\\file.txt')).toBe('dir/file.txt');
    });

    it('preserves forward slashes', () => {
      expect(normalizePath('dir/file.txt')).toBe('dir/file.txt');
    });

    it('handles mixed separators', () => {
      expect(normalizePath('dir\\sub/file.txt')).toBe('dir/sub/file.txt');
    });

    it('handles multiple backslashes', () => {
      expect(normalizePath('a\\b\\c\\d')).toBe('a/b/c/d');
    });
  });

  describe('createEntries', () => {
    it('creates entries from artifacts', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];

      const entries = createEntries(artifacts);

      expect(entries).toHaveLength(2);
      expect(entries[0].path).toBe('artifacts/a.txt');
      expect(entries[1].path).toBe('artifacts/b.txt');
    });

    it('uses custom base path', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const entries = createEntries(artifacts, 'custom/path');

      expect(entries[0].path).toBe('custom/path/file.txt');
    });

    it('computes correct hash', () => {
      const artifacts = [createTestArtifact('file.txt', 'test content')];

      const entries = createEntries(artifacts);
      const expectedHash = hashString('test content');

      expect(entries[0].hash).toBe(expectedHash);
    });

    it('computes correct byte length', () => {
      const artifacts = [createTestArtifact('file.txt', 'émoji 🎉')];

      const entries = createEntries(artifacts);

      expect(entries[0].byteLength).toBe(11); // UTF-8 bytes
    });

    it('throws for invalid filename (H-INV-08)', () => {
      const artifacts = [createTestArtifact('../evil.txt', 'content')];

      expect(() => createEntries(artifacts)).toThrow('H-INV-08');
    });

    it('returns frozen entries', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const entries = createEntries(artifacts);

      expect(Object.isFrozen(entries[0])).toBe(true);
    });
  });

  describe('buildProofPack', () => {
    it('builds pack from artifacts', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(pack.meta.version).toBe('1.0');
      expect(pack.meta.created).toBe(FIXED_TIMESTAMP);
      expect(pack.meta.artifactCount).toBe(2);
    });

    it('includes manifest by default', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const manifestEntry = pack.entries.find(e => e.path === 'manifest.json');

      expect(manifestEntry).toBeDefined();
    });

    it('includes meta by default', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const metaEntry = pack.entries.find(e => e.path === 'meta.json');

      expect(metaEntry).toBeDefined();
    });

    it('excludes manifest when requested', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP, {
        includeManifest: false,
      });
      const manifestEntry = pack.entries.find(e => e.path === 'manifest.json');

      expect(manifestEntry).toBeUndefined();
    });

    it('excludes meta when requested', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP, {
        includeMeta: false,
      });
      const metaEntry = pack.entries.find(e => e.path === 'meta.json');

      expect(metaEntry).toBeUndefined();
    });

    it('uses custom name', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP, {
        name: 'custom-pack',
      });

      expect(pack.meta.name).toBe('custom-pack');
    });

    it('uses custom base path', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP, {
        basePath: 'custom',
      });

      expect(pack.entries.some(e => e.path === 'custom/file.txt')).toBe(true);
    });

    it('computes pack hash', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(pack.packHash).toMatch(/^[a-f0-9]{64}$/);
    });

    it('computes total bytes', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'aaa'), // 3 bytes
        createTestArtifact('b.txt', 'bb'),  // 2 bytes
      ];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      // Total includes manifest and meta too
      expect(pack.meta.totalBytes).toBeGreaterThan(5);
    });

    it('returns frozen pack', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(Object.isFrozen(pack)).toBe(true);
      expect(Object.isFrozen(pack.meta)).toBe(true);
      expect(Object.isFrozen(pack.entries)).toBe(true);
    });

    it('handles empty artifacts', () => {
      const pack = buildProofPack([], FIXED_TIMESTAMP);

      expect(pack.meta.artifactCount).toBe(0);
      expect(pack.entries.length).toBe(2); // manifest + meta
    });
  });

  describe('verifyProofPack', () => {
    it('validates correct pack', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const result = verifyProofPack(pack);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('detects invalid version', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tampered: ProofPack = {
        ...pack,
        meta: { ...pack.meta, version: '2.0' as '1.0' },
      };

      const result = verifyProofPack(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('version'))).toBe(true);
    });

    it('detects artifact count mismatch', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tampered: ProofPack = {
        ...pack,
        meta: { ...pack.meta, artifactCount: 99 },
      };

      const result = verifyProofPack(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('count mismatch'))).toBe(true);
    });

    it('detects hash mismatch', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tamperedEntry: ProofPackEntry = {
        ...pack.entries[0],
        hash: 'a'.repeat(64) as Sha256,
      };
      const tampered: ProofPack = {
        ...pack,
        entries: Object.freeze([tamperedEntry, ...pack.entries.slice(1)]),
      };

      const result = verifyProofPack(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Hash mismatch'))).toBe(true);
    });

    it('detects byte length mismatch', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tamperedEntry: ProofPackEntry = {
        ...pack.entries[0],
        byteLength: 9999,
      };
      const tampered: ProofPack = {
        ...pack,
        entries: Object.freeze([tamperedEntry, ...pack.entries.slice(1)]),
      };

      const result = verifyProofPack(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Byte length mismatch'))).toBe(true);
    });

    it('detects pack hash mismatch', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tampered: ProofPack = {
        ...pack,
        packHash: 'b'.repeat(64) as Sha256,
      };

      const result = verifyProofPack(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Pack hash mismatch'))).toBe(true);
    });

    it('reports valid entry count', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const result = verifyProofPack(pack);

      expect(result.entriesChecked).toBe(pack.entries.length);
      expect(result.entriesValid).toBe(pack.entries.length);
    });

    it('returns frozen result', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const result = verifyProofPack(pack);

      expect(Object.isFrozen(result)).toBe(true);
    });
  });

  describe('toZipEntries', () => {
    it('converts entries to ZIP format', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const zipEntries = toZipEntries(pack);

      expect(zipEntries.length).toBe(pack.entries.length);
      expect(Buffer.isBuffer(zipEntries[0].content)).toBe(true);
    });

    it('preserves path', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const zipEntries = toZipEntries(pack);

      expect(zipEntries[0].path).toBe('artifacts/file.txt');
    });

    it('preserves hash', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const zipEntries = toZipEntries(pack);

      expect(zipEntries[0].hash).toBe(pack.entries[0].hash);
    });

    it('converts string content to Buffer', () => {
      const artifacts = [createTestArtifact('file.txt', 'test content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const zipEntries = toZipEntries(pack);

      expect(zipEntries[0].content.toString('utf-8')).toBe('test content');
    });

    it('returns frozen array', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const zipEntries = toZipEntries(pack);

      expect(Object.isFrozen(zipEntries)).toBe(true);
    });
  });

  describe('getPackSize', () => {
    it('returns total bytes', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const size = getPackSize(pack);
      const expected = pack.entries.reduce((sum, e) => sum + e.byteLength, 0);

      expect(size).toBe(expected);
    });

    it('handles empty pack', () => {
      const pack = buildProofPack([], FIXED_TIMESTAMP, {
        includeManifest: false,
        includeMeta: false,
      });

      expect(getPackSize(pack)).toBe(0);
    });
  });

  describe('listPackPaths', () => {
    it('lists all paths', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'a'),
        createTestArtifact('b.txt', 'b'),
      ];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const paths = listPackPaths(pack);

      expect(paths).toContain('artifacts/a.txt');
      expect(paths).toContain('artifacts/b.txt');
      expect(paths).toContain('manifest.json');
      expect(paths).toContain('meta.json');
    });

    it('returns frozen array', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const paths = listPackPaths(pack);

      expect(Object.isFrozen(paths)).toBe(true);
    });
  });

  describe('getPackEntry', () => {
    it('finds entry by path', () => {
      const artifacts = [createTestArtifact('file.txt', 'test content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'artifacts/file.txt');

      expect(entry).toBeDefined();
      expect(entry!.content).toBe('test content');
    });

    it('normalizes path', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'artifacts\\file.txt');

      expect(entry).toBeDefined();
    });

    it('returns undefined for unknown path', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'unknown.txt');

      expect(entry).toBeUndefined();
    });

    it('finds manifest', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'manifest.json');

      expect(entry).toBeDefined();
    });

    it('finds meta', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'meta.json');

      expect(entry).toBeDefined();
    });
  });

  describe('Determinism (H-INV-05)', () => {
    it('produces identical pack for identical input', () => {
      const artifacts = [
        createTestArtifact('a.txt', 'content a'),
        createTestArtifact('b.txt', 'content b'),
      ];

      const pack1 = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const pack2 = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(pack1.packHash).toBe(pack2.packHash);
    });

    it('produces identical entries', () => {
      const artifacts = [createTestArtifact('file.txt', 'content')];

      const pack1 = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const pack2 = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(pack1.entries[0].hash).toBe(pack2.entries[0].hash);
    });
  });

  describe('H-INV-01: Body bytes preserved', () => {
    it('preserves content exactly', () => {
      const body = 'exact content with émoji 🎉';
      const artifacts = [createTestArtifact('file.txt', body)];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'artifacts/file.txt');

      expect(entry!.content).toBe(body);
    });

    it('preserves whitespace', () => {
      const body = '  leading\ntrailing  \n';
      const artifacts = [createTestArtifact('file.txt', body)];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const entry = getPackEntry(pack, 'artifacts/file.txt');

      expect(entry!.content).toBe(body);
    });
  });

  describe('Edge cases', () => {
    it('handles many artifacts', () => {
      const artifacts = Array.from({ length: 50 }, (_, i) =>
        createTestArtifact(`file${i}.txt`, `content ${i}`)
      );

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      expect(pack.meta.artifactCount).toBe(50);
    });

    it('handles large content', () => {
      const body = 'x'.repeat(100000);
      const artifacts = [createTestArtifact('large.txt', body)];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const entry = getPackEntry(pack, 'artifacts/large.txt');

      expect(entry!.content).toBe(body);
      expect(entry!.byteLength).toBe(100000);
    });

    it('handles empty content', () => {
      const artifacts = [createTestArtifact('empty.txt', '')];

      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);
      const entry = getPackEntry(pack, 'artifacts/empty.txt');

      expect(entry!.content).toBe('');
      expect(entry!.byteLength).toBe(0);
    });
  });
});
