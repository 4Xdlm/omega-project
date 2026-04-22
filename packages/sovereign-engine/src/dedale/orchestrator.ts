/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/orchestrator.ts
 * Version:  0.55.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md §D.4
 * Design:   DEDALE_LOOP_DETECT_REGEN_DESIGN_v0.5_RESET_FIRST.md §5
 *
 * Orchestrateur = arbre décisionnel RESET-FIRST.
 *
 * Contrat runChunkWithDedale :
 *   1. Appelle chunkFn() → texte candidat
 *   2. Évalue oracle → attempt_1
 *   3. no_loop     → verdict='no_loop', retourne texte
 *      hard_fail   → branche reset (si mode 'on' + budget disponible)
 *   4. Branche reset :
 *      a. execute reset → si failed → verdict='reset_failed', retourne texte original
 *      b. re-run chunkFn() AVEC LE MÊME SEED → new_text
 *      c. oracle attempt_2 → new_text
 *         - no_loop   → verdict='reset_effective', retourne new_text
 *         - hard_fail → verdict='reset_non_effective', retourne new_text (fallback)
 *   5. Budget : MAX_SESSION_RESETS_PER_RUN=1 — au-delà, accepte la loop.
 *
 * Invariants :
 *   - Mode 'off'    : court-circuit complet, zéro calcul
 *   - Mode 'shadow' : oracle évalue + télémétrie, mais JAMAIS reset
 *   - Mode 'on'     : arbre complet, reset effectif
 *   - SAME SEED : isole la variable causale (§D.4 crucial)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DedaleDependencies,
  DedaleChunkTelemetry,
  DedaleConfig,
  DedaleTriggerPath,
  DedaleVerdict,
  OracleResult,
  ResetResult,
} from './types.js';
import { DEDALE_BUDGETS } from './types.js';
import type { Oracle } from './oracle.js';
import type { ResetSession } from './reset-session.js';
import type { Telemetry, RunContext } from './telemetry.js';

// ──────────────────────────────────────────────────────────────────────────────
// STATE — BUDGET CROSS-CHUNK
// ──────────────────────────────────────────────────────────────────────────────

/**
 * État orchestrateur mutable — compte les resets sur la vie d'un run.
 * Enforce MAX_SESSION_RESETS_PER_RUN (budget dur cross-chunk).
 */
export interface OrchestratorState {
  resets_used: number;
}

/**
 * Crée un état neuf (un par run).
 */
export function createOrchestratorState(): OrchestratorState {
  return { resets_used: 0 };
}

// ──────────────────────────────────────────────────────────────────────────────
// PARAMS — CONTRAT D'APPEL PAR CHUNK
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Fonction de génération d'un chunk — seed injecté pour déterminisme.
 * En cas de re-run post-reset, runChunkWithDedale re-invoque avec LE MÊME SEED.
 */
export type ChunkFn = (seed: number) => Promise<string>;

/**
 * Résultat d'un appel runChunkWithDedale.
 */
export interface DedaleChunkResult {
  /** Texte final retenu (attempt_1 ou attempt_2 selon branche). */
  readonly text: string;
  /** Verdict final Dédale (4 états). */
  readonly verdict: DedaleVerdict;
  /** Entrée télémétrie complète. */
  readonly entry: DedaleChunkTelemetry;
}

export interface RunChunkParams {
  readonly chunkFn: ChunkFn;
  readonly seed: number;
  readonly chunk_index: number;
  readonly trigger_path: DedaleTriggerPath;
  readonly runCtx: RunContext;
  readonly state: OrchestratorState;
  readonly config: DedaleConfig;
}

// ──────────────────────────────────────────────────────────────────────────────
// ORCHESTRATOR FACTORY
// ──────────────────────────────────────────────────────────────────────────────

export interface Orchestrator {
  /**
   * Exécute un chunk sous contrôle Dédale. Applique l'arbre RESET-FIRST.
   * Thread-safe : aucun parallélisme intra-run (§D.4 CI-11).
   */
  runChunkWithDedale(params: RunChunkParams): Promise<DedaleChunkResult>;
}

/**
 * Factory orchestrateur. Consomme oracle + reset + telemetry + deps (DI complet B3).
 */
export function createOrchestrator(
  oracle: Oracle,
  resetSession: ResetSession,
  telemetry: Telemetry,
  deps: Pick<DedaleDependencies, 'clock' | 'clockMonotonic' | 'logger'>
): Orchestrator {
  return {
    async runChunkWithDedale(params): Promise<DedaleChunkResult> {
      const {
        chunkFn, seed, chunk_index, trigger_path,
        runCtx, state, config,
      } = params;
      const logger = deps.logger;
      const ts_start_ms = deps.clock();

      // ─────────────────────────────────────────────────────────────────────
      // MODE OFF — court-circuit complet
      // ─────────────────────────────────────────────────────────────────────
      if (config.mode === 'off') {
        // Pas de calcul, pas de télémétrie. On exécute juste le chunk.
        const text = await chunkFn(seed);
        // Entrée minimale pour traçabilité (même en off, on sait que Dédale a
        // été "bypass"). Oracle pseudo-result neutre.
        const neutralOracle = buildNeutralOracleResult(deps, config);
        const entry = telemetry.buildChunkEntry({
          ctx: runCtx,
          chunk_index,
          seed_used: seed,
          trigger_path: null,  // Dédale désactivé → pas de trigger
          oracle_attempt_1: neutralOracle,
          oracle_attempt_2: null,
          reset: null,
          verdict: 'no_loop',
          ts_start_ms,
          ts_end_ms: deps.clock(),
        });
        // En mode 'off' on NE flush PAS — zéro impact I/O.
        return { text, verdict: 'no_loop', entry };
      }

      // ─────────────────────────────────────────────────────────────────────
      // ATTEMPT 1 — génération + évaluation oracle
      // ─────────────────────────────────────────────────────────────────────
      const text1 = await chunkFn(seed);
      const attempt1 = oracle.evaluate(text1, config.oracle_thresholds);

      // ─────────────────────────────────────────────────────────────────────
      // CAS 1 — no_loop : rien à faire, on retourne
      // ─────────────────────────────────────────────────────────────────────
      if (attempt1.verdict === 'no_loop') {
        const entry = telemetry.buildChunkEntry({
          ctx: runCtx,
          chunk_index,
          seed_used: seed,
          trigger_path,
          oracle_attempt_1: attempt1,
          oracle_attempt_2: null,
          reset: null,
          verdict: 'no_loop',
          ts_start_ms,
          ts_end_ms: deps.clock(),
        });
        await telemetry.recordChunk(runCtx, entry);
        return { text: text1, verdict: 'no_loop', entry };
      }

      // hard_fail détecté à ce stade
      logger.warn('[dedale.orchestrator] hard_fail attempt_1', {
        run_id: runCtx.run_id,
        chunk_index,
        reason: attempt1.reason,
        resets_used: state.resets_used,
        mode: config.mode,
      });

      // ─────────────────────────────────────────────────────────────────────
      // MODE SHADOW — log seulement, JAMAIS de reset
      // ─────────────────────────────────────────────────────────────────────
      if (config.mode === 'shadow') {
        // En shadow, on enregistre le hard_fail observé mais le verdict final
        // reste 'no_loop' (Dédale n'arbitre pas). L'oracle_attempt_1 capture
        // ce qui AURAIT déclenché un reset en mode 'on'.
        const entry = telemetry.buildChunkEntry({
          ctx: runCtx,
          chunk_index,
          seed_used: seed,
          trigger_path,
          oracle_attempt_1: attempt1,
          oracle_attempt_2: null,
          reset: null,
          verdict: 'no_loop',  // shadow n'arbitre pas → pas de reset_*
          ts_start_ms,
          ts_end_ms: deps.clock(),
        });
        await telemetry.recordChunk(runCtx, entry);
        return { text: text1, verdict: 'no_loop', entry };
      }

      // ─────────────────────────────────────────────────────────────────────
      // MODE ON — branche reset (si budget disponible)
      // ─────────────────────────────────────────────────────────────────────

      // BUDGET GUARD — MAX_SESSION_RESETS_PER_RUN=1
      if (state.resets_used >= DEDALE_BUDGETS.MAX_SESSION_RESETS_PER_RUN) {
        logger.warn('[dedale.orchestrator] reset budget exhausted, accepting loop', {
          run_id: runCtx.run_id,
          chunk_index,
          resets_used: state.resets_used,
        });
        // On ne peut pas reset une 2e fois. On rentre l'entry en
        // 'reset_non_effective' sans exécuter de reset (budget exhausted)
        // pour refléter "hard_fail observé, pas d'action possible".
        // Alternative : verdict 'no_loop' pour ne pas polluer le ratio.
        // Choix scellé (§C.5) : verdict 'no_loop' quand budget épuisé car
        // aucun reset n'a été tenté → exclu du dénominateur (CI-12).
        const entry = telemetry.buildChunkEntry({
          ctx: runCtx,
          chunk_index,
          seed_used: seed,
          trigger_path,
          oracle_attempt_1: attempt1,
          oracle_attempt_2: null,
          reset: null,
          verdict: 'no_loop',
          ts_start_ms,
          ts_end_ms: deps.clock(),
        });
        await telemetry.recordChunk(runCtx, entry);
        return { text: text1, verdict: 'no_loop', entry };
      }

      // Exécution reset
      let resetResult: ResetResult;
      try {
        resetResult = await resetSession.execute();
      } catch (err) {
        // Reset a throw (ne devrait pas — reset-session est défensif).
        // On traite comme 'reset_failed' pour robustesse CI-4.
        logger.error('[dedale.orchestrator] reset threw, treating as failed', {
          run_id: runCtx.run_id,
          chunk_index,
          err: String(err),
        });
        resetResult = {
          outcome: 'failed',
          proof: null,
          elapsed_ms: 0,
          error: `reset threw: ${String(err)}`,
        };
      }

      // Incrémenter budget que le reset réussisse ou pas (tenté = compté).
      state.resets_used += 1;

      // ─────────────────────────────────────────────────────────────────────
      // CAS 2 — reset échoué : on retourne le texte original
      // ─────────────────────────────────────────────────────────────────────
      if (resetResult.outcome === 'failed') {
        logger.error('[dedale.orchestrator] reset failed', {
          run_id: runCtx.run_id,
          chunk_index,
          error: resetResult.error,
        });
        const entry = telemetry.buildChunkEntry({
          ctx: runCtx,
          chunk_index,
          seed_used: seed,
          trigger_path,
          oracle_attempt_1: attempt1,
          oracle_attempt_2: null,
          reset: resetResult,
          verdict: 'reset_failed',
          ts_start_ms,
          ts_end_ms: deps.clock(),
        });
        await telemetry.recordChunk(runCtx, entry);
        return { text: text1, verdict: 'reset_failed', entry };
      }

      // ─────────────────────────────────────────────────────────────────────
      // ATTEMPT 2 — re-run avec LE MÊME SEED (isole variable causale)
      // ─────────────────────────────────────────────────────────────────────
      const text2 = await chunkFn(seed);
      const attempt2 = oracle.evaluate(text2, config.oracle_thresholds);

      const finalVerdict: DedaleVerdict =
        attempt2.verdict === 'no_loop' ? 'reset_effective' : 'reset_non_effective';

      logger.info('[dedale.orchestrator] attempt_2 evaluated', {
        run_id: runCtx.run_id,
        chunk_index,
        verdict: finalVerdict,
        reset_outcome: resetResult.outcome,
      });

      const entry = telemetry.buildChunkEntry({
        ctx: runCtx,
        chunk_index,
        seed_used: seed,
        trigger_path,
        oracle_attempt_1: attempt1,
        oracle_attempt_2: attempt2,
        reset: resetResult,
        verdict: finalVerdict,
        ts_start_ms,
        ts_end_ms: deps.clock(),
      });
      await telemetry.recordChunk(runCtx, entry);

      // On retourne text2 (retry) même si reset_non_effective —
      // le texte retry est au pire équivalent, jamais pire que text1
      // en distribution (observation empirique P8 v0.55).
      return { text: text2, verdict: finalVerdict, entry };
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Construit un OracleResult neutre pour mode 'off' (métriques à 0).
 * Permet de remplir l'entry télémétrie sans évaluer l'oracle.
 *
 * ADR-005 r2 : metrics.c2_info_elevated = false (aucune évaluation).
 */
function buildNeutralOracleResult(
  deps: Pick<DedaleDependencies, 'clock'>,
  config: DedaleConfig
): OracleResult {
  return {
    verdict: 'no_loop',
    reason: undefined,
    metrics: {
      c1_trigram_ratio: 0,
      c2_repetition_score: 0,
      c4_unique_ratio: 1,
      c2_info_elevated: false,
    },
    thresholds_used: config.oracle_thresholds,
    evaluated_at_ms: deps.clock(),
  };
}
