/**
 * @fileoverview Unit tests for proof pack verifier.
 */

import { describe, it, expect } from 'vitest';
import {
  ProofPackBuilder,
  verifyProofPack,
  verifyManifest,
  verifyEvidence,
  computeRootHash,
  validateManifest,
  isFullyVerified,
  getFailedEvidence,
  formatVerificationReport,
} from '../../src/index.js';

describe('verifyProofPack', () => {
  it('should verify valid pack', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'log content');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(result.valid).toBe(true);
    expect(result.rootHashValid).toBe(true);
    expect(result.summary.verified).toBe(1);
    expect(result.summary.failed).toBe(0);
    expect(result.summary.missing).toBe(0);
  });

  it('should detect missing content', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    // Remove content
    const tamperedPack = {
      manifest: pack.manifest,
      content: {},
    };

    const result = verifyProofPack(tamperedPack);

    expect(result.valid).toBe(false);
    expect(result.summary.missing).toBe(1);
  });

  it('should detect hash mismatch', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'original content');
    const pack = builder.build();

    // Tamper with content
    const tamperedPack = {
      manifest: pack.manifest,
      content: { 'test.log': 'tampered content' },
    };

    const result = verifyProofPack(tamperedPack);

    expect(result.valid).toBe(false);
    expect(result.summary.failed).toBe(1);
    expect(result.evidenceResults[0].valid).toBe(false);
  });

  it('should verify multiple evidence entries', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder
      .addTestLog('a.log', 'content a')
      .addTestLog('b.log', 'content b')
      .addTestLog('c.log', 'content c');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(result.valid).toBe(true);
    expect(result.summary.total).toBe(3);
    expect(result.summary.verified).toBe(3);
  });

  it('should include verification timestamp', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(result.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('should include pack ID', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(result.packId).toBe(pack.manifest.packId);
  });
});

describe('verifyManifest', () => {
  it('should return true for valid manifest', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    expect(verifyManifest(pack.manifest)).toBe(true);
  });

  it('should return false for tampered manifest', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    // Tamper with root hash
    const tamperedManifest = {
      ...pack.manifest,
      rootHash: 'invalid-hash',
    };

    expect(verifyManifest(tamperedManifest)).toBe(false);
  });
});

describe('verifyEvidence', () => {
  it('should return true for matching hash', () => {
    const content = 'test content';
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', content);
    const pack = builder.build();

    const hash = pack.manifest.evidence[0].hash;
    expect(verifyEvidence(content, hash)).toBe(true);
  });

  it('should return false for non-matching hash', () => {
    expect(verifyEvidence('content', 'wrong-hash')).toBe(false);
  });
});

describe('computeRootHash', () => {
  it('should compute deterministic root hash', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const computed = computeRootHash(pack.manifest);

    expect(computed).toBe(pack.manifest.rootHash);
  });

  it('should produce same hash for same evidence', () => {
    const builder1 = new ProofPackBuilder({ name: 'Test' });
    builder1.addTestLog('test.log', 'same');
    const pack1 = builder1.build();

    const builder2 = new ProofPackBuilder({ name: 'Test' });
    builder2.addTestLog('test.log', 'same');
    const pack2 = builder2.build();

    expect(computeRootHash(pack1.manifest)).toBe(computeRootHash(pack2.manifest));
  });
});

describe('validateManifest', () => {
  it('should validate correct manifest', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = validateManifest(pack.manifest);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject non-object', () => {
    const result = validateManifest('not an object');
    expect(result.valid).toBe(false);
  });

  it('should reject missing version', () => {
    const result = validateManifest({
      packId: 'test',
      name: 'test',
      createdAt: '2026-01-01',
      evidence: [],
      metadata: {},
      rootHash: 'hash',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('version'))).toBe(true);
  });

  it('should reject missing packId', () => {
    const result = validateManifest({
      version: '1.0.0',
      name: 'test',
      createdAt: '2026-01-01',
      evidence: [],
      metadata: {},
      rootHash: 'hash',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('packId'))).toBe(true);
  });

  it('should reject missing name', () => {
    const result = validateManifest({
      version: '1.0.0',
      packId: 'test',
      createdAt: '2026-01-01',
      evidence: [],
      metadata: {},
      rootHash: 'hash',
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('name'))).toBe(true);
  });

  it('should reject invalid evidence entry', () => {
    const result = validateManifest({
      version: '1.0.0',
      packId: 'test',
      name: 'test',
      createdAt: '2026-01-01',
      evidence: [{ missing: 'fields' }],
      metadata: {},
      rootHash: 'hash',
    });
    expect(result.valid).toBe(false);
  });

  it('should reject null', () => {
    const result = validateManifest(null);
    expect(result.valid).toBe(false);
  });
});

describe('isFullyVerified', () => {
  it('should return true for fully verified pack', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(isFullyVerified(result)).toBe(true);
  });

  it('should return false for failed verification', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const tamperedPack = {
      manifest: pack.manifest,
      content: { 'test.log': 'tampered' },
    };

    const result = verifyProofPack(tamperedPack);

    expect(isFullyVerified(result)).toBe(false);
  });
});

describe('getFailedEvidence', () => {
  it('should return empty array for valid pack', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = verifyProofPack(pack);

    expect(getFailedEvidence(result)).toHaveLength(0);
  });

  it('should return failed evidence', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const tamperedPack = {
      manifest: pack.manifest,
      content: { 'test.log': 'tampered' },
    };

    const result = verifyProofPack(tamperedPack);
    const failed = getFailedEvidence(result);

    expect(failed).toHaveLength(1);
    expect(failed[0].valid).toBe(false);
  });
});

describe('formatVerificationReport', () => {
  it('should format valid pack report', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const result = verifyProofPack(pack);
    const report = formatVerificationReport(result);

    expect(report).toContain('Proof Pack Verification Report');
    expect(report).toContain('Pack ID:');
    expect(report).toContain('Overall Valid: YES');
  });

  it('should format invalid pack report', () => {
    const builder = new ProofPackBuilder({ name: 'Test' });
    builder.addTestLog('test.log', 'content');
    const pack = builder.build();

    const tamperedPack = {
      manifest: pack.manifest,
      content: { 'test.log': 'tampered' },
    };

    const result = verifyProofPack(tamperedPack);
    const report = formatVerificationReport(result);

    expect(report).toContain('Overall Valid: NO');
    expect(report).toContain('Failed Evidence');
  });
});
