/**
 * OMEGA Phase C.1.1 - Types & Schemas
 * Sentinel Judge Core Types
 * 
 * @module types
 * @version 1.0.0
 */

// =============================================================================
// ERROR CODES
// =============================================================================

export const ERROR_CODES = {
  // Gate errors (GATE_01 - GATE_08)
  GATE_01: 'GATE_01',
  GATE_02: 'GATE_02',
  GATE_03: 'GATE_03',
  GATE_04: 'GATE_04',
  GATE_05: 'GATE_05',
  GATE_06: 'GATE_06',
  GATE_07: 'GATE_07',
  GATE_08: 'GATE_08',
  // Digest errors
  DIGEST_01: 'DIGEST_01',
  DIGEST_02: 'DIGEST_02',
  // Assembly errors
  ASSEMBLE_01: 'ASSEMBLE_01',
  ASSEMBLE_02: 'ASSEMBLE_02',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

// =============================================================================
// PATTERNS
// =============================================================================

export const PATTERNS = {
  SHA256: /^[a-f0-9]{64}$/,
  TRACE_ID: /^C-\d{8}-\d{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  ISO_TIMESTAMP: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,
  UUID: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  POLICY_ID: /^POL-[A-Z0-9-]+$/,
  CLAIM_ID: /^CLM-[A-Z0-9-]+$/,
  PROOF_ID: /^PRF-[A-Z0-9-]+$/,
} as const;

// =============================================================================
// SENTINEL JUDGE ERROR
// =============================================================================

export class SentinelJudgeError extends Error {
  public readonly code: ErrorCode;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SentinelJudgeError';
    this.code = code;
    this.details = details;
  }
}

// =============================================================================
// VERDICT TYPES
// =============================================================================

export type Verdict = 'PASS' | 'FAIL' | 'REJECT' | 'DEFER' | 'SKIP' | 'INCONCLUSIVE';

// =============================================================================
// PROOF & EVIDENCE TYPES
// =============================================================================

export interface Proof {
  readonly proofId: string;
  readonly proofType: string;
  readonly hash: string;
  readonly source: string;
  readonly timestamp: string;
  readonly verdict: Verdict;
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

// =============================================================================
// CLAIM TYPES
// =============================================================================

export interface Claim {
  readonly claimId: string;
  readonly payload: unknown;
  readonly payloadHash: string;
  readonly timestamp: string;
  readonly source: string;
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// CONTEXT & POLICY TYPES
// =============================================================================

export interface ContextRef {
  readonly refId: string;
  readonly refType: 'CANON' | 'MEMORY' | 'EXTERNAL' | 'POLICY';
  readonly sha256: string;
  readonly uri?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface PolicyRef {
  readonly policyId: string;
  readonly version: string;
  readonly sourceSha256: string;
  readonly appliesTo: string[];
  readonly metadata?: Record<string, unknown>;
}

export interface PolicyBundle {
  readonly bundleId: string;
  readonly policies: readonly PolicyRef[];
  readonly combinedHash: string;
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// GATE TYPES
// =============================================================================

export interface GateDefinition {
  readonly gateId: string;
  readonly description: string;
  readonly gateClass: 'REQUIRED' | 'ADVISORY';
  readonly failPolicy: 'REJECT' | 'DEFER' | 'WARN';
  readonly errorCode: ErrorCode;
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

// =============================================================================
// DECISION REQUEST
// =============================================================================

export interface DecisionRequest {
  readonly traceId: string;
  readonly claim: Claim;
  readonly contextRefs: readonly ContextRef[];
  readonly policies: readonly PolicyRef[];
  readonly evidencePack: EvidencePack;
  readonly requestedAt: string;
  readonly metadata?: Record<string, unknown>;
}

// =============================================================================
// TYPE GUARDS
// =============================================================================

export function isInputClaim(value: unknown): value is InputClaim {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.claimId === 'string' &&
    v.payload !== undefined &&
    typeof v.payloadHash === 'string' &&
    typeof v.timestamp === 'string' &&
    typeof v.source === 'string'
  );
}

export function isContextRef(value: unknown): value is ContextRef {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.refId === 'string' &&
    ['CANON', 'MEMORY', 'EXTERNAL', 'POLICY'].includes(v.refType as string) &&
    typeof v.sha256 === 'string'
  );
}

export function isPolicyRef(value: unknown): value is PolicyRef {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.policyId === 'string' &&
    typeof v.version === 'string' &&
    typeof v.sourceSha256 === 'string' &&
    Array.isArray(v.appliesTo)
  );
}

export function isPolicyBundle(value: unknown): value is PolicyBundle {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.bundleId === 'string' &&
    Array.isArray(v.policies) &&
    typeof v.combinedHash === 'string'
  );
}

export function isEvidenceProof(value: unknown): value is EvidenceProof {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.proofId === 'string' &&
    typeof v.proofType === 'string' &&
    typeof v.hash === 'string' &&
    typeof v.source === 'string' &&
    typeof v.timestamp === 'string' &&
    ['PASS', 'FAIL', 'INCONCLUSIVE'].includes(v.verdict as string)
  );
}

export function isMissingEvidence(value: unknown): value is MissingEvidence {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.evidenceType === 'string' &&
    typeof v.reason === 'string' &&
    typeof v.blocksVerdict === 'boolean'
  );
}

export function isEvidencePack(value: unknown): value is EvidencePack {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.packId === 'string' &&
    Array.isArray(v.proofs) &&
    Array.isArray(v.missing) &&
    typeof v.inputsDigest === 'string' &&
    typeof v.collectedAt === 'string'
  );
}

export function isGateResult(value: unknown): value is GateResult {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.gateId === 'string' &&
    ['PASS', 'REJECT', 'DEFER'].includes(v.verdict as string) &&
    typeof v.timestamp === 'string'
  );
}

export function isJudgmentRequest(value: unknown): value is JudgmentRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.traceId === 'string' &&
    isInputClaim(v.claim) &&
    Array.isArray(v.contextRefs) &&
    isPolicyBundle(v.policyBundle) &&
    isEvidencePack(v.evidencePack) &&
    typeof v.requestedAt === 'string'
  );
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
  // Determine overall verdict: REJECT > DEFER > PASS
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

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const SHA256_REGEX = /^[a-f0-9]{64}$/;
const TRACE_ID_REGEX = /^C-\d{8}-\d{6}-[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;

export function isValidSha256(hash: string): boolean {
  return SHA256_REGEX.test(hash);
}

export function isValidTraceId(traceId: string): boolean {
  return TRACE_ID_REGEX.test(traceId);
}

export function isValidTimestamp(timestamp: string): boolean {
  const date = new Date(timestamp);
  return !isNaN(date.getTime());
}
