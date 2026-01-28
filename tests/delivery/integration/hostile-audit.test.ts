/**
 * OMEGA Delivery Hostile Audit Integration Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Hostile tests H-T01 to H-T16 as specified in DELIVERY_SPEC v1.0
 */

import { describe, it, expect } from 'vitest';
import {
  DeliveryEngine,
  createEngine,
  deliverBody,
} from '../../../src/delivery/delivery-engine';
import { render } from '../../../src/delivery/renderer';
import { hashString, verifyChain, createChain, addToChain } from '../../../src/delivery/hasher';
import type { HashChain } from '../../../src/delivery/hasher';
import { validateBody } from '../../../src/delivery/normalizer';
import { isValidPath, buildProofPack, verifyProofPack } from '../../../src/delivery/proof-pack';
import type { ProofPack, ProofPackEntry } from '../../../src/delivery/proof-pack';
import { loadProfiles, getDefaultProfile } from '../../../src/delivery/profile-loader';
import { createManifest, verifyManifest } from '../../../src/delivery/manifest';
import { isValidFilename, isSha256 } from '../../../src/delivery/types';
import type { ProfileId, ISO8601, Sha256, DeliveryArtifact } from '../../../src/delivery/types';

const FIXED_TIMESTAMP = '2025-01-15T10:30:00.000Z' as ISO8601;

// Helper to create test artifact
function createTestArtifact(
  body: string,
  filename: string
): DeliveryArtifact {
  return Object.freeze({
    filename,
    format: 'TEXT' as const,
    content: body,
    hash: hashString(body),
    bodyHash: hashString(body),
    byteLength: Buffer.byteLength(body, 'utf-8'),
    timestamp: FIXED_TIMESTAMP,
    profileId: 'PROF-test',
  });
}

describe('Hostile Audit Tests (H-T01 to H-T16) — Phase H', () => {
  describe('H-T01: BOM injection in body', () => {
    it('detects and rejects BOM at start of body', () => {
      const bodyWithBOM = '\uFEFFContent with BOM';
      const validation = validateBody(bodyWithBOM);

      expect(validation.valid).toBe(false);
      expect(validation.violations.some(v => v.includes('H-INV-06'))).toBe(true);
    });

    it('rejects BOM in engine delivery', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: '\uFEFFBOM content',
        filename: 'test.txt',
      });

      expect(result.valid).toBe(false);
    });

    it('rejects BOM in standalone delivery', () => {
      expect(() => deliverBody('\uFEFFbad', 'test.txt')).toThrow();
    });
  });

  describe('H-T02: CRLF injection in body', () => {
    it('detects and rejects CRLF line endings', () => {
      const bodyWithCRLF = 'line1\r\nline2\r\nline3';
      const validation = validateBody(bodyWithCRLF);

      expect(validation.valid).toBe(false);
      expect(validation.violations.some(v => v.includes('H-INV-07'))).toBe(true);
    });

    it('detects standalone CR', () => {
      const bodyWithCR = 'line1\rline2';
      const validation = validateBody(bodyWithCR);

      expect(validation.valid).toBe(false);
    });

    it('accepts LF-only', () => {
      const bodyWithLF = 'line1\nline2\nline3';
      const validation = validateBody(bodyWithLF);

      expect(validation.valid).toBe(true);
    });
  });

  describe('H-T03: Path traversal in filename', () => {
    it('rejects parent directory traversal', () => {
      expect(isValidFilename('../etc/passwd')).toBe(false);
      expect(isValidFilename('..\\windows\\system32')).toBe(false);
      expect(isValidFilename('dir/../file.txt')).toBe(false);
    });

    it('rejects absolute paths', () => {
      expect(isValidFilename('/etc/passwd')).toBe(false);
      expect(isValidFilename('C:\\Windows\\System32')).toBe(false);
      expect(isValidPath('/absolute/path')).toBe(false);
    });

    it('rejects current directory reference', () => {
      expect(isValidFilename('./file.txt')).toBe(false);
      expect(isValidPath('./current')).toBe(false);
    });

    it('engine throws for traversal attempt', () => {
      const engine = createEngine();

      expect(() =>
        engine.deliver({
          body: 'malicious',
          filename: '../../../etc/passwd',
        })
      ).toThrow('H-INV-08');
    });
  });

  describe('H-T04: Null byte injection in filename', () => {
    it('rejects null bytes in filename', () => {
      expect(isValidFilename('file\0.txt')).toBe(false);
      expect(isValidFilename('test\x00hidden.exe')).toBe(false);
    });

    it('rejects null bytes in path', () => {
      expect(isValidPath('dir/file\0.txt')).toBe(false);
    });
  });

  describe('H-T05: Profile lock bypass attempt', () => {
    it('profiles are verified against lock hash', () => {
      const profiles = loadProfiles();

      expect(profiles.verified).toBe(true);
      expect(isSha256(profiles.lockHash)).toBe(true);
      expect(profiles.hash).toBe(profiles.lockHash);
    });

    it('engine uses verified profiles', () => {
      const engine = createEngine();

      expect(engine.profiles.verified).toBe(true);
    });
  });

  describe('H-T06: Hash manipulation attempt', () => {
    it('verifies hash integrity', () => {
      const content = 'original content';
      const correctHash = hashString(content);
      const wrongHash = 'a'.repeat(64) as Sha256;

      expect(correctHash).not.toBe(wrongHash);
    });

    it('detects manifest root hash tampering', () => {
      const artifacts = [createTestArtifact('content', 'file.txt')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered = {
        ...manifest,
        rootHash: 'b'.repeat(64) as Sha256,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('H-INV-10'))).toBe(true);
    });
  });

  describe('H-T07: Chain link manipulation', () => {
    it('detects broken chain links', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('a'), 'T', FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('b'), 'T', FIXED_TIMESTAMP);

      // Tamper with previous hash link
      const tamperedEntries = [
        chain.entries[0],
        { ...chain.entries[1], previousHash: 'c'.repeat(64) as Sha256 },
      ];
      const tamperedChain: HashChain = {
        ...chain,
        entries: Object.freeze(tamperedEntries),
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
    });

    it('detects entry hash manipulation', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'T', FIXED_TIMESTAMP);

      const tamperedEntries = [
        { ...chain.entries[0], hash: 'd'.repeat(64) as Sha256 },
      ];
      const tamperedChain: HashChain = {
        ...chain,
        entries: Object.freeze(tamperedEntries),
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
    });
  });

  describe('H-T08: Proof pack path traversal', () => {
    it('proof pack validates paths', () => {
      const artifacts = [createTestArtifact('content', 'safe.txt')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const result = verifyProofPack(pack);

      expect(result.valid).toBe(true);
    });

    it('detects traversal in proof pack entries', () => {
      const artifacts = [createTestArtifact('content', 'file.txt')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      // Manually create tampered entry with path traversal
      const tamperedEntry: ProofPackEntry = {
        path: '../../../etc/passwd',
        content: 'malicious',
        hash: hashString('malicious'),
        byteLength: 9,
      };

      const tamperedPack: ProofPack = {
        ...pack,
        entries: Object.freeze([tamperedEntry]),
      };

      const result = verifyProofPack(tamperedPack);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('H-INV-08'))).toBe(true);
    });
  });

  describe('H-T09: Content hash mismatch', () => {
    it('detects content hash mismatch in proof pack', () => {
      const artifacts = [createTestArtifact('original', 'file.txt')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tamperedEntry: ProofPackEntry = {
        ...pack.entries[0],
        hash: 'e'.repeat(64) as Sha256, // Wrong hash
      };

      const tamperedPack: ProofPack = {
        ...pack,
        entries: Object.freeze([tamperedEntry, ...pack.entries.slice(1)]),
      };

      const result = verifyProofPack(tamperedPack);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Hash mismatch'))).toBe(true);
    });
  });

  describe('H-T10: Byte length manipulation', () => {
    it('detects byte length mismatch', () => {
      const artifacts = [createTestArtifact('content', 'file.txt')];
      const pack = buildProofPack(artifacts, FIXED_TIMESTAMP);

      const tamperedEntry: ProofPackEntry = {
        ...pack.entries[0],
        byteLength: 9999,
      };

      const tamperedPack: ProofPack = {
        ...pack,
        entries: Object.freeze([tamperedEntry, ...pack.entries.slice(1)]),
      };

      const result = verifyProofPack(tamperedPack);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Byte length mismatch'))).toBe(true);
    });
  });

  describe('H-T11: Manifest artifact count manipulation', () => {
    it('detects artifact count mismatch', () => {
      const artifacts = [createTestArtifact('content', 'file.txt')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered = {
        ...manifest,
        artifactCount: 999,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('count mismatch'))).toBe(true);
    });
  });

  describe('H-T12: Manifest total bytes manipulation', () => {
    it('detects total bytes mismatch', () => {
      const artifacts = [createTestArtifact('content', 'file.txt')];
      const manifest = createManifest(artifacts, FIXED_TIMESTAMP);

      const tampered = {
        ...manifest,
        totalBytes: 999999,
      };

      const result = verifyManifest(tampered);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('bytes mismatch'))).toBe(true);
    });
  });

  describe('H-T13: Chain hash tampering', () => {
    it('detects chainHash tampering', () => {
      let chain = createChain(FIXED_TIMESTAMP);
      chain = addToChain(chain, hashString('content'), 'T', FIXED_TIMESTAMP);

      const tamperedChain: HashChain = {
        ...chain,
        chainHash: 'f'.repeat(64) as Sha256,
      };

      const result = verifyChain(tamperedChain);

      expect(result.valid).toBe(false);
    });
  });

  describe('H-T14: Empty chain hash manipulation', () => {
    it('detects wrong hash for empty chain', () => {
      const chain: HashChain = {
        version: '1.0',
        created: FIXED_TIMESTAMP,
        entries: Object.freeze([]),
        chainHash: 'g'.repeat(64) as Sha256, // Should be GENESIS_HASH
      };

      const result = verifyChain(chain);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('genesis hash'))).toBe(true);
    });
  });

  describe('H-T15: Double extension attack', () => {
    it('handles double extensions safely', () => {
      // Double extensions are actually allowed but validated
      expect(isValidFilename('file.txt.exe')).toBe(true);
      expect(isValidFilename('document.pdf.js')).toBe(true);

      // But path traversal with extensions is blocked
      expect(isValidFilename('../file.txt.exe')).toBe(false);
    });
  });

  describe('H-T16: Unicode normalization attack', () => {
    it('preserves unicode exactly without normalization', () => {
      const engine = createEngine();

      // Different unicode representations
      const normalized = 'café'; // é as single character
      const decomposed = 'cafe\u0301'; // e + combining acute

      const result1 = engine.deliver({ body: normalized, filename: 'n.txt' });
      const result2 = engine.deliver({ body: decomposed, filename: 'd.txt' });

      // Hashes should be different (no normalization applied)
      expect(result1.artifact.hash).not.toBe(result2.artifact.hash);

      // Content preserved exactly
      expect(result1.artifact.content).toBe(normalized);
      expect(result2.artifact.content).toBe(decomposed);
    });

    it('preserves emojis exactly', () => {
      const engine = createEngine();
      const emojiBody = '🎉🎊🎈';

      const result = engine.deliver({ body: emojiBody, filename: 'emoji.txt' });

      expect(result.artifact.content).toBe(emojiBody);
      expect(result.artifact.byteLength).toBe(12); // 4 bytes per emoji
    });
  });

  describe('Combined hostile scenarios', () => {
    it('rejects multiple violations', () => {
      const validation = validateBody('\uFEFFline1\r\nline2');

      expect(validation.valid).toBe(false);
      expect(validation.violations).toHaveLength(2);
    });

    it('validates clean content passes all checks', () => {
      const engine = createEngine();

      const result = engine.deliver({
        body: 'Clean content\nWith LF only\nNo BOM',
        filename: 'clean.txt',
      });

      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);

      // Create and verify bundle
      const bundleResult = engine.createBundle({
        includeChain: true,
        includeProofPack: true,
      });

      expect(bundleResult.valid).toBe(true);

      if (bundleResult.proofPack) {
        const packResult = verifyProofPack(bundleResult.proofPack);
        expect(packResult.valid).toBe(true);
      }
    });
  });
});
