/**
 * OMEGA Truth Gate Types v1.0
 * Phase F - NASA-Grade L4 / DO-178C
 *
 * INVARIANTS:
 * - F1-INV-01: All types are immutable (readonly)
 * - F1-INV-02: IDs are deterministic hashes
 * - F1-INV-03: No probabilistic fields
 * - F1-INV-04: All enums are exhaustive
 *
 * SPEC: TRUTH_GATE_SPEC v1.0
 */

import type { ChainHash, EntityId, PredicateType, ClaimId } from '../canon';

// ═══════════════════════════════════════════════════════════════════════════════
// BRANDED TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Unique identifier for a canonical fact (deterministic hash) */
export type FactId = string & { readonly __brand: 'FactId' };

/** Hash of proof manifest */
export type ProofHash = string & { readonly __brand: 'ProofHash' };

/** Quarantine reference ID */
export type QuarantineId = string & { readonly __brand: 'QuarantineId' };

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE SPAN
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Location of a fact within source text.
 * Used for deterministic ordering (sort by start, then end).
 */
export interface SourceSpan {
  readonly start: number;
  readonly end: number;
  readonly text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACT CLASSIFICATION (F3)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fact classification types.
 * F3-INV-01: Exhaustive enum
 */
export const FactClass = {
  /** Direct factual assertion requiring CANON validation */
  FACT_STRICT: 'FACT_STRICT',
  /** Derived/inferred fact (not validated against CANON) */
  FACT_DERIVED: 'FACT_DERIVED',
  /** Non-factual content (opinions, questions, etc.) */
  NON_FACTUAL: 'NON_FACTUAL',
} as const;

export type FactClass = (typeof FactClass)[keyof typeof FactClass];

// ═══════════════════════════════════════════════════════════════════════════════
// VIOLATION CODES (F4)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Violation codes for CANON contradictions.
 * F4-INV-01: Exhaustive enum
 */
export const ViolationCode = {
  /** C-01: Referenced entity not in CANON */
  UNKNOWN_ENTITY: 'C-01',
  /** C-02: Predicate not in catalog */
  FORBIDDEN_PREDICATE: 'C-02',
  /** C-03: Value contradicts CANON */
  CONTRADICTORY_VALUE: 'C-03',
  /** C-04: Temporal constraint violated */
  TEMPORAL_VIOLATION: 'C-04',
  /** C-05: Would regress canonical state */
  CANONICAL_REGRESSION: 'C-05',
  /** C-06: Ambiguous reference detected */
  AMBIGUITY_DETECTED: 'C-06',
} as const;

export type ViolationCode = (typeof ViolationCode)[keyof typeof ViolationCode];

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT (F5)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Final verdict of truth gate.
 * F5-INV-01: Binary only (no partial)
 */
export const Verdict = {
  /** All facts validated, no violations */
  PASS: 'PASS',
  /** One or more violations detected */
  FAIL: 'FAIL',
} as const;

export type Verdict = (typeof Verdict)[keyof typeof Verdict];

// ═══════════════════════════════════════════════════════════════════════════════
// CANONICAL FACT (F2 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracted canonical fact from source text.
 * F2-INV-01: ID is deterministic hash of stable inputs
 * F2-INV-02: sourceSpan is required
 */
export interface CanonicalFact {
  /** Deterministic ID = hash(sourceSpan, subject, predicate, object, scope) */
  readonly id: FactId;
  /** Location in source text */
  readonly sourceSpan: SourceSpan;
  /** Subject entity reference */
  readonly subject: string;
  /** Predicate type */
  readonly predicate: string;
  /** Object/value */
  readonly object: unknown;
  /** Optional scope/context */
  readonly scope?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLASSIFIED FACT (F3 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fact with classification.
 * F3-INV-02: classification is deterministic
 */
export interface ClassifiedFact extends CanonicalFact {
  /** Classification result */
  readonly classification: FactClass;
  /** Reason for classification (for audit) */
  readonly classificationReason: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CANON VIOLATION (F4 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Detected violation against CANON.
 * F4-INV-02: All fields required
 */
export interface CanonViolation {
  /** Violation code */
  readonly code: ViolationCode;
  /** Fact that caused violation */
  readonly fact: ClassifiedFact;
  /** Human-readable message */
  readonly message: string;
  /** Related CANON claim ID (if applicable) */
  readonly relatedClaimId?: ClaimId;
  /** Expected value from CANON (if applicable) */
  readonly expectedValue?: unknown;
  /** Actual value from fact (if applicable) */
  readonly actualValue?: unknown;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VERDICT RESULT (F5 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of verdict engine.
 * F5-INV-02: violations.length === 0 iff verdict === PASS
 */
export interface VerdictResult {
  /** Final verdict */
  readonly verdict: Verdict;
  /** All detected violations (empty if PASS) */
  readonly violations: readonly CanonViolation[];
  /** Total facts processed */
  readonly factsProcessed: number;
  /** Strict facts checked against CANON */
  readonly strictFactsChecked: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROOF MANIFEST (F6 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Audit-proof manifest of gate execution.
 * F6-INV-01: proofHash does NOT include timestamp
 * F6-INV-02: All inputs recorded
 * F6-INV-03: Hash is deterministic
 */
export interface ProofManifest {
  /** Deterministic proof hash (excludes timestamp) */
  readonly proofHash: ProofHash;
  /** Input text hash */
  readonly inputHash: ChainHash;
  /** Verdict result */
  readonly verdict: VerdictResult;
  /** Extracted facts */
  readonly facts: readonly ClassifiedFact[];
  /** Execution timestamp (NOT part of proofHash) */
  readonly timestamp: string;
  /** Gate version */
  readonly gateVersion: string;
  /** CANON state hash at time of check */
  readonly canonStateHash: ChainHash;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUARANTINE RESULT (F7 OUTPUT)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Quarantine result for failed gate.
 * F7-INV-01: No output text on FAIL
 * F7-INV-02: All violations recorded
 * F7-INV-03: Proof manifest required
 */
export interface QuarantineResult {
  /** Quarantine ID */
  readonly id: QuarantineId;
  /** Proof manifest */
  readonly proof: ProofManifest;
  /** Reason for quarantine */
  readonly reason: string;
  /** Original input preserved for audit */
  readonly originalInputHash: ChainHash;
  /** Quarantine timestamp */
  readonly quarantinedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GATE OUTPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Truth gate output.
 * Either passes with output text or fails with quarantine.
 */
export type GateOutput =
  | { readonly passed: true; readonly output: string; readonly proof: ProofManifest }
  | { readonly passed: false; readonly quarantine: QuarantineResult };

// ═══════════════════════════════════════════════════════════════════════════════
// GATE INPUT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input to truth gate.
 */
export interface GateInput {
  /** Text to validate */
  readonly text: string;
  /** Optional context for extraction */
  readonly context?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

export function isFactClass(value: string): value is FactClass {
  return Object.values(FactClass).includes(value as FactClass);
}

export function isViolationCode(value: string): value is ViolationCode {
  return Object.values(ViolationCode).includes(value as ViolationCode);
}

export function isVerdict(value: string): value is Verdict {
  return Object.values(Verdict).includes(value as Verdict);
}

export function isGatePass(output: GateOutput): output is { passed: true; output: string; proof: ProofManifest } {
  return output.passed === true;
}

export function isGateFail(output: GateOutput): output is { passed: false; quarantine: QuarantineResult } {
  return output.passed === false;
}
