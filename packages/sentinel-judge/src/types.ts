/**
 * OMEGA Phase C — SENTINEL_JUDGE Types
 * 
 * Version: 1.0.0
 * Date: 2026-01-26
 * Standard: NASA-Grade L4
 * 
 * Aligned with:
 * - docs/phase-c/C_CONTRACT.md v1.1.0
 * - docs/phase-c/schema/*.schema.json v1.0.0
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gate classification for execution flow control
 */
export type GateClass = 'REQUIRED' | 'OPTIONAL';

/**
 * Policy when a gate fails
 */
export type FailPolicy = 'REJECT' | 'DEFER' | 'APPEAL';

/**
 * Final verdict of a judgement
 */
export type Verdict = 'ACCEPT' | 'REJECT' | 'DEFER' | 'APPEAL';

/**
 * Type of claim being judged
 */
export type ClaimType =
  | 'ARTIFACT_CERTIFICATION'
  | 'EVIDENCE_VALIDATION'
  | 'SEGMENT_ACCEPTANCE'
  | 'FACT_PROMOTION'
  | 'MEMORY_ENTRY'
  | 'CUSTOM';

/**
 * Type of context reference
 */
export type ContextRefType = 'PHASE_A' | 'PHASE_B' | 'CANON' | 'MEMORY' | 'ARTIFACT';

/**
 * Scope where a policy applies
 */
export type PolicyScope = 'CANON' | 'MEMORY' | 'ARTIFACT' | 'PROMOTION' | 'ALL';

/**
 * Severity of a policy violation
 */
export type Severity = 'BLOCKER' | 'MAJOR' | 'MINOR';

/**
 * Verdict from a proof source
 */
export type ProofVerdict = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';

/**
 * Type of required action
 */
export type ActionType =
  | 'PROVIDE_EVIDENCE'
  | 'RECALIBRATE'
  | 'ESCALATE'
  | 'RESOLVE_CONFLICT'
  | 'RETRY'
  | 'MANUAL_REVIEW';

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES — DecisionRequest
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input to SENTINEL_JUDGE for claim evaluation
 */
export interface DecisionRequest {
  /** Unique trace ID, format: C-{YYYYMMDD}-{HHMMSS}-{uuid4} */
  traceId: string;
  /** Module ID that submitted this request */
  submittedBy: string;
  /** ISO 8601 timestamp (VOLATILE - excluded from hash) */
  submittedAt: string;
  /** The claim to be evaluated */
  claim: Claim;
  /** References to context documents */
  contextRefs: ContextRef[];
  /** Evidence pack supporting the claim */
  evidencePack: EvidencePack;
  /** Policies to evaluate against */
  policyBundle: PolicyBundle;
}

/**
 * A claim to be evaluated
 */
export interface Claim {
  /** Type of claim being made */
  type: ClaimType;
  /** Claim-specific payload data */
  payload: Record<string, unknown>;
  /** SHA-256 of canonical JSON payload */
  payloadHash: string;
}

/**
 * Reference to a context document
 */
export interface ContextRef {
  /** Type of referenced context */
  refType: ContextRefType;
  /** Path to the referenced document */
  path: string;
  /** SHA-256 of the referenced document */
  sha256: string;
  /** Optional version tag */
  version?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES — EvidencePack
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Container for evidence submitted with a DecisionRequest
 */
export interface EvidencePack {
  /** SHA-256 of all inputs (sorted, canonical JSON) */
  inputsDigest: string;
  /** List of evidence proofs */
  proofs: Proof[];
  /** List of missing evidence items */
  missing: MissingEvidence[];
}

/**
 * A single proof item
 */
export interface Proof {
  /** Type of proof, e.g., HASH_CHAIN, J1_VERDICT, GATE_PASS */
  proofType: string;
  /** Source module that produced this proof */
  source: string;
  /** Version of the source module */
  sourceVersion: string;
  /** SHA-256 hash of the proof content */
  hash: string;
  /** Verdict from the source module */
  verdict: ProofVerdict;
  /** Optional metrics (no magic numbers - values must reference calibration) */
  metrics?: Record<string, unknown>;
}

/**
 * Missing evidence declaration
 */
export interface MissingEvidence {
  /** Type of evidence that is missing */
  evidenceType: string;
  /** Reason why evidence is missing */
  reason: string;
  /** If true, this missing evidence triggers DEFER verdict */
  blocksVerdict: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES — PolicyRef & PolicyBundle
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Reference to a policy/invariant
 */
export interface PolicyRef {
  /** Invariant identifier, e.g., INV-C-01, INV-SENT-001 */
  invariantId: string;
  /** Path to source document containing the invariant */
  sourcePath: string;
  /** SHA-256 hash of the source document */
  sourceSha256: string;
  /** Version tag of the source document */
  versionTag: string;
  /** Scope where this policy applies */
  scope: PolicyScope;
  /** Severity of violation */
  severity: Severity;
}

/**
 * Bundle of policies for evaluation
 */
export interface PolicyBundle {
  /** Unique identifier for this bundle */
  bundleId: string;
  /** Version of this bundle */
  bundleVersion: string;
  /** SHA-256 of sorted policies */
  bundleSha256: string;
  /** At least one policy required */
  policies: PolicyRef[];
  /** Optional reference to calibration */
  calibrationRef?: CalibrationRef;
}

/**
 * Reference to calibration file
 */
export interface CalibrationRef {
  /** Path to calibration file */
  path: string;
  /** SHA-256 of calibration file */
  sha256: string;
  /** Version of calibration */
  version: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE INTERFACES — Judgement
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Output from SENTINEL_JUDGE after claim evaluation
 */
export interface Judgement {
  /** Unique judgement ID, format: J-{YYYYMMDD}-{HHMMSS}-{uuid4} */
  judgementId: string;
  /** Links to the original DecisionRequest */
  traceId: string;
  /** Final verdict of the judgement */
  verdict: Verdict;
  /** Reasons for the verdict (at least one required) */
  reasons: ReasonCode[];
  /** Actions required (especially for DEFER/APPEAL) */
  requiredActions: RequiredAction[];
  /** SHA-256 hashes of evidence used (at least one required) */
  evidenceRefs: string[];
  /** Hash of previous judgement in chain, or 'GENESIS' for first */
  prevJudgementHash: string;
  /** SHA-256 of this judgement (excluding volatile fields) */
  judgementHash: string;
  /** ISO 8601 timestamp (VOLATILE - excluded from hash) */
  executedAt: string;
  /** Execution duration in milliseconds (VOLATILE - excluded from hash) */
  executionDurationMs: number;
}

/**
 * Reason code for a verdict
 */
export interface ReasonCode {
  /** Reason code, e.g., RC-001, INV-C-01-VIOLATION, ERR-C-GATE-01 */
  code: string;
  /** Severity of this reason */
  severity: Severity;
  /** Optional reference to violated invariant */
  invariantRef?: string;
}

/**
 * Required action for DEFER/APPEAL verdicts
 */
export interface RequiredAction {
  /** Type of action required */
  actionType: ActionType;
  /** Human-readable description of required action */
  description: string;
  /** Optional target module for the action */
  targetModule?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Gate definition for request validation
 */
export interface GateDefinition {
  /** Gate identifier, e.g., GATE_C_01 */
  id: string;
  /** Human-readable description */
  description: string;
  /** Gate classification */
  gateClass: GateClass;
  /** Policy when this gate fails */
  failPolicy: FailPolicy;
  /** Error code when this gate fails */
  errorCode: string;
}

/**
 * Result of gate evaluation
 */
export interface GateResult {
  /** Whether execution can proceed */
  proceed: boolean;
  /** Suggested verdict if proceed is false */
  suggestedVerdict?: Verdict;
  /** List of failures */
  failures: GateFailure[];
}

/**
 * A single gate failure
 */
export interface GateFailure {
  /** Gate that failed */
  gateId: string;
  /** Error code */
  errorCode: string;
  /** Suggested verdict based on failPolicy */
  suggestedVerdict: Verdict;
  /** Human-readable message */
  message: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Error codes for SENTINEL_JUDGE
 * Pattern: ERR-C-{CATEGORY}-{NUMBER}
 */
export const ERROR_CODES = {
  // Gate errors
  GATE_01: 'ERR-C-GATE-01',  // Invalid traceId format
  GATE_02: 'ERR-C-GATE-02',  // Payload hash mismatch
  GATE_03: 'ERR-C-GATE-03',  // Invalid contextRef sha256
  GATE_04: 'ERR-C-GATE-04',  // Invalid inputsDigest
  GATE_05: 'ERR-C-GATE-05',  // Empty policyBundle
  GATE_06: 'ERR-C-GATE-06',  // Invalid PolicyRef sha256
  GATE_07: 'ERR-C-GATE-07',  // Magic number detected
  GATE_08: 'ERR-C-GATE-08',  // Missing blocking evidence
  GATE_09: 'ERR-C-GATE-09',  // Uncalibrated threshold
  
  // Schema errors
  SCHEMA_01: 'ERR-C-SCHEMA-01',  // Schema validation failed
  SCHEMA_02: 'ERR-C-SCHEMA-02',  // Schema not found
  SCHEMA_03: 'ERR-C-SCHEMA-03',  // Invalid schema format
  
  // Digest errors
  DIGEST_01: 'ERR-C-DIGEST-01',  // Hash computation failed
  DIGEST_02: 'ERR-C-DIGEST-02',  // Hash mismatch
  
  // Canonical JSON errors
  CANONICAL_01: 'ERR-C-CANONICAL-01',  // Serialization failed
  CANONICAL_02: 'ERR-C-CANONICAL-02',  // Invalid input type
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Typed error for SENTINEL_JUDGE
 */
export class SentinelJudgeError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(`[${code}] ${message}`);
    this.name = 'SentinelJudgeError';
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// VOLATILE FIELDS — Excluded from hash computation
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fields to exclude from hash computation for DecisionRequest
 */
export const DECISION_REQUEST_VOLATILE_FIELDS: readonly string[] = [
  'submittedAt',
] as const;

/**
 * Fields to exclude from hash computation for Judgement
 */
export const JUDGEMENT_VOLATILE_FIELDS: readonly string[] = [
  'executedAt',
  'executionDurationMs',
  'judgementHash',
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// REGEX PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Regex patterns for validation
 */
export const PATTERNS = {
  /** traceId format: C-{YYYYMMDD}-{HHMMSS}-{uuid4} */
  TRACE_ID: /^C-[0-9]{8}-[0-9]{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  /** judgementId format: J-{YYYYMMDD}-{HHMMSS}-{uuid4} */
  JUDGEMENT_ID: /^J-[0-9]{8}-[0-9]{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  /** SHA-256 hash: 64 lowercase hex characters */
  SHA256: /^[a-f0-9]{64}$/,
  /** Invariant ID: INV-{MODULE}-{NUMBER} where MODULE can include sub-identifiers like C-FA, C-GATE, SENT */
  INVARIANT_ID: /^INV-[A-Z]+(-[A-Z]+)*-[0-9]+$/,
  /** Reason code: RC-{NUMBER} or INV-*-VIOLATION or ERR-C-* */
  REASON_CODE: /^(RC-[0-9]{3}|INV-[A-Z]+(-[A-Z]+)*-[0-9]+-VIOLATION|ERR-C-[A-Z]+-[0-9]+)$/,
  /** Previous judgement hash: 64 hex chars or 'GENESIS' */
  PREV_JUDGEMENT_HASH: /^([a-f0-9]{64}|GENESIS)$/,
} as const;
