/**
 * OMEGA V2.1 — Emotional Arc Detector (IMPLEMENTATION)
 *
 * Identifies segments where dominant emotion changes or intensity peaks,
 * using sliding window feature extraction + change-point detection.
 *
 * Algorithm:
 * 1. Compute feature vector per sliding window (W consecutive sentences)
 * 2. Compute pairwise Euclidean distance between adjacent windows
 * 3. Identify change points where distance > intensity_threshold
 * 4. Segment sentences into arcs between change points
 * 5. Compute dominant emotion + intensity per arc
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Sprint V2.1 implementation 2026-05-26
 */

import type { EmotionalArc, FeatureVector } from '../types.js';
import {
  determineDominantEmotion,
  extractFeatures,
  featureDistance,
  featureIntensity,
} from './features.js';

export interface EmotionalArcDetectorConfig {
  readonly features: readonly ('vakog' | 'body_binding' | 'concreteness' | 'sentiment')[];
  readonly window_size: number; // sentences per analysis window
  readonly intensity_threshold: number; // 0-1, min for arc detection (change-point distance)
  readonly min_arc_length: number; // minimum sentences per arc
}

export const DEFAULT_DETECTOR_CONFIG: EmotionalArcDetectorConfig = {
  features: ['vakog', 'body_binding', 'concreteness', 'sentiment'],
  window_size: 5,
  intensity_threshold: 0.3,
  min_arc_length: 2,
};

export class EmotionalArcDetector {
  private readonly config: EmotionalArcDetectorConfig;

  constructor(config: EmotionalArcDetectorConfig = DEFAULT_DETECTOR_CONFIG) {
    if (config.window_size < 1) {
      throw new Error(`window_size must be >= 1, got ${config.window_size}`);
    }
    if (config.intensity_threshold < 0 || config.intensity_threshold > 2) {
      throw new Error(`intensity_threshold must be in [0, 2], got ${config.intensity_threshold}`);
    }
    if (config.min_arc_length < 1) {
      throw new Error(`min_arc_length must be >= 1, got ${config.min_arc_length}`);
    }
    this.config = config;
  }

  /**
   * Detect emotional arcs in chapter sentences.
   *
   * @param sentences - Chapter text split into sentences
   * @returns Detected emotional arcs (covering full sentence range)
   */
  detect(sentences: readonly string[]): readonly EmotionalArc[] {
    if (sentences.length === 0) return [];

    // Edge case: fewer sentences than 2x window → single arc
    if (sentences.length < this.config.window_size * 2) {
      return [this.buildArcFromRange(sentences, 0, sentences.length)];
    }

    // Step 1: extract features per sliding window
    const windowFeatures = this.extractWindowFeatures(sentences);

    // Step 2: identify change points (distance peaks)
    const changePoints = this.findChangePoints(windowFeatures);

    // Step 3: segment sentences into arcs
    return this.segmentArcs(sentences, changePoints);
  }

  /**
   * Extract feature vector from a sentence batch (window).
   */
  extractFeatures(sentences: readonly string[]): FeatureVector {
    const concatenated = sentences.join(' ');
    return extractFeatures(concatenated);
  }

  /**
   * Extract features per sliding window across all sentences.
   * Each window covers `window_size` consecutive sentences.
   */
  private extractWindowFeatures(sentences: readonly string[]): FeatureVector[] {
    const windowFeatures: FeatureVector[] = [];
    const w = this.config.window_size;

    for (let i = 0; i + w <= sentences.length; i++) {
      const window = sentences.slice(i, i + w);
      windowFeatures.push(this.extractFeatures(window));
    }

    return windowFeatures;
  }

  /**
   * Find change-point sentence indices where adjacent windows diverge significantly.
   * Returns sorted unique sentence indices marking arc boundaries.
   */
  private findChangePoints(windowFeatures: readonly FeatureVector[]): number[] {
    if (windowFeatures.length < 2) return [];

    const changePoints: number[] = [];
    const w = this.config.window_size;

    for (let i = 0; i < windowFeatures.length - 1; i++) {
      const current = windowFeatures[i];
      const next = windowFeatures[i + 1];
      if (!current || !next) continue;

      const distance = featureDistance(current, next);
      if (distance > this.config.intensity_threshold) {
        // Change point sentence index: end of window i (start of window i+1)
        const sentenceIdx = i + w;
        changePoints.push(sentenceIdx);
      }
    }

    return [...new Set(changePoints)].sort((a, b) => a - b);
  }

  /**
   * Build arcs from sentence ranges between change points.
   * Respects min_arc_length (merges short arcs into neighbors).
   */
  private segmentArcs(
    sentences: readonly string[],
    changePoints: readonly number[]
  ): readonly EmotionalArc[] {
    if (changePoints.length === 0) {
      return [this.buildArcFromRange(sentences, 0, sentences.length)];
    }

    const arcs: EmotionalArc[] = [];
    let start = 0;

    for (const cp of changePoints) {
      const length = cp - start;
      if (length >= this.config.min_arc_length) {
        arcs.push(this.buildArcFromRange(sentences, start, cp));
        start = cp;
      }
      // else: merge into next (don't update start)
    }

    // Tail arc
    if (start < sentences.length) {
      arcs.push(this.buildArcFromRange(sentences, start, sentences.length));
    }

    return arcs;
  }

  /**
   * Build an EmotionalArc from a sentence range.
   */
  private buildArcFromRange(
    sentences: readonly string[],
    startIdx: number,
    endIdx: number
  ): EmotionalArc {
    const slice = sentences.slice(startIdx, endIdx);
    const features = this.extractFeatures(slice);
    const intensity = Math.min(1, featureIntensity(features) * 2); // scale to [0, 1]
    const dominant_emotion = determineDominantEmotion(features);

    return {
      start_idx: startIdx,
      end_idx: endIdx,
      dominant_emotion,
      intensity,
      features,
    };
  }
}
