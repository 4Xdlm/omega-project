/**
 * @fileoverview Unit tests for proof pack serializer.
 */

import { describe, it, expect } from 'vitest';
import {
  ProofPackBuilder,
  serializeProofPack,
  serializeManifest,
  deserializeProofPack,
  deserializeManifest,
  exportProofPack,
  importProofPack,
  toArchiveEntries,
  fromArchiveEntries,
  compareManifests,
} from '../../src/index.js';

describe('serializeProofPack', () => {
  it('should serialize pack to JSON string', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = serializeProofPack(pack);

    expect(typeof json).toBe('string');
    expect(json).toContain('manifest');
    expect(json).toContain('content');
  });

  it('should produce stable JSON (sorted keys)', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json1 = serializeProofPack(pack);
    const json2 = serializeProofPack(pack);

    expect(json1).toBe(json2);
  });
});

describe('serializeManifest', () => {
  it('should serialize manifest only', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = serializeManifest(pack.manifest);

    expect(typeof json).toBe('string');
    expect(json).toContain('packId');
    expect(json).not.toContain('"content"');
  });
});

describe('deserializeProofPack', () => {
  it('should deserialize valid JSON', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = serializeProofPack(pack);
    const restored = deserializeProofPack(json);

    expect(restored.manifest.packId).toBe(pack.manifest.packId);
    expect(restored.content['test.log']).toBe('content');
  });

  it('should throw for invalid JSON', () => {
    expect(() => deserializeProofPack('not json')).toThrow();
  });

  it('should throw for non-object', () => {
    expect(() => deserializeProofPack('"string"')).toThrow('not an object');
  });

  it('should throw for invalid manifest', () => {
    const json = JSON.stringify({ manifest: {}, content: {} });
    expect(() => deserializeProofPack(json)).toThrow('Invalid manifest');
  });

  it('should throw for missing content', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = JSON.stringify({ manifest: pack.manifest });
    expect(() => deserializeProofPack(json)).toThrow('missing or invalid content');
  });
});

describe('deserializeManifest', () => {
  it('should deserialize valid manifest JSON', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = serializeManifest(pack.manifest);
    const restored = deserializeManifest(json);

    expect(restored.packId).toBe(pack.manifest.packId);
  });

  it('should throw for invalid manifest', () => {
    expect(() => deserializeManifest('{}')).toThrow('Invalid manifest');
  });
});

describe('exportProofPack', () => {
  it('should export as json format', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = exportProofPack(pack, 'json');

    expect(typeof json).toBe('string');
    const parsed = JSON.parse(json);
    expect(parsed.manifest).toBeDefined();
  });

  it('should export as json-pretty format', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = exportProofPack(pack, 'json-pretty');

    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });

  it('should export as manifest-only format', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = exportProofPack(pack, 'manifest-only');

    const parsed = JSON.parse(json);
    expect(parsed.packId).toBeDefined();
    expect(parsed.content).toBeUndefined();
  });

  it('should throw for unknown format', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    const pack = builder.build();

    expect(() => exportProofPack(pack, 'unknown' as any)).toThrow('Unknown export format');
  });
});

describe('importProofPack', () => {
  it('should import from JSON string', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const json = serializeProofPack(pack);
    const imported = importProofPack(json);

    expect(imported.manifest.packId).toBe(pack.manifest.packId);
  });
});

describe('toArchiveEntries', () => {
  it('should convert pack to archive entries', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const entries = toArchiveEntries(pack);

    expect(entries.length).toBe(2);
    expect(entries.some((e) => e.path === 'MANIFEST.json')).toBe(true);
    expect(entries.some((e) => e.path === 'test.log')).toBe(true);
  });

  it('should include all evidence files', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder
      .addTestLog('a.log', 'a')
      .addTestLog('b.log', 'b')
      .addTestLog('c.log', 'c');
    const pack = builder.build();

    const entries = toArchiveEntries(pack);

    expect(entries.length).toBe(4); // 3 files + manifest
  });
});

describe('fromArchiveEntries', () => {
  it('should convert archive entries back to pack', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const entries = toArchiveEntries(pack);
    const restored = fromArchiveEntries(entries);

    expect(restored.manifest.packId).toBe(pack.manifest.packId);
    expect(restored.content['test.log']).toBe('content');
  });

  it('should throw for missing MANIFEST.json', () => {
    const entries = [{ path: 'test.log', content: 'content' }];
    expect(() => fromArchiveEntries(entries)).toThrow('missing MANIFEST.json');
  });
});

describe('compareManifests', () => {
  it('should detect no changes', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const diff = compareManifests(pack.manifest, pack.manifest);

    expect(diff).toHaveLength(0);
  });

  it('should detect added evidence', () => {
    const builder1 = new ProofPackBuilder({ name: 'Test' });
    builder1.addTestLog('a.log', 'a');
    const pack1 = builder1.build();

    const builder2 = new ProofPackBuilder({ name: 'Test' });
    builder2.addTestLog('a.log', 'a').addTestLog('b.log', 'b');
    const pack2 = builder2.build();

    const diff = compareManifests(pack1.manifest, pack2.manifest);

    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('added');
    expect(diff[0].path).toBe('b.log');
  });

  it('should detect removed evidence', () => {
    const builder1 = new ProofPackBuilder({ name: 'Test' });
    builder1.addTestLog('a.log', 'a').addTestLog('b.log', 'b');
    const pack1 = builder1.build();

    const builder2 = new ProofPackBuilder({ name: 'Test' });
    builder2.addTestLog('a.log', 'a');
    const pack2 = builder2.build();

    const diff = compareManifests(pack1.manifest, pack2.manifest);

    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('removed');
    expect(diff[0].path).toBe('b.log');
  });

  it('should detect hash changes', () => {
    const builder1 = new ProofPackBuilder({ name: 'Test' });
    builder1.addTestLog('test.log', 'original');
    const pack1 = builder1.build();

    const builder2 = new ProofPackBuilder({ name: 'Test' });
    builder2.addTestLog('test.log', 'modified');
    const pack2 = builder2.build();

    const diff = compareManifests(pack1.manifest, pack2.manifest);

    expect(diff.length).toBe(1);
    expect(diff[0].type).toBe('hash_changed');
    expect(diff[0].path).toBe('test.log');
    expect(diff[0].oldHash).toBeDefined();
    expect(diff[0].newHash).toBeDefined();
  });

  it('should detect multiple changes', () => {
    const builder1 = new ProofPackBuilder({ name: 'Test' });
    builder1.addTestLog('a.log', 'a').addTestLog('b.log', 'b');
    const pack1 = builder1.build();

    const builder2 = new ProofPackBuilder({ name: 'Test' });
    builder2.addTestLog('b.log', 'modified-b').addTestLog('c.log', 'c');
    const pack2 = builder2.build();

    const diff = compareManifests(pack1.manifest, pack2.manifest);

    expect(diff.length).toBe(3);
    expect(diff.some((d) => d.type === 'removed' && d.path === 'a.log')).toBe(true);
    expect(diff.some((d) => d.type === 'hash_changed' && d.path === 'b.log')).toBe(true);
    expect(diff.some((d) => d.type === 'added' && d.path === 'c.log')).toBe(true);
  });
});

describe('round-trip', () => {
  it('should preserve data through serialize/deserialize', () => {
    const builder = new ProofPackBuilder({
      name: 'Complete Pack',
      phase: 67,
      module: '@omega/proof-pack',
      commit: 'abc123',
      tag: 'v3.70.0',
    });
    builder
      .addTestLog('test.log', 'test output')
      .addCertificate('CERT.md', '# Certificate')
      .addHashManifest('hashes.sha256', 'abc123  file.ts')
      .addConfig('config.json', '{"key": "value"}');

    const pack = builder.build();
    const json = serializeProofPack(pack);
    const restored = deserializeProofPack(json);

    expect(restored.manifest.name).toBe(pack.manifest.name);
    expect(restored.manifest.phase).toBe(67);
    expect(restored.manifest.module).toBe('@omega/proof-pack');
    expect(restored.manifest.evidence.length).toBe(4);
    expect(Object.keys(restored.content).length).toBe(4);
  });

  it('should preserve data through archive conversion', () => {
    const builder = new ProofPackBuilder({ name: 'Archive Test' });
    builder.addTestLog('a.log', 'content a').addTestLog('b.log', 'content b');

    const pack = builder.build();
    const entries = toArchiveEntries(pack);
    const restored = fromArchiveEntries(entries);

    expect(restored.manifest.packId).toBe(pack.manifest.packId);
    expect(restored.content['a.log']).toBe('content a');
    expect(restored.content['b.log']).toBe('content b');
  });
});
