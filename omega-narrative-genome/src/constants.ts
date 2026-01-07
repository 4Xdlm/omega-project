/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NARRATIVE GENOME — CONSTANTS
 * Version: 1.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SimilarityWeights } from "./types";

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

/** Version du format Genome */
export const GENOME_VERSION = "1.2.0" as const;

/** Version de l'extracteur */
export const EXTRACTOR_VERSION = "1.2.0" as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DÉTERMINISME
// ═══════════════════════════════════════════════════════════════════════════════

/** Seed par défaut (FROZEN) */
export const DEFAULT_SEED = 42 as const;

/** Précision de quantification des floats (INV-GEN-14) */
export const FLOAT_PRECISION = 1e-6 as const;

/** Nombre de décimales après quantification */
export const FLOAT_DECIMALS = 6 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// SIMILARITÉ
// ═══════════════════════════════════════════════════════════════════════════════

/** Poids par défaut pour la similarité */
export const DEFAULT_WEIGHTS: Readonly<SimilarityWeights> = {
  emotion: 0.30,
  style: 0.30,
  structure: 0.20,
  tempo: 0.20,
} as const;

/** Seuils de verdict */
export const SIMILARITY_THRESHOLDS = {
  IDENTICAL: 0.99,
  VERY_SIMILAR: 0.85,
  SIMILAR: 0.70,
  DIFFERENT: 0.30,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════

/** Nombre de points dans la courbe de tension */
export const TENSION_CURVE_POINTS = 10 as const;

/** Nombre max de transitions dominantes */
export const MAX_DOMINANT_TRANSITIONS = 5 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Tolérance pour somme distribution = 1.0 */
export const DISTRIBUTION_SUM_TOLERANCE = 0.001 as const;

/** Longueur attendue du fingerprint (SHA-256 hex) */
export const FINGERPRINT_LENGTH = 64 as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DISCLAIMER
// ═══════════════════════════════════════════════════════════════════════════════

/** Disclaimer juridique obligatoire */
export const SIMILARITY_DISCLAIMER = "INDICATEUR_PROBABILISTE_NON_PREUVE_LEGALE" as const;
