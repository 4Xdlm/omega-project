/**
 * OMEGA Delivery Types Tests v1.0
 * Phase H - NASA-Grade L4 / DO-178C
 *
 * Tests for H1 delivery types
 */

import { describe, it, expect } from 'vitest';
import {
  isProfileId,
  isSha256,
  isISO8601,
  isDeliveryFormat,
  isDeliveryProfile,
  isDeliveryArtifact,
  isDeliveryManifest,
  isDeliveryBundle,
  isDeliveryInput,
  isValidFilename,
  hasBOM,
  hasCRLF,
  hasCRLFBytes,
  createDeliveryError,
  DELIVERY_FORMATS,
  DEFAULT_PROFILE_ID,
  DEFAULT_ENCODING,
  DEFAULT_LINE_ENDING,
  type ProfileId,
  type Sha256,
  type DeliveryFormat,
} from '../../src/delivery/types';

describe('Delivery Types — Phase H', () => {
  describe('isProfileId', () => {
    it('accepts OMEGA_STD', () => {
      expect(isProfileId('OMEGA_STD')).toBe(true);
    });

    it('accepts PROF-* format', () => {
      expect(isProfileId('PROF-text')).toBe(true);
      expect(isProfileId('PROF-markdown')).toBe(true);
      expect(isProfileId('PROF-json_pack')).toBe(true);
      expect(isProfileId('PROF-test-123')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(isProfileId('INVALID')).toBe(false);
      expect(isProfileId('prof-text')).toBe(false);
      expect(isProfileId('')).toBe(false);
      expect(isProfileId(null)).toBe(false);
      expect(isProfileId(123)).toBe(false);
    });
  });

  describe('isSha256', () => {
    it('accepts valid 64-char hex', () => {
      expect(isSha256('a'.repeat(64))).toBe(true);
      expect(isSha256('0123456789abcdef'.repeat(4))).toBe(true);
    });

    it('rejects invalid hashes', () => {
      expect(isSha256('a'.repeat(63))).toBe(false);
      expect(isSha256('a'.repeat(65))).toBe(false);
      expect(isSha256('G'.repeat(64))).toBe(false); // Non-hex
      expect(isSha256('')).toBe(false);
      expect(isSha256(null)).toBe(false);
    });
  });

  describe('isISO8601', () => {
    it('accepts valid ISO8601', () => {
      expect(isISO8601('2024-01-15T10:30:00Z')).toBe(true);
      expect(isISO8601('2024-01-15T10:30:00.000Z')).toBe(true);
      expect(isISO8601(new Date().toISOString())).toBe(true);
    });

    it('rejects invalid timestamps', () => {
      expect(isISO8601('2024-01-15')).toBe(false); // No time
      expect(isISO8601('not-a-date')).toBe(false);
      expect(isISO8601('')).toBe(false);
      expect(isISO8601(null)).toBe(false);
    });
  });

  describe('isDeliveryFormat', () => {
    it('accepts all valid formats', () => {
      expect(isDeliveryFormat('TEXT')).toBe(true);
      expect(isDeliveryFormat('MARKDOWN')).toBe(true);
      expect(isDeliveryFormat('JSON_PACK')).toBe(true);
      expect(isDeliveryFormat('PROOF_PACK')).toBe(true);
      expect(isDeliveryFormat('HASH_CHAIN')).toBe(true);
    });

    it('rejects invalid formats', () => {
      expect(isDeliveryFormat('text')).toBe(false);
      expect(isDeliveryFormat('HTML')).toBe(false);
      expect(isDeliveryFormat('')).toBe(false);
      expect(isDeliveryFormat(null)).toBe(false);
    });
  });

  describe('DELIVERY_FORMATS', () => {
    it('contains all formats', () => {
      expect(DELIVERY_FORMATS).toContain('TEXT');
      expect(DELIVERY_FORMATS).toContain('MARKDOWN');
      expect(DELIVERY_FORMATS).toContain('JSON_PACK');
      expect(DELIVERY_FORMATS).toContain('PROOF_PACK');
      expect(DELIVERY_FORMATS).toContain('HASH_CHAIN');
      expect(DELIVERY_FORMATS).toHaveLength(5);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(DELIVERY_FORMATS)).toBe(true);
    });
  });

  describe('isDeliveryProfile', () => {
    const validProfile = {
      profileId: 'OMEGA_STD' as ProfileId,
      format: 'TEXT' as DeliveryFormat,
      extension: '.txt',
      encoding: 'UTF-8' as const,
      lineEnding: 'LF' as const,
    };

    it('accepts valid profile', () => {
      expect(isDeliveryProfile(validProfile)).toBe(true);
    });

    it('accepts profile with optional fields', () => {
      const withOptional = {
        ...validProfile,
        wrapWidth: 80,
        headers: ['# Header'],
        footers: ['# Footer'],
      };
      expect(isDeliveryProfile(withOptional)).toBe(true);
    });

    it('rejects invalid encoding', () => {
      const invalid = { ...validProfile, encoding: 'UTF-16' };
      expect(isDeliveryProfile(invalid)).toBe(false);
    });

    it('rejects invalid lineEnding', () => {
      const invalid = { ...validProfile, lineEnding: 'CRLF' };
      expect(isDeliveryProfile(invalid)).toBe(false);
    });

    it('rejects missing fields', () => {
      expect(isDeliveryProfile({})).toBe(false);
      expect(isDeliveryProfile(null)).toBe(false);
    });
  });

  describe('isDeliveryArtifact', () => {
    const validArtifact = {
      format: 'TEXT' as DeliveryFormat,
      filename: 'output.txt',
      content: new Uint8Array([72, 101, 108, 108, 111]),
      bodyHash: 'a'.repeat(64) as Sha256,
      contentHash: 'b'.repeat(64) as Sha256,
      size: 5,
    };

    it('accepts valid artifact', () => {
      expect(isDeliveryArtifact(validArtifact)).toBe(true);
    });

    it('rejects invalid content type', () => {
      const invalid = { ...validArtifact, content: 'not bytes' };
      expect(isDeliveryArtifact(invalid)).toBe(false);
    });

    it('rejects negative size', () => {
      const invalid = { ...validArtifact, size: -1 };
      expect(isDeliveryArtifact(invalid)).toBe(false);
    });
  });

  describe('isDeliveryManifest', () => {
    const validManifest = {
      intentId: 'INT-12345',
      intentHash: 'a'.repeat(64),
      profileId: 'OMEGA_STD',
      profileHash: 'b'.repeat(64),
      proofHash: 'c'.repeat(64),
      artifacts: [],
      bundleHash: 'd'.repeat(64),
      createdAt: '2024-01-15T10:30:00Z',
    };

    it('accepts valid manifest', () => {
      expect(isDeliveryManifest(validManifest)).toBe(true);
    });

    it('rejects missing fields', () => {
      const invalid = { ...validManifest, bundleHash: undefined };
      expect(isDeliveryManifest(invalid)).toBe(false);
    });
  });

  describe('isDeliveryBundle', () => {
    const validBundle = {
      artifacts: [],
      manifest: {
        intentId: 'INT-12345',
        intentHash: 'a'.repeat(64),
        profileId: 'OMEGA_STD',
        profileHash: 'b'.repeat(64),
        proofHash: 'c'.repeat(64),
        artifacts: [],
        bundleHash: 'd'.repeat(64),
        createdAt: '2024-01-15T10:30:00Z',
      },
      bundleHash: 'd'.repeat(64),
    };

    it('accepts valid bundle', () => {
      expect(isDeliveryBundle(validBundle)).toBe(true);
    });

    it('rejects missing manifest', () => {
      const invalid = { artifacts: [], bundleHash: 'd'.repeat(64) };
      expect(isDeliveryBundle(invalid)).toBe(false);
    });
  });

  describe('isDeliveryInput', () => {
    const validInput = {
      validatedText: 'Hello, World!',
      truthGateVerdict: { passed: true },
      proofManifest: { proofs: [] },
      intent: { goal: 'DRAFT' },
      generationContract: { contractId: 'CON-123' },
    };

    it('accepts valid input', () => {
      expect(isDeliveryInput(validInput)).toBe(true);
    });

    it('accepts input with profile', () => {
      const withProfile = { ...validInput, profile: 'OMEGA_STD' };
      expect(isDeliveryInput(withProfile)).toBe(true);
    });

    it('rejects missing validatedText', () => {
      const invalid = { ...validInput, validatedText: undefined };
      expect(isDeliveryInput(invalid)).toBe(false);
    });
  });

  describe('isValidFilename (H-INV-10)', () => {
    it('accepts valid filenames', () => {
      expect(isValidFilename('output.txt')).toBe(true);
      expect(isValidFilename('my-file_123.md')).toBe(true);
      expect(isValidFilename('test.json')).toBe(true);
    });

    it('rejects path traversal', () => {
      expect(isValidFilename('../etc/passwd')).toBe(false);
      expect(isValidFilename('..\\secret.txt')).toBe(false);
      expect(isValidFilename('some/path/file.txt')).toBe(false);
      expect(isValidFilename('some\\path\\file.txt')).toBe(false);
    });

    it('rejects special characters', () => {
      expect(isValidFilename('file<>.txt')).toBe(false);
      expect(isValidFilename('file:name.txt')).toBe(false);
      expect(isValidFilename('file?.txt')).toBe(false);
      expect(isValidFilename('file*.txt')).toBe(false);
    });

    it('rejects null bytes', () => {
      expect(isValidFilename('file\0.txt')).toBe(false);
    });

    it('rejects empty', () => {
      expect(isValidFilename('')).toBe(false);
    });
  });

  describe('hasBOM (H-INV-08)', () => {
    it('detects UTF-8 BOM', () => {
      const withBOM = new Uint8Array([0xEF, 0xBB, 0xBF, 72, 101, 108, 108, 111]);
      expect(hasBOM(withBOM)).toBe(true);
    });

    it('detects UTF-16 LE BOM', () => {
      const withBOM = new Uint8Array([0xFF, 0xFE, 72, 0, 105, 0]);
      expect(hasBOM(withBOM)).toBe(true);
    });

    it('detects UTF-16 BE BOM', () => {
      const withBOM = new Uint8Array([0xFE, 0xFF, 0, 72, 0, 105]);
      expect(hasBOM(withBOM)).toBe(true);
    });

    it('returns false for no BOM', () => {
      const noBOM = new Uint8Array([72, 101, 108, 108, 111]);
      expect(hasBOM(noBOM)).toBe(false);
    });

    it('handles empty array', () => {
      expect(hasBOM(new Uint8Array([]))).toBe(false);
    });
  });

  describe('hasCRLF (H-INV-09)', () => {
    it('detects CRLF', () => {
      expect(hasCRLF('Hello\r\nWorld')).toBe(true);
    });

    it('detects lone CR', () => {
      expect(hasCRLF('Hello\rWorld')).toBe(true);
    });

    it('returns false for LF only', () => {
      expect(hasCRLF('Hello\nWorld')).toBe(false);
    });

    it('returns false for no newlines', () => {
      expect(hasCRLF('Hello World')).toBe(false);
    });
  });

  describe('hasCRLFBytes', () => {
    it('detects CRLF in bytes', () => {
      const bytes = new Uint8Array([72, 101, 0x0D, 0x0A, 108, 108, 111]);
      expect(hasCRLFBytes(bytes)).toBe(true);
    });

    it('detects lone CR in bytes', () => {
      const bytes = new Uint8Array([72, 101, 0x0D, 108, 108, 111]);
      expect(hasCRLFBytes(bytes)).toBe(true);
    });

    it('returns false for LF only', () => {
      const bytes = new Uint8Array([72, 101, 0x0A, 108, 108, 111]);
      expect(hasCRLFBytes(bytes)).toBe(false);
    });
  });

  describe('createDeliveryError', () => {
    it('creates error with code and message', () => {
      const error = createDeliveryError('ERR-001', 'Test error');

      expect(error.code).toBe('ERR-001');
      expect(error.message).toBe('Test error');
      expect(error.details).toBeUndefined();
    });

    it('creates error with details', () => {
      const error = createDeliveryError('ERR-002', 'Error', { key: 'value' });

      expect(error.details).toEqual({ key: 'value' });
    });

    it('returns frozen error', () => {
      const error = createDeliveryError('ERR-001', 'Test');

      expect(Object.isFrozen(error)).toBe(true);
    });

    it('freezes details', () => {
      const error = createDeliveryError('ERR-001', 'Test', { key: 'value' });

      expect(Object.isFrozen(error.details)).toBe(true);
    });
  });

  describe('Default values', () => {
    it('DEFAULT_PROFILE_ID is OMEGA_STD', () => {
      expect(DEFAULT_PROFILE_ID).toBe('OMEGA_STD');
      expect(isProfileId(DEFAULT_PROFILE_ID)).toBe(true);
    });

    it('DEFAULT_ENCODING is UTF-8', () => {
      expect(DEFAULT_ENCODING).toBe('UTF-8');
    });

    it('DEFAULT_LINE_ENDING is LF', () => {
      expect(DEFAULT_LINE_ENDING).toBe('LF');
    });
  });
});
