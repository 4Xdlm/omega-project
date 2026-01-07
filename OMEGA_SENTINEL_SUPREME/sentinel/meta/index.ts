/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SENTINEL SUPREME — META MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * @module meta
 * @version 2.0.0
 * @license MIT
 * 
 * META — THE SYSTEM THAT OBSERVES ITSELF
 * ======================================
 * 
 * 5 Pillars:
 * 1. CANONICAL — Deterministic serialization
 * 2. ORCHESTRATOR — Certification pipeline
 * 3. INTROSPECTION — System snapshot
 * 4. BOUNDARY — Explicit limitations
 * 5. EXPORT — Portable certification
 * 6. SEAL — Final cryptographic certificate
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Constants
  FLOAT_PRECISION,
  FLOAT_EPSILON,
  
  // Validation
  isDangerousNumber,
  validateForSerialization,
  isCanonicalizable,
  
  // Quantization
  quantizeFloat,
  quantizeFloats,
  
  // Key sorting
  sortKeysDeep,
  
  // String normalization
  normalizeLF,
  normalizePath,
  normalizeStrings,
  
  // Array normalization
  sortUnique,
  isSortedUnique,
  
  // Canonical serialization
  prepareForCanonical,
  canonicalize,
  canonicalHash,
  canonicalEquals,
  floatEquals,
  
  // File hashing
  hashFileContent,
  computeMerkleHash,
  
  // Documentation
  getCanonicalRules
} from './canonical.js';

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type PipelineStage,
  type StageStatus,
  type StageResultCore,
  type StageResultMeta,
  type StageResult,
  type PipelineJournalCore,
  type PipelineJournalMeta,
  type PipelineJournal,
  type StageTransition,
  type StageHandler,
  type PipelineContext,
  
  // Constants
  PIPELINE_STAGES,
  STAGE_TRANSITIONS,
  
  // Validation
  isValidStage,
  isValidStatus,
  getStageIndex,
  isValidTransition,
  getTransition,
  
  // Stage result creation
  createStageResultCore,
  createStageResultMeta,
  createStageResult,
  
  // Journal operations
  generatePipelineId,
  resetJournalCounter,
  createJournalCore,
  addStageToJournal,
  computeJournalHash,
  createPipelineJournal,
  verifyJournalHash,
  
  // Pipeline execution
  createPipelineContext,
  executeTransition,
  isPipelineComplete,
  isPipelineFailed,
  getNextStage,
  getPreviousStage,
  
  // Queries
  getPassedStages,
  getFailedStages,
  getStageResult,
  countStagesByStatus,
  
  // Documentation
  formatJournal,
  generatePipelineDiagram
} from './orchestrator.js';

// ═══════════════════════════════════════════════════════════════════════════════
// INTROSPECTION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type ModuleState,
  type FileInfo,
  type SnapshotCore,
  type SnapshotMeta,
  type SystemSnapshot,
  type SnapshotDiff,
  
  // Constants
  EXPECTED_MODULES,
  SYSTEM_VERSION,
  
  // Validation
  validateExpectedModules,
  validateSnapshotCompleteness,
  
  // Module state creation
  createModuleState,
  createFileInfo,
  
  // Snapshot creation
  createSnapshotCore,
  createSnapshotMeta,
  computeSnapshotCoreHash,
  createSystemSnapshot,
  verifySnapshotHash,
  
  // Snapshot diff
  diffSnapshots,
  
  // Queries
  getModule,
  getModuleNames,
  countTotalFiles,
  getTestPassRate,
  allTestsPassed as snapshotAllTestsPassed,
  
  // Documentation
  formatSnapshotSummary,
  formatDiffSummary
} from './introspection.js';

// ═══════════════════════════════════════════════════════════════════════════════
// BOUNDARY
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type BoundaryCategory,
  type BoundaryCore,
  type BoundaryMeta,
  type Boundary,
  type BoundaryLedgerCore,
  type BoundaryLedgerMeta,
  type BoundaryLedger,
  type Guarantee,
  type GuaranteeLedgerCore,
  type GuaranteeLedger,
  
  // Constants
  BOUNDARY_LEDGER_VERSION,
  GUARANTEE_LEDGER_VERSION,
  BOUNDARY_CATEGORIES,
  MANDATORY_BOUNDARIES,
  SYSTEM_GUARANTEES,
  
  // Validation
  isValidCategory,
  isValidBoundaryId,
  isValidGuaranteeId,
  containsAllMandatory,
  
  // Boundary creation
  createBoundaryCore,
  createBoundaryMeta,
  createBoundary,
  
  // Ledger operations
  createBoundaryLedgerCore,
  computeBoundaryLedgerHash,
  createBoundaryLedger,
  verifyBoundaryLedgerHash,
  addBoundaryToLedger,
  
  // Guarantee ledger
  createGuaranteeLedgerCore,
  computeGuaranteeLedgerHash,
  createGuaranteeLedger,
  
  // Queries
  getBoundariesByCategory,
  getBoundaryById,
  countBoundariesByCategory,
  getGuaranteeById,
  isGuaranteed,
  
  // Documentation
  formatBoundaryLedger,
  formatGuaranteeLedger,
  generateDisclaimer
} from './boundary.js';

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type InvariantRef,
  type ArtifactRef,
  type ExportCore,
  type ExportMeta,
  type SystemExport,
  type ImportValidation,
  
  // Constants
  EXPORT_FORMAT_VERSION,
  MIN_IMPORT_VERSION,
  EXPORT_EXTENSION,
  
  // Serialization
  serializeExportCore,
  computeExportCoreHash,
  serializeExport,
  deserializeExport,
  
  // Export creation
  createExportMeta,
  createExportCore,
  createSystemExport,
  
  // Export operations
  exportSystem,
  exportSystemFull,
  
  // Import operations
  importSystem,
  extractCore,
  
  // Validation
  verifyExportHash,
  isVersionCompatible,
  validateImport,
  importAndValidate,
  
  // Round-trip
  verifyRoundTrip,
  verifyMultipleRoundTrips,
  
  // Queries
  getInvariantCount,
  getArtifactCount,
  getBoundaryCount,
  getGuaranteeCount,
  
  // Documentation
  formatExportSummary,
  formatValidation
} from './export.js';

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Types
  type SealCore,
  type SealMeta,
  type OmegaSeal,
  type SealVerification,
  type SealStatus,
  
  // Constants
  SEAL_VERSION,
  
  // Seal creation
  generateSystemId,
  resetSealCounter,
  generateLimitationsSummary,
  createSealCore,
  createSealMeta,
  computeSealHash,
  createOmegaSeal,
  
  // Verification
  verifySealHash,
  verifyBoundaryCount,
  verifyGuaranteeCount,
  verifySeal,
  getSealStatus,
  
  // Queries
  allTestsPassed as sealAllTestsPassed,
  getTestPassRate as sealGetTestPassRate,
  meetsMinimumRegion,
  getSealAgeInDays,
  
  // Serialization
  serializeSeal,
  deserializeSeal,
  
  // Comparison
  compareSeals,
  
  // Documentation
  formatSeal,
  formatVerification
} from './seal.js';
