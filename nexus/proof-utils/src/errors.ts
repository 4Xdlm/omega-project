/**
 * Proof Utils Errors
 * Standard: NASA-Grade L4
 * Pattern: ADR-0002 Typed Error Hierarchy
 */

// ============================================================
// Base Error
// ============================================================

export class ProofError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'ProofError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

// ============================================================
// Manifest Errors
// ============================================================

export class ProofManifestError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E001_MANIFEST') {
    super(message, code);
    this.name = 'ProofManifestError';
  }
}

export class ProofManifestBuildError extends ProofManifestError {
  readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message, 'PROOF_E002_MANIFEST_BUILD');
    this.name = 'ProofManifestBuildError';
    this.filePath = filePath;
  }
}

export class ProofManifestParseError extends ProofManifestError {
  constructor(message: string) {
    super(message, 'PROOF_E003_MANIFEST_PARSE');
    this.name = 'ProofManifestParseError';
  }
}

// ============================================================
// Verification Errors
// ============================================================

export class ProofVerifyError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E010_VERIFY') {
    super(message, code);
    this.name = 'ProofVerifyError';
  }
}

export class ProofFileNotFoundError extends ProofVerifyError {
  readonly filePath: string;

  constructor(filePath: string) {
    super(`File not found: ${filePath}`, 'PROOF_E011_FILE_NOT_FOUND');
    this.name = 'ProofFileNotFoundError';
    this.filePath = filePath;
  }
}

export class ProofHashMismatchError extends ProofVerifyError {
  readonly filePath: string;
  readonly expectedHash: string;
  readonly actualHash: string;

  constructor(filePath: string, expectedHash: string, actualHash: string) {
    super(`Hash mismatch for ${filePath}`, 'PROOF_E012_HASH_MISMATCH');
    this.name = 'ProofHashMismatchError';
    this.filePath = filePath;
    this.expectedHash = expectedHash;
    this.actualHash = actualHash;
  }
}

// ============================================================
// Snapshot Errors
// ============================================================

export class ProofSnapshotError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E020_SNAPSHOT') {
    super(message, code);
    this.name = 'ProofSnapshotError';
  }
}

export class ProofSnapshotCreateError extends ProofSnapshotError {
  readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message, 'PROOF_E021_SNAPSHOT_CREATE');
    this.name = 'ProofSnapshotCreateError';
    this.filePath = filePath;
  }
}

export class ProofSnapshotRestoreError extends ProofSnapshotError {
  readonly filePath: string;

  constructor(message: string, filePath: string) {
    super(message, 'PROOF_E022_SNAPSHOT_RESTORE');
    this.name = 'ProofSnapshotRestoreError';
    this.filePath = filePath;
  }
}

export class ProofSnapshotNotFoundError extends ProofSnapshotError {
  readonly snapshotId: string;

  constructor(snapshotId: string) {
    super(`Snapshot not found: ${snapshotId}`, 'PROOF_E023_SNAPSHOT_NOT_FOUND');
    this.name = 'ProofSnapshotNotFoundError';
    this.snapshotId = snapshotId;
  }
}

// ============================================================
// Diff Errors
// ============================================================

export class ProofDiffError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E030_DIFF') {
    super(message, code);
    this.name = 'ProofDiffError';
  }
}

export class ProofDiffInvalidInputError extends ProofDiffError {
  constructor(message: string) {
    super(message, 'PROOF_E031_DIFF_INVALID_INPUT');
    this.name = 'ProofDiffInvalidInputError';
  }
}

// ============================================================
// Serialization Errors
// ============================================================

export class ProofSerializeError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E040_SERIALIZE') {
    super(message, code);
    this.name = 'ProofSerializeError';
  }
}

export class ProofDeserializeError extends ProofError {
  constructor(message: string, code: string = 'PROOF_E041_DESERIALIZE') {
    super(message, code);
    this.name = 'ProofDeserializeError';
  }
}
