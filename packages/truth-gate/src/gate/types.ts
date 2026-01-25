/**
 * OMEGA Truth Gate — Core Types
 *
 * Types for the validation gate system.
 *
 * RULE: All verdicts are ALLOW, DENY, or DEFER. No partial states.
 */

import type { TxId, RootHash, EntityId, CanonTx, CalibrationConfig } from '@omega/canon-kernel';

/**
 * Verdict enum - ALLOW, DENY, or DEFER.
 * No intermediate states permitted.
 */
export type VerdictType = 'ALLOW' | 'DENY' | 'DEFER';

/**
 * Validator identifier.
 * Format: V-{CATEGORY}-{NAME}
 */
export type ValidatorId = `V-${string}`;

/**
 * Policy identifier.
 * Format: P-{CATEGORY}-{VERSION}
 */
export type PolicyId = `P-${string}`;

/**
 * Verdict ID (deterministic hash).
 */
export type VerdictId = string & { readonly __brand: 'VerdictId' };

/**
 * Ledger entry hash.
 */
export type LedgerHash = RootHash;

/**
 * Evidence attachment for verdicts.
 */
export interface VerdictEvidence {
  readonly type: 'hash_mismatch' | 'schema_violation' | 'policy_violation' | 'drift_detected' | 'toxicity_detected' | 'magic_number' | 'rail_violation' | 'emotion_ssot_violation';
  readonly details: string;
  readonly location?: string;
  readonly expected?: string;
  readonly actual?: string;
}

/**
 * Result from a single validator.
 */
export interface ValidatorResult {
  readonly validator_id: ValidatorId;
  readonly verdict: VerdictType;
  readonly evidence: readonly VerdictEvidence[];
  readonly duration_ms: number;
  readonly timestamp: number;
}

/**
 * Composite verdict from TruthGate.
 */
export interface GateVerdict {
  readonly verdict_id: VerdictId;
  readonly tx_id: TxId;
  readonly final_verdict: VerdictType;
  readonly validator_results: readonly ValidatorResult[];
  readonly policy_id: PolicyId;
  readonly timestamp: number;
  readonly hash: RootHash;
}

/**
 * Ledger entry for append-only verdict storage.
 */
export interface LedgerEntry {
  readonly index: number;
  readonly verdict: GateVerdict;
  readonly parent_hash: LedgerHash;
  readonly cumulative_hash: LedgerHash;
}

/**
 * Validator interface - all validators must implement this.
 */
export interface Validator {
  readonly id: ValidatorId;
  readonly name: string;
  readonly description: string;
  readonly version: string;

  /**
   * Validate a transaction.
   * MUST be deterministic: same input → same output.
   */
  validate(tx: CanonTx, context: ValidationContext): ValidatorResult;
}

/**
 * Context provided to validators.
 */
export interface ValidationContext {
  readonly calibration: CalibrationConfig;
  readonly policy: PolicyPack;
  readonly store_snapshot?: StoreSnapshotRef;
  readonly previous_tx?: CanonTx;
}

/**
 * Reference to store snapshot for validators needing historical data.
 */
export interface StoreSnapshotRef {
  readonly truth_head_hash: RootHash;
  readonly interpretation_head_hash: RootHash;
  readonly entity_count: number;
  readonly getEntityFacts: (entity_id: EntityId) => ReadonlyMap<string, unknown>;
}

/**
 * Policy pack - versioned validation rules.
 */
export interface PolicyPack {
  readonly policy_id: PolicyId;
  readonly version: string;
  readonly validators_enabled: readonly ValidatorId[];
  readonly rules: PolicyRules;
  readonly created_at: number;
  readonly hash: RootHash;
}

/**
 * Policy rules configuration.
 */
export interface PolicyRules {
  readonly require_all_validators: boolean;
  readonly defer_on_any_defer: boolean;
  readonly deny_on_any_deny: boolean;
  readonly max_drift_score: number;
  readonly max_toxicity_score: number;
  readonly allowed_schemas: readonly string[];
  readonly blocked_patterns: readonly string[];
}

/**
 * Truth Gate configuration.
 */
export interface TruthGateConfig {
  readonly default_policy: PolicyPack;
  readonly calibration: CalibrationConfig;
  readonly strict_mode: boolean;
  readonly enable_proof_carrying: boolean;
}

/**
 * Proof-carrying verdict (Phase A.2 variant).
 */
export interface ProofCarryingVerdict extends GateVerdict {
  readonly proof_chain: readonly RootHash[];
  readonly merkle_root: RootHash;
  readonly validator_hashes: ReadonlyMap<ValidatorId, RootHash>;
}
