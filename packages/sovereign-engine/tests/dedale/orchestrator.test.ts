/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — ORCHESTRATOR TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture arbre RESET-FIRST :
 *   1. Mode 'off'    : court-circuit (pas d'oracle, pas de reset)
 *   2. Mode 'shadow' : oracle évalue + logue, mais JAMAIS reset
 *   3. Mode 'on'     : arbre complet
 *      3a. no_loop attempt_1 → verdict='no_loop'
 *      3b. hard_fail → reset → no_loop attempt_2 → 'reset_effective'
 *      3c. hard_fail → reset → hard_fail attempt_2 → 'reset_non_effective'
 *      3d. hard_fail → reset_failed → 'reset_failed'
 *      3e. Budget MAX_SESSION_RESETS_PER_RUN=1 enforced
 *   4. Re-run use SAME seed (isolation variable causale)
 *   5. Reset throw → traité comme 'reset_failed' (CI-4 robust)
 *
 * Tous les tests utilisent des mocks (oracle, resetSession, telemetry) pour
 * isoler la logique orchestrator. Pas de LLM, pas d'I/O, pas de process OS.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createOrchestrator,
  createOrchestratorState,
} from '../../src/dedale/orchestrator.js';
import type {
  DedaleConfig,
  DedaleDependencies,
  DedaleVerdict,
  OracleResult,
  ResetResult,
  DedaleChunkTelemetry,
} from '../../src/dedale/types.js';
import { DEDALE_BUDGETS } from '../../src/dedale/types.js';
import type { Oracle } from '../../src/dedale/oracle.js';
import type { ResetSession } from '../../src/dedale/reset-session.js';
import type { Telemetry, RunContext } from '../../src/dedale/telemetry.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

function buildOracleResult(verdict: 'no_loop' | 'hard_fail'): OracleResult {
  return {
    verdict,
    reason: verdict === 'no_loop' ? undefined : 'c1_trigram_ratio',
    metrics: {
      c1_trigram_ratio: verdict === 'no_loop' ? 0.05 : 0.25,
      c2_repetition_score: 0.2,
      c4_unique_ratio: 0.5,
      c2_info_elevated: false,
    },
    thresholds_used: { c1_threshold: 0.15, c1_high_threshold: 0.20, c2_threshold: 0.60, c4_threshold: 0.30 },
    evaluated_at_ms: 1_000,
  };
}

function buildResetResult(outcome: 'success' | 'failed'): ResetResult {
  if (outcome === 'failed') {
    return { outcome: 'failed', proof: null, elapsed_ms: 100, error: 'test failure' };
  }
  return {
    outcome: 'success',
    proof: {
      before: {
        serve: { pid: 1000, start_time_iso: '2026-04-21T10:00:00Z', name: 'ollama serve' },
        runner: { pid: 2000, start_time_iso: '2026-04-21T10:00:00Z', name: 'ollama_llama_server' },
      },
      after: {
        serve: { pid: 3000, start_time_iso: '2026-04-21T10:01:00Z', name: 'ollama serve' },
        runner: { pid: 4000, start_time_iso: '2026-04-21T10:01:00Z', name: 'ollama_llama_server' },
      },
      kill_order: ['ollama_llama_server', 'ollama serve'],
      fallback_used: false,
      health_check_ms: 150,
    },
    elapsed_ms: 15000,
    error: null,
  };
}

function mockOracle(verdicts: Array<'no_loop' | 'hard_fail'>): Oracle {
  let idx = 0;
  return {
    evaluate: vi.fn().mockImplementation(() => {
      const v = verdicts[idx] ?? 'no_loop';
      idx += 1;
      return buildOracleResult(v);
    }),
  };
}

function mockResetSession(outcomes: Array<'success' | 'failed'>): ResetSession {
  let idx = 0;
  return {
    execute: vi.fn().mockImplementation(async () => {
      const o = outcomes[idx] ?? 'success';
      idx += 1;
      return buildResetResult(o);
    }),
  };
}

function mockTelemetry(): Telemetry & {
  recordedEntries: DedaleChunkTelemetry[];
  runCtx: RunContext;
} {
  const recordedEntries: DedaleChunkTelemetry[] = [];
  const runCtx: RunContext = {
    run_id: 'run-test',
    mode: 'on',
    ts_run_start_ms: 1_000,
    ts_run_start_iso: '2026-04-21T00:00:00.000Z',
    chunks: [],
    run_file_path: '/tmp/dedale_run_test.json',
    chunks_file_path: '/tmp/dedale_run_test_chunks.jsonl',
  };
  return {
    recordedEntries,
    runCtx,
    startRun: vi.fn().mockReturnValue(runCtx),
    buildChunkEntry: vi.fn().mockImplementation((params) => ({
      schema_version: '1' as const,
      run_id: params.ctx.run_id,
      chunk_index: params.chunk_index,
      seed_used: params.seed_used,
      mode: params.ctx.mode,
      trigger_path: params.trigger_path,
      oracle_attempt_1: params.oracle_attempt_1,
      oracle_attempt_2: params.oracle_attempt_2,
      reset: params.reset,
      verdict: params.verdict,
      ts_start_iso: '2026-04-21T00:00:00.000Z',
      ts_end_iso: '2026-04-21T00:00:01.000Z',
      elapsed_ms_total: params.ts_end_ms - params.ts_start_ms,
    })),
    recordChunk: vi.fn().mockImplementation(async (_ctx, entry) => {
      recordedEntries.push(entry);
    }),
    finalizeRun: vi.fn(),
  };
}

function mockDeps(): Pick<DedaleDependencies, 'clock' | 'clockMonotonic' | 'logger'> {
  let t = 1_000;
  return {
    clock: () => {
      const v = t;
      t += 10;
      return v;
    },
    clockMonotonic: () => t,
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

function buildConfig(mode: 'off' | 'shadow' | 'on'): DedaleConfig {
  return {
    mode,
    telemetry_dir: '/tmp/dedale',
    oracle_thresholds: { c1_threshold: 0.15, c1_high_threshold: 0.20, c2_threshold: 0.60, c4_threshold: 0.30 },
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MODE OFF
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — mode off', () => {
  it('short-circuits : no oracle call, no reset, no telemetry write', async () => {
    const oracle = mockOracle(['no_loop']);
    const reset = mockResetSession(['success']);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('lorem ipsum dolor sit amet');

    const result = await orch.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: telemetry.runCtx,
      state,
      config: buildConfig('off'),
    });

    expect(result.verdict).toBe('no_loop');
    expect(result.text).toBe('lorem ipsum dolor sit amet');
    expect(oracle.evaluate).not.toHaveBeenCalled();
    expect(reset.execute).not.toHaveBeenCalled();
    expect(telemetry.recordChunk).not.toHaveBeenCalled();  // OFF ne flush pas
    expect(state.resets_used).toBe(0);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE SHADOW
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — mode shadow', () => {
  it('evaluates oracle and records even on hard_fail but does NOT reset', async () => {
    const oracle = mockOracle(['hard_fail']);
    const reset = mockResetSession([]);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('boucle boucle boucle');

    const result = await orch.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: telemetry.runCtx,
      state,
      config: buildConfig('shadow'),
    });

    expect(result.verdict).toBe('no_loop');  // shadow ne passe jamais en reset_*
    expect(oracle.evaluate).toHaveBeenCalledOnce();
    expect(reset.execute).not.toHaveBeenCalled();
    expect(telemetry.recordChunk).toHaveBeenCalledOnce();
    const recordedEntry = telemetry.recordedEntries[0]!;
    expect(recordedEntry.oracle_attempt_1.verdict).toBe('hard_fail');
    expect(recordedEntry.verdict).toBe('no_loop');
    expect(state.resets_used).toBe(0);
  });

  it('returns original text on hard_fail (no retry in shadow)', async () => {
    const oracle = mockOracle(['hard_fail']);
    const reset = mockResetSession([]);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('ORIGINAL');

    const result = await orch.runChunkWithDedale({
      chunkFn,
      seed: 42,
      chunk_index: 0,
      trigger_path: 'v2b',
      runCtx: telemetry.runCtx,
      state,
      config: buildConfig('shadow'),
    });

    expect(result.text).toBe('ORIGINAL');
    expect(chunkFn).toHaveBeenCalledOnce();  // pas de re-run en shadow
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// MODE ON — ARBRE RESET-FIRST
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — mode on', () => {
  it('no_loop attempt_1 → verdict="no_loop" + no reset', async () => {
    const oracle = mockOracle(['no_loop']);
    const reset = mockResetSession([]);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('healthy prose');

    const result = await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(result.verdict).toBe('no_loop');
    expect(oracle.evaluate).toHaveBeenCalledOnce();
    expect(reset.execute).not.toHaveBeenCalled();
    expect(state.resets_used).toBe(0);
  });

  it('hard_fail → reset success → no_loop attempt_2 → "reset_effective"', async () => {
    const oracle = mockOracle(['hard_fail', 'no_loop']);
    const reset = mockResetSession(['success']);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    let callCount = 0;
    const chunkFn = vi.fn().mockImplementation(async () => {
      callCount += 1;
      return callCount === 1 ? 'LOOP_TEXT' : 'HEALTHY_TEXT';
    });

    const result = await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(result.verdict).toBe('reset_effective');
    expect(result.text).toBe('HEALTHY_TEXT');
    expect(oracle.evaluate).toHaveBeenCalledTimes(2);
    expect(reset.execute).toHaveBeenCalledOnce();
    expect(state.resets_used).toBe(1);
  });

  it('hard_fail → reset success → hard_fail attempt_2 → "reset_non_effective"', async () => {
    const oracle = mockOracle(['hard_fail', 'hard_fail']);
    const reset = mockResetSession(['success']);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('LOOP_TEXT_STILL');

    const result = await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(result.verdict).toBe('reset_non_effective');
    expect(oracle.evaluate).toHaveBeenCalledTimes(2);
    expect(reset.execute).toHaveBeenCalledOnce();
    expect(state.resets_used).toBe(1);
  });

  it('hard_fail → reset failed → "reset_failed" + returns original text', async () => {
    const oracle = mockOracle(['hard_fail']);
    const reset = mockResetSession(['failed']);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('ORIGINAL');

    const result = await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(result.verdict).toBe('reset_failed');
    expect(result.text).toBe('ORIGINAL');
    expect(chunkFn).toHaveBeenCalledOnce();  // pas de re-run si reset failed
    expect(oracle.evaluate).toHaveBeenCalledOnce();  // pas d'attempt_2
    expect(state.resets_used).toBe(1);  // tenté = compté
  });

  it('reset throws → treated as "reset_failed" (CI-4)', async () => {
    const oracle = mockOracle(['hard_fail']);
    const reset: ResetSession = {
      execute: vi.fn().mockRejectedValue(new Error('PS1 crashed')),
    };
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('ORIGINAL');

    const result = await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(result.verdict).toBe('reset_failed');
    expect(state.resets_used).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// BUDGET MAX_SESSION_RESETS_PER_RUN
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — budget cap', () => {
  it('MAX_SESSION_RESETS_PER_RUN=1 enforced across chunks', async () => {
    expect(DEDALE_BUDGETS.MAX_SESSION_RESETS_PER_RUN).toBe(1);

    const oracle = mockOracle(['hard_fail', 'no_loop', 'hard_fail']);
    //                        chunk0 att1   chunk0 att2   chunk1 att1 (budget épuisé)
    const reset = mockResetSession(['success']);  // un seul reset autorisé
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const chunkFn = vi.fn().mockResolvedValue('TEXT');

    // Chunk 0 — consomme le reset
    const r0 = await orch.runChunkWithDedale({
      chunkFn, seed: 1, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });
    expect(r0.verdict).toBe('reset_effective');
    expect(state.resets_used).toBe(1);

    // Chunk 1 — hard_fail mais budget épuisé → verdict='no_loop' (exclu ratio)
    const r1 = await orch.runChunkWithDedale({
      chunkFn, seed: 2, chunk_index: 1, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });
    expect(r1.verdict).toBe('no_loop');
    expect(reset.execute).toHaveBeenCalledOnce();  // pas de 2e reset
    expect(state.resets_used).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// SAME SEED INVARIANT
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — same seed invariant', () => {
  it('re-run after reset uses the SAME seed as attempt_1', async () => {
    const oracle = mockOracle(['hard_fail', 'no_loop']);
    const reset = mockResetSession(['success']);
    const telemetry = mockTelemetry();
    const deps = mockDeps();
    const orch = createOrchestrator(oracle, reset, telemetry, deps);
    const state = createOrchestratorState();
    const seedsReceived: number[] = [];
    const chunkFn = vi.fn().mockImplementation(async (seed: number) => {
      seedsReceived.push(seed);
      return `text-seed-${seed}`;
    });

    await orch.runChunkWithDedale({
      chunkFn, seed: 42, chunk_index: 0, trigger_path: 'v2b',
      runCtx: telemetry.runCtx, state, config: buildConfig('on'),
    });

    expect(seedsReceived).toEqual([42, 42]);  // même seed sur les 2 attempts
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TELEMETRY INTEGRATION
// ──────────────────────────────────────────────────────────────────────────────

describe('orchestrator — telemetry entries', () => {
  it('records all 4 verdict types', async () => {
    const cases: Array<{ verdict: DedaleVerdict; oracleSeq: Array<'no_loop' | 'hard_fail'>; resetSeq: Array<'success' | 'failed'>; }> = [
      { verdict: 'no_loop', oracleSeq: ['no_loop'], resetSeq: [] },
      { verdict: 'reset_effective', oracleSeq: ['hard_fail', 'no_loop'], resetSeq: ['success'] },
      { verdict: 'reset_non_effective', oracleSeq: ['hard_fail', 'hard_fail'], resetSeq: ['success'] },
      { verdict: 'reset_failed', oracleSeq: ['hard_fail'], resetSeq: ['failed'] },
    ];

    for (const c of cases) {
      const oracle = mockOracle(c.oracleSeq);
      const reset = mockResetSession(c.resetSeq);
      const telemetry = mockTelemetry();
      const deps = mockDeps();
      const orch = createOrchestrator(oracle, reset, telemetry, deps);
      const state = createOrchestratorState();
      const result = await orch.runChunkWithDedale({
        chunkFn: vi.fn().mockResolvedValue('text'),
        seed: 1, chunk_index: 0, trigger_path: 'v2b',
        runCtx: telemetry.runCtx, state, config: buildConfig('on'),
      });
      expect(result.verdict).toBe(c.verdict);
      expect(telemetry.recordedEntries[0]!.verdict).toBe(c.verdict);
    }
  });
});
