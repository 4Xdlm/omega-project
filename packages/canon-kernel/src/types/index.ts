/**
 * OMEGA Canon Kernel — Types Index
 * Re-exports all types for public API.
 */

// Identifiers
export {
  type RootHash,
  type EntityId,
  type SchemaId,
  type OpId,
  type TxId,
  ROOTHASH_REGEX,
  isValidRootHash,
  assertRootHash,
  isEntityId,
  isSchemaId,
  isOpId,
  isTxId,
  assertEntityId,
  assertSchemaId,
  assertOpId,
  assertTxId,
} from './identifiers';

// Evidence
export {
  type EvidenceType,
  type EvidenceRef,
  createEvidenceRef,
  sortEvidenceRefs,
} from './evidence';

// Operations
export {
  type OpType,
  type FieldPath,
  type CanonOp,
  createCanonOp,
  sortOps,
} from './operations';

// Transactions
export {
  type RailType,
  type CanonTx,
  type HashableTxView,
  createCanonTx,
} from './transactions';

// Invariants
export {
  type InvariantSeverity,
  type Invariant,
  type InvariantContext,
  type Violation,
  type ValidationResult,
  createValidationResult,
  combineValidationResults,
  VALID,
  invalid,
} from './invariants';

// Conflicts
export {
  type ConflictType,
  type Conflict,
  type ConflictSet,
  type ResolutionStrategy,
  type ResolutionOp,
  createConflict,
  isAutoResolvable,
} from './conflicts';

// Calibration
export {
  Ω_WINDOW,
  Ω_CONTINUITY_MIN,
  Ω_EMOTION_MIN,
  Ω_PACING_MIN,
  Ω_STYLE_MIN,
  Ω_CLARITY_MIN,
  Ω_ORIGINALITY_MIN,
  Ω_PROMISE_MIN,
  Ω_CHAIN_DEPTH_MAX,
  Ω_BATCH_SIZE_MAX,
  Ω_AUTO_RESOLVE_TIMEOUT_MS,
  Ω_ESCALATION_THRESHOLD,
  type CalibrationSymbol,
  type CalibrationConfig,
  TEST_CALIBRATION,
  getCalibrated,
} from './calibration';
