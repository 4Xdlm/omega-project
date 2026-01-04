/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA PROJECT — CREATION_LAYER
 * index.ts — Public API
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * VERSION     : 1.0.0-NASA
 * PHASE       : 9A
 * STANDARD    : DO-178C Level A / MIL-STD-882E
 * 
 * NCR OUVERTES :
 *   NCR-CRE-01 : Template Purity non prouvable sans sandbox réelle (→ 9C)
 *   NCR-CRE-02 : Timeout non garanti sans worker/coop (→ 9C)
 *   NCR-CRE-03 : Cache = optimisation, jamais invariant
 * 
 * INVARIANTS PROUVÉS (9A) :
 *   INV-CRE-07 : Request Validation ✅
 *   INV-CRE-10 : Idempotency (request_hash) ✅
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — DEF-01 to DEF-04
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  // Configuration
  CreationConfig,
  
  // DEF-01: Artifact
  ArtifactType,
  SourceRef,
  Artifact,
  
  // DEF-02: Template
  JSONSchema,
  ReadOnlySnapshotContext,
  SnapshotEntry,
  Template,
  RegisteredTemplate,
  
  // DEF-03: Request
  CreationRequest,
  CreationResult,
  CreationErrorInfo,
  CreationErrorCode,
  
  // DEF-04: Confidence
  Assumption,
  AssumptionReason,
  ConfidenceReport,
} from "./creation_types.js";

export {
  // Constants
  ARTIFACT_TYPES,
  ASSUMPTION_REASONS,
  SCHEMA_VERSION,
  DEFAULT_CREATION_CONFIG,
  
  // Type Guards
  isArtifactType,
  isSourceRef,
  isArtifact,
  isTemplate,
  isCreationRequest,
  isAssumption,
  isConfidenceReport,
  
  // Utilities
  validateArtifactType,
  validateAssumptionReason,
  ConfidenceReportBuilder,
  createAssumption,
} from "./creation_types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ErrorDefinition,
} from "./creation_errors.js";

export {
  ERROR_DEFINITIONS,
  CreationError,
  CreationErrors,
  isCreationError,
  wrapError,
  getErrorChain,
  formatError,
} from "./creation_errors.js";

// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ValidationResult,
  CreateRequestInput,
} from "./creation_request.js";

export {
  // Canonical encoding (shared with MEMORY_LAYER)
  canonicalEncode,
  
  // Hashing
  sha256,
  sha256Sync,
  
  // Validation — INV-CRE-07
  validateRequest,
  
  // Hash computation — INV-CRE-10
  computeRequestHash,
  computeRequestHashSync,
  
  // Request builder
  createRequest,
  createRequestSync,
  
  // Utilities
  requestsEqual,
  cloneRequest,
  generateRequestId,
} from "./creation_request.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT CONTEXT — Phase 9B
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  SnapshotProvider,
  SourceVerificationResult,
} from "./snapshot_context.js";

export {
  // Deep freeze utilities — INV-CRE-06
  deepFreeze,
  isDeepFrozen,
  
  // Context creation — INV-CRE-01
  createReadOnlyContext,
  
  // Source verification — INV-CRE-11
  verifySource,
  verifySources,
  requireValidSources,
  
  // Source ref builder
  createSourceRef,
  
  // Mock for testing
  MockSnapshotProvider,
} from "./snapshot_context.js";

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE REGISTRY — Phase 9C
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  ExecutionOptions,
  ExecutionResult,
} from "./template_registry.js";

export {
  // Registry
  TemplateRegistry,
  globalRegistry,
  
  // Execution — INV-CRE-04, INV-CRE-08
  executeTemplate,
  executeTemplateSync,
  
  // Validation
  validateParams,
  validateOutput,
  
  // Helper
  createTemplate,
} from "./template_registry.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ARTIFACT BUILDER — Phase 9C
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  QuickBuildOptions,
  ArtifactVerificationResult,
} from "./artifact_builder.js";

export {
  // Build context — INV-CRE-03, INV-CRE-05, INV-CRE-09
  ArtifactBuildContext,
  createBuildContext,
  
  // Quick build
  buildArtifact,
  
  // Verification
  verifyArtifact,
  requireValidArtifact,
  
  // Comparison
  artifactsEqual,
  sameSnapshotOrigin,
  hasCompleteDerivation,
} from "./artifact_builder.js";

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const CREATION_LAYER_VERSION = "1.0.0-NASA" as const;
export const CREATION_LAYER_PHASE = "9C" as const;

/**
 * Metadata about this module
 */
export const CREATION_LAYER_INFO = Object.freeze({
  name: "@omega/creation-layer",
  version: CREATION_LAYER_VERSION,
  phase: CREATION_LAYER_PHASE,
  standard: "DO-178C Level A",
  
  invariants: {
    proven: [
      "INV-CRE-01", // Snapshot-Only
      "INV-CRE-03", // Full Provenance
      "INV-CRE-04", // Deterministic Output
      "INV-CRE-05", // Derivation Honesty
      "INV-CRE-06", // Template Purity (deepFreeze)
      "INV-CRE-07", // Request Validation
      "INV-CRE-08", // Bounded Execution (soft limit)
      "INV-CRE-09", // Atomic Output
      "INV-CRE-10", // Idempotency
      "INV-CRE-11", // Source Verification
    ],
    pending: ["INV-CRE-02"], // No Write Authority (→ 9E)
  },
  
  ncr: {
    open: ["NCR-CRE-01", "NCR-CRE-02", "NCR-CRE-03"],
    description: {
      "NCR-CRE-01": "Template Purity non prouvable sans sandbox réelle",
      "NCR-CRE-02": "Timeout non garanti sans worker/coop",
      "NCR-CRE-03": "Cache = optimisation, jamais invariant",
    },
  },
});
