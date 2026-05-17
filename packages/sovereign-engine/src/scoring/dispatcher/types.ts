/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DISPATCHER LANG V3.1 — PUBLIC TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/scoring/dispatcher/types.ts
 * Version:  3.1.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      outputs/dispatcher_v33/ADR-001-dispatcher-lang_v2.md
 *
 * Purpose
 * -------
 * Contrats TypeScript publics du M0b_slim V3.1 Language Dispatcher.
 * Le dispatcher produit un score "tier ordinal" (~[1.5, 6.5]) utilisé en
 * parallèle du composite 0–100 existant, sans jamais remplacer celui-ci.
 *
 * Invariants couverts
 * -------------------
 * - INV-DISP-LANG-01 : DispatcherRoute ∈ {FR, EN, FALLBACK}
 * - INV-DISP-LANG-06 : baseline_tier_score ∈ [1.0, 7.5] (range théorique, non clipé)
 * - INV-DISP-LANG-09 : DispatcherAttachment = discriminated union tri-état
 * - INV-NR-01        : aucun export de ce module n'est importé par composite/verdict
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket } from '../../types.js';

// ──────────────────────────────────────────────────────────────────────────────
// ROUTING
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Route sélectionnée par le dispatcher — détermine quel modèle Ridge (FR, EN,
 * FALLBACK) est utilisé pour calculer baseline_tier_score.
 *
 * INV-DISP-LANG-01 : cette union est fermée. Toute nouvelle route (ex: 'ES')
 * exige un nouveau modèle Ridge calibré + version bump.
 */
export type DispatcherRoute = 'FR' | 'EN' | 'FALLBACK';

// ──────────────────────────────────────────────────────────────────────────────
// RESULT
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Résultat d'une passe dispatcher réussie.
 *
 * Tous les champs sont `readonly` pour bloquer toute mutation post-hoc
 * (garantit INV-NR-04 : attachment ne peut pas être altéré après retour).
 */
export interface DispatcherResult {
  /** Route effectivement empruntée (FR, EN, FALLBACK). */
  readonly route: DispatcherRoute;

  /**
   * Prédiction finale (échelle tier ordinal, ~[1.5, 6.5]).
   * Produit du Ridge V3.1 sur les 5 features standardisées.
   *
   * ⚠ PAS un composite 0–100. Ne JAMAIS comparer à MIN_COMPOSITE.
   */
  readonly baseline_tier_score: number;

  /**
   * Prédiction brute avant arrondi éventuel — pour traçabilité.
   * En V3.1 : identique à baseline_tier_score (pas de clip, pas d'arrondi).
   */
  readonly raw_prediction: number;

  /**
   * Vecteur de features standardisées (après normalisation z-score).
   * Clés : f24c_contrast_delta, f33b_commas_count, f1a_rhythm_variance,
   *        f33c_dot_comma_ratio, f12_tense_switches.
   * Lecture seule pour forbid mutation.
   */
  readonly feature_vector: Readonly<Record<string, number>>;

  /** Nombre de features fournies. V3.1 : toujours 5 si status='ok'. */
  readonly feature_count: number;

  /** Identifiant de calibration (source rapport M0b_slim). */
  readonly calibration_id: string;

  /** SHA-256 canonique des coefficients (boot check INV-NR-10). */
  readonly calibration_sha256: string;

  /** Version du modèle dispatcher ('3.1'). */
  readonly model_version: string;

  /**
   * Justification de la route choisie.
   * Valeurs typiques : 'packet.language=fr', 'packet.language=en',
   *                    'packet.language missing → fallback',
   *                    'packet.language=es → fallback (unsupported)'.
   */
  readonly route_reason: string;

  /**
   * Identifiant unique de cette attachement (pour corrélation avec logs).
   * Format : `disp-${scene_id}-${counter}`.
   */
  readonly trace_id: string;

  /**
   * Schéma de normalisation utilisé — verrou explicite pour distinguer
   * la V3.1 (raw Ridge tier ordinal) d'une future V4 normalisée vers 0–100.
   */
  readonly normalization_scheme: 'raw_ridge_tier_ordinal';
}

// ──────────────────────────────────────────────────────────────────────────────
// SKIP REASONS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Raisons documentées pour lesquelles le dispatcher peut décider de ne PAS
 * émettre de résultat (status = 'skipped'). Fermée, non extensible.
 */
export type DispatcherSkipReason =
  | 'prose_too_short'
  | 'nan_feature'
  | 'invalid_feature_vector'
  | 'unexpected_language';

// ──────────────────────────────────────────────────────────────────────────────
// ATTACHMENT — DISCRIMINATED UNION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Attachement produit par le dispatcher et collé à MacroSScore.baseline_m0b.
 *
 * Discriminated union tri-état :
 * - 'ok'       → résultat calculé
 * - 'skipped'  → dispatcher actif mais n'a pas pu produire de résultat
 * - 'disabled' → feature flag OFF (runDispatcherLang ne fait rien)
 *
 * INV-DISP-LANG-09 : exhaustive, tout switch doit couvrir les 3 branches.
 */
export type DispatcherAttachment =
  | { readonly status: 'ok'; readonly result: DispatcherResult }
  | { readonly status: 'skipped'; readonly reason: DispatcherSkipReason }
  | { readonly status: 'disabled' };

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Configuration runtime du dispatcher.
 *
 * En V3.1, `mode` est verrouillé à `'shadow'` : le dispatcher n'influe
 * JAMAIS sur composite/verdict/routing (INV-NR-01, INV-NR-02).
 */
export interface DispatcherConfig {
  /** Résultat de isDispatcherLangActive() — lecture env var. */
  readonly enabled: boolean;

  /** Mode d'opération. V3.1 : 'shadow' uniquement. */
  readonly mode: 'shadow';

  /** Version du modèle. V3.1 → V3.4 cabled 2026-04-11 (CLAUDE.md OMEGA). */
  readonly version: '3.1' | '3.4';

  /**
   * Longueur minimale de la prose (caractères) pour déclencher le calcul.
   * En dessous : status='skipped', reason='prose_too_short'.
   */
  readonly min_prose_length: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// API PRINCIPALE (signatures — implémentations dans dispatcher-lang.ts)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Exécute le dispatcher langue V3.1 sur une prose et retourne un attachement
 * à coller dans MacroSScore.baseline_m0b.
 *
 * Pure side-effect free hormis :
 * - incrémentation du counter module-scope (singleton R-04)
 * - lecture de process.env.OMEGA_DISPATCHER_LANG_V33 (via isDispatcherLangActive)
 *
 * Ne jette JAMAIS d'exception propagée à l'appelant sauf si :
 * - coefficients tampered (DispatcherIntegrationError INVALID_SHA256)
 * - feature provenance bug interne (DispatcherIntegrationError UNKNOWN_FEATURE)
 *
 * @param prose  - Texte brut à analyser (chaîne UTF-8)
 * @param packet - ForgePacket avec au moins language renseigné
 * @param config - Override partiel de DispatcherConfig (tests)
 * @returns DispatcherAttachment tri-état
 */
export type RunDispatcherLangFn = (
  prose: string,
  packet: Pick<ForgePacket, 'language'>,
  config?: Partial<DispatcherConfig>,
) => DispatcherAttachment;

/**
 * Lit le feature flag depuis process.env.OMEGA_DISPATCHER_LANG_V33.
 * Valeurs acceptées : '0' (OFF, défaut), '1' (ON). Toute autre valeur
 * jette DispatcherIntegrationError avec code UNKNOWN_MODE.
 */
export type IsDispatcherLangActiveFn = () => boolean;

/**
 * Retourne la configuration courante (snapshot instantané).
 */
export type GetDispatcherConfigFn = () => DispatcherConfig;

// ──────────────────────────────────────────────────────────────────────────────
// ERRORS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Erreur structurée remontée par le dispatcher en cas de corruption
 * (coefficients tampered, feature bus absent, mode env inconnu).
 *
 * Distincte des erreurs runtime ordinaires afin que les caller puissent
 * discriminer et remonter immédiatement un incident NASA-Grade.
 */
export class DispatcherIntegrationError extends Error {
  readonly code:
    | 'MISSING_COEFFICIENTS'
    | 'INVALID_SHA256'
    | 'UNKNOWN_FEATURE'
    | 'UNKNOWN_MODE';

  constructor(
    code: DispatcherIntegrationError['code'],
    message: string,
  ) {
    super(message);
    this.name = 'DispatcherIntegrationError';
    this.code = code;
    Object.setPrototypeOf(this, DispatcherIntegrationError.prototype);
  }
}
