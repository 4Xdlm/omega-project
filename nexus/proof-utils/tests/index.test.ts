/**
 * Index Export Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect } from 'vitest';
import * as ProofUtils from '../src/index.js';

describe('proof-utils exports', () => {
  it('exports version constant', () => {
    expect(ProofUtils.PROOF_UTILS_VERSION).toBe('2.0.0');
  });

  describe('Types', () => {
    it('exports Clock types', () => {
      expect(ProofUtils.systemClock).toBeDefined();
      expect(typeof ProofUtils.systemClock.now).toBe('function');
      expect(ProofUtils.mockClock).toBeDefined();
    });
  });

  describe('Errors', () => {
    it('exports base error', () => {
      expect(ProofUtils.ProofError).toBeDefined();
    });

    it('exports manifest errors', () => {
      expect(ProofUtils.ProofManifestError).toBeDefined();
      expect(ProofUtils.ProofManifestBuildError).toBeDefined();
      expect(ProofUtils.ProofManifestParseError).toBeDefined();
    });

    it('exports verify errors', () => {
      expect(ProofUtils.ProofVerifyError).toBeDefined();
      expect(ProofUtils.ProofFileNotFoundError).toBeDefined();
      expect(ProofUtils.ProofHashMismatchError).toBeDefined();
    });

    it('exports snapshot errors', () => {
      expect(ProofUtils.ProofSnapshotError).toBeDefined();
      expect(ProofUtils.ProofSnapshotCreateError).toBeDefined();
      expect(ProofUtils.ProofSnapshotRestoreError).toBeDefined();
      expect(ProofUtils.ProofSnapshotNotFoundError).toBeDefined();
    });

    it('exports diff errors', () => {
      expect(ProofUtils.ProofDiffError).toBeDefined();
      expect(ProofUtils.ProofDiffInvalidInputError).toBeDefined();
    });

    it('exports serialization errors', () => {
      expect(ProofUtils.ProofSerializeError).toBeDefined();
      expect(ProofUtils.ProofDeserializeError).toBeDefined();
    });
  });

  describe('Manifest', () => {
    it('exports buildManifest', () => {
      expect(ProofUtils.buildManifest).toBeDefined();
      expect(typeof ProofUtils.buildManifest).toBe('function');
    });
  });

  describe('Verify', () => {
    it('exports verifyManifest', () => {
      expect(ProofUtils.verifyManifest).toBeDefined();
      expect(typeof ProofUtils.verifyManifest).toBe('function');
    });
  });

  describe('Snapshot', () => {
    it('exports snapshot functions', () => {
      expect(ProofUtils.createSnapshot).toBeDefined();
      expect(ProofUtils.restoreSnapshot).toBeDefined();
      expect(ProofUtils.verifySnapshot).toBeDefined();
      expect(ProofUtils.compareSnapshots).toBeDefined();
      expect(ProofUtils.resetIdCounter).toBeDefined();
      expect(ProofUtils.seededIdGenerator).toBeDefined();
    });
  });

  describe('Diff', () => {
    it('exports diff functions', () => {
      expect(ProofUtils.diffManifests).toBeDefined();
      expect(ProofUtils.filterDiff).toBeDefined();
      expect(ProofUtils.hasChanges).toBeDefined();
      expect(ProofUtils.getChangedPaths).toBeDefined();
      expect(ProofUtils.getAddedPaths).toBeDefined();
      expect(ProofUtils.getRemovedPaths).toBeDefined();
      expect(ProofUtils.getModifiedPaths).toBeDefined();
      expect(ProofUtils.summarizeDiff).toBeDefined();
    });
  });

  describe('Serialize', () => {
    it('exports serialization functions', () => {
      expect(ProofUtils.serializeManifest).toBeDefined();
      expect(ProofUtils.deserializeManifest).toBeDefined();
      expect(ProofUtils.serializeSnapshot).toBeDefined();
      expect(ProofUtils.deserializeSnapshot).toBeDefined();
      expect(ProofUtils.saveManifest).toBeDefined();
      expect(ProofUtils.loadManifest).toBeDefined();
      expect(ProofUtils.saveSnapshot).toBeDefined();
      expect(ProofUtils.loadSnapshot).toBeDefined();
    });
  });
});
