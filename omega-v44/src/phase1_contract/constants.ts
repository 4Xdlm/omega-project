/**
 * OMEGA V4.4 — Phase 1: Emotion Constants (CANON ONLY)
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0 — Table 3.4
 * THIS IS THE LAW. DO NOT MODIFY.
 *
 * CANON PARAMS ONLY: M, λ, κ, E₀, ζ, μ
 * C, ω, φ are NOT in this table (see RuntimeConfig)
 */

import type { EmotionId, EmotionCategory } from './types.js';
import type { EmotionParamsCanon } from './types-canon.js';

// ═══════════════════════════════════════════════════════════════════════════
// EMOTION DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete emotion definition with canon parameters
 */
export interface EmotionDefinition {
  readonly id: EmotionId;
  readonly category: EmotionCategory;
  readonly params: EmotionParamsCanon;
}

// ═══════════════════════════════════════════════════════════════════════════
// THE 16 CANONICAL EMOTIONS V4.4
// Coefficients EXACTLY as in Vision Scellée
// ═══════════════════════════════════════════════════════════════════════════

export const EMOTIONS_V44: Record<EmotionId, EmotionDefinition> = {
  // ═══════════════════════════════════════════════════════════════════════
  // MAJEURES (4) - High mass, low dissipation
  // ═══════════════════════════════════════════════════════════════════════
  AMOUR: {
    id: 'AMOUR',
    category: 'MAJEURE',
    params: { M: 6.0, lambda: 0.10, kappa: 0.8, E0: 2, zeta: 0.7, mu: 0.3 }
  },
  HAINE: {
    id: 'HAINE',
    category: 'MAJEURE',
    params: { M: 7.0, lambda: 0.08, kappa: 1.2, E0: -1, zeta: 0.6, mu: 0.4 }
  },
  TERREUR: {
    id: 'TERREUR',
    category: 'MAJEURE',
    params: { M: 5.0, lambda: 0.25, kappa: 1.8, E0: 0, zeta: 0.5, mu: 0.5 }
  },
  DEUIL: {
    id: 'DEUIL',
    category: 'MAJEURE',
    params: { M: 8.5, lambda: 0.03, kappa: 0.6, E0: -2, zeta: 0.4, mu: 0.6 }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // INTERMEDIAIRES (4) - Medium mass and dissipation
  // ═══════════════════════════════════════════════════════════════════════
  JOIE: {
    id: 'JOIE',
    category: 'INTERMEDIAIRE',
    params: { M: 3.0, lambda: 0.35, kappa: 1.0, E0: 1, zeta: 0.9, mu: 0.1 }
  },
  TRISTESSE: {
    id: 'TRISTESSE',
    category: 'INTERMEDIAIRE',
    params: { M: 4.5, lambda: 0.15, kappa: 0.9, E0: -1, zeta: 0.7, mu: 0.3 }
  },
  COLERE: {
    id: 'COLERE',
    category: 'INTERMEDIAIRE',
    params: { M: 4.0, lambda: 0.30, kappa: 1.5, E0: 0, zeta: 0.6, mu: 0.2 }
  },
  PEUR: {
    id: 'PEUR',
    category: 'INTERMEDIAIRE',
    params: { M: 3.5, lambda: 0.40, kappa: 1.6, E0: 0, zeta: 0.8, mu: 0.2 }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // MINEURES (4) - Lower mass, moderate dissipation
  // ═══════════════════════════════════════════════════════════════════════
  ESPOIR: {
    id: 'ESPOIR',
    category: 'MINEURE',
    params: { M: 2.5, lambda: 0.25, kappa: 1.0, E0: 1, zeta: 0.85, mu: 0.15 }
  },
  NOSTALGIE: {
    id: 'NOSTALGIE',
    category: 'MINEURE',
    params: { M: 3.5, lambda: 0.12, kappa: 0.7, E0: 0, zeta: 0.75, mu: 0.25 }
  },
  ANXIETE: {
    id: 'ANXIETE',
    category: 'MINEURE',
    params: { M: 3.0, lambda: 0.20, kappa: 1.3, E0: 0, zeta: 0.55, mu: 0.35 }
  },
  CULPABILITE: {
    id: 'CULPABILITE',
    category: 'MINEURE',
    params: { M: 5.0, lambda: 0.08, kappa: 0.8, E0: -1, zeta: 0.5, mu: 0.4 }
  },

  // ═══════════════════════════════════════════════════════════════════════
  // BENIGNES (4) - Low mass, high dissipation
  // ═══════════════════════════════════════════════════════════════════════
  SURPRISE: {
    id: 'SURPRISE',
    category: 'BENIGNE',
    params: { M: 1.5, lambda: 0.80, kappa: 1.8, E0: 0, zeta: 1.2, mu: 0.05 }
  },
  DEGOUT: {
    id: 'DEGOUT',
    category: 'BENIGNE',
    params: { M: 2.0, lambda: 0.50, kappa: 1.4, E0: 0, zeta: 1.1, mu: 0.1 }
  },
  ENNUI: {
    id: 'ENNUI',
    category: 'BENIGNE',
    params: { M: 1.0, lambda: 0.60, kappa: 1.0, E0: 0, zeta: 1.3, mu: 0.05 }
  },
  SERENITE: {
    id: 'SERENITE',
    category: 'BENIGNE',
    params: { M: 2.0, lambda: 0.20, kappa: 0.8, E0: 2, zeta: 1.0, mu: 0.0 }
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get emotion definition by ID
 */
export function getEmotionDefinition(id: EmotionId): EmotionDefinition {
  return EMOTIONS_V44[id];
}

/**
 * Get emotions by category
 */
export function getEmotionsByCategory(category: EmotionCategory): readonly EmotionDefinition[] {
  return Object.values(EMOTIONS_V44).filter(e => e.category === category);
}

/**
 * Get canon parameters for an emotion
 */
export function getCanonParams(id: EmotionId): EmotionParamsCanon {
  return EMOTIONS_V44[id].params;
}

/**
 * Verify all 16 emotions are defined
 */
export function verifyEmotionsComplete(): boolean {
  return Object.keys(EMOTIONS_V44).length === 16;
}

/**
 * Verify category distribution (4 per category)
 */
export function verifyCategoryDistribution(): boolean {
  const categories: EmotionCategory[] = ['MAJEURE', 'INTERMEDIAIRE', 'MINEURE', 'BENIGNE'];
  return categories.every(cat => getEmotionsByCategory(cat).length === 4);
}
