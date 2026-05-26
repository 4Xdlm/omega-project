/**
 * OMEGA V2.3 — Early Exit Inference Types
 *
 * Sprint V2.3 scaffolding (2026-05-26) — Pre-implementation interfaces
 * Reference ADR : Claude-Workspace/OMEGA/outputs/ADR_V2.3_EARLY_EXIT_2026-05-26.md
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

export interface AxisScores {
  readonly ecc: number; // Emotional Continuity Coherence
  readonly aai: number; // Authorial Authority Index
  readonly rci: number; // Reader Connection Index
  readonly sii: number; // Stylistic Integrity Index
  readonly ifi: number; // Inner Fictional Integrity
}

export interface EarlyExitConfig {
  readonly threshold: number; // 0-1, dispersion below = exit
  readonly min_avg_score: number; // candidate must beat (default 75)
  readonly confidence_window: number; // require last K chapters to agree (default 3)
  readonly absolute_floor: number; // any axis below = no exit (default 60)
}

export const DEFAULT_EARLY_EXIT_CONFIG: EarlyExitConfig = {
  threshold: 5.0, // stdev across 5 axes
  min_avg_score: 75,
  confidence_window: 3,
  absolute_floor: 60,
};

export interface DispersionResult {
  readonly stdev: number;
  readonly mean: number;
  readonly min: number;
  readonly max: number;
  readonly range: number;
}

export interface EarlyExitDecision {
  readonly exit: boolean;
  readonly reason: string;
  readonly confidence: number; // 0-1
  readonly dispersion: DispersionResult;
}

export interface ChapterHistoryEntry {
  readonly chapter_id: string;
  readonly scores: AxisScores;
  readonly exited_early: boolean;
  readonly final_score: number;
  readonly timestamp: number;
}

export class EarlyExitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'EarlyExitError';
  }
}
