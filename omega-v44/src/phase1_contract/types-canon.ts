/**
 * OMEGA V4.4 — Phase 1: Canon Parameters
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0 — Table 3.4
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * These parameters are IMMUTABLE per emotion.
 * Defined EXACTLY as in Vision Scellée.
 *
 * CANON PARAMS: M, λ (lambda), κ (kappa), E₀, ζ (zeta), μ (mu)
 * RUNTIME PARAMS: C, ω (omega), φ (phi) — NOT IN THIS FILE
 */

/**
 * Canon parameters defined EXPLICITLY in the Vision Scellée table.
 * These are IMMUTABLE per emotion type.
 */
export interface EmotionParamsCanon {
  /** M: Masse - Inertie émotionnelle (0, M_MAX] */
  readonly M: number;
  /** λ: Dissipation - Coefficient de décroissance = 1/τ */
  readonly lambda: number;
  /** κ: Vitesse - Facteur de vitesse [KAPPA_MIN, KAPPA_MAX] */
  readonly kappa: number;
  /** E₀: Repos - Point d'équilibre naturel */
  readonly E0: number;
  /** ζ: Damping - Facteur d'amortissement */
  readonly zeta: number;
  /** μ: Fatigue - Coefficient d'hystérésis [0, 1] */
  readonly mu: number;
}

/**
 * Type guard for EmotionParamsCanon
 */
export function isEmotionParamsCanon(obj: unknown): obj is EmotionParamsCanon {
  if (typeof obj !== 'object' || obj === null) return false;
  const params = obj as Record<string, unknown>;
  return (
    typeof params['M'] === 'number' &&
    typeof params['lambda'] === 'number' &&
    typeof params['kappa'] === 'number' &&
    typeof params['E0'] === 'number' &&
    typeof params['zeta'] === 'number' &&
    typeof params['mu'] === 'number'
  );
}
