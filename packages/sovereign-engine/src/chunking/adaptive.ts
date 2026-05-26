/**
 * OMEGA V2.1 — Chunking Adaptatif Main Entry (IMPLEMENTATION)
 *
 * Replaces K2 fixed chunking (4×750w) with adaptive boundary detection.
 *
 * Pipeline:
 *   text → splitSentences → EmotionalArcDetector → ChunkBoundaryOptimizer → chunks[]
 *
 * Calibration of hyperparameters (weights, threshold) requires corpus
 * benchmark — Sprint V2.1 calibration phase post-implementation.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.1 implementation 2026-05-26
 */

import type { Chunk, ChunkConfig } from './types.js';
import { ChunkingError, DEFAULT_ADAPTIVE_CONFIG } from './types.js';
import { EmotionalArcDetector } from './detector/emotionalArc.js';
import { splitSentences } from './detector/sentences.js';
import { ChunkBoundaryOptimizer } from './optimizer/boundary.js';

/**
 * Adaptive chunking entry point.
 *
 * @param text - Chapter raw text
 * @param config - Chunking configuration (defaults to adaptive)
 * @returns Array of adaptive chunks
 * @throws ChunkingError if input invalid
 */
export function chunkAdaptive(
  text: string,
  config: ChunkConfig = DEFAULT_ADAPTIVE_CONFIG
): readonly Chunk[] {
  if (!text || text.trim().length === 0) {
    throw new ChunkingError('Input text is empty', 'EMPTY_INPUT');
  }

  if (config.mode !== 'adaptive') {
    throw new ChunkingError(
      `chunkAdaptive() requires mode='adaptive', got '${config.mode}'`,
      'INVALID_MODE'
    );
  }

  // Step 1: Split into sentences
  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    throw new ChunkingError('No sentences extracted from text', 'NO_SENTENCES');
  }

  // Step 2: Detect emotional arcs
  const detector = new EmotionalArcDetector();
  const arcs = detector.detect(sentences);

  // Step 3: Optimize chunk boundaries
  const optimizer = new ChunkBoundaryOptimizer({
    weights: config.weights,
    target_size: config.target_size,
    min_chunks: config.min_chunks,
    max_chunks: config.max_chunks,
  });

  return optimizer.optimize(text, sentences, arcs);
}

/**
 * Convenience helper to detect if adaptive mode is production-ready.
 * Returns true after Sprint V2.1 calibration complete (hyperparams tuned on corpus).
 *
 * @returns true if production-ready (calibration validated empirically)
 */
export function isAdaptiveModeReady(): boolean {
  // Sprint V2.1 production gate:
  // - Implementation complete: ✅
  // - Calibration corpus 1334 livres: ⏳ pending
  // - R-METRICS holdout V2 validation: ⏳ pending
  // - Kill-switch evaluation Δρ ≥ +0.02: ⏳ pending
  //
  // Once calibration phase passes, flip to true.
  return false;
}

/**
 * Pipeline status for monitoring.
 */
export interface AdaptivePipelineStatus {
  readonly implementation_complete: boolean;
  readonly calibration_complete: boolean;
  readonly validation_complete: boolean;
  readonly kill_switch_passed: boolean;
}

export function getAdaptivePipelineStatus(): AdaptivePipelineStatus {
  return {
    implementation_complete: true,
    calibration_complete: false,
    validation_complete: false,
    kill_switch_passed: false,
  };
}
