/**
 * Error Classes Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import {
  ProofError,
  ProofManifestError,
  ProofManifestBuildError,
  ProofManifestParseError,
  ProofVerifyError,
  ProofFileNotFoundError,
  ProofHashMismatchError,
  ProofSnapshotError,
  ProofSnapshotCreateError,
  ProofSnapshotRestoreError,
  ProofSnapshotNotFoundError,
  ProofDiffError,
  ProofDiffInvalidInputError,
  ProofSerializeError,
  ProofDeserializeError,
} from '../src/errors.js';

describe('ProofError hierarchy', () => {
  describe('ProofError (base)', () => {
    it('creates error with message and code', () => {
      const error = new ProofError('Test error', 'TEST_001');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_001');
      expect(error.name).toBe('ProofError');
    });

    it('is instanceof Error', () => {
      const error = new ProofError('Test', 'CODE');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Manifest errors', () => {
    it('ProofManifestError has correct code', () => {
      const error = new ProofManifestError('Test');
      expect(error.code).toBe('PROOF_E001_MANIFEST');
      expect(error.name).toBe('ProofManifestError');
    });

    it('ProofManifestBuildError includes filePath', () => {
      const error = new ProofManifestBuildError('Build failed', '/path/to/file');
      expect(error.code).toBe('PROOF_E002_MANIFEST_BUILD');
      expect(error.filePath).toBe('/path/to/file');
    });

    it('ProofManifestParseError has parse code', () => {
      const error = new ProofManifestParseError('Parse failed');
      expect(error.code).toBe('PROOF_E003_MANIFEST_PARSE');
    });
  });

  describe('Verify errors', () => {
    it('ProofVerifyError has correct code', () => {
      const error = new ProofVerifyError('Verify failed');
      expect(error.code).toBe('PROOF_E010_VERIFY');
    });

    it('ProofFileNotFoundError includes filePath', () => {
      const error = new ProofFileNotFoundError('/missing/file');
      expect(error.filePath).toBe('/missing/file');
      expect(error.message).toContain('/missing/file');
    });

    it('ProofHashMismatchError includes hash details', () => {
      const error = new ProofHashMismatchError('/file', 'abc', 'xyz');
      expect(error.filePath).toBe('/file');
      expect(error.expectedHash).toBe('abc');
      expect(error.actualHash).toBe('xyz');
    });
  });

  describe('Snapshot errors', () => {
    it('ProofSnapshotError has correct code', () => {
      const error = new ProofSnapshotError('Snapshot failed');
      expect(error.code).toBe('PROOF_E020_SNAPSHOT');
    });

    it('ProofSnapshotCreateError includes filePath', () => {
      const error = new ProofSnapshotCreateError('Create failed', '/path');
      expect(error.filePath).toBe('/path');
    });

    it('ProofSnapshotRestoreError includes filePath', () => {
      const error = new ProofSnapshotRestoreError('Restore failed', '/path');
      expect(error.filePath).toBe('/path');
    });

    it('ProofSnapshotNotFoundError includes snapshotId', () => {
      const error = new ProofSnapshotNotFoundError('snap-123');
      expect(error.snapshotId).toBe('snap-123');
    });
  });

  describe('Diff errors', () => {
    it('ProofDiffError has correct code', () => {
      const error = new ProofDiffError('Diff failed');
      expect(error.code).toBe('PROOF_E030_DIFF');
    });

    it('ProofDiffInvalidInputError has invalid input code', () => {
      const error = new ProofDiffInvalidInputError('Invalid input');
      expect(error.code).toBe('PROOF_E031_DIFF_INVALID_INPUT');
    });
  });

  describe('Serialization errors', () => {
    it('ProofSerializeError has correct code', () => {
      const error = new ProofSerializeError('Serialize failed');
      expect(error.code).toBe('PROOF_E040_SERIALIZE');
    });

    it('ProofDeserializeError has correct code', () => {
      const error = new ProofDeserializeError('Deserialize failed');
      expect(error.code).toBe('PROOF_E041_DESERIALIZE');
    });
  });
});
