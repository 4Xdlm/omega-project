/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — DÉDALE v0.55 — TELEMETRY TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Couverture :
 *   - startRun : crée RunContext correct
 *   - buildChunkEntry : pureté + schéma v1
 *   - recordChunk : flush JSONL via atomicWrite (mocked)
 *   - finalizeRun : aggregate + atomicWrite
 *   - aggregateRun : counts, ratio, distribution
 *   - computeC5Verdict : pass_exploratory / pass_robust / fail / inconclusive
 *   - Erreurs atomicWrite ne throw pas (CI-4)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, vi } from 'vitest';
import {
  createTelemetry,
  aggregateRun,
  computeC5Verdict,
  toIso,
  joinPath,
} from '../../src/dedale/telemetry.js';
import type {
  DedaleDependencies,
  DedaleChunkTelemetry,
  DedaleRunTelemetry,
  OracleResult,
} from '../../src/dedale/types.js';
import { PASS_THRESHOLDS } from '../../src/dedale/types.js';

// ──────────────────────────────────────────────────────────────────────────────
// FIXTURES
// ──────────────────────────────────────────────────────────────────────────────

function mockDeps(): DedaleDependencies {
  let uuidCounter = 0;
  let nowMs = 1_700_000_000_000;
  return {
    execCmd: vi.fn(),
    fetchFn: vi.fn(),
    sleep: vi.fn(),
    clock: () => {
      const t = nowMs;
      nowMs += 10;
      return t;
    },
    clockMonotonic: () => nowMs,
    uuid: () => `uuid-${++uuidCounter}`,
    nvidiaSmi: undefined,
    atomicWrite: vi.fn().mockResolvedValue(undefined),
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  };
}

function buildOracleResult(verdict: 'no_loop' | 'hard_fail', reason?: 'c1_trigram_ratio' | 'c1_c4_composite' | 'c2_repetition_score' | 'c4_fingerprint_distance'): OracleResult {
  return {
    verdict,
    reason: verdict === 'no_loop' ? undefined : (reason ?? 'c1_trigram_ratio'),
    metrics: {
      c1_trigram_ratio: verdict === 'no_loop' ? 0.05 : 0.25,
      c2_repetition_score: 0.3,
      c4_unique_ratio: 0.5,
      c2_info_elevated: false,
    },
    thresholds_used: {
      c1_threshold: 0.15,
      c1_high_threshold: 0.20,
      c2_threshold: 0.60,
      c4_threshold: 0.30,
    },
    evaluated_at_ms: 1_700_000_000_000,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

describe('toIso', () => {
  it('produces ISO 8601 string', () => {
    const iso = toIso(1_700_000_000_000);
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('joinPath', () => {
  it('joins dir and file with forward slash', () => {
    expect(joinPath('/tmp/foo', 'bar.json')).toBe('/tmp/foo/bar.json');
  });

  it('handles trailing forward slash', () => {
    expect(joinPath('/tmp/foo/', 'bar.json')).toBe('/tmp/foo/bar.json');
  });

  it('handles trailing backslash (Windows)', () => {
    expect(joinPath('C:\\tmp\\foo\\', 'bar.json')).toBe('C:\\tmp\\foo/bar.json');
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// startRun
// ──────────────────────────────────────────────────────────────────────────────

describe('createTelemetry.startRun', () => {
  it('creates RunContext with fresh uuid', () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('shadow', '/tmp/telemetry');
    expect(ctx.run_id).toMatch(/^uuid-/);
    expect(ctx.mode).toBe('shadow');
    expect(ctx.chunks).toEqual([]);
    expect(ctx.run_file_path).toContain(`dedale_run_${ctx.run_id}.json`);
    expect(ctx.chunks_file_path).toContain(`dedale_run_${ctx.run_id}_chunks.jsonl`);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// buildChunkEntry
// ──────────────────────────────────────────────────────────────────────────────

describe('createTelemetry.buildChunkEntry', () => {
  it('constructs a DedaleChunkTelemetry with schema v1', () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');
    const entry = telemetry.buildChunkEntry({
      ctx,
      chunk_index: 0,
      seed_used: 42,
      trigger_path: 'v2b',
      oracle_attempt_1: buildOracleResult('no_loop'),
      oracle_attempt_2: null,
      reset: null,
      verdict: 'no_loop',
      ts_start_ms: 1_000,
      ts_end_ms: 2_000,
    });
    expect(entry.schema_version).toBe('1');
    expect(entry.run_id).toBe(ctx.run_id);
    expect(entry.chunk_index).toBe(0);
    expect(entry.seed_used).toBe(42);
    expect(entry.mode).toBe('on');
    expect(entry.trigger_path).toBe('v2b');
    expect(entry.elapsed_ms_total).toBe(1000);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// recordChunk
// ──────────────────────────────────────────────────────────────────────────────

describe('createTelemetry.recordChunk', () => {
  it('appends entry to ctx.chunks + flushes JSONL via atomicWrite', async () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');
    const entry = telemetry.buildChunkEntry({
      ctx,
      chunk_index: 0,
      seed_used: 42,
      trigger_path: 'v2b',
      oracle_attempt_1: buildOracleResult('no_loop'),
      oracle_attempt_2: null,
      reset: null,
      verdict: 'no_loop',
      ts_start_ms: 1_000,
      ts_end_ms: 2_000,
    });
    await telemetry.recordChunk(ctx, entry);
    expect(ctx.chunks.length).toBe(1);
    expect(deps.atomicWrite).toHaveBeenCalledWith(ctx.chunks_file_path, expect.any(String));
  });

  it('does not throw when atomicWrite fails (CI-4)', async () => {
    const deps = mockDeps();
    deps.atomicWrite = vi.fn().mockRejectedValue(new Error('disk full'));
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');
    const entry = telemetry.buildChunkEntry({
      ctx,
      chunk_index: 0,
      seed_used: 42,
      trigger_path: 'v2b',
      oracle_attempt_1: buildOracleResult('no_loop'),
      oracle_attempt_2: null,
      reset: null,
      verdict: 'no_loop',
      ts_start_ms: 1_000,
      ts_end_ms: 2_000,
    });
    await expect(telemetry.recordChunk(ctx, entry)).resolves.not.toThrow();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// finalizeRun
// ──────────────────────────────────────────────────────────────────────────────

describe('createTelemetry.finalizeRun', () => {
  it('returns DedaleRunTelemetry and writes atomically', async () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');
    const agg = await telemetry.finalizeRun(ctx);
    expect(agg.schema_version).toBe('1');
    expect(agg.run_id).toBe(ctx.run_id);
    expect(agg.chunks_total).toBe(0);
    expect(deps.atomicWrite).toHaveBeenCalledWith(ctx.run_file_path, expect.any(String));
  });

  it('does not throw when final flush fails (CI-4)', async () => {
    const deps = mockDeps();
    deps.atomicWrite = vi.fn().mockRejectedValue(new Error('disk full'));
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');
    await expect(telemetry.finalizeRun(ctx)).resolves.toBeDefined();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// aggregateRun
// ──────────────────────────────────────────────────────────────────────────────

describe('aggregateRun', () => {
  it('counts verdicts correctly', () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('on', '/tmp/telemetry');

    const entries: DedaleChunkTelemetry[] = [
      { schema_version: '1', run_id: ctx.run_id, chunk_index: 0, seed_used: 0, mode: 'on',
        trigger_path: 'v2b', oracle_attempt_1: buildOracleResult('hard_fail'),
        oracle_attempt_2: buildOracleResult('no_loop'), reset: null, verdict: 'reset_effective',
        ts_start_iso: '', ts_end_iso: '', elapsed_ms_total: 100 },
      { schema_version: '1', run_id: ctx.run_id, chunk_index: 1, seed_used: 1, mode: 'on',
        trigger_path: 'v2b', oracle_attempt_1: buildOracleResult('hard_fail'),
        oracle_attempt_2: buildOracleResult('hard_fail'), reset: null, verdict: 'reset_non_effective',
        ts_start_iso: '', ts_end_iso: '', elapsed_ms_total: 100 },
      { schema_version: '1', run_id: ctx.run_id, chunk_index: 2, seed_used: 2, mode: 'on',
        trigger_path: null, oracle_attempt_1: buildOracleResult('no_loop'),
        oracle_attempt_2: null, reset: null, verdict: 'no_loop',
        ts_start_iso: '', ts_end_iso: '', elapsed_ms_total: 50 },
    ];
    (ctx.chunks as DedaleChunkTelemetry[]).push(...entries);

    const agg = aggregateRun(ctx, deps.clock);
    expect(agg.counts.reset_effective).toBe(1);
    expect(agg.counts.reset_non_effective).toBe(1);
    expect(agg.counts.no_loop).toBe(1);
    expect(agg.counts.reset_failed).toBe(0);
    expect(agg.chunks_total).toBe(3);
    expect(agg.ratio_effective).toBeCloseTo(0.5);
  });

  it('returns ratio_effective = null when denominator is 0', () => {
    const deps = mockDeps();
    const telemetry = createTelemetry(deps);
    const ctx = telemetry.startRun('shadow', '/tmp/telemetry');
    const agg = aggregateRun(ctx, deps.clock);
    expect(agg.ratio_effective).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// computeC5Verdict
// ──────────────────────────────────────────────────────────────────────────────

describe('computeC5Verdict', () => {
  function buildAgg(effective: number, nonEffective: number): DedaleRunTelemetry {
    const total = effective + nonEffective;
    const ratio = total === 0 ? null : effective / total;
    return {
      schema_version: '1',
      run_id: 'test',
      mode: 'on',
      chunks_total: total,
      counts: {
        no_loop: 0,
        reset_effective: effective,
        reset_non_effective: nonEffective,
        reset_failed: 0,
      },
      distribution_trigger_path: { v2b: total, k2: 0, both: 0, none: 0 },
      ratio_effective: ratio,
      ts_run_start_iso: '2026-04-21T00:00:00.000Z',
      ts_run_end_iso: '2026-04-21T00:01:00.000Z',
    };
  }

  it('returns inconclusive when n_total < n_exploratory', () => {
    const agg = buildAgg(2, 1);  // n=3 < 5
    expect(computeC5Verdict(agg)).toBe('inconclusive');
  });

  it('returns pass_exploratory when ratio≥0.50 AND n≥5', () => {
    const agg = buildAgg(3, 2);  // ratio=0.6, n=5
    expect(computeC5Verdict(agg)).toBe('pass_exploratory');
  });

  it('returns pass_robust when ratio≥0.50 AND n≥15', () => {
    const agg = buildAgg(8, 7);  // ratio=0.53, n=15
    expect(computeC5Verdict(agg)).toBe('pass_robust');
  });

  it('returns fail when ratio<0.30 AND n≥10', () => {
    const agg = buildAgg(2, 10);  // ratio=0.167, n=12
    expect(computeC5Verdict(agg)).toBe('fail');
  });

  it('returns inconclusive when 0.30 ≤ ratio < 0.50 AND n≥10', () => {
    const agg = buildAgg(4, 8);  // ratio=0.333, n=12
    expect(computeC5Verdict(agg)).toBe('inconclusive');
  });

  it('PASS_THRESHOLDS are frozen constants', () => {
    expect(PASS_THRESHOLDS.ratio_min).toBe(0.50);
    expect(PASS_THRESHOLDS.n_exploratory).toBe(5);
    expect(PASS_THRESHOLDS.n_robust).toBe(15);
    expect(PASS_THRESHOLDS.ratio_fail).toBe(0.30);
    expect(PASS_THRESHOLDS.n_fail_min).toBe(10);
  });
});
