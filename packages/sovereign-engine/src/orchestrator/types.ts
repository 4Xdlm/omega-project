/**
 * orchestrator/types.ts — Types pour le Scribe Orchestrator v3.1.0
 * Sprint S2 — SCRIBE ORCHESTRÉ MODE SAFE
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import type { CompiledPartition } from '../compiler/types.js';
import type { ProfileName } from '../compiler/partition-profiles.js';

// ── CALC Composite ────────────────────────────────────────────────────────────

export interface CalcCompositeResult {
  readonly profile: ProfileName;
  readonly tension_14d: number;
  readonly emotion_coherence: number;
  readonly rhythm: number;
  readonly signature: number;
  readonly anti_cliche: number;
  readonly composite: number;      // weighted average of 5 CALC axes
}

// ── Orchestrator Result ───────────────────────────────────────────────────────

export interface OrchestratorResult {
  readonly mode: 'SAFE';
  readonly selected_profile: ProfileName;
  readonly selected_prose: string;
  readonly selected_partition: CompiledPartition;
  readonly scores: {
    readonly dramaturge: CalcCompositeResult;
    readonly musicien: CalcCompositeResult;
  };
  readonly margin: number;         // |dram.composite - music.composite|
  readonly selection_method: 'CALC' | 'TIEBREAK';
  readonly tiebreak_winner?: ProfileName;
}

// ── Config ────────────────────────────────────────────────────────────────────

export const ORCHESTRATOR_CONFIG = {
  /** Margin below which LLM tiebreak is invoked */
  TIEBREAK_MARGIN: 3.0,
} as const;
