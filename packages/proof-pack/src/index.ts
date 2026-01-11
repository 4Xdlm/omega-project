/**
 * @fileoverview OMEGA Proof Pack - Public API
 * @module @omega/proof-pack
 *
 * Evidence bundling and audit trail.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  EvidenceType,
  EvidenceEntry,
  ProofPackManifest,
  ProofPackMetadata,
  ProofPackBundle,
  EvidenceVerificationResult,
  PackVerificationResult,
  VerificationSummary,
  ProofPackOptions,
  EvidenceFile,
} from './types.js';

export {
  MANIFEST_VERSION,
  GENERATOR_VERSION,
  DEFAULT_STANDARD,
  MIME_TYPES,
} from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  ProofPackBuilder,
  createProofPackBuilder,
  createPhaseProofPack,
} from './builder.js';

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFIER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  verifyProofPack,
  verifyManifest,
  verifyEvidence,
  computeRootHash,
  validateManifest,
  isFullyVerified,
  getFailedEvidence,
  formatVerificationReport,
} from './verifier.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SERIALIZER
// ═══════════════════════════════════════════════════════════════════════════════

export type { ExportFormat, ArchiveEntry, ProofPackDifference } from './serializer.js';

export {
  serializeProofPack,
  serializeManifest,
  deserializeProofPack,
  deserializeManifest,
  exportProofPack,
  importProofPack,
  toArchiveEntries,
  fromArchiveEntries,
  compareManifests,
} from './serializer.js';
