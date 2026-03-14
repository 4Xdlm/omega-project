/**
 * compiler/types.ts — Types pour le Constraint Compiler v3.0.0
 * Sprint P1 — V-PARTITION
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ── Constraint Levels ────────────────────────────────────────────────────────

/** Niveau hiérarchique de contrainte */
export type ConstraintLevel = 1 | 2 | 3;

/** Contrainte brute collectée depuis n'importe quelle source */
export interface RawConstraint {
  readonly id: string;
  readonly source: string;          // ex: 'cde.hot_elements', 'pdb.LOT1-03', 'packet.kill_lists'
  readonly level: ConstraintLevel;
  readonly priority: number;        // [1-10]
  readonly text: string;            // texte narratif de la contrainte
  readonly target_axes: readonly string[];  // axes ciblés (ex: 'tension_14d', 'rythme_musical')
}

// ── Compiled Partition ───────────────────────────────────────────────────────

export interface CompiledPartition {
  readonly attention_contract: string;    // ~30 tokens, fixe
  readonly level1_laws: string;           // ≤ 60 tokens, incompressible
  readonly level2_trajectory: string;     // ≤ 140 tokens, compressible
  readonly level3_decor: string;          // ≤ 60 tokens, sacrifiable
  readonly total_tokens: number;
  readonly partition_hash: string;        // SHA256 du tout
  readonly instrumentation: InstrumentationReport;
  readonly recency_reminder: string;      // ~10 tokens, rappel fin
}

// ── Instrumentation ──────────────────────────────────────────────────────────

export interface InstrumentationReport {
  readonly tokens_by_level: {
    readonly l1: number;
    readonly l2: number;
    readonly l3: number;
    readonly contract: number;
  };
  readonly conflicts_detected: readonly ConflictEntry[];
  readonly cognitive_load: number;          // 0-100
  readonly sacrificed_elements: readonly SacrificeEntry[];
  readonly shape_routing: readonly string[];
  readonly warnings: readonly string[];
  readonly conflict_score: number;          // 0-100
  readonly redundancy_score: number;        // 0-100
}

export interface ConflictEntry {
  readonly source_a: string;
  readonly source_b: string;
  readonly type: 'attention_competition' | 'redundancy' | 'contradiction';
  readonly resolution: string;
}

export interface SacrificeEntry {
  readonly element: string;
  readonly level: ConstraintLevel;
  readonly reason: string;
}

// ── Compiler Config ──────────────────────────────────────────────────────────

export interface CompilerConfig {
  readonly budget_l1: number;             // default 60
  readonly budget_l2: number;             // default 140
  readonly budget_l3: number;             // default 60
  readonly budget_contract: number;       // default 30
  readonly tokenizer_id: string;          // default 'chars_div_4'
  readonly shape: string;
}

export const DEFAULT_COMPILER_CONFIG: Omit<CompilerConfig, 'shape'> = {
  budget_l1: 60,
  budget_l2: 140,
  budget_l3: 60,
  budget_contract: 30,
  tokenizer_id: 'chars_div_4',
};

// ── PreFlight / Static Analyzer ──────────────────────────────────────────────

export interface PreFlightReport {
  readonly density_l1: number;              // 0-1, >0.9 = surchargé
  readonly density_l2: number;
  readonly density_l3: number;
  readonly conflict_score: number;          // 0-100
  readonly cognitive_load_score: number;    // 0-100
  readonly redundancy_score: number;        // 0-100
  readonly risk_ecc: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly risk_rci: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly risk_sii: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly sacrificed_count: number;
  readonly sacrificed_critical: boolean;    // true si N1 ou N2 sacrifié
  readonly verdict: 'GREEN' | 'YELLOW' | 'RED';
  readonly warnings: readonly string[];
}

export interface PartitionDump {
  readonly attention_contract: string;
  readonly level_1: string;
  readonly level_2: string;
  readonly level_3: string;
  readonly partition_hash: string;
  readonly preflight_report: PreFlightReport;
}
