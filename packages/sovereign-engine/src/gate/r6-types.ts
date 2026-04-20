/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — TYPES
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/r6-types.ts
 * Version:  1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md
 *
 * Contrats TypeScript du R6 Rejection Gate. Ce module est séparé du
 * dispatcher shadow (INV-NR-01/02/03 intacts). Le R6 gate a autorité
 * de rejet sur les drafts — il n'est PAS shadow.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DispatcherFeatureName } from '../scoring/dispatcher/features-provenance.js';
import type { LangKey } from '../scoring/dispatcher/coefficients-v3-4.js';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Mode d'opération du R6 gate.
 *
 * - 'disabled' : gate désactivé, aucun calcul
 * - 'shadow'   : gate s'exécute et logue, mais ne rejette jamais
 * - 'active'   : gate rejette activement les drafts sous seuil
 */
export type R6GateMode = 'disabled' | 'shadow' | 'active';

/**
 * Configuration du R6 Rejection Gate.
 * Tous les champs sont readonly — la config est fixée AVANT le run,
 * jamais modifiée pendant (invariant ADR-003 §3).
 */
export interface R6GateConfig {
  /** Mode d'opération. Default: 'shadow'. */
  readonly mode: R6GateMode;

  /**
   * Seuil de passage sur l'échelle tier ordinal (~[1.5, 6.5]).
   * Un jet dont le baseline_tier_score ≥ threshold passe le gate.
   * Source: env var OMEGA_R6_GATE_THRESHOLD. Default: 4.2.
   */
  readonly threshold: number;

  /**
   * Nombre maximum de retries après le premier jet.
   * Total de tentatives = 1 + maxRetries.
   * ADR-003 §4 : max 2 retries (3 tentatives total).
   */
  readonly maxRetries: number;

  /**
   * Schedule de températures pour chaque tentative.
   * Index 0 = premier jet (null = pas de override, utiliser le default du modèle).
   * Index 1 = retry 1 (0.85).
   * Index 2 = retry 2 (0.90).
   *
   * La longueur DOIT être ≥ 1 + maxRetries.
   */
  readonly temperatureSchedule: readonly (number | null)[];

  /**
   * Longueur minimale de prose (en caractères) pour que le CALC
   * puisse produire un score fiable. Sous ce seuil, les features
   * sont instables (dispatcher-lang.ts §Conditions d'échec).
   */
  readonly minProseLength: number;
}

/**
 * Construit la config par défaut depuis les env vars.
 *
 * Env vars lues :
 * - OMEGA_R6_GATE           : '0' | 'shadow' | '1' → mode
 * - OMEGA_R6_GATE_THRESHOLD : number → threshold
 */
export function buildR6GateConfig(
  overrides?: Partial<R6GateConfig>,
): R6GateConfig {
  const modeRaw = process.env.OMEGA_R6_GATE ?? 'shadow';
  let mode: R6GateMode;
  if (modeRaw === '0') mode = 'disabled';
  else if (modeRaw === 'shadow') mode = 'shadow';
  else if (modeRaw === '1') mode = 'active';
  else mode = 'shadow'; // safe default for unknown values

  // Parse threshold with explicit NaN guard
  let threshold = 4.2;
  if (process.env.OMEGA_R6_GATE_THRESHOLD) {
    const parsed = Number(process.env.OMEGA_R6_GATE_THRESHOLD);
    if (Number.isFinite(parsed)) {
      threshold = parsed;
    }
    // Invalid env var silently uses default (no crash in production)
  }

  const finalMode = overrides?.mode ?? mode;
  const finalMaxRetries = overrides?.maxRetries ?? 2;
  const finalSchedule = overrides?.temperatureSchedule ?? [null, 0.85, 0.90];

  // Validate temperature schedule length (ADR-003 §4 contract)
  if (finalSchedule.length < 1 + finalMaxRetries) {
    throw new Error(
      `R6GateConfig: temperatureSchedule length (${finalSchedule.length}) ` +
      `must be >= 1 + maxRetries (${1 + finalMaxRetries})`,
    );
  }

  return {
    mode: finalMode,
    threshold: overrides?.threshold ?? threshold,
    maxRetries: finalMaxRetries,
    temperatureSchedule: finalSchedule,
    minProseLength: overrides?.minProseLength ?? 200,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// RÉSULTATS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Résultat d'une tentative individuelle au sein du R6 gate.
 */
export interface R6GateAttempt {
  /** Index de la tentative (0 = premier jet, 1 = retry 1, 2 = retry 2). */
  readonly attemptIndex: number;

  /** Prose générée par cette tentative. */
  readonly prose: string;

  /**
   * Score CALC V3.4 (baseline_tier_score, échelle tier ordinal ~[1.5, 6.5]).
   * NaN si le scoring a échoué (prose trop courte, feature NaN).
   */
  readonly calcScore: number;

  /** Vecteur de features brutes (5 features). NaN si extraction échouée. */
  readonly features: Readonly<Record<DispatcherFeatureName, number>>;

  /** Température utilisée pour cette tentative (null = default du modèle). */
  readonly temperature: number | null;

  /** Seed utilisé pour cette tentative. */
  readonly seed: string;

  /** Durée de la génération en millisecondes. */
  readonly durationMs: number;

  /** Route linguistique utilisée (FR/EN/FALLBACK). */
  readonly langRoute: LangKey;

  /** Le jet a-t-il passé le seuil ? */
  readonly passedGate: boolean;
}

/**
 * Résultat complet du R6 Rejection Gate.
 */
export interface R6GateResult {
  /**
   * Le gate a-t-il trouvé au moins un jet au-dessus du seuil ?
   * true  = au moins un jet ≥ threshold → on retourne le meilleur valide.
   * false = aucun jet ≥ threshold → on retourne le meilleur global (fallback A).
   */
  readonly passed: boolean;

  /**
   * Tentative sélectionnée comme résultat final.
   * Si passed=true  : meilleur jet parmi ceux ≥ threshold.
   * Si passed=false : meilleur jet global (fallback A, ADR-003 §5).
   */
  readonly selectedAttempt: R6GateAttempt;

  /** Toutes les tentatives effectuées, dans l'ordre chronologique. */
  readonly allAttempts: readonly R6GateAttempt[];

  /** Nombre total de tentatives effectuées (1 à 3). */
  readonly attemptCount: number;

  /** Index de la tentative sélectionnée dans allAttempts. */
  readonly selectedAttemptIndex: number;

  /** Seuil utilisé pour ce run. */
  readonly gateThreshold: number;

  /**
   * Flag explicite : le résultat est-il sous le seuil ?
   * Équivalent à !passed. Existe pour audit/traçabilité (ADR-003 §5).
   */
  readonly belowThreshold: boolean;

  /** Mode du gate pour ce run. */
  readonly gateMode: R6GateMode;

  /** Durée totale de toutes les tentatives en millisecondes. */
  readonly totalDurationMs: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// LOG STRUCTURÉ (ADR-003 §6)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Log structuré produit par chaque passage du R6 gate.
 * Conforme à ADR-003 §6 — audit trail obligatoire.
 */
export interface R6GateLog {
  readonly gate_threshold: number;
  readonly attempt_count: number;
  readonly best_score: number;
  readonly passed_gate: boolean;
  readonly below_threshold: boolean;
  readonly selected_attempt_index: number;
  readonly temperature_schedule: readonly (number | null)[];
  readonly seed_schedule: readonly string[];
  readonly all_scores: readonly number[];
  readonly lang_route: LangKey;
  readonly duration_ms: number;
  readonly model_version: string;
  readonly calibration_id: string;
  readonly gate_mode: R6GateMode;
}

// ──────────────────────────────────────────────────────────────────────────────
// GÉNÉRATION ABSTRAITE (injection de dépendance)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Interface du générateur de prose injecté dans le R6 gate.
 * Permet de découpler le gate de SCRIBE/Ollama — testable avec des mocks.
 *
 * Le gate ne connaît pas le LLM. Il connaît seulement cette interface.
 */
export interface R6ProseGenerator {
  /**
   * Génère un draft de prose à partir d'un prompt.
   *
   * @param prompt - Le prompt complet de génération
   * @param seed - Seed pour la reproductibilité
   * @param temperature - Température (null = utiliser le default du modèle)
   * @returns La prose générée
   */
  readonly generate: (
    prompt: string,
    seed: string,
    temperature: number | null,
  ) => Promise<string>;
}

/**
 * Langue de la scène, détermine le modèle Ridge à utiliser.
 */
export type R6Language = 'fr' | 'en';
