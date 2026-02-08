/**
 * OMEGA Creation Pipeline — Type Definitions
 * Phase C.4 — E2E Orchestration + Proof-Pack + CLI
 * All types are readonly and immutable by design.
 * Standard: NASA-Grade L4
 */

// Re-export consumed types from C.1
export type {
  Intent, Canon, CanonEntry, Constraints, StyleGenomeInput, EmotionTarget,
  GenesisPlan, Arc, Scene, Beat, Seed, SubtextLayer,
  GConfig, GVerdict, GInvariantId, GConfigSymbol,
  GenesisReport, GEvidenceChain, GenesisMetrics,
  EmotionWaypoint,
} from '@omega/genesis-planner';

// Re-export consumed types from C.2
export type {
  ScribeOutput, ProseDoc, ProseParagraph, SkeletonDoc, Segment,
  GateChainResult, OracleChainResult, RewriteHistory,
  SConfig, SVerdict, SInvariantId, SConfigSymbol,
  GateId, OracleId, GateResult, OracleResult,
  ScribeMetrics, ScribeReport, SEvidenceChain,
} from '@omega/scribe-engine';

// Re-export consumed types from C.3
export type {
  StyledOutput, StyledParagraph, StyleProfile, GenomeDeviation,
  IADetectionResult, GenreDetectionResult, BanalityResult,
  TournamentResult, TournamentRound,
  EConfig, EVerdict, EInvariantId, EConfigSymbol,
  StyleMetrics, StyleReport, EEvidenceChain,
  CadenceProfile, LexicalProfile, SyntacticProfile, DensityProfile, CoherenceProfile,
} from '@omega/style-emergence-engine';

// ═══════════════════════ VERDICTS ═══════════════════════

export type C4Verdict = 'PASS' | 'FAIL';

export type C4InvariantId =
  | 'C4-INV-01' | 'C4-INV-02' | 'C4-INV-03' | 'C4-INV-04'
  | 'C4-INV-05' | 'C4-INV-06' | 'C4-INV-07' | 'C4-INV-08'
  | 'C4-INV-09' | 'C4-INV-10' | 'C4-INV-11' | 'C4-INV-12';

export type UnifiedGateId =
  | 'U_TRUTH' | 'U_NECESSITY' | 'U_CROSSREF' | 'U_BANALITY'
  | 'U_STYLE' | 'U_EMOTION' | 'U_DISCOMFORT' | 'U_QUALITY';

// ═══════════════════════ INTENT PACK ═══════════════════════

export interface IntentPack {
  readonly intent: import('@omega/genesis-planner').Intent;
  readonly canon: import('@omega/genesis-planner').Canon;
  readonly constraints: import('@omega/genesis-planner').Constraints;
  readonly genome: import('@omega/genesis-planner').StyleGenomeInput;
  readonly emotion: import('@omega/genesis-planner').EmotionTarget;
  readonly metadata: IntentPackMetadata;
}

export interface IntentPackMetadata {
  readonly pack_id: string;
  readonly pack_version: string;
  readonly author: string;
  readonly created_at: string;
  readonly description: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly input_hash: string;
}

export interface ValidationError {
  readonly field: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR';
}

// ═══════════════════════ PIPELINE STAGES ═══════════════════════

export type PipelineStageId = 'F0' | 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8';

export interface StageResult {
  readonly stage: PipelineStageId;
  readonly verdict: C4Verdict;
  readonly input_hash: string;
  readonly output_hash: string;
  readonly duration_ms: number;
  readonly details: string;
  readonly timestamp_deterministic: string;
}

export interface PipelineTrace {
  readonly stages: readonly StageResult[];
  readonly total_stages: number;
  readonly passed_stages: number;
  readonly first_failure: PipelineStageId | null;
}

// ═══════════════════════ UNIFIED GATES ═══════════════════════

export interface UnifiedGateViolation {
  readonly gate_id: UnifiedGateId;
  readonly invariant: C4InvariantId;
  readonly location: string;
  readonly message: string;
  readonly severity: 'FATAL' | 'ERROR';
  readonly source_phase: 'C1' | 'C2' | 'C3' | 'C4';
}

export interface UnifiedGateResult {
  readonly gate_id: UnifiedGateId;
  readonly verdict: C4Verdict;
  readonly violations: readonly UnifiedGateViolation[];
  readonly metrics: Readonly<Record<string, number>>;
  readonly timestamp_deterministic: string;
}

export interface UnifiedGateChainResult {
  readonly verdict: C4Verdict;
  readonly gate_results: readonly UnifiedGateResult[];
  readonly first_failure: UnifiedGateId | null;
  readonly total_violations: number;
}

// ═══════════════════════ MERKLE EVIDENCE ═══════════════════════

export interface MerkleNode {
  readonly hash: string;
  readonly left: string | null;
  readonly right: string | null;
  readonly label: string;
  readonly depth: number;
}

export interface MerkleTree {
  readonly root_hash: string;
  readonly nodes: readonly MerkleNode[];
  readonly leaf_count: number;
  readonly depth: number;
}

export interface ParagraphTrace {
  readonly paragraph_id: string;
  readonly text_hash: string;
  readonly intent_hash: string;
  readonly plan_hash: string;
  readonly segment_ids: readonly string[];
  readonly scene_ids: readonly string[];
  readonly arc_ids: readonly string[];
  readonly canon_refs: readonly string[];
  readonly seed_refs: readonly string[];
  readonly proof_path: readonly string[];
}

export interface E2EEvidenceChain {
  readonly pipeline_id: string;
  readonly merkle_tree: MerkleTree;
  readonly paragraph_traces: readonly ParagraphTrace[];
  readonly stage_results: readonly StageResult[];
  readonly genesis_evidence_hash: string;
  readonly scribe_evidence_hash: string;
  readonly style_evidence_hash: string;
  readonly chain_hash: string;
}

// ═══════════════════════ PROOF-PACK ═══════════════════════

export interface ProofPackManifest {
  readonly manifest_version: string;
  readonly pipeline_id: string;
  readonly root_hash: string;
  readonly files: readonly ProofPackFile[];
  readonly created_at: string;
  readonly total_files: number;
  readonly total_bytes: number;
}

export interface ProofPackFile {
  readonly path: string;
  readonly sha256: string;
  readonly size_bytes: number;
  readonly role: 'input' | 'intermediate' | 'output' | 'evidence' | 'report';
}

export interface ProofPack {
  readonly manifest: ProofPackManifest;
  readonly root_hash: string;
  readonly merkle_tree: MerkleTree;
  readonly verifiable: boolean;
}

export interface VerificationResult {
  readonly verified: boolean;
  readonly root_hash_match: boolean;
  readonly files_verified: number;
  readonly files_failed: number;
  readonly failed_files: readonly string[];
  readonly merkle_valid: boolean;
}

// ═══════════════════════ ADVERSARIAL ═══════════════════════

export type FuzzCategory =
  | 'contradiction' | 'ambiguity' | 'impossible_constraints'
  | 'empty_fields' | 'overflow' | 'type_mismatch'
  | 'circular_reference' | 'hostile_content';

export interface FuzzedIntentPack {
  readonly fuzz_id: string;
  readonly category: FuzzCategory;
  readonly mutation: string;
  readonly pack: IntentPack;
}

export interface ChaosResult {
  readonly fuzz_id: string;
  readonly category: FuzzCategory;
  readonly mutation: string;
  readonly verdict: C4Verdict;
  readonly failure_stage: PipelineStageId | null;
  readonly failure_reason: string;
  readonly handled_gracefully: boolean;
}

export interface ChaosReport {
  readonly total_runs: number;
  readonly graceful_failures: number;
  readonly ungraceful_failures: number;
  readonly crash_count: number;
  readonly results: readonly ChaosResult[];
  readonly report_hash: string;
}

// ═══════════════════════ CREATION OUTPUT ═══════════════════════

export interface CreationResult {
  readonly pipeline_id: string;
  readonly output_hash: string;
  readonly intent_hash: string;
  readonly final_text: import('@omega/style-emergence-engine').StyledOutput;
  readonly genesis_plan: import('@omega/genesis-planner').GenesisPlan;
  readonly scribe_output: import('@omega/scribe-engine').ScribeOutput;
  readonly style_output: import('@omega/style-emergence-engine').StyledOutput;
  readonly unified_gates: UnifiedGateChainResult;
  readonly evidence: E2EEvidenceChain;
  readonly proof_pack: ProofPack;
  readonly report: CreationReport;
  readonly pipeline_trace: PipelineTrace;
  readonly verdict: C4Verdict;
}

// ═══════════════════════ CONFIG ═══════════════════════

export interface C4ConfigSymbol {
  readonly value: number | string | boolean | readonly string[];
  readonly unit: string;
  readonly rule: string;
  readonly derivation: string;
}

export interface C4Config {
  readonly PIPELINE_STRICT_MODE: C4ConfigSymbol;
  readonly UNIFIED_GATE_ORDER: C4ConfigSymbol;
  readonly MERKLE_HASH_ALGORITHM: C4ConfigSymbol;
  readonly PROOF_PACK_VERSION: C4ConfigSymbol;
  readonly ADVERSARIAL_FUZZ_COUNT: C4ConfigSymbol;
  readonly ADVERSARIAL_CATEGORIES: C4ConfigSymbol;
  readonly NECESSITY_ABLATION_THRESHOLD: C4ConfigSymbol;
  readonly CROSSREF_MAX_ORPHANS: C4ConfigSymbol;
  readonly CANON_MAX_UNSUPPORTED: C4ConfigSymbol;
  readonly PIPELINE_MAX_DURATION_MS: C4ConfigSymbol;
  readonly E2E_TRUTH_THRESHOLD: C4ConfigSymbol;
  readonly E2E_STYLE_THRESHOLD: C4ConfigSymbol;
}

// ═══════════════════════ REPORT ═══════════════════════

export interface CreationMetrics {
  readonly total_words: number;
  readonly total_paragraphs: number;
  readonly total_segments: number;
  readonly total_arcs: number;
  readonly total_scenes: number;
  readonly genesis_duration_ms: number;
  readonly scribe_duration_ms: number;
  readonly style_duration_ms: number;
  readonly gates_duration_ms: number;
  readonly total_duration_ms: number;
  readonly rewrite_passes: number;
  readonly tournament_rounds: number;
  readonly ia_detection_score: number;
  readonly genre_specificity: number;
  readonly voice_stability: number;
  readonly genome_max_deviation: number;
  readonly evidence_nodes: number;
  readonly proof_files: number;
  readonly invariants_checked: number;
  readonly invariants_passed: number;
}

export interface CreationReport {
  readonly pipeline_id: string;
  readonly output_hash: string;
  readonly intent_hash: string;
  readonly verdict: C4Verdict;
  readonly unified_gates: UnifiedGateChainResult;
  readonly metrics: CreationMetrics;
  readonly evidence_hash: string;
  readonly proof_pack_hash: string;
  readonly pipeline_trace: PipelineTrace;
  readonly invariants_checked: readonly C4InvariantId[];
  readonly invariants_passed: readonly C4InvariantId[];
  readonly invariants_failed: readonly C4InvariantId[];
  readonly config_hash: string;
  readonly timestamp_deterministic: string;
}

// ═══════════════════════ CLI ═══════════════════════

export interface CLIArgs {
  readonly intentPath: string;
  readonly outDir: string;
  readonly strict: boolean;
  readonly dryRun: boolean;
  readonly verbose: boolean;
}

export interface CLIOutput {
  readonly files_written: readonly string[];
  readonly verdict: C4Verdict;
  readonly duration_ms: number;
}
