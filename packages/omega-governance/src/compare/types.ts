/**
 * OMEGA Governance — Compare Types
 * Phase D.2 — Types for run comparison
 */

export interface CompareResult {
  readonly runs: readonly string[];
  readonly identical: boolean;
  readonly summary: CompareSummary;
  readonly diffs: readonly ArtifactDiff[];
  readonly score_comparison: ScoreComparison | null;
}

export interface CompareSummary {
  readonly total_artifacts: number;
  readonly identical: number;
  readonly different: number;
  readonly missing_in_first: number;
  readonly missing_in_second: number;
}

export type ArtifactDiffStatus = 'IDENTICAL' | 'DIFFERENT' | 'MISSING_LEFT' | 'MISSING_RIGHT';

export interface ArtifactDiff {
  readonly path: string;
  readonly status: ArtifactDiffStatus;
  readonly hash_left?: string;
  readonly hash_right?: string;
}

export interface ScoreComparison {
  readonly forge_score_delta: number;
  readonly emotion_score_delta: number;
  readonly quality_score_delta: number;
  readonly m_scores: Readonly<Record<string, number>>;
}
