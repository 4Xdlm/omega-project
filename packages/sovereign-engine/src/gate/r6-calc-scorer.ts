/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — CALC SCORER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/r6-calc-scorer.ts
 * Version:  1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md
 *
 * Rôle
 * ----
 * Calcule le score CALC V3.4 (baseline_tier_score) pour le R6 Rejection Gate.
 * Réutilise les coefficients scellés et l'extracteur de features canonique.
 *
 * Séparation architecturale
 * -------------------------
 * Ce module est DISTINCT de dispatcher-lang.ts (shadow mode).
 * Le dispatcher-lang reste shadow (INV-NR-01/02/03 intacts).
 * Le r6-calc-scorer a un rôle de GATING — il produit un score utilisé
 * pour des décisions accept/reject. Pas de shadow ici.
 *
 * Mécanisme du scoring
 * --------------------
 * Identique au dispatcher-lang.ts :
 *   score = model.intercept + Σ_f model.features[f].coef
 *           × (raw[f] - model.features[f].mean) / model.features[f].std
 *
 * Pourquoi ça marche :
 *   Ridge α=1.0 sur 1334 œuvres. Le score est une prédiction ordinale
 *   de tier qualité (~[1.5, 6.5]). Plus le score est haut, meilleure
 *   est la qualité structurelle de la prose.
 *
 * Conditions d'échec :
 *   - prose trop courte (< minProseLength) → NaN
 *   - feature NaN (texte anormal) → NaN
 *   - langue non supportée → fallback model
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  CALIBRATION_ID,
  MODEL_VERSION,
  getLangModel,
  type LangKey,
  type LangModel,
  type CoefficientStats,
} from '../scoring/dispatcher/coefficients-v3-4.js';
import {
  extractDispatcherFeatures,
  DISPATCHER_FEATURE_NAMES,
  type DispatcherFeatureName,
} from '../scoring/dispatcher/features-provenance.js';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES LOCAUX
// ──────────────────────────────────────────────────────────────────────────────

export interface R6CalcScoreResult {
  /** Score Ridge (échelle tier ordinal ~[1.5, 6.5]). NaN si échec. */
  readonly score: number;

  /** Vecteur de features brutes (5 features). */
  readonly features: Readonly<Record<DispatcherFeatureName, number>>;

  /** Route linguistique sélectionnée. */
  readonly langRoute: LangKey;

  /** Raison d'échec si score=NaN. Undefined si scoring réussi. */
  readonly skipReason?: 'prose_too_short' | 'nan_feature';

  /** Version du modèle utilisé. */
  readonly modelVersion: string;

  /** ID de calibration. */
  readonly calibrationId: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// ROUTING LINGUISTIQUE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Détermine la clé de langue pour le routing Ridge.
 * Identique à routeFromLanguage() dans dispatcher-lang.ts.
 */
export function routeLang(language: string): LangKey {
  const lower = language.toLowerCase().trim();
  if (lower === 'fr' || lower === 'fra' || lower === 'french') return 'fr';
  if (lower === 'en' || lower === 'eng' || lower === 'english') return 'en';
  return 'fallback';
}

// ──────────────────────────────────────────────────────────────────────────────
// SCORING RIDGE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Calcule la prédiction Ridge standardisée.
 *
 * @param model - Modèle Ridge (intercept + features avec coef/mean/std)
 * @param rawFeatures - Vecteur de features brutes
 * @returns Score Ridge (NaN si une feature est NaN)
 */
export function computeRidgeScore(
  model: LangModel,
  rawFeatures: Readonly<Record<DispatcherFeatureName, number>>,
): number {
  let score = model.intercept;

  for (const featureName of DISPATCHER_FEATURE_NAMES) {
    const raw = rawFeatures[featureName];
    if (!Number.isFinite(raw)) return NaN;

    const stats: CoefficientStats = model.features[featureName] as CoefficientStats;
    if (!stats || stats.std === 0) return NaN;

    const z = (raw - stats.mean) / stats.std;
    score += stats.coef * z;
  }

  return score;
}

// ──────────────────────────────────────────────────────────────────────────────
// ENTRÉE PRINCIPALE
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Score une prose via CALC V3.4 pour le R6 Rejection Gate.
 *
 * @param prose - Texte à scorer
 * @param language - Langue de la scène ('fr' | 'en' ou équivalents)
 * @param minProseLength - Longueur minimum en caractères (default 200)
 * @returns R6CalcScoreResult avec score, features, et metadata
 *
 * @example
 * ```typescript
 * const result = scoreForR6Gate(prose, 'fr');
 * if (Number.isFinite(result.score) && result.score >= 4.2) {
 *   // PASS — le draft a franchi le gate
 * }
 * ```
 */
export function scoreForR6Gate(
  prose: string,
  language: string,
  minProseLength: number = 200,
): R6CalcScoreResult {
  const langRoute = routeLang(language);
  const baseResult = {
    langRoute,
    modelVersion: MODEL_VERSION,
    calibrationId: CALIBRATION_ID,
  };

  // Guard: prose trop courte
  if (prose.length < minProseLength) {
    return {
      ...baseResult,
      score: NaN,
      features: makeNaNFeatures(),
      skipReason: 'prose_too_short',
    };
  }

  // Extraction des 5 features canoniques
  const features = extractDispatcherFeatures(prose);

  // Guard: feature NaN
  for (const name of DISPATCHER_FEATURE_NAMES) {
    if (!Number.isFinite(features[name])) {
      return {
        ...baseResult,
        score: NaN,
        features,
        skipReason: 'nan_feature',
      };
    }
  }

  // Scoring Ridge
  const model = getLangModel(langRoute);
  const score = computeRidgeScore(model, features);

  // Guard: score NaN (ne devrait pas arriver si features OK, mais défense en profondeur)
  if (!Number.isFinite(score)) {
    return {
      ...baseResult,
      score: NaN,
      features,
      skipReason: 'nan_feature',
    };
  }

  return {
    ...baseResult,
    score,
    features,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function makeNaNFeatures(): Readonly<Record<DispatcherFeatureName, number>> {
  const result: Record<string, number> = {};
  for (const name of DISPATCHER_FEATURE_NAMES) {
    result[name] = NaN;
  }
  return result as Record<DispatcherFeatureName, number>;
}

// Re-export pour consommation par r6-rejection-gate.ts
export { CALIBRATION_ID, MODEL_VERSION };
