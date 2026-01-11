/**
 * @fileoverview Unit tests for proof pack builder.
 */

import { describe, it, expect } from 'vitest';
import {
  ProofPackBuilder,
  createProofPackBuilder,
  createPhaseProofPack,
  MANIFEST_VERSION,
  GENERATOR_VERSION,
  DEFAULT_STANDARD,
} from '../../src/index.js';

describe('ProofPackBuilder', () => {
  describe('constructor', () => {
    it('should create builder with options', () => {
      const builder = new ProofPackBuilder({ name: 'Test Pack' });
      const pack = builder.build();

      expect(pack.manifest.name).toBe('Test Pack');
    });

    it('should include phase and module', () => {
      const builder = new ProofPackBuilder({
        name: 'Phase 1',
        phase: 1,
        module: '@omega/test',
      });
      const pack = builder.build();

      expect(pack.manifest.phase).toBe(1);
      expect(pack.manifest.module).toBe('@omega/test');
    });
  });

  describe('addEvidence', () => {
    it('should add evidence to pack', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addEvidence({
        type: 'TEST_LOG',
        path: 'test.log',
        content: 'Test log content',
      });

      const pack = builder.build();
      expect(pack.manifest.evidence).toHaveLength(1);
      expect(pack.manifest.evidence[0].type).toBe('TEST_LOG');
      expect(pack.manifest.evidence[0].path).toBe('test.log');
    });

    it('should compute hash for evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addEvidence({
        type: 'TEST_LOG',
        path: 'test.log',
        content: 'Test content',
      });

      const pack = builder.build();
      expect(pack.manifest.evidence[0].hash).toBeDefined();
      expect(pack.manifest.evidence[0].hash.length).toBe(64);
    });

    it('should chain addEvidence calls', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const result = builder
        .addEvidence({ type: 'TEST_LOG', path: 'a.log', content: 'a' })
        .addEvidence({ type: 'HASH_MANIFEST', path: 'b.sha256', content: 'b' });

      expect(result).toBe(builder);
      const pack = builder.build();
      expect(pack.manifest.evidence).toHaveLength(2);
    });

    it('should include content in pack', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addEvidence({
        type: 'TEST_LOG',
        path: 'test.log',
        content: 'File content here',
      });

      const pack = builder.build();
      expect(pack.content['test.log']).toBe('File content here');
    });
  });

  describe('convenience methods', () => {
    it('addTestLog should add TEST_LOG evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addTestLog('test.log', 'log content');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('TEST_LOG');
    });

    it('addHashManifest should add HASH_MANIFEST evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addHashManifest('hashes.sha256', 'abc123  file.ts');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('HASH_MANIFEST');
    });

    it('addCertificate should add CERTIFICATE evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addCertificate('CERT.md', '# Certificate');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('CERTIFICATE');
    });

    it('addSourceBundle should add SOURCE_BUNDLE evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addSourceBundle('src.zip', 'base64data');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('SOURCE_BUNDLE');
    });

    it('addConfig should add CONFIG evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addConfig('config.json', '{}');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('CONFIG');
    });

    it('addArtifact should add ARTIFACT evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addArtifact('seal.json', '{}');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('ARTIFACT');
    });

    it('addRecording should add RECORDING evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addRecording('recording.json', '{}');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('RECORDING');
    });

    it('addTrace should add TRACE evidence', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addTrace('trace.json', '{}');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].type).toBe('TRACE');
    });
  });

  describe('build', () => {
    it('should generate pack ID', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const pack = builder.build();

      expect(pack.manifest.packId).toMatch(/^PACK-\d{2}-[a-z0-9]+$/);
    });

    it('should set manifest version', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const pack = builder.build();

      expect(pack.manifest.version).toBe(MANIFEST_VERSION);
    });

    it('should set creation timestamp', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const pack = builder.build();

      expect(pack.manifest.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should compute root hash', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addTestLog('test.log', 'content');
      const pack = builder.build();

      expect(pack.manifest.rootHash).toBeDefined();
      expect(pack.manifest.rootHash.length).toBe(64);
    });

    it('should freeze manifest and content', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const pack = builder.build();

      expect(Object.isFrozen(pack)).toBe(true);
      expect(Object.isFrozen(pack.manifest)).toBe(true);
      expect(Object.isFrozen(pack.content)).toBe(true);
    });

    it('should include metadata', () => {
      const builder = new ProofPackBuilder({
        name: 'Test',
        standard: 'Custom Standard',
        commit: 'abc123',
        tag: 'v1.0.0',
        certifiedBy: 'Claude',
      });
      const pack = builder.build();

      expect(pack.manifest.metadata.standard).toBe('Custom Standard');
      expect(pack.manifest.metadata.commit).toBe('abc123');
      expect(pack.manifest.metadata.tag).toBe('v1.0.0');
      expect(pack.manifest.metadata.certifiedBy).toBe('Claude');
      expect(pack.manifest.metadata.generatorVersion).toBe(GENERATOR_VERSION);
    });

    it('should use default standard', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      const pack = builder.build();

      expect(pack.manifest.metadata.standard).toBe(DEFAULT_STANDARD);
    });
  });

  describe('evidence IDs', () => {
    it('should generate unique evidence IDs', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder
        .addTestLog('a.log', 'a')
        .addTestLog('b.log', 'b')
        .addTestLog('c.log', 'c');

      const pack = builder.build();
      const ids = pack.manifest.evidence.map((e) => e.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });

    it('should include type prefix in ID', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addTestLog('test.log', 'content');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].id).toMatch(/^EV-TEST-/);
    });
  });

  describe('MIME type detection', () => {
    it('should detect markdown MIME type', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addCertificate('CERT.md', '# Certificate');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].mimeType).toBe('text/markdown');
    });

    it('should detect JSON MIME type', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addConfig('config.json', '{}');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].mimeType).toBe('application/json');
    });

    it('should detect plain text MIME type', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addTestLog('test.txt', 'text');

      const pack = builder.build();
      expect(pack.manifest.evidence[0].mimeType).toBe('text/plain');
    });

    it('should use provided MIME type', () => {
      const builder = new ProofPackBuilder({ name: 'Test' });
      builder.addEvidence({
        type: 'ARTIFACT',
        path: 'custom.bin',
        content: 'binary',
        mimeType: 'application/custom',
      });

      const pack = builder.build();
      expect(pack.manifest.evidence[0].mimeType).toBe('application/custom');
    });
  });

  describe('root hash determinism', () => {
    it('should produce same root hash for same content', () => {
      const builder1 = new ProofPackBuilder({ name: 'Test' });
      builder1.addTestLog('test.log', 'same content');
      const pack1 = builder1.build();

      const builder2 = new ProofPackBuilder({ name: 'Test' });
      builder2.addTestLog('test.log', 'same content');
      const pack2 = builder2.build();

      expect(pack1.manifest.rootHash).toBe(pack2.manifest.rootHash);
    });

    it('should produce different root hash for different content', () => {
      const builder1 = new ProofPackBuilder({ name: 'Test' });
      builder1.addTestLog('test.log', 'content 1');
      const pack1 = builder1.build();

      const builder2 = new ProofPackBuilder({ name: 'Test' });
      builder2.addTestLog('test.log', 'content 2');
      const pack2 = builder2.build();

      expect(pack1.manifest.rootHash).not.toBe(pack2.manifest.rootHash);
    });
  });
});

describe('createProofPackBuilder', () => {
  it('should create builder with options', () => {
    const builder = createProofPackBuilder({ name: 'Test' });
    expect(builder).toBeInstanceOf(ProofPackBuilder);
  });
});

describe('createPhaseProofPack', () => {
  it('should create builder for phase', () => {
    const builder = createPhaseProofPack(67, '@omega/proof-pack');
    const pack = builder.build();

    expect(pack.manifest.phase).toBe(67);
    expect(pack.manifest.module).toBe('@omega/proof-pack');
    expect(pack.manifest.name).toBe('Phase 67 - @omega/proof-pack');
  });

  it('should accept additional options', () => {
    const builder = createPhaseProofPack(67, '@omega/proof-pack', {
      tag: 'v3.70.0',
    });
    const pack = builder.build();

    expect(pack.manifest.metadata.tag).toBe('v3.70.0');
  });
});
