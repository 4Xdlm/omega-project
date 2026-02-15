/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA Sovereign — Constraint Compiler Types
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Déterministe, budgeté, fail-closed.
 */

export type ConstraintPriority = 'CRITICAL' | 'HIGH' | 'MED';

export interface CompiledConstraint {
  readonly id: string;
  readonly priority: ConstraintPriority;
  readonly text: string;
  readonly source_signal_ids: readonly string[];
}

export interface CompiledPhysicsSection {
  readonly text: string;
  readonly token_count: number;
  readonly tokenizer_id: string;
  readonly used_signal_ids: readonly string[];
  readonly constraints: readonly CompiledConstraint[];
  readonly section_hash: string;
}

export interface PhysicsCompilerConfig {
  readonly physics_prompt_budget_tokens: number;
  readonly physics_prompt_tokenizer_id: string;
  readonly top_k_emotions: number;
  readonly top_k_transitions: number;
  readonly top_k_prescriptions: number;
}
