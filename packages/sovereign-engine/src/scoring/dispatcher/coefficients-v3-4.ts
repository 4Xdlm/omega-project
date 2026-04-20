/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.4 — COEFFICIENTS (SEALED)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/scoring/dispatcher/coefficients-v3-4.ts
 * Version:  3.4.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Provenance
 * ----------
 * Recalibration complète des 5 features M0b_slim sur corpus étendu (1334 œuvres)
 * vs V3.1 (547 œuvres). Mêmes features, nouveaux coefficients per-language.
 *
 * calibration_id     : M0b_slim_V3_4_2026-04-11
 * calibration_sha256 : e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c
 *
 * Source rapport     : M0B_SLIM_V34_COEFFICIENTS.json
 * Ridge α=1.0, seed=42, n_train=1070, n_holdout=264, ρ_dispatched=0.6138
 * holdout_v2_sha256  : 56636e289f3ceba921e74fcd33c60fc82f7498277f510545d552a9851843b1cf
 *
 * Gains vs V3.1
 * -------------
 * - Corpus : 547 → 1334 œuvres (+124 FR tier-D, expansion EN/FR complète)
 * - ρ_dispatched : 0.4827 (V3.1) → 0.6138 (V3.4) = +0.131
 * - Sign flips RÉSOLUS : f33c et f12 désormais cohérents FR/EN
 *   (les flips V3.1 étaient des instabilités statistiques dues au petit n)
 * - VIF max : 3.94 (V3.1 FR) → < 3.0 (V3.4 tous modèles)
 *
 * Pourquoi V3.4 et non V3.2/V3.3
 * -------------------------------
 * V3.2 : calibrée mais non câblée (f33c FR fragile < 95%, corpus FR insuffisant)
 * V3.3 : f9a candidate testée et REJETÉE (Δρ=-0.013 vs retrain, VIF 4.46)
 * V3.4 : retrain V3.1 sur 1334 livres = gain massif par volume, features inchangées
 *
 * Mécanisme du boot check
 * -----------------------
 * Identique à V3.1 : canon-kernel.canonicalize() → sha256 → comparaison.
 * Voir coefficients-v3-1.ts pour documentation complète du mécanisme.
 *
 * Invariants couverts
 * -------------------
 * - INV-NR-10 : boot check bit-for-bit, échec = throw immédiat
 * - INV-DISP-LANG-04 : mêmes 5 features pour FR/EN/FALLBACK, ordre figé
 * - INV-DISP-LANG-05 : coefficients immuables (`as const`)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { canonicalize, sha256 } from '@omega/canon-kernel';
import { DispatcherIntegrationError } from './types.js';
import { DISPATCHER_FEATURE_NAMES } from './features-provenance.js';

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTES D'IDENTITÉ
// ──────────────────────────────────────────────────────────────────────────────

export const CALIBRATION_ID = 'M0b_slim_V3_4_2026-04-11' as const;

/**
 * SHA256 du canonical JSON de COEFFICIENTS_V3_4.
 * Calculé le 2026-04-11 via canon-kernel.canonicalize() + sha256().
 * Vérifié bit-for-bit par reproduction indépendante du hash V3.1.
 */
export const CALIBRATION_SHA256_EXPECTED =
  'e75e3bb07d8655c6e0ee1ca99b32a2a043a44cb9c1681ee3d7a3dd305fe8424c' as const;

export const MODEL_VERSION = '3.4' as const;

// ──────────────────────────────────────────────────────────────────────────────
// COEFFICIENTS V3.4 — INVARIANTS GELÉS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Bloc scellé des coefficients Ridge V3.4 pour les trois modèles.
 * Chaque modèle expose : intercept + 5 features {coef, mean, std}.
 *
 * Calibré sur 1334 œuvres (FR: 632 train, EN: 438 train).
 * Holdout V2 : 264 œuvres (stratifié tier×lang, seed=42, 80/20).
 *
 * ZÉRO sign flip FR/EN — toutes les features sont cohérentes.
 *
 * ⚠ NE JAMAIS éditer à la main. Tout changement nécessite :
 *   1. Calibration complète (script Python)
 *   2. Recalcul sha256 canonique
 *   3. Nouveau calibration_id
 */
export const COEFFICIENTS_V3_4 = {
  fr: {
    // V3.4 — n_train=632 (vrais textes FR, lang_corrected)
    intercept: 2.7991,
    features: {
      f24c_contrast_delta: { coef: 0.371, mean: 22.5376, std: 9.1438 },
      f33b_commas_count: { coef: 0.3465, mean: 35.7304, std: 10.4749 },
      f1a_rhythm_variance: { coef: 0.203, mean: 10.9522, std: 7.8456 },
      f33c_dot_comma_ratio: { coef: 0.0915, mean: 1.3454, std: 2.9512 },
      f12_tense_switches: { coef: -0.2134, mean: 13.8671, std: 6.8928 },
    },
  },
  en: {
    // V3.4 — n_train=438 (vrais textes EN, lang_corrected)
    intercept: 3.5342,
    features: {
      f24c_contrast_delta: { coef: 0.2658, mean: 25.0295, std: 9.0033 },
      f33b_commas_count: { coef: 0.287, mean: 34.4781, std: 9.6124 },
      f1a_rhythm_variance: { coef: 0.16, mean: 11.7399, std: 5.9751 },
      f33c_dot_comma_ratio: { coef: 0.3329, mean: 1.557, std: 1.5058 },
      f12_tense_switches: { coef: -0.0405, mean: 5.9584, std: 3.0622 },
    },
  },
  fallback: {
    // V3.4 — n_train=1070 (FR+EN, toutes langues)
    intercept: 3.1,
    features: {
      f24c_contrast_delta: { coef: 0.2469, mean: 23.5576, std: 9.1688 },
      f33b_commas_count: { coef: 0.2564, mean: 35.2178, std: 10.1494 },
      f1a_rhythm_variance: { coef: 0.1507, mean: 11.2746, std: 7.1499 },
      f33c_dot_comma_ratio: { coef: 0.152, mean: 1.432, std: 2.4664 },
      f12_tense_switches: { coef: -0.4082, mean: 10.6297, std: 6.8574 },
    },
  },
} as const;

// ──────────────────────────────────────────────────────────────────────────────
// TYPES DÉRIVÉS (pour consommation par dispatcher-lang.ts)
// ──────────────────────────────────────────────────────────────────────────────

export interface CoefficientStats {
  readonly coef: number;
  readonly mean: number;
  readonly std: number;
}

export interface LangModel {
  readonly intercept: number;
  readonly features: Readonly<Record<string, CoefficientStats>>;
}

export type LangKey = 'fr' | 'en' | 'fallback';

/**
 * Accesseur typé pour récupérer un modèle Ridge par clé de langue.
 * @throws DispatcherIntegrationError(MISSING_COEFFICIENTS) si la clé n'existe pas
 */
export function getLangModel(key: LangKey): LangModel {
  const model = COEFFICIENTS_V3_4[key];
  if (!model) {
    throw new DispatcherIntegrationError(
      'MISSING_COEFFICIENTS',
      `Dispatcher V3.4: no Ridge model found for lang key '${key}'`,
    );
  }
  return model;
}

// ──────────────────────────────────────────────────────────────────────────────
// BOOT CHECK — INV-NR-10 — S'EXÉCUTE À L'IMPORT
// ──────────────────────────────────────────────────────────────────────────────

function assertFeatureNamesConsistent(): void {
  for (const langKey of ['fr', 'en', 'fallback'] as const) {
    const model = COEFFICIENTS_V3_4[langKey];
    const modelFeatureKeys = Object.keys(model.features);
    if (modelFeatureKeys.length !== DISPATCHER_FEATURE_NAMES.length) {
      throw new DispatcherIntegrationError(
        'UNKNOWN_FEATURE',
        `Dispatcher V3.4: model '${langKey}' has ${modelFeatureKeys.length} features, expected ${DISPATCHER_FEATURE_NAMES.length}`,
      );
    }
    for (const expected of DISPATCHER_FEATURE_NAMES) {
      if (!(expected in model.features)) {
        throw new DispatcherIntegrationError(
          'UNKNOWN_FEATURE',
          `Dispatcher V3.4: model '${langKey}' is missing feature '${expected}'`,
        );
      }
    }
  }
}

function assertCoefficientsSha256(): void {
  const canonical = canonicalize(COEFFICIENTS_V3_4);
  const actual = sha256(canonical);
  if (actual !== CALIBRATION_SHA256_EXPECTED) {
    throw new DispatcherIntegrationError(
      'INVALID_SHA256',
      `Dispatcher V3.4 coefficients tampered or canonicalize drift: ` +
        `expected ${CALIBRATION_SHA256_EXPECTED}, got ${actual} ` +
        `(canonical bytes=${canonical.length})`,
    );
  }
}

// Exécution immédiate au chargement du module.
assertFeatureNamesConsistent();
assertCoefficientsSha256();

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT D'UN HELPER DE CANONICAL HASH (pour tests et scellement)
// ──────────────────────────────────────────────────────────────────────────────

export function computeCoefficientsSha256(): string {
  return sha256(canonicalize(COEFFICIENTS_V3_4));
}

export function computeCoefficientsCanonical(): string {
  return canonicalize(COEFFICIENTS_V3_4);
}
