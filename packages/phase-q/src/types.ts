/**
 * OMEGA Phase Q — Type Definitions
 *
 * Triple-Oracle Evaluation System: Justesse / Precision / Necessite
 * All types are readonly and immutable by design.
 */

/** Phase Q verdicts are strictly binary. No intermediate states. Fail-closed. */
export type QVerdict = 'PASS' | 'FAIL';

/** Oracle identifier */
export type OracleId = 'ORACLE-A' | 'ORACLE-B' | 'ORACLE-C';

/** Invariant identifier */
export type QInvariantId =
  | 'Q-INV-01'
  | 'Q-INV-02'
  | 'Q-INV-03'
  | 'Q-INV-04'
  | 'Q-INV-05'
  | 'Q-INV-06';

/** Test case category */
export type QCaseCategory =
  | 'precision'
  | 'necessity'
  | 'contradiction'
  | 'stability'
  | 'adversarial'
  | 'cross-ref';

/** Adversarial strategy */
export type AdversarialStrategy =
  | 'NEGATION'
  | 'PERMUTATION'
  | 'INJECTION'
  | 'TRUNCATION'
  | 'SUBSTITUTION';

// ============================================================
// TEST CASE STRUCTURE (maps to NDJSON schema)
// ============================================================

export interface QTestCaseInput {
  readonly context: string;
  readonly facts: readonly string[];
  readonly constraints: readonly string[];
}

export interface QTestCaseExpected {
  readonly verdict: QVerdict;
  readonly expected_props: readonly string[];
  readonly must_find: readonly string[];
  readonly must_not_find: readonly string[];
  readonly max_unsupported_claims: string;
  readonly contradiction_ids: readonly string[];
  readonly notes: string;
}

export interface QTestCase {
  readonly id: string;
  readonly category: QCaseCategory;
  readonly input: QTestCaseInput;
  readonly candidate_output: string;
  readonly expected: QTestCaseExpected;
}

// ============================================================
// EVIDENCE CHAIN (Q-INV-06)
// ============================================================

export interface QEvidenceStep {
  readonly step: string;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly rule_applied: string;
  readonly verdict: QVerdict;
  readonly timestamp_deterministic: string;
}

export interface QEvidenceChain {
  readonly case_id: string;
  readonly steps: readonly QEvidenceStep[];
  readonly chain_hash: string;
}

// ============================================================
// ORACLE RESULT TYPES
// ============================================================

export interface QOracleMetrics {
  readonly [key: string]: number | string | boolean;
}

export interface QViolation {
  readonly invariant_id: QInvariantId;
  readonly message: string;
  readonly severity: 'CRITICAL' | 'HIGH';
  readonly details?: string;
}

export interface QOracleResult {
  readonly oracle_id: OracleId;
  readonly verdict: QVerdict;
  readonly metrics: QOracleMetrics;
  readonly evidence: readonly QEvidenceStep[];
  readonly violations: readonly QViolation[];
}

// ============================================================
// EVALUATOR RESULT (per case)
// ============================================================

export interface QCaseResult {
  readonly case_id: string;
  readonly category: QCaseCategory;
  readonly oracle_a: QOracleResult;
  readonly oracle_b: QOracleResult;
  readonly oracle_c: QOracleResult;
  readonly final_verdict: QVerdict;
  readonly evidence_chain: QEvidenceChain;
  readonly result_hash: string;
}

// ============================================================
// AGGREGATE REPORT
// ============================================================

export interface QCategoryScore {
  readonly passed: number;
  readonly failed: number;
  readonly total: number;
}

export interface QInvariantScore {
  readonly violations: number;
}

export interface QAggregateScores {
  readonly total_cases: number;
  readonly passed: number;
  readonly failed: number;
  readonly pass_rate: number;
  readonly by_category: Readonly<Record<QCaseCategory, QCategoryScore>>;
  readonly by_invariant: Readonly<Record<QInvariantId, QInvariantScore>>;
}

export interface QReport {
  readonly version: string;
  readonly phase: string;
  readonly timestamp_deterministic: string;
  readonly config_hash: string;
  readonly testset_hash: string;
  readonly scores: QAggregateScores;
  readonly case_results: readonly QCaseResult[];
  readonly report_hash: string;
}

// ============================================================
// CONFIGURATION (symbolic, no magic numbers)
// ============================================================

export interface QConfigSymbol {
  readonly value: number | string;
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
  readonly override?: string;
  readonly alternatives?: readonly string[];
}

export interface QConfig {
  readonly UNSUPPORTED_MAX: QConfigSymbol;
  readonly NECESSITY_MIN_RATIO: QConfigSymbol;
  readonly STABILITY_FACTOR: QConfigSymbol;
  readonly ABLATION_STRATEGY: QConfigSymbol;
}

// ============================================================
// ABLATION TYPES
// ============================================================

export interface QSegment {
  readonly index: number;
  readonly content: string;
}

export interface QAblationResult {
  readonly original_segments: readonly QSegment[];
  readonly ablated_index: number;
  readonly remaining_output: string;
  readonly properties_preserved: readonly string[];
  readonly properties_lost: readonly string[];
  readonly is_necessary: boolean;
}

// ============================================================
// ADVERSARIAL TYPES
// ============================================================

export interface QAdversarialVariant {
  readonly strategy: AdversarialStrategy;
  readonly original_hash: string;
  readonly mutated_output: string;
  readonly mutated_hash: string;
  readonly mutation_description: string;
}

// ============================================================
// CROSS-REFERENCE TYPES
// ============================================================

export interface QBaseline {
  readonly id: string;
  readonly expected_hash: string;
  readonly description: string;
}

export interface QCrossRefResult {
  readonly baseline_id: string;
  readonly matched: boolean;
  readonly details: string;
}

// ============================================================
// ORACLE RULES
// ============================================================

export type QRuleCheckType =
  | 'must_find'
  | 'must_not_find'
  | 'count_threshold'
  | 'pattern_match'
  | 'contradiction_check';

export interface QOracleRule {
  readonly id: string;
  readonly invariant: QInvariantId;
  readonly description: string;
  readonly check_type: QRuleCheckType;
  readonly parameters: Readonly<Record<string, unknown>>;
}
