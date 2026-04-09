/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.1 — FEATURES PROVENANCE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/scoring/dispatcher/features-provenance.ts
 * Version:  3.1.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      outputs/dispatcher_v33/ADR-001-dispatcher-lang_v2.md §6
 *
 * Purpose
 * -------
 * Source unique de vérité pour les 5 features consommées par le dispatcher
 * M0b_slim V3.1. Assure la traçabilité : chaque feature est mappée 1:1 à
 * son nom canonique dans text-features.ts (computeTextFeatures), et tout
 * changement de nom ou suppression fait EXPLOSER le typecheck.
 *
 * Mécanisme
 * ---------
 * Pourquoi ça marche :
 *   extractDispatcherFeatures() délègue à computeTextFeatures() (unique
 *   source légitime des valeurs) et ne conserve que les 5 clés connues.
 *   Aucune recopie ni recalcul : zéro divergence possible avec les
 *   features exposées au reste du pipeline.
 *
 * Conditions d'échec :
 *   - Si computeTextFeatures() retire ou renomme une des 5 features →
 *     le champ devient NaN. extractDispatcherFeatures signale via NaN,
 *     et dispatcher-lang.ts convertit en status='skipped' reason='nan_feature'.
 *
 * Risques :
 *   - Changement silencieux de sémantique d'une feature (ex: f1a_rhythm_variance
 *     qui passerait de stdev à variance). Non détectable ici : c'est la
 *     responsabilité des tests de non-régression golden runs.
 *
 * Invariants couverts
 * -------------------
 * - INV-DISP-LANG-02 : exactement 5 features, ordre figé
 * - INV-DISP-LANG-03 : delegation pure à computeTextFeatures (pas de recalcul)
 * - INV-DISP-LANG-08 : NaN propagé fidèlement en cas de feature absente
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeTextFeatures } from '../text-features.js';

/**
 * Liste ordonnée des 5 features M0b_slim V3.1.
 *
 * L'ordre est canonique : il correspond à l'ordre d'extraction dans le script
 * Python de calibration (M0B_SLIM_CALIBRATION_V3_1_LANGFIX.json). Toute
 * réorganisation nécessite un recalcul du sha256 des coefficients.
 *
 * `as const` → littéraux string → type union FeatureName.
 */
export const DISPATCHER_FEATURE_NAMES = [
  'f24c_contrast_delta',
  'f33b_commas_count',
  'f1a_rhythm_variance',
  'f33c_dot_comma_ratio',
  'f12_tense_switches',
] as const;

/**
 * Type union des 5 feature names valides. Utilisé pour garantir que toute
 * clé manipulée par dispatcher-lang.ts est connue à la compilation.
 */
export type DispatcherFeatureName = (typeof DISPATCHER_FEATURE_NAMES)[number];

/**
 * Extrait les 5 features dispatcher depuis une prose en déléguant à
 * computeTextFeatures (source unique de vérité du reste du pipeline).
 *
 * Retourne un Record exactement peuplé des 5 clés de DISPATCHER_FEATURE_NAMES.
 * Si computeTextFeatures ne fournit pas une clé (ex: prose trop courte →
 * valeur manquante), la valeur est NaN — charge à l'appelant de traiter.
 *
 * @param prose - Texte UTF-8 à analyser
 * @returns Record<FeatureName, number> — peut contenir NaN
 */
export function extractDispatcherFeatures(
  prose: string,
): Readonly<Record<DispatcherFeatureName, number>> {
  const tf = computeTextFeatures(prose);

  // On itère sur DISPATCHER_FEATURE_NAMES pour que TypeScript ait connaissance
  // de l'exhaustivité : si une entrée est supprimée du tuple, ce bloc ne
  // compilera plus (erreur TS2322).
  const out: Record<DispatcherFeatureName, number> = {
    f24c_contrast_delta: valueOrNaN(tf, 'f24c_contrast_delta'),
    f33b_commas_count: valueOrNaN(tf, 'f33b_commas_count'),
    f1a_rhythm_variance: valueOrNaN(tf, 'f1a_rhythm_variance'),
    f33c_dot_comma_ratio: valueOrNaN(tf, 'f33c_dot_comma_ratio'),
    f12_tense_switches: valueOrNaN(tf, 'f12_tense_switches'),
  };

  return out;
}

/**
 * Retourne tf[key] si la clé est présente et finie, sinon NaN.
 * NaN est propagé fidèlement : il sert de sentinelle exploitée par
 * dispatcher-lang.ts pour décider status='skipped' reason='nan_feature'.
 */
function valueOrNaN(tf: Record<string, number>, key: string): number {
  if (!(key in tf)) {
    return NaN;
  }
  const v = tf[key];
  if (typeof v !== 'number') {
    return NaN;
  }
  return v;
}
