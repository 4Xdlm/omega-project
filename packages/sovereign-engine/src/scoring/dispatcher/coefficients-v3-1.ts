/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.1 — COEFFICIENTS (SEALED)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/scoring/dispatcher/coefficients-v3-1.ts
 * Version:  3.1.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      outputs/dispatcher_v33/ADR-001-dispatcher-lang_v2.md §9 + Annexe C
 *
 * Provenance
 * ----------
 * Extrait de `git show stash@{0}:packages/sovereign-engine/src/config.ts`
 * lignes 173-207 (via bridge Linux read-only, 2026-04-09), et scellé ici
 * en bit-for-bit fidélité avec l'Annexe C de l'ADR-001 v2.
 *
 * calibration_id     : M0b_slim_V3_1_LANGFIX_2026-04-08
 * calibration_sha256 : a45309090b4f65c32a1f4763a3527b7e7f8b8536ac92285c5340a3a92b5e00b2
 *
 * Source rapport     : M0B_SLIM_CALIBRATION_V3_1_LANGFIX.json
 * Ridge α=1.0, seed=42, n_train=437, n_holdout=110, ρ_dispatched=0.4827
 * VIF_max : FR=3.94, EN=2.71, ALL=1.80
 *
 * Mécanisme du boot check
 * -----------------------
 * Pourquoi ça marche :
 *   canon-kernel.canonicalize() produit la même sérialisation déterministe
 *   que le Python d'origine (sorted keys, compact separators, shortest
 *   float repr). sha256(canonicalize(COEFFICIENTS_V3_1)) doit égaler
 *   CALIBRATION_SHA256_EXPECTED à l'import même du module. Sinon, l'import
 *   JETTE DispatcherIntegrationError(INVALID_SHA256) avant qu'aucun appel
 *   ne puisse se produire.
 *
 * Conditions d'échec :
 *   - Altération d'une valeur numérique → hash divergent → exception au boot
 *   - Ajout/suppression de clé → hash divergent → exception au boot
 *   - Changement de canon-kernel.canonicalize (ex: whitespace) → hash
 *     divergent → exception au boot. Dans ce cas UNIQUE, mettre à jour
 *     CALIBRATION_SHA256_EXPECTED après avoir vérifié que les coefficients
 *     eux-mêmes n'ont pas bougé.
 *
 * Risques :
 *   - Divergence Python ↔ JS sur le format numérique (ex: `1e-05` vs `0.00001`).
 *     Aucune des valeurs V3.1 n'est dans ce régime, mais il faudrait vigilance
 *     si on calibre une V3.2 avec coefficients quasi-nuls.
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

export const CALIBRATION_ID = 'M0b_slim_V3_1_LANGFIX_2026-04-08' as const;

export const CALIBRATION_SHA256_EXPECTED =
  'a45309090b4f65c32a1f4763a3527b7e7f8b8536ac92285c5340a3a92b5e00b2' as const;

export const MODEL_VERSION = '3.1' as const;

// ──────────────────────────────────────────────────────────────────────────────
// COEFFICIENTS V3.1 — INVARIANTS GELÉS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Bloc scellé des coefficients Ridge V3.1 pour les trois modèles.
 * Chaque modèle expose : intercept + 5 features {coef, mean, std}.
 *
 * ⚠ NE JAMAIS éditer à la main. Tout changement nécessite :
 *   1. Calibration complète (script Python)
 *   2. Recalcul sha256 canonique
 *   3. Nouveau ADR
 *   4. Nouveau calibration_id
 */
export const COEFFICIENTS_V3_1 = {
  fr: {
    // V3.1 lang_corrected — n_train=155 (vrais textes FR)
    intercept: 3.9226,
    features: {
      f24c_contrast_delta: { coef: 0.258, mean: 25.6022, std: 10.5819 },
      f33b_commas_count: { coef: 0.3478, mean: 39.5458, std: 12.0079 },
      f1a_rhythm_variance: { coef: 0.1625, mean: 13.1915, std: 10.4294 },
      // SIGN FLIP vs EN (FRAGILE 85%)
      f33c_dot_comma_ratio: { coef: -0.1562, mean: 1.0814, std: 0.5845 },
      // SIGN FLIP vs EN
      f12_tense_switches: { coef: 0.237, mean: 13.5781, std: 6.2624 },
    },
  },
  en: {
    // V3.1 lang_corrected — n_train=228 (vrais textes EN)
    intercept: 4.1009,
    features: {
      f24c_contrast_delta: { coef: 0.2197, mean: 29.8723, std: 10.7938 },
      f33b_commas_count: { coef: 0.2958, mean: 41.2816, std: 14.1456 },
      // FRAGILE 93%
      f1a_rhythm_variance: { coef: 0.1057, mean: 15.5911, std: 9.9184 },
      // SIGN FLIP vs FR
      f33c_dot_comma_ratio: { coef: 0.2277, mean: 1.3211, std: 2.2357 },
      // SIGN FLIP vs FR
      f12_tense_switches: { coef: -0.2525, mean: 4.6588, std: 3.2728 },
    },
  },
  fallback: {
    // V3 inchangé — n_train=437 (toutes langues, labels non utilisés)
    intercept: 3.9405,
    features: {
      f24c_contrast_delta: { coef: 0.28, mean: 27.8647, std: 10.7648 },
      f33b_commas_count: { coef: 0.3419, mean: 40.1011, std: 13.4404 },
      f1a_rhythm_variance: { coef: 0.1626, mean: 14.3736, std: 9.7855 },
      f33c_dot_comma_ratio: { coef: 0.0786, mean: 1.2276, std: 1.6737 },
      f12_tense_switches: { coef: -0.0354, mean: 8.7249, std: 6.293 },
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
  const model = COEFFICIENTS_V3_1[key];
  if (!model) {
    throw new DispatcherIntegrationError(
      'MISSING_COEFFICIENTS',
      `Dispatcher V3.1: no Ridge model found for lang key '${key}'`,
    );
  }
  return model;
}

// ──────────────────────────────────────────────────────────────────────────────
// BOOT CHECK — INV-NR-10 — S'EXÉCUTE À L'IMPORT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Vérification des 5 feature names dans chaque modèle.
 * Ce check est indépendant du sha256 : il détecte une désynchronisation
 * structurelle entre DISPATCHER_FEATURE_NAMES et COEFFICIENTS_V3_1.
 */
function assertFeatureNamesConsistent(): void {
  for (const langKey of ['fr', 'en', 'fallback'] as const) {
    const model = COEFFICIENTS_V3_1[langKey];
    const modelFeatureKeys = Object.keys(model.features);
    if (modelFeatureKeys.length !== DISPATCHER_FEATURE_NAMES.length) {
      throw new DispatcherIntegrationError(
        'UNKNOWN_FEATURE',
        `Dispatcher V3.1: model '${langKey}' has ${modelFeatureKeys.length} features, expected ${DISPATCHER_FEATURE_NAMES.length}`,
      );
    }
    for (const expected of DISPATCHER_FEATURE_NAMES) {
      if (!(expected in model.features)) {
        throw new DispatcherIntegrationError(
          'UNKNOWN_FEATURE',
          `Dispatcher V3.1: model '${langKey}' is missing feature '${expected}'`,
        );
      }
    }
  }
}

/**
 * Boot-time sha256 check — INV-NR-10.
 *
 * canon-kernel.canonicalize produit une chaîne JSON déterministe (clés
 * triées, séparateurs compacts, shortest float repr). L'équivalence avec
 * la canonicalisation Python de référence est empiriquement vérifiée
 * côté test (T-DL-16 : sha256 bit-for-bit).
 *
 * Si le hash diffère, c'est soit :
 *   (a) altération des coefficients (incident sécurité → STOP)
 *   (b) divergence de canon-kernel.canonicalize (régression infra → STOP)
 *
 * Dans les deux cas, le module refuse de charger.
 */
function assertCoefficientsSha256(): void {
  const canonical = canonicalize(COEFFICIENTS_V3_1);
  const actual = sha256(canonical);
  if (actual !== CALIBRATION_SHA256_EXPECTED) {
    throw new DispatcherIntegrationError(
      'INVALID_SHA256',
      `Dispatcher V3.1 coefficients tampered or canonicalize drift: ` +
        `expected ${CALIBRATION_SHA256_EXPECTED}, got ${actual} ` +
        `(canonical bytes=${canonical.length})`,
    );
  }
}

// Exécution immédiate au chargement du module.
// Ordre important : structure d'abord (message plus clair), puis sha256.
assertFeatureNamesConsistent();
assertCoefficientsSha256();

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT D'UN HELPER DE CANONICAL HASH (pour tests)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Expose le hash canonique recalculé à la volée — utilisé par les tests
 * T-DL-16 (bit-for-bit) et par le rapport final. Ne JAMAIS l'utiliser dans
 * la boucle chaude : utiliser CALIBRATION_SHA256_EXPECTED à la place.
 */
export function computeCoefficientsSha256(): string {
  return sha256(canonicalize(COEFFICIENTS_V3_1));
}

/**
 * Retourne la chaîne canonique elle-même (bytes exacts hashés). Utile
 * pour diagnostiquer une divergence hash lors d'une mise à jour V3.2.
 */
export function computeCoefficientsCanonical(): string {
  return canonicalize(COEFFICIENTS_V3_1);
}
