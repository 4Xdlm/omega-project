/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — CORE LOGIC
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/r6-rejection-gate.ts
 * Version:  1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ADR:      docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md
 *
 * Rôle
 * ----
 * Implémente le rejection sampling Mode B (Gate Dur) validé par bench R6.
 * Le LLM génère librement, le CALC V3.4 score, accept/reject, retry aveugle.
 * Le CALC contrôle la SÉLECTION, pas la génération (ADR-003 §1).
 *
 * Mécanisme
 * ---------
 * 1. Générer un draft via le provider injecté
 * 2. Scorer via CALC V3.4 (Ridge, 5 features)
 * 3. Si score ≥ seuil → ACCEPT, retourner immédiatement
 * 4. Si score < seuil → REJECT, retry avec température progressive
 * 5. Après maxRetries+1 tentatives sans succès → fallback A
 *    (retourner le meilleur jet sous seuil, flaggé below_threshold)
 *
 * Pourquoi ça marche :
 *   Variance naturelle du LLM : sur 3 tirages avec exploration thermique,
 *   P(≥1 pass) = 1-(1-p)³. Avec p≈0.5 (bench), P = 87.5%.
 *   Le gate filtre les "mauvais tirages" sans contraindre le LLM.
 *
 * Conditions d'échec :
 *   - Scène intrinsèquement difficile → fallback A activé
 *   - Modèle LLM dont le floor naturel < seuil → tous les jets échouent
 *   - Prose trop courte pour CALC → scoring skipped, jet accepté par défaut
 *
 * Ce qui pourrait casser :
 *   - Coefficients V3.4 divergent du corpus de production → score biaisé
 *   - Le LLM change de version → recalibrer le seuil
 *   - Temperature > 0.95 → dégradation cohérence
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { scoreForR6Gate, CALIBRATION_ID, MODEL_VERSION } from './r6-calc-scorer.js';
import type {
  R6GateConfig,
  R6GateResult,
  R6GateAttempt,
  R6GateLog,
  R6ProseGenerator,
  R6Language,
} from './r6-types.js';
import { buildR6GateConfig } from './r6-types.js';
import { attachCompositeShadow, type EmotionalShadowScorers } from './emotional/r6-shadow.js';

// ──────────────────────────────────────────────────────────────────────────────
// SEED GENERATION (ADR-003 §4)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Génère le seed pour une tentative donnée.
 * Attempt 0 : seed de base inchangé.
 * Retries   : seed suffixé pour forcer un point de départ différent.
 */
function buildAttemptSeed(baseSeed: string, attemptIndex: number): string {
  if (attemptIndex === 0) return baseSeed;
  return `${baseSeed}_r${attemptIndex}`;
}

/**
 * Récupère la température pour une tentative donnée.
 * Retourne null si pas de override (utiliser le default du modèle).
 */
function getAttemptTemperature(
  schedule: readonly (number | null)[],
  attemptIndex: number,
): number | null {
  if (attemptIndex < schedule.length) {
    return schedule[attemptIndex] ?? null;
  }
  // Si l'index dépasse le schedule, utiliser la dernière valeur
  return schedule[schedule.length - 1] ?? null;
}

// ──────────────────────────────────────────────────────────────────────────────
// SÉLECTION DU MEILLEUR JET (ADR-003 §5)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Sélectionne le meilleur jet parmi un ensemble de tentatives.
 *
 * Priorité de sélection (ADR-003 §5) :
 * 1. Meilleur score CALC (baseline_tier_score le plus élevé)
 * 2. Si égalité : version avec le moins de retries (attemptIndex le plus bas)
 * 3. Si égalité : première générée (déjà couvert par l'ordre du tableau)
 *
 * @param attempts - Tableau de tentatives (au moins 1 élément)
 * @param passedOnly - Si true, ne considérer que les jets ayant passé le gate
 * @returns Index de la meilleure tentative dans le tableau
 */
export function selectBestAttempt(
  attempts: readonly R6GateAttempt[],
  passedOnly: boolean,
): number {
  if (attempts.length === 0) {
    throw new Error('R6 Gate: selectBestAttempt called with empty attempts array');
  }

  // Filtrage optionnel sur les jets ayant passé le gate
  const candidateIndices: number[] = passedOnly
    ? attempts.reduce<number[]>((acc, a, i) => { if (a.passedGate) acc.push(i); return acc; }, [])
    : attempts.map((_, i) => i);

  // Si aucun candidat valide en mode passedOnly, fallback sur tous
  const poolIndices = candidateIndices.length > 0
    ? candidateIndices
    : attempts.map((_, i) => i);

  let bestOriginalIndex = poolIndices[0];
  let bestScore = -Infinity;
  let bestRetries = Infinity;

  for (const originalIdx of poolIndices) {
    const attempt = attempts[originalIdx];
    const score = Number.isFinite(attempt.calcScore) ? attempt.calcScore : -Infinity;

    if (score > bestScore) {
      bestScore = score;
      bestRetries = attempt.attemptIndex;
      bestOriginalIndex = originalIdx;
    } else if (score === bestScore && attempt.attemptIndex < bestRetries) {
      // Tiebreaker: fewer retries wins (ADR-003 §5 priority 2)
      bestRetries = attempt.attemptIndex;
      bestOriginalIndex = originalIdx;
    }
  }

  return bestOriginalIndex;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTRUCTION DU LOG (ADR-003 §6)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Construit le log structuré conforme ADR-003 §6.
 */
export function buildR6GateLog(result: R6GateResult): R6GateLog {
  return {
    gate_threshold: result.gateThreshold,
    attempt_count: result.attemptCount,
    best_score: result.selectedAttempt.calcScore,
    passed_gate: result.passed,
    below_threshold: result.belowThreshold,
    selected_attempt_index: result.selectedAttemptIndex,
    temperature_schedule: result.allAttempts.map((a) => a.temperature),
    seed_schedule: result.allAttempts.map((a) => a.seed),
    all_scores: result.allAttempts.map((a) => a.calcScore),
    lang_route: result.selectedAttempt.langRoute,
    duration_ms: result.totalDurationMs,
    model_version: MODEL_VERSION,
    calibration_id: CALIBRATION_ID,
    gate_mode: result.gateMode,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// GATE PRINCIPAL
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Exécute le R6 Rejection Gate sur une génération de prose.
 *
 * @param generator - Générateur de prose injecté (SCRIBE, Ollama, mock)
 * @param prompt - Prompt complet de génération
 * @param baseSeed - Seed de base pour la reproductibilité
 * @param language - Langue de la scène ('fr' | 'en')
 * @param config - Configuration du gate (optionnel, construit depuis env vars)
 * @returns R6GateResult avec le jet sélectionné et les métadonnées
 *
 * @example
 * ```typescript
 * const result = await runR6RejectionGate(
 *   { generate: (prompt, seed, temp) => callOllama(prompt, seed, temp) },
 *   masterPrompt,
 *   'scene_001_draft',
 *   'fr',
 * );
 * if (result.belowThreshold) {
 *   console.warn('R6 Gate: all attempts below threshold', buildR6GateLog(result));
 * }
 * ```
 */
async function runR6RejectionGateCore(
  generator: R6ProseGenerator,
  prompt: string,
  baseSeed: string,
  language: R6Language,
  config?: Partial<R6GateConfig>,
): Promise<R6GateResult> {
  const cfg = buildR6GateConfig(config);

  // Mode disabled : un seul jet, pas de gating
  if (cfg.mode === 'disabled') {
    return runDisabledMode(generator, prompt, baseSeed, language, cfg);
  }

  const totalAttempts = 1 + cfg.maxRetries;
  const attempts: R6GateAttempt[] = [];
  const startTime = Date.now();

  for (let i = 0; i < totalAttempts; i++) {
    const seed = buildAttemptSeed(baseSeed, i);
    const temperature = getAttemptTemperature(cfg.temperatureSchedule, i);

    const attemptStart = Date.now();
    const prose = await generator.generate(prompt, seed, temperature);
    const attemptDuration = Date.now() - attemptStart;

    // Score CALC V3.4
    const calcResult = scoreForR6Gate(prose, language, cfg.minProseLength);
    const passedGate = Number.isFinite(calcResult.score)
      ? calcResult.score >= cfg.threshold
      : false; // NaN = ne passe pas

    const attempt: R6GateAttempt = {
      attemptIndex: i,
      prose,
      calcScore: calcResult.score,
      features: calcResult.features,
      temperature,
      seed,
      durationMs: attemptDuration,
      langRoute: calcResult.langRoute,
      passedGate,
    };

    attempts.push(attempt);

    // En mode actif : si le jet passe, retourner immédiatement
    // En mode shadow : continuer tous les jets (pour collecter les données)
    if (cfg.mode === 'active' && passedGate) {
      return buildResult(attempts, i, cfg, startTime, true);
    }

    // Active mode only: if CALC returns NaN (prose too short, etc.), accept by default.
    // Cannot reject what cannot be judged. Shadow mode continues (NaN = non-pass for telemetry).
    if (cfg.mode === 'active' && !Number.isFinite(calcResult.score)) {
      return buildResult(attempts, i, cfg, startTime, true);
    }
  }

  // Tous les jets terminés — sélection du meilleur
  const anyPassed = attempts.some((a) => a.passedGate);

  if (cfg.mode === 'shadow') {
    // Shadow mode : retourner le premier jet (pas de gating réel)
    // mais loguer comme si on avait gaté
    return buildResult(attempts, 0, cfg, startTime, anyPassed);
  }

  // Mode actif, aucun jet n'a passé → fallback A
  if (!anyPassed) {
    const bestIdx = selectBestAttempt(attempts, false);
    return buildResult(attempts, bestIdx, cfg, startTime, false);
  }

  // Mode actif, au moins un jet a passé (ne devrait pas arriver ici
  // car on retourne immédiatement au premier pass — mais défense)
  const bestPassedIdx = selectBestAttempt(attempts, true);
  return buildResult(attempts, bestPassedIdx, cfg, startTime, true);
}

/**
 * Point d'entrée public du R6 Rejection Gate.
 *
 * Comportement IDENTIQUE à l'historique : la sélection de production reste
 * pilotée à 100% par le score de STYLE (CALC V3.4). Le paramètre optionnel
 * `shadowScorers`, combiné au flag `OMEGA_R6_COMPOSITE=shadow`, attache
 * UNIQUEMENT un champ observationnel `compositeShadow` (V4.4->R6 bridge) —
 * il ne change JAMAIS `selectedAttempt` (hash de sortie livre stable).
 *
 * @param shadowScorers - scoreurs émotion/logique injectés (log-only). Optionnel.
 * @see gate/emotional/r6-shadow.ts
 */
export async function runR6RejectionGate(
  generator: R6ProseGenerator,
  prompt: string,
  baseSeed: string,
  language: R6Language,
  config?: Partial<R6GateConfig>,
  shadowScorers?: EmotionalShadowScorers,
): Promise<R6GateResult> {
  const result = await runR6RejectionGateCore(generator, prompt, baseSeed, language, config);
  return attachCompositeShadow(result, shadowScorers);
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS INTERNES
// ──────────────────────────────────────────────────────────────────────────────

function buildResult(
  attempts: readonly R6GateAttempt[],
  selectedIndex: number,
  config: R6GateConfig,
  startTime: number,
  passed: boolean,
): R6GateResult {
  // Defensive bounds check — should never fire if callers are correct
  if (selectedIndex < 0 || selectedIndex >= attempts.length) {
    throw new Error(
      `R6 Gate: selectedIndex ${selectedIndex} out of bounds [0, ${attempts.length - 1}]`,
    );
  }

  return {
    passed,
    selectedAttempt: attempts[selectedIndex],
    allAttempts: attempts,
    attemptCount: attempts.length,
    selectedAttemptIndex: selectedIndex,
    gateThreshold: config.threshold,
    belowThreshold: !passed,
    gateMode: config.mode,
    totalDurationMs: Date.now() - startTime,
  };
}

/**
 * Mode disabled : génère un seul jet, aucun scoring, aucun gating.
 * Le résultat est marqué comme passed=true (pas de gate = tout passe).
 */
async function runDisabledMode(
  generator: R6ProseGenerator,
  prompt: string,
  baseSeed: string,
  language: R6Language,
  config: R6GateConfig,
): Promise<R6GateResult> {
  const startTime = Date.now();
  const prose = await generator.generate(prompt, baseSeed, null);
  const calcResult = scoreForR6Gate(prose, language, config.minProseLength);

  const attempt: R6GateAttempt = {
    attemptIndex: 0,
    prose,
    calcScore: calcResult.score,
    features: calcResult.features,
    temperature: null,
    seed: baseSeed,
    durationMs: Date.now() - startTime,
    langRoute: calcResult.langRoute,
    passedGate: true, // disabled = tout passe
  };

  return {
    passed: true,
    selectedAttempt: attempt,
    allAttempts: [attempt],
    attemptCount: 1,
    selectedAttemptIndex: 0,
    gateThreshold: config.threshold,
    belowThreshold: false,
    gateMode: 'disabled',
    totalDurationMs: Date.now() - startTime,
  };
}
