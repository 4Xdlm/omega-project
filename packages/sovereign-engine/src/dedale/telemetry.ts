/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — TELEMETRY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/dedale/telemetry.ts
 * Version:  0.55.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Upstream: DEDALE_v0.55_SYNTHESE_3IA_ET_SPEC_AMENDED.md §D.6 (NB1 + NB5 + B2)
 *
 * Télémétrie run-level + chunk-level + calcul C5 Verdict.
 *
 * Contrat d'écriture (CI-6 à CI-9) :
 *   - Toute écriture passe par deps.atomicWrite (tmp + rename + optional fsync)
 *   - UUID run-level via deps.uuid (crypto.randomUUID injectable)
 *   - Durées via deps.clockMonotonic (jamais Date.now() pour elapsed_ms)
 *   - Timestamps horodatés via deps.clock (ISO-friendly)
 *
 * Invariant : zéro import direct de fs/crypto/Date. Tout via DI.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  DedaleDependencies,
  DedaleMode,
  DedaleChunkTelemetry,
  DedaleRunTelemetry,
  DedaleTriggerPath,
  DedaleVerdict,
  OracleResult,
  ResetResult,
  C5Verdict,
} from './types.js';
import { PASS_THRESHOLDS } from './types.js';

// ──────────────────────────────────────────────────────────────────────────────
// RUN CONTEXT
// ──────────────────────────────────────────────────────────────────────────────

export interface RunContext {
  readonly run_id: string;
  readonly mode: DedaleMode;
  readonly ts_run_start_ms: number;      // deps.clockMonotonic
  readonly ts_run_start_iso: string;      // deps.clock serialized
  readonly chunks: DedaleChunkTelemetry[];
  readonly run_file_path: string;          // chemin final run.json (atomicWrite target)
  readonly chunks_file_path: string;       // chemin append chunk log (JSONL)
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS — ISO ET JOIN PATH
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Convertit un timestamp ms (deps.clock) en ISO string stable.
 */
export function toIso(ms: number): string {
  return new Date(ms).toISOString();
}

/**
 * Join path portable (POSIX-style pour cohérence JSON).
 */
export function joinPath(dir: string, file: string): string {
  const trimDir = dir.endsWith('/') || dir.endsWith('\\') ? dir.slice(0, -1) : dir;
  return `${trimDir}/${file}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// TELEMETRY FACTORY
// ──────────────────────────────────────────────────────────────────────────────

export interface Telemetry {
  /**
   * Démarre un run. Crée RunContext en mémoire (pas de flush I/O).
   */
  startRun(mode: DedaleMode, telemetryDir: string): RunContext;

  /**
   * Construit une entrée DedaleChunkTelemetry à partir des résultats.
   * Pure : pas d'I/O, pas de mutation. Appelé par orchestrator.
   */
  buildChunkEntry(params: {
    ctx: RunContext;
    chunk_index: number;
    seed_used: number;
    trigger_path: DedaleTriggerPath;
    oracle_attempt_1: OracleResult;
    oracle_attempt_2: OracleResult | null;
    reset: ResetResult | null;
    verdict: DedaleVerdict;
    ts_start_ms: number;
    ts_end_ms: number;
  }): DedaleChunkTelemetry;

  /**
   * Ajoute une entrée chunk en mémoire ET flush asynchrone vers JSONL.
   */
  recordChunk(ctx: RunContext, entry: DedaleChunkTelemetry): Promise<void>;

  /**
   * Finalise le run : calcule l'agrégat et écrit atomiquement.
   */
  finalizeRun(ctx: RunContext): Promise<DedaleRunTelemetry>;
}

/**
 * Factory. Consomme DI (atomicWrite, uuid, clock, clockMonotonic).
 */
export function createTelemetry(
  deps: Pick<DedaleDependencies,
    'atomicWrite' | 'uuid' | 'clock' | 'clockMonotonic' | 'logger'>
): Telemetry {
  return {
    startRun(mode, telemetryDir): RunContext {
      const run_id = deps.uuid();
      const ts_start_ms = deps.clockMonotonic();
      const ts_start_wall = deps.clock();
      return {
        run_id,
        mode,
        ts_run_start_ms: ts_start_ms,
        ts_run_start_iso: toIso(ts_start_wall),
        chunks: [],
        run_file_path: joinPath(telemetryDir, `dedale_run_${run_id}.json`),
        chunks_file_path: joinPath(telemetryDir, `dedale_run_${run_id}_chunks.jsonl`),
      };
    },

    buildChunkEntry(params): DedaleChunkTelemetry {
      return {
        schema_version: '1',
        run_id: params.ctx.run_id,
        chunk_index: params.chunk_index,
        seed_used: params.seed_used,
        mode: params.ctx.mode,
        trigger_path: params.trigger_path,
        oracle_attempt_1: params.oracle_attempt_1,
        oracle_attempt_2: params.oracle_attempt_2,
        reset: params.reset,
        verdict: params.verdict,
        ts_start_iso: toIso(params.ts_start_ms),
        ts_end_iso: toIso(params.ts_end_ms),
        elapsed_ms_total: Math.max(0, params.ts_end_ms - params.ts_start_ms),
      };
    },

    async recordChunk(ctx, entry): Promise<void> {
      // Mémoire (pour finalizeRun)
      (ctx.chunks as DedaleChunkTelemetry[]).push(entry);
      // JSONL append-style : on écrit tout le buffer à chaque fois (atomic)
      // Simple mais safe crash : un seul run en cours, pas de parallélisme.
      const jsonl = ctx.chunks.map(c => JSON.stringify(c)).join('\n') + '\n';
      try {
        await deps.atomicWrite(ctx.chunks_file_path, jsonl);
      } catch (err) {
        deps.logger.error('[dedale.telemetry] chunk JSONL flush failed', {
          path: ctx.chunks_file_path,
          err: String(err),
        });
        // On ne throw pas : la télémétrie ne doit pas casser le pipeline (CI-4)
      }
    },

    async finalizeRun(ctx): Promise<DedaleRunTelemetry> {
      const aggregate = aggregateRun(ctx, deps.clock);
      try {
        await deps.atomicWrite(ctx.run_file_path, JSON.stringify(aggregate, null, 2));
      } catch (err) {
        deps.logger.error('[dedale.telemetry] run aggregate flush failed', {
          path: ctx.run_file_path,
          err: String(err),
        });
      }
      return aggregate;
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATE + C5 VERDICT (B4)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Agrège un RunContext en DedaleRunTelemetry.
 * Pure (modulo deps.clock pour ts_end_iso).
 */
export function aggregateRun(
  ctx: RunContext,
  clock: () => number
): DedaleRunTelemetry {
  const counts = {
    no_loop: 0,
    reset_effective: 0,
    reset_non_effective: 0,
    reset_failed: 0,
  };
  const distrib = { v2b: 0, k2: 0, both: 0, none: 0 };

  for (const c of ctx.chunks) {
    counts[c.verdict]++;
    if (c.trigger_path === 'v2b') distrib.v2b++;
    else if (c.trigger_path === 'k2') distrib.k2++;
    else if (c.trigger_path === 'both') distrib.both++;
    else distrib.none++;
  }

  const denom = counts.reset_effective + counts.reset_non_effective;
  const ratio_effective = denom === 0 ? null : counts.reset_effective / denom;

  return {
    schema_version: '1',
    run_id: ctx.run_id,
    mode: ctx.mode,
    chunks_total: ctx.chunks.length,
    counts,
    distribution_trigger_path: distrib,
    ratio_effective,
    ts_run_start_iso: ctx.ts_run_start_iso,
    ts_run_end_iso: toIso(clock()),
  };
}

/**
 * Calcule le verdict §C.5 depuis un agrégat run.
 * Seuils gelés via PASS_THRESHOLDS (non modifiables post-hoc).
 *
 * Règles (ordre d'application) :
 *   1. Si n_total < n_exploratory → INCONCLUSIVE (échantillon insuffisant)
 *   2. Si ratio ≥ ratio_min ET n_total ≥ n_robust → PASS_ROBUST
 *   3. Si ratio ≥ ratio_min ET n_total ≥ n_exploratory → PASS_EXPLORATORY
 *   4. Si ratio < ratio_fail ET n_total ≥ n_fail_min → FAIL
 *   5. Sinon → INCONCLUSIVE
 */
export function computeC5Verdict(agg: DedaleRunTelemetry): C5Verdict {
  const n_total = agg.counts.reset_effective + agg.counts.reset_non_effective;
  const ratio = agg.ratio_effective ?? 0;

  if (n_total < PASS_THRESHOLDS.n_exploratory) return 'inconclusive';
  if (ratio >= PASS_THRESHOLDS.ratio_min && n_total >= PASS_THRESHOLDS.n_robust) return 'pass_robust';
  if (ratio >= PASS_THRESHOLDS.ratio_min) return 'pass_exploratory';
  if (ratio < PASS_THRESHOLDS.ratio_fail && n_total >= PASS_THRESHOLDS.n_fail_min) return 'fail';
  return 'inconclusive';
}
