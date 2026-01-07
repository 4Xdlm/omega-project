/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/genome — VERSION & CONSTANTS
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SimilarityWeights } from "../api/types.js";

// VERSION
export const GENOME_VERSION = "1.2.0" as const;
export const EXTRACTOR_VERSION = "1.2.0" as const;

// DETERMINISM
export const DEFAULT_SEED = 42 as const;
export const FLOAT_PRECISION = 1e-6 as const;
export const FLOAT_DECIMALS = 6 as const;

// SIMILARITY
export const DEFAULT_WEIGHTS: Readonly<SimilarityWeights> = {
  emotion: 0.30,
  style: 0.30,
  structure: 0.20,
  tempo: 0.20,
} as const;

export const SIMILARITY_THRESHOLDS = {
  IDENTICAL: 0.99,
  VERY_SIMILAR: 0.85,
  SIMILAR: 0.70,
  DIFFERENT: 0.30,
} as const;

// STRUCTURE
export const TENSION_CURVE_POINTS = 10 as const;
export const MAX_DOMINANT_TRANSITIONS = 5 as const;

// VALIDATION
export const DISTRIBUTION_SUM_TOLERANCE = 0.001 as const;
export const FINGERPRINT_LENGTH = 64 as const;

// DISCLAIMER
export const SIMILARITY_DISCLAIMER = "INDICATEUR_PROBABILISTE_NON_PREUVE_LEGALE" as const;
