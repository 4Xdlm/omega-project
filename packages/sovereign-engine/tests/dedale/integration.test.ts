/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — INTEGRATION TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Tests d'intégration end-to-end avec chunkFn mocké (pas de LLM réel) et
 * DI complet (execCmd + fetchFn + atomicWrite mockés).
 *
 * Couverture :
 *   - Mode off : bypass complet (oracle non appelé, pas de flush I/O)
 *   - Mode shadow : oracle évalue + télémétrie enregistrée, JAMAIS reset
 *   - Mode on / no_loop : chemin heureux, zéro reset
 *   - Mode on / reset_effective : hard_fail → reset → no_loop (PROSE saine)
 *   - Mode on / reset_non_effective : hard_fail → reset → hard_fail (LOOP)
 *   - finalizeRun + computeC5Verdict : flow agrégation
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createDedale,
  buildDefaultDependencies,
  computeC5Verdict,
} from '../../src/dedale/index.js';
import type {
  DedaleConfig,
  DedaleDependencies,
  ExecResult,
} from '../../src/dedale/index.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

const PROSE_SAINE =
  'Le soleil déclinait sur les toits de la ville, projetant des ombres longues ' +
  'et dorées sur les pavés humides. Marie marchait sans se presser. ' +
  'Elle pensait à cette lettre dans son tiroir. ' +
  'Les mots lui revenaient par fragments, brisés par le temps. ' +
  'Chaque syllabe portait le poids d\'une décision mûrie. ' +
  'Le vent soufflait froid et insistant dehors.';

const PROSE_LOOP =
  'il marche dans la rue il marche dans la rue il marche dans la rue ' +
  'il marche dans la rue il marche dans la rue il marche dans la rue ' +
  'il marche dans la rue il marche dans la rue il marche dans la rue.';

// ──────────────────────────────────────────────────────────────────────────────
// MOCK DEPS — DI COMPLET POUR INTÉGRATION
// ──────────────────────────────────────────────────────────────────────────────

function integrationMockDeps(): DedaleDependencies {
  // Exec retourne un JSON list vide (pas de process Ollama visible)
  const execResult: ExecResult = {
    exit_code: 0,
    stdout: '[]',
    stderr: '',
    elapsed_ms: 1,
  };
  const fetchMock = vi.fn().mockImplementation(async () => ({
    status: 200,
    ok: true,
    text: async () => 'OK',
  } as unknown as Response));
  const atomicWriteMock = vi.fn().mockImplementation(async () => {});
  const execMock = vi.fn().mockImplementation(async () => execResult);

  let t = 1_700_000_000_000;
  return buildDefaultDependencies({
    execCmd: execMock,
    fetchFn: fetchMock,
    sleep: vi.fn().mockImplementation(async () => {}),
    clock: () => {
      const v = t;
      t += 1;
      return v;
    },
    clockMonotonic: () => {
      const v = t;
      t += 1;
      return v;
    },
    uuid: () => 'int-test-uuid',
    atomicWrite: atomicWriteMock,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
    },
  });
}

function buildConfig(mode: 'off' | 'shadow' | 'on'): DedaleConfig {
  return {
    mode,
    telemetry_dir: '/tmp/dedale-int',
    oracle_thresholds: {
      c1_threshold: 0.15,
      c1_high_threshold: 0.20,
      c2_threshold: 0.60,
      c4_threshold: 0.30,
    },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE OFF — BYPASS COMPLET
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — mode off', () => {
  it('executes chunkFn but does not call oracle.evaluate, does not flush', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('off');
    const dedale = createDedale(cfg, deps);

    // On remplace oracle.evaluate par un spy pour détecter l'appel
    const evalSpy = vi.spyOn(dedale.oracle, 'evaluate');

    const ctx = dedale.telemetry.startRun('off', cfg.telemetry_dir);
    const chunkFn = vi.fn().mockImplementation(async (_seed: number) => PROSE_LOOP);

    const result = await dedale.orchestrator.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    expect(result.verdict).toBe('no_loop');
    expect(result.text).toBe(PROSE_LOOP);
    expect(chunkFn).toHaveBeenCalledTimes(1);
    // En mode off, oracle.evaluate NE DOIT PAS être appelé
    expect(evalSpy).not.toHaveBeenCalled();
    // state.resets_used reste à 0
    expect(dedale.state.resets_used).toBe(0);
    // atomicWrite (flush) ne doit pas avoir été déclenché
    expect(deps.atomicWrite).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE SHADOW — LOG SANS ARBITRER
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — mode shadow', () => {
  it('evaluates oracle and records, but never triggers reset', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('shadow');
    const dedale = createDedale(cfg, deps);

    const resetSpy = vi.spyOn(dedale.resetSession, 'execute');

    const ctx = dedale.telemetry.startRun('shadow', cfg.telemetry_dir);
    const chunkFn = vi.fn().mockImplementation(async (_seed: number) => PROSE_LOOP);

    const result = await dedale.orchestrator.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    // En shadow, verdict final 'no_loop' même si oracle a trouvé hard_fail
    expect(result.verdict).toBe('no_loop');
    // chunkFn n'est appelé qu'une fois (pas de retry)
    expect(chunkFn).toHaveBeenCalledTimes(1);
    // resetSession.execute NE DOIT PAS avoir été appelé
    expect(resetSpy).not.toHaveBeenCalled();
    // state.resets_used reste à 0
    expect(dedale.state.resets_used).toBe(0);
    // Oracle a été exécuté (verdict hard_fail capturé dans l'entry)
    expect(result.entry.oracle_attempt_1.verdict).toBe('hard_fail');
    // Télémétrie : une entry, pas de retry
    expect(ctx.chunks.length).toBe(1);
    expect(ctx.chunks[0]!.oracle_attempt_2).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE ON — NO_LOOP (CHEMIN HEUREUX)
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — mode on / no_loop', () => {
  it('does not trigger reset on healthy prose', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('on');
    const dedale = createDedale(cfg, deps);

    const resetSpy = vi.spyOn(dedale.resetSession, 'execute');

    const ctx = dedale.telemetry.startRun('on', cfg.telemetry_dir);
    const chunkFn = vi.fn().mockImplementation(async (_seed: number) => PROSE_SAINE);

    const result = await dedale.orchestrator.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    expect(result.verdict).toBe('no_loop');
    expect(result.text).toBe(PROSE_SAINE);
    expect(chunkFn).toHaveBeenCalledTimes(1);
    expect(resetSpy).not.toHaveBeenCalled();
    expect(dedale.state.resets_used).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE ON — RESET_EFFECTIVE (hard_fail → reset → no_loop)
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — mode on / reset_effective', () => {
  it('detects loop, triggers reset, and recovers on retry with same seed', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('on');
    const dedale = createDedale(cfg, deps);

    // Mock resetSession pour retourner un succès sans vraiment killer
    const resetSpy = vi.spyOn(dedale.resetSession, 'execute')
      .mockImplementation(async () => ({
        outcome: 'success',
        proof: {
          before: {
            serve: { pid: 1000, start_time_iso: '2026-04-21T10:00:00.000Z', name: 'ollama serve' },
            runner: { pid: 2000, start_time_iso: '2026-04-21T10:00:00.000Z', name: 'ollama_llama_server' },
          },
          after: {
            serve: { pid: null, start_time_iso: null, name: 'ollama serve' },
            runner: { pid: null, start_time_iso: null, name: 'ollama_llama_server' },
          },
          kill_order: ['ollama_llama_server', 'ollama serve'],
          fallback_used: false,
          health_check_ms: 500,
        },
        elapsed_ms: 1000,
        error: null,
      }));

    const ctx = dedale.telemetry.startRun('on', cfg.telemetry_dir);

    // chunkFn retourne loop au 1er call, prose saine au 2e
    const chunkFn = vi.fn()
      .mockImplementationOnce(async () => PROSE_LOOP)
      .mockImplementationOnce(async () => PROSE_SAINE);

    const result = await dedale.orchestrator.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    expect(result.verdict).toBe('reset_effective');
    expect(result.text).toBe(PROSE_SAINE);  // le retry gagne
    expect(chunkFn).toHaveBeenCalledTimes(2);
    // MÊME SEED sur les 2 appels
    expect(chunkFn).toHaveBeenNthCalledWith(1, 42);
    expect(chunkFn).toHaveBeenNthCalledWith(2, 42);
    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(dedale.state.resets_used).toBe(1);
    // Télémétrie : oracle_attempt_1 hard_fail, attempt_2 no_loop
    expect(ctx.chunks.length).toBe(1);
    expect(ctx.chunks[0]!.oracle_attempt_1.verdict).toBe('hard_fail');
    expect(ctx.chunks[0]!.oracle_attempt_2).not.toBeNull();
    expect(ctx.chunks[0]!.oracle_attempt_2!.verdict).toBe('no_loop');
    expect(ctx.chunks[0]!.verdict).toBe('reset_effective');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE ON — RESET_NON_EFFECTIVE (hard_fail → reset → hard_fail)
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — mode on / reset_non_effective', () => {
  it('triggers reset but retry still loops → accepts new text as fallback', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('on');
    const dedale = createDedale(cfg, deps);

    vi.spyOn(dedale.resetSession, 'execute').mockImplementation(async () => ({
      outcome: 'success',
      proof: null,
      elapsed_ms: 500,
      error: null,
    }));

    const ctx = dedale.telemetry.startRun('on', cfg.telemetry_dir);
    const PROSE_LOOP_2 = PROSE_LOOP + ' il marche.';  // toujours loop
    const chunkFn = vi.fn()
      .mockImplementationOnce(async () => PROSE_LOOP)
      .mockImplementationOnce(async () => PROSE_LOOP_2);

    const result = await dedale.orchestrator.runChunkWithDedale({
      chunkFn,
      seed: 100,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    expect(result.verdict).toBe('reset_non_effective');
    expect(result.text).toBe(PROSE_LOOP_2);  // retry text, même si loop
    expect(chunkFn).toHaveBeenCalledTimes(2);
    expect(dedale.state.resets_used).toBe(1);
    expect(ctx.chunks[0]!.oracle_attempt_2!.verdict).toBe('hard_fail');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// FINALIZE RUN + C5 VERDICT — FLOW AGRÉGATION
// ──────────────────────────────────────────────────────────────────────────────

describe('integration — finalizeRun + computeC5Verdict', () => {
  it('aggregates chunk counts and computes C5 verdict inconclusive when n < 5', async () => {
    const deps = integrationMockDeps();
    const cfg = buildConfig('on');
    const dedale = createDedale(cfg, deps);

    vi.spyOn(dedale.resetSession, 'execute').mockImplementation(async () => ({
      outcome: 'success',
      proof: null,
      elapsed_ms: 100,
      error: null,
    }));

    const ctx = dedale.telemetry.startRun('on', cfg.telemetry_dir);

    // 1 chunk no_loop (SAINE)
    await dedale.orchestrator.runChunkWithDedale({
      chunkFn: async () => PROSE_SAINE,
      seed: 1,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    // 1 chunk reset_effective (LOOP → SAINE) — consumer le budget
    const resetChunkFn = vi.fn()
      .mockImplementationOnce(async () => PROSE_LOOP)
      .mockImplementationOnce(async () => PROSE_SAINE);

    await dedale.orchestrator.runChunkWithDedale({
      chunkFn: resetChunkFn,
      seed: 2,
      chunk_index: 1,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    // 1 chunk supplémentaire (budget exhausted → verdict='no_loop')
    await dedale.orchestrator.runChunkWithDedale({
      chunkFn: async () => PROSE_LOOP,
      seed: 3,
      chunk_index: 2,
      trigger_path: 'v2b',
      runCtx: ctx,
      state: dedale.state,
      config: cfg,
    });

    const agg = await dedale.telemetry.finalizeRun(ctx);
    expect(agg.chunks_total).toBe(3);
    expect(agg.counts.no_loop).toBe(2);  // 1 SAINE + 1 budget-exhausted
    expect(agg.counts.reset_effective).toBe(1);
    expect(agg.counts.reset_non_effective).toBe(0);
    expect(agg.counts.reset_failed).toBe(0);
    expect(agg.ratio_effective).toBe(1);  // 1/(1+0)
    expect(agg.distribution_trigger_path.v2b).toBe(3);

    // n_total (reset_effective + non_effective) = 1 < n_exploratory (5) → inconclusive
    const verdict = computeC5Verdict(agg);
    expect(verdict).toBe('inconclusive');
  });
});
