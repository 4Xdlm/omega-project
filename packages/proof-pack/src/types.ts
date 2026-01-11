/**
 * @fileoverview OMEGA Proof Pack - Type Definitions
 * @module @omega/proof-pack
 *
 * Evidence bundling and audit trail types.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF PACK TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Evidence type classification.
 */
export type EvidenceType =
  | 'TEST_LOG'       // Test execution log
  | 'HASH_MANIFEST'  // SHA-256 hash manifest
  | 'CERTIFICATE'    // Phase/module certificate
  | 'SOURCE_BUNDLE'  // Source code snapshot
  | 'CONFIG'         // Configuration files
  | 'ARTIFACT'       // Generated artifact
  | 'RECORDING'      // Execution recording
  | 'TRACE';         // Execution trace

/**
 * Evidence entry in proof pack.
 */
export interface EvidenceEntry {
  /** Unique evidence ID */
  readonly id: string;
  /** Evidence type */
  readonly type: EvidenceType;
  /** File path relative to pack root */
  readonly path: string;
  /** SHA-256 hash of content */
  readonly hash: string;
  /** Creation timestamp (ISO) */
  readonly createdAt: string;
  /** Optional description */
  readonly description?: string;
  /** Size in bytes */
  readonly sizeBytes: number;
  /** MIME type */
  readonly mimeType: string;
}

/**
 * Proof pack manifest.
 */
export interface ProofPackManifest {
  /** Manifest version */
  readonly version: string;
  /** Pack identifier */
  readonly packId: string;
  /** Pack name/title */
  readonly name: string;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Phase number if applicable */
  readonly phase?: number;
  /** Module name if applicable */
  readonly module?: string;
  /** Evidence entries */
  readonly evidence: readonly EvidenceEntry[];
  /** Pack metadata */
  readonly metadata: ProofPackMetadata;
  /** Root hash (hash of all evidence hashes) */
  readonly rootHash: string;
}

/**
 * Proof pack metadata.
 */
export interface ProofPackMetadata {
  /** Standard compliance level */
  readonly standard: string;
  /** Generator version */
  readonly generatorVersion: string;
  /** Platform info */
  readonly platform?: string;
  /** Git commit if available */
  readonly commit?: string;
  /** Git tag if available */
  readonly tag?: string;
  /** Additional tags */
  readonly tags?: readonly string[];
  /** Author/certifier */
  readonly certifiedBy?: string;
}

/**
 * Proof pack bundle (complete pack).
 */
export interface ProofPackBundle {
  /** Manifest */
  readonly manifest: ProofPackManifest;
  /** Serialized content (base64 or references) */
  readonly content: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Verification result for single evidence.
 */
export interface EvidenceVerificationResult {
  /** Evidence ID */
  readonly evidenceId: string;
  /** Whether verification passed */
  readonly valid: boolean;
  /** Expected hash */
  readonly expectedHash: string;
  /** Actual hash */
  readonly actualHash: string;
  /** Error message if failed */
  readonly error?: string;
}

/**
 * Verification result for entire pack.
 */
export interface PackVerificationResult {
  /** Pack ID */
  readonly packId: string;
  /** Whether all evidence verified */
  readonly valid: boolean;
  /** Root hash verification */
  readonly rootHashValid: boolean;
  /** Individual evidence results */
  readonly evidenceResults: readonly EvidenceVerificationResult[];
  /** Verification timestamp */
  readonly verifiedAt: string;
  /** Summary statistics */
  readonly summary: VerificationSummary;
}

/**
 * Verification summary statistics.
 */
export interface VerificationSummary {
  /** Total evidence count */
  readonly total: number;
  /** Verified count */
  readonly verified: number;
  /** Failed count */
  readonly failed: number;
  /** Missing count */
  readonly missing: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUILDER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Options for creating a proof pack.
 */
export interface ProofPackOptions {
  /** Pack name */
  readonly name: string;
  /** Phase number */
  readonly phase?: number;
  /** Module name */
  readonly module?: string;
  /** Standard compliance */
  readonly standard?: string;
  /** Git commit */
  readonly commit?: string;
  /** Git tag */
  readonly tag?: string;
  /** Additional tags */
  readonly tags?: readonly string[];
  /** Certifier name */
  readonly certifiedBy?: string;
}

/**
 * Evidence file to add.
 */
export interface EvidenceFile {
  /** Evidence type */
  readonly type: EvidenceType;
  /** File path */
  readonly path: string;
  /** File content */
  readonly content: string | Buffer;
  /** Optional description */
  readonly description?: string;
  /** MIME type (auto-detected if not provided) */
  readonly mimeType?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Current manifest version */
export const MANIFEST_VERSION = '1.0.0';

/** Generator version */
export const GENERATOR_VERSION = '0.1.0';

/** Default standard */
export const DEFAULT_STANDARD = 'NASA-Grade L4 / DO-178C Level A';

/** MIME types by extension */
export const MIME_TYPES: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.ts': 'text/typescript',
  '.js': 'application/javascript',
  '.sha256': 'text/plain',
  '.log': 'text/plain',
  '.zip': 'application/zip',
};
