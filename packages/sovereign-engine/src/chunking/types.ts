/**
 * OMEGA V2.1 — Chunking Adaptatif Types
 *
 * Sprint V2.1 scaffolding (2026-05-26) — Pre-implementation interfaces
 * Reference ADR : Claude-Workspace/OMEGA/outputs/ADR_V2.1_CHUNKING_ADAPTATIF_2026-05-26.md
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ============================================================
// Core Types
// ============================================================

export type ChunkingMode = 'fixed' | 'adaptive';

export type Emotion =
  | 'joy'
  | 'sadness'
  | 'fear'
  | 'anger'
  | 'surprise'
  | 'disgust'
  | 'neutral';

export interface FeatureVector {
  readonly vakog: { v: number; a: number; k: number; o: number; g: number };
  readonly body_binding: number;
  readonly concreteness: number;
  readonly sentiment: number; // -1 to +1
  readonly punctuation_density: number;
}

export interface EmotionalArc {
  readonly start_idx: number; // sentence index (inclusive)
  readonly end_idx: number; // sentence index (exclusive)
  readonly dominant_emotion: Emotion;
  readonly intensity: number; // 0-1
  readonly features: FeatureVector;
}

export interface ChunkConfig {
  readonly mode: ChunkingMode;
  readonly target_size: number; // mots cibles (default 750)
  readonly min_chunks: number; // default 2
  readonly max_chunks: number; // default 7
  readonly weights: ChunkWeights;
}

export interface ChunkWeights {
  readonly arc_breakage: number; // w1
  readonly length_variance: number; // w2
  readonly discontinuity: number; // w3
}

export interface ChunkMetadata {
  readonly chunk_index: number;
  readonly total_chunks: number;
  readonly word_count: number;
  readonly sentence_count: number;
  readonly arc_count: number;
  readonly cost_score: number;
}

export interface Chunk {
  readonly id: string;
  readonly text: string;
  readonly start_word: number; // word offset start
  readonly end_word: number; // word offset end (exclusive)
  readonly arcs: readonly EmotionalArc[];
  readonly metadata: ChunkMetadata;
}

// ============================================================
// Constants
// ============================================================

export const DEFAULT_CHUNK_CONFIG: ChunkConfig = {
  mode: 'fixed',
  target_size: 750,
  min_chunks: 2,
  max_chunks: 7,
  weights: {
    arc_breakage: 0.5,
    length_variance: 0.3,
    discontinuity: 0.2,
  },
};

export const DEFAULT_ADAPTIVE_CONFIG: ChunkConfig = {
  ...DEFAULT_CHUNK_CONFIG,
  mode: 'adaptive',
};

// ============================================================
// Errors
// ============================================================

export class ChunkingError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ChunkingError';
  }
}

export class CalibrationError extends ChunkingError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CALIBRATION_FAILED', context);
    this.name = 'CalibrationError';
  }
}
