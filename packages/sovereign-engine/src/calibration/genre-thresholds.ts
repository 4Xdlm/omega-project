/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — GENRE-BASED THRESHOLDS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: calibration/genre-thresholds.ts
 * Sprint: 18.3
 * Invariant: ART-CAL-03
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Different genres have different scoring expectations.
 * A thriller doesn't need the same rhythm as contemplative prose.
 * This module adjusts axis weights and floors per genre.
 *
 * 100% CALC — deterministic.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type Genre =
  | 'thriller'
  | 'science-fiction'
  | 'romance'
  | 'historique'
  | 'fantastique'
  | 'noir'
  | 'contemplatif'
  | 'urbain'
  | 'psychologique'
  | 'litteraire'
  | 'default';

export interface GenreProfile {
  readonly genre: Genre;
  readonly label_fr: string;

  /** Axis weight multipliers (1.0 = default, >1 = more important, <1 = less) */
  readonly weight_multipliers: {
    readonly ecc: number;      // Emotional coherence
    readonly rci: number;      // Rhythm craftsmanship
    readonly sii: number;      // Style identity
    readonly ifi: number;      // Immersion fidelity
    readonly aai: number;      // Authenticity
  };

  /** Axis floor adjustments (added to default AXIS_FLOOR of 50) */
  readonly floor_adjustments: {
    readonly ecc: number;
    readonly rci: number;
    readonly sii: number;
    readonly ifi: number;
    readonly aai: number;
  };

  /** Composite threshold adjustment (added to SOVEREIGN_THRESHOLD of 93) */
  readonly threshold_adjustment: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GENRE PROFILES
// ═══════════════════════════════════════════════════════════════════════════════

const GENRE_PROFILES: Record<Genre, GenreProfile> = {
  thriller: {
    genre: 'thriller',
    label_fr: 'Thriller / Suspense',
    weight_multipliers: { ecc: 1.2, rci: 1.1, sii: 0.9, ifi: 1.0, aai: 1.0 },
    floor_adjustments: { ecc: 5, rci: 0, sii: -5, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
  'science-fiction': {
    genre: 'science-fiction',
    label_fr: 'Science-Fiction',
    weight_multipliers: { ecc: 0.9, rci: 1.0, sii: 1.2, ifi: 1.1, aai: 0.9 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 5, ifi: 0, aai: -5 },
    threshold_adjustment: 0,
  },
  romance: {
    genre: 'romance',
    label_fr: 'Romance',
    weight_multipliers: { ecc: 1.3, rci: 1.0, sii: 0.9, ifi: 1.0, aai: 1.1 },
    floor_adjustments: { ecc: 5, rci: 0, sii: -5, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
  historique: {
    genre: 'historique',
    label_fr: 'Historique',
    weight_multipliers: { ecc: 1.0, rci: 1.0, sii: 1.1, ifi: 1.2, aai: 1.0 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 0, ifi: 5, aai: 0 },
    threshold_adjustment: 0,
  },
  fantastique: {
    genre: 'fantastique',
    label_fr: 'Fantastique / Fantasy',
    weight_multipliers: { ecc: 1.1, rci: 1.0, sii: 1.2, ifi: 1.1, aai: 0.9 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 5, ifi: 0, aai: -5 },
    threshold_adjustment: 0,
  },
  noir: {
    genre: 'noir',
    label_fr: 'Polar / Noir',
    weight_multipliers: { ecc: 1.1, rci: 1.2, sii: 1.0, ifi: 1.0, aai: 1.0 },
    floor_adjustments: { ecc: 0, rci: 5, sii: 0, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
  contemplatif: {
    genre: 'contemplatif',
    label_fr: 'Contemplatif / Poétique',
    weight_multipliers: { ecc: 0.9, rci: 1.3, sii: 1.1, ifi: 1.2, aai: 1.0 },
    floor_adjustments: { ecc: -5, rci: 5, sii: 0, ifi: 5, aai: 0 },
    threshold_adjustment: -2, // Slightly lower threshold for contemplative
  },
  urbain: {
    genre: 'urbain',
    label_fr: 'Urbain / Contemporain',
    weight_multipliers: { ecc: 1.0, rci: 1.0, sii: 1.0, ifi: 1.1, aai: 1.2 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 5 },
    threshold_adjustment: 0,
  },
  psychologique: {
    genre: 'psychologique',
    label_fr: 'Psychologique',
    weight_multipliers: { ecc: 1.3, rci: 0.9, sii: 1.0, ifi: 1.0, aai: 1.1 },
    floor_adjustments: { ecc: 5, rci: -5, sii: 0, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
  litteraire: {
    genre: 'litteraire',
    label_fr: 'Littéraire général',
    weight_multipliers: { ecc: 1.0, rci: 1.1, sii: 1.1, ifi: 1.0, aai: 1.1 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
  default: {
    genre: 'default',
    label_fr: 'Par défaut',
    weight_multipliers: { ecc: 1.0, rci: 1.0, sii: 1.0, ifi: 1.0, aai: 1.0 },
    floor_adjustments: { ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0 },
    threshold_adjustment: 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get genre profile. Returns 'default' if genre not found.
 */
export function getGenreProfile(genre: string): GenreProfile {
  return GENRE_PROFILES[genre as Genre] ?? GENRE_PROFILES.default;
}

/**
 * Get all available genre profiles.
 */
export function getAllGenreProfiles(): readonly GenreProfile[] {
  return Object.values(GENRE_PROFILES);
}

/**
 * Apply genre-specific weight multipliers to base weights.
 *
 * @param baseWeights - Map of axis → weight
 * @param genre - Genre string
 * @returns Adjusted weights (normalized to same total)
 */
export function applyGenreWeights(
  baseWeights: Record<string, number>,
  genre: string,
): Record<string, number> {
  const profile = getGenreProfile(genre);
  const result: Record<string, number> = {};
  let total = 0;

  for (const [axis, weight] of Object.entries(baseWeights)) {
    const multiplier = (profile.weight_multipliers as Record<string, number>)[axis] ?? 1.0;
    result[axis] = weight * multiplier;
    total += result[axis];
  }

  // Normalize to maintain same total
  const originalTotal = Object.values(baseWeights).reduce((a, b) => a + b, 0);
  if (total > 0 && originalTotal > 0) {
    const scale = originalTotal / total;
    for (const axis of Object.keys(result)) {
      result[axis] = Math.round(result[axis] * scale * 100) / 100;
    }
  }

  return result;
}

/**
 * Get adjusted axis floor for a genre.
 *
 * @param baseFloor - Default AXIS_FLOOR (e.g., 50)
 * @param axis - Axis name (ecc, rci, sii, ifi, aai)
 * @param genre - Genre string
 * @returns Adjusted floor value
 */
export function getGenreAxisFloor(baseFloor: number, axis: string, genre: string): number {
  const profile = getGenreProfile(genre);
  const adjustment = (profile.floor_adjustments as Record<string, number>)[axis] ?? 0;
  return Math.max(30, Math.min(70, baseFloor + adjustment)); // Clamp [30, 70]
}

/**
 * Get adjusted sovereign threshold for a genre.
 *
 * @param baseThreshold - Default SOVEREIGN_THRESHOLD (e.g., 93)
 * @param genre - Genre string
 * @returns Adjusted threshold
 */
export function getGenreThreshold(baseThreshold: number, genre: string): number {
  const profile = getGenreProfile(genre);
  return Math.max(85, Math.min(98, baseThreshold + profile.threshold_adjustment));
}

/**
 * List all supported genres.
 */
export function listGenres(): readonly Genre[] {
  return Object.keys(GENRE_PROFILES) as Genre[];
}
