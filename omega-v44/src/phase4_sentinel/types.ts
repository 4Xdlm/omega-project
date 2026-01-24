/**
 * OMEGA V4.4 — Phase 4: Sentinel Types
 *
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Sentinel = Binary Judge = ALLOW or DENY
 * Stateless. Deterministic. No modification.
 */

import type { ActionType, InvariantId } from '../phase1_contract/index.js';

// ═══════════════════════════════════════════════════════════════════════════
// REQUEST TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request to Sentinel for validation
 */
export interface SentinelRequest {
  readonly requestId: string;
  readonly module: string;
  readonly action: ActionType;
  readonly target: string;
  readonly params: unknown;
  readonly timestamp: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Read-only state provided to Sentinel
 */
export interface ReadonlyState {
  readonly contractVersion: string;
  readonly coreVersion: string;
  readonly configHash: string;
  readonly currentTimestamp: number;
  readonly allowedModules: readonly string[];
  readonly invariants: readonly InvariantId[];
}

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION LEVELS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validation level identifier
 */
export type ValidationLevel = 1 | 2 | 3 | 4;

/**
 * Level 1: Structural validation
 * - Request well-formed?
 * - Types correct?
 * - Required fields present?
 */
export interface Level1StructuralResult {
  readonly level: 1;
  readonly status: 'PASS' | 'FAIL';
  readonly checks: readonly string[];
  readonly failedCheck?: string;
}

/**
 * Level 2: Contractual validation
 * - Respects Phase 1 invariants?
 * - Values within bounds?
 * - Axiomatic relations true?
 */
export interface Level2ContractualResult {
  readonly level: 2;
  readonly status: 'PASS' | 'FAIL';
  readonly invariantsChecked: readonly InvariantId[];
  readonly violatedInvariant?: InvariantId;
}

/**
 * Level 3: Contextual validation
 * - Module authorized?
 * - Temporal window respected?
 * - Quotas not exceeded?
 */
export interface Level3ContextualResult {
  readonly level: 3;
  readonly status: 'PASS' | 'FAIL';
  readonly contextChecks: readonly string[];
  readonly failedCheck?: string;
}

/**
 * Level 4: Semantic validation
 * - Action coherent with system state?
 * - No dependency violations?
 * - No unauthorized side-effects?
 */
export interface Level4SemanticResult {
  readonly level: 4;
  readonly status: 'PASS' | 'FAIL';
  readonly semanticChecks: readonly string[];
  readonly failedCheck?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// VERDICT TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Verdict: ALLOW or DENY
 */
export type Verdict = 'ALLOW' | 'DENY';

/**
 * Proof for ALLOW decision (all levels passed)
 */
export interface AllowProof {
  readonly level1_structural: 'PASS';
  readonly level2_contractual: 'PASS';
  readonly level3_contextual: 'PASS';
  readonly level4_semantic: 'PASS';
  readonly invariantsChecked: readonly InvariantId[];
  readonly checksPerformed: readonly string[];
}

/**
 * Reason for DENY decision
 */
export interface DenialReason {
  readonly level: ValidationLevel;
  readonly failedCheck: string;
  readonly violatedInvariant?: InvariantId;
  readonly details: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// DECISION TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete Sentinel decision
 */
export interface SentinelDecision {
  readonly decisionId: string;
  readonly timestamp: number;
  readonly request: SentinelRequest;
  readonly verdict: Verdict;
  readonly proof?: AllowProof;
  readonly denialReason?: DenialReason;
  readonly decisionHash: string;
  readonly processingTimeMs: number;
}
