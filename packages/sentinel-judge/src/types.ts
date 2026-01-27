/**
 * OMEGA Phase C.1.2 - Types & Schemas (FIXED)
 * Sentinel Judge Core Types
 * 
 * @module types
 * @version 1.2.0
 */

// =============================================================================
// ERROR CODES (Format: ERR-C-[CATEGORY]-[NUMBER])
// =============================================================================

export const ERROR_CODES = {
  // Gate errors
  GATE_01: 'ERR-C-GATE-01',
  GATE_02: 'ERR-C-GATE-02',
  GATE_03: 'ERR-C-GATE-03',
  GATE_04: 'ERR-C-GATE-04',
  GATE_05: 'ERR-C-GATE-05',
  GATE_06: 'ERR-C-GATE-06',
  GATE_07: 'ERR-C-GATE-07',
  GATE_08: 'ERR-C-GATE-08',
  GATE_09: 'ERR-C-GATE-09',
  // Digest errors
  DIGEST_01: 'ERR-C-DIGEST-01',
  DIGEST_02: 'ERR-C-DIGEST-02',
  // Assembly errors
  ASSEMBLE_01: 'ERR-C-ASSEMBLE-01',
  ASSEMBLE_02: 'ERR-C-ASSEMBLE-02',
  // Schema errors
  SCHEMA_01: 'ERR-C-SCHEMA-01',
  SCHEMA_02: 'ERR-C-SCHEMA-02',
  SCHEMA_03: 'ERR-C-SCHEMA-03',
  // Canonical JSON errors
  CANONICAL_01: 'ERR-C-CANONICAL-01',
  CANONICAL_02: 'ERR-C-CANONICAL-02',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// =============================================================================
// PATTERNS (All patterns needed by tests)
// =============================================================================

export const PATTERNS = {
  SHA256: /^[a-f0-9]{64}$/,
  TRACE_ID: /^C-\d{8}-\d{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  JUDGEMENT_ID: /^J-\d{8}-\d{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  ISO_TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  UUID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  POLICY_ID: /^POL-[A-Z0-9-]+$/,
  CLAIM_ID: /^CLM-[A-Z0-9-]+$/,
  PROOF_ID: /^PRF-[A-Z0-9-]+$/,
  INVARIANT_ID: /^INV-[A-Z]+(-[A-Z0-9]+)*-[0-9]+$/,
  REASON_CODE: /^(RC-[0-9]{3}|INV-[A-Z]+-[0-9]+(-[A-Z0-9]+)?-VIOLATION|ERR-C-[A-Z]+-[0-9]+)$/,
  PREV_JUDGEMENT_HASH: /^([a-f0-9]{64}|GENESIS)$/,
} as const;

// =============================================================================
// VOLATILE FIELDS (for digest exclusion)
// =============================================================================

export const DECISION_REQUEST_VOLATILE_FIELDS: readonly string[] = ['submittedAt'];
export const JUDGEMENT_VOLATILE_FIELDS: readonly string[] = ['executedAt', 'executionDurationMs', 'judgementHash'];

// =============================================================================
// SENTINEL JUDGE ERROR
// =============================================================================

export class SentinelJudgeError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, unknown>) {
    super(`${code}: ${message}`);
    this.name = 'SentinelJudgeError';
    this.code = code;
    this.details = details;
  }
}

// =============================================================================
// ENUMS (aligned with JSON schemas)
// =============================================================================

export type Verdict = 'ACCEPT' | 'REJECT' | 'DEFER' | 'APPEAL';
export type GateClass = 'REQUIRED' | 'OPTIONAL';
export type FailPolicy = 'REJECT' | 'DEFER' | 'APPEAL';
export type ClaimType = 'ARTIFACT_CERTIFICATION' | 'EVIDENCE_VALIDATION' | 'SEGMENT_ACCEPTANCE' | 'FACT_PROMOTION' | 'MEMORY_ENTRY' | 'CUSTOM';
export type ContextRefType = 'PHASE_A' | 'PHASE_B' | 'CANON' | 'MEMORY' | 'ARTIFACT';
export type PolicyScope = 'CANON' | 'MEMORY' | 'ARTIFACT' | 'PROMOTION' | 'ALL';
export type Severity = 'BLOCKER' | 'MAJOR' | 'MINOR';
export type ProofVerdict = 'PASS' | 'FAIL' | 'WARN' | 'SKIP';
export type ActionType = 'PROVIDE_EVIDENCE' | 'RECALIBRATE' | 'ESCALATE' | 'RESOLVE_CONFLICT' | 'RETRY' | 'MANUAL_REVIEW';

// =============================================================================
// CORE INTERFACES (aligned with JSON schemas)
// =============================================================================

export interface Claim {
  readonly type: ClaimType;
  readonly payload: unknown;
  readonly payloadHash: string;
}

export interface ContextRef {
  readonly refType: ContextRefType;
  readonly path: string;
  readonly sha256: string;
}

export interface Proof {
  readonly proofType: string;
  readonly source: string;
  readonly sourceVersion: string;
  readonly hash: string;
  readonly verdict: ProofVerdict;
  readonly details?: Record<string, unknown>;
}

export interface MissingEvidence {
  readonly evidenceType: string;
  readonly reason: string;
  readonly blocksVerdict: boolean;
  readonly suggestedAction?: string;
}

export interface EvidencePack {
  readonly inputsDigest: string;
  readonly proofs: readonly Proof[];
  readonly missing: readonly MissingEvidence[];
}

export interface PolicyRef {
  readonly invariantId: string;
  readonly sourcePath: string;
  readonly sourceSha256: string;
  readonly versionTag: string;
  readonly scope: PolicyScope;
  readonly severity: Severity;
}

export interface PolicyBundle {
  readonly bundleId: string;
  readonly bundleVersion: string;
  readonly bundleSha256: string;
  readonly policies: readonly PolicyRef[];
}

export interface ReasonCode {
  readonly code: string;
  readonly severity: Severity;
  readonly message?: string;
}

export interface RequiredAction {
  readonly actionType: ActionType;
  readonly description: string;
  readonly deadline?: string;
}

export interface CalibrationRef {
  readonly calibrationId: string;
  readonly targetGate: string;
  readonly newThreshold?: number;
}

export interface DecisionRequest {
  readonly traceId: string;
  readonly submittedBy: string;
  readonly submittedAt?: string;
  readonly claim: Claim;
  readonly contextRefs: readonly ContextRef[];
  readonly evidencePack?: EvidencePack;
  readonly policyBundle?: PolicyBundle;
}

export interface Judgement {
  readonly judgementId: string;
  readonly traceId: string;
  readonly verdict: Verdict;
  readonly reasons: readonly ReasonCode[];
  readonly requiredActions: readonly RequiredAction[];
  readonly evidenceRefs: readonly string[];
  readonly prevJudgementHash: string;
  readonly judgementHash: string;
  readonly executedAt: string;
  readonly executionDurationMs: number;
  readonly calibrationRefs?: readonly CalibrationRef[];
}

// =============================================================================
// GATE TYPES
// =============================================================================

export interface GateDefinition {
  readonly gateId: string;
  readonly description: string;
  readonly gateClass: GateClass;
  readonly failPolicy: FailPolicy;
  readonly errorCode: string;
}

export interface GateResult {
  readonly gateId: string;
  readonly verdict: 'PASS' | 'REJECT' | 'DEFER';
  readonly reason?: string;
  readonly errorCode?: string;
  readonly timestamp: string;
}

export interface GateFailure {
  readonly gateId: string;
  readonly errorCode: string;
  readonly reason: string;
  readonly timestamp: string;
}

export interface InputGatesResult {
  readonly overallVerdict: 'PASS' | 'REJECT' | 'DEFER';
  readonly gateResults: readonly GateResult[];
  readonly executedAt: string;
  readonly mode: 'STRICT' | 'ADVERSARIAL';
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isValidSha256(hash: string): boolean {
  return PATTERNS.SHA256.test(hash);
}

export function isValidTraceId(traceId: string): boolean {
  return PATTERNS.TRACE_ID.test(traceId);
}

export function isValidJudgementId(id: string): boolean {
  return PATTERNS.JUDGEMENT_ID.test(id);
}

export function isValidInvariantId(id: string): boolean {
  return PATTERNS.INVARIANT_ID.test(id);
}

export function isValidReasonCode(code: string): boolean {
  return PATTERNS.REASON_CODE.test(code);
}

export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}

// =============================================================================
// FACTORY FUNCTIONS
// =============================================================================

export function createGateResult(
  gateId: string,
  verdict: 'PASS' | 'REJECT' | 'DEFER',
  reason?: string,
  errorCode?: string
): GateResult {
  return {
    gateId,
    verdict,
    reason,
    errorCode,
    timestamp: new Date().toISOString()
  };
}

export function createInputGatesResult(
  gateResults: readonly GateResult[],
  mode: 'STRICT' | 'ADVERSARIAL'
): InputGatesResult {
  let overallVerdict: 'PASS' | 'REJECT' | 'DEFER' = 'PASS';
  for (const result of gateResults) {
    if (result.verdict === 'REJECT') {
      overallVerdict = 'REJECT';
      break;
    }
    if (result.verdict === 'DEFER') {
      overallVerdict = 'DEFER';
    }
  }

  return {
    overallVerdict,
    gateResults,
    executedAt: new Date().toISOString(),
    mode
  };
}
