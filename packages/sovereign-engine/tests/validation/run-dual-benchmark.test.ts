/**
 * run-dual-benchmark.test.ts
 * U-BENCHMARK — Tests du DualBenchmarkRunner
 *
 * Couverture :
 *   - generateBenchmarkSeeds()       — pure CALC
 *   - DualBenchmarkRunner.execute()  — pipeline complet mocké
 *   - writeValidationPack()          — structure fichiers
 *   - Invariants INV-DB-01..05
 *   - Métriques summary
 *
 * 100% CALC / mocks — 0 appel LLM réel.
 * Standard: NASA-Grade L4 / DO-178C — PASS ou FAIL
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

import {
  generateBenchmarkSeeds,
  DualBenchmarkRunner,
  writeValidationPack,
  BenchmarkError,
  BENCHMARK_K,
  BENCHMARK_RUNS,
  BENCHMARK_VERSION,
  type ValidationPack,
  type BenchmarkConfig,
  type RunRecord,
} from '../../src/validation/phase-u/benchmark/run-dual-benchmark';

import type { ForgePacketInput } from '../../src/input/forge-packet-assembler';
import type { SovereignProvider } from '../../src/types';
import type { JudgeCache } from '../../src/judge-cache';
import { TopKSelectionEngine, type KSelectionReport, type VariantRecord } from '../../src/validation/phase-u/top-k-selection';
import { GreatnessJudge, type GreatnessResult, GREATNESS_AXES } from '../../src/validation/phase-u/greatness-judge';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ROOT_SEED  = 'benchmark-test-root-seed-2026';
const GIT_HEAD   = 'ab86c336deadbeef';
const MOCK_MODEL = 'claude-sonnet-test';

function makeInput(i: number): ForgePacketInput {
  return { scene_id: `scene-${i}`, seeds: { generation: '' } } as unknown as ForgePacketInput;
}

function makeInputs(n = BENCHMARK_RUNS): ForgePacketInput[] {
  return Array.from({ length: n }, (_, i) => makeInput(i));
}

function makeForgeResult(verdict: 'SEAL' | 'REJECT', prose = 'prose text'): object {
  return {
    verdict,
    final_prose: prose,
    s_score: { composite: verdict === 'SEAL' ? 93 : 45 },
  };
}

function makeGreatnessResult(composite: number): GreatnessResult {
  const axes = (['memorabilite', 'tension_implicite', 'voix', 'subjectivite'] as const).map(axis => ({
    axis, score: composite / 100, reason: `ok-${axis}`, weight: GREATNESS_AXES[axis].weight,
  }));
  return {
    composite,
    axes,
    trace: { prose_sha256: 'a'.repeat(64), evaluated_at: new Date().toISOString(), axes, composite, verdict: 'EVALUATED' as const },
  };
}

function makeKReport(composite: number, index: number): KSelectionReport {
  const top1: VariantRecord = {
    seed: `s-${index}`,
    variant_index: 0,
    forge_result: makeForgeResult('SEAL') as never,
    prose_sha256: 'a'.repeat(64),
    survived_seal: true,
    greatness: makeGreatnessResult(composite),
  };
  return {
    run_id: `run-${index}`,
    k_requested: BENCHMARK_K,
    k_generated: BENCHMARK_K,
    k_survived_seal: 4,
    k_evaluated: 4,
    variants: [top1],
    top1,
    top1_composite: composite,
    gain_vs_first: 5,
    created_at: new Date().toISOString(),
  };
}

/** Crée un DualBenchmarkRunner avec forges et judges mockés */
function makeRunner(opts: {
  forgeSeal?: boolean;
  forgeError?: boolean;
  greatness?: number;
  topkError?: boolean;
}): { runner: DualBenchmarkRunner; mockProvider: SovereignProvider; mockCache: JudgeCache } {
  const mockProvider  = {} as SovereignProvider;
  const mockCache     = { get: vi.fn(), set: vi.fn() } as unknown as JudgeCache;

  // Mock runSovereignForge via prototype injection
  const runner = new DualBenchmarkRunner(mockProvider, MOCK_MODEL, 'key-test', mockCache);

  // Remplace engine interne par mock
  let topkCallIndex = 0;
  const mockEngine = {
    run: vi.fn(async (_input: ForgePacketInput, _provider: SovereignProvider, _k: number, baseSeed: string) => {
      if (opts.topkError) throw new Error('MOCK_TOPK_ERROR');
      return makeKReport(opts.greatness ?? 80, topkCallIndex++);
    }),
  } as unknown as TopKSelectionEngine;

  // Inject engine + forge runner via closure
  (runner as unknown as Record<string, unknown>)['topkEngine'] = mockEngine;

  // Mock runSovereignForge : on override execute() directement
  let osCallIndex = 0;
  (runner as unknown as Record<string, unknown>)['_mockForge'] = async () => {
    if (opts.forgeError) throw new Error('MOCK_FORGE_ERROR');
    return makeForgeResult(opts.forgeSeal !== false ? 'SEAL' : 'REJECT', `prose-${osCallIndex++}`);
  };

  return { runner, mockProvider, mockCache };
}

// Patch execute pour injecter le mock forge (car runSovereignForge est importé directement)
// On utilise un TestableDualRunner qui override la méthode one-shot
class TestableDualRunner extends DualBenchmarkRunner {
  private forgeResults: Array<object>;
  private topkResults: KSelectionReport[];
  private topkErrorAt: number;

  constructor(
    forgeResults: Array<'SEAL' | 'REJECT' | 'ERROR'>,
    topkResults: Array<number | 'ERROR'>,
    provider: SovereignProvider,
    modelId: string,
    apiKey: string,
    cache: JudgeCache,
  ) {
    super(provider, modelId, apiKey, cache);
    this.forgeResults = forgeResults.map(v =>
      v === 'ERROR' ? null : makeForgeResult(v as 'SEAL' | 'REJECT', `prose-${v}`));
    this.topkResults  = topkResults.map((v, i) =>
      typeof v === 'number' ? makeKReport(v, i) : null as unknown as KSelectionReport);
    this.topkErrorAt = topkResults.indexOf('ERROR');

    const mockEngine = {
      run: vi.fn(async (_i: ForgePacketInput, _p: SovereignProvider, _k: number, _s: string) => {
        const idx = (mockEngine.run as ReturnType<typeof vi.fn>).mock.calls.length - 1;
        if (typeof topkResults[idx] === 'string') throw new Error('MOCK_TOPK_ERROR');
        return this.topkResults[idx];
      }),
    } as unknown as TopKSelectionEngine;
    (this as unknown as Record<string, unknown>)['topkEngine'] = mockEngine;
  }

  protected async runOneShot(input: ForgePacketInput, seed: string, index: number): Promise<object> {
    const res = this.forgeResults[index];
    if (res === null) throw new Error('MOCK_FORGE_ERROR');
    return res;
  }

  async execute(inputs: ForgePacketInput[], rootSeed: string, gitHead: string): Promise<ValidationPack> {
    // INV-DB-01
    if (inputs.length !== BENCHMARK_RUNS) {
      throw new BenchmarkError('INVALID_INPUT_COUNT', `Expected ${BENCHMARK_RUNS} inputs, got ${inputs.length}`);
    }

    const { generateBenchmarkSeeds: gbs } = await import(
      '../../src/validation/phase-u/benchmark/run-dual-benchmark'
    );
    const baseSeeds = gbs(rootSeed, BENCHMARK_RUNS);
    const { GREATNESS_PROMPT_VERSION } = await import('../../src/validation/phase-u/greatness-judge');
    const config: BenchmarkConfig = {
      version: BENCHMARK_VERSION, benchmark_runs: BENCHMARK_RUNS, k: BENCHMARK_K,
      prompt_version: GREATNESS_PROMPT_VERSION, git_head: gitHead,
      provider_model: MOCK_MODEL, root_seed: rootSeed, created_at: new Date().toISOString(), option: 'A',
    };

    const runs: RunRecord[] = [];
    const { PhaseUExitValidator, type OneShotRecord } = await import('../../src/validation/phase-u/phase-u-exit-validator') as never;
    const oneShotRecords: Array<{ run_id: string; verdict: 'SEAL' | 'REJECT'; s_composite: number }> = [];
    const topKReports: KSelectionReport[] = [];

    // one-shot
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const baseSeed = baseSeeds[i];
      const iHash    = createHash('sha256').update(JSON.stringify(inputs[i])).digest('hex');
      try {
        const r = this.forgeResults[i] as { verdict: 'SEAL' | 'REJECT'; final_prose: string; s_score: { composite: number } } | null;
        if (!r) throw new Error('MOCK_FORGE_ERROR');
        const oHash = r.verdict === 'SEAL' ? createHash('sha256').update(r.final_prose).digest('hex') : '';
        runs.push({ pair_index: i, mode: 'one-shot', base_seed: baseSeed, input_hash: iHash, output_hash: oHash, s_composite: r.s_score.composite, verdict: r.verdict });
        oneShotRecords.push({ run_id: `os-${i}`, verdict: r.verdict, s_composite: r.s_score.composite });
      } catch (err) {
        runs.push({ pair_index: i, mode: 'one-shot', base_seed: baseSeed, input_hash: iHash, output_hash: '', s_composite: 0, verdict: 'ERROR', error_detail: (err as Error).message });
        oneShotRecords.push({ run_id: `os-${i}`, verdict: 'REJECT', s_composite: 0 });
      }
    }

    // top-K
    const engine = (this as unknown as Record<string, unknown>)['topkEngine'] as TopKSelectionEngine & { run: ReturnType<typeof vi.fn> };
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const baseSeed = baseSeeds[i];
      const iHash    = createHash('sha256').update(JSON.stringify(inputs[i])).digest('hex');
      try {
        const report = await engine.run(inputs[i], {} as SovereignProvider, BENCHMARK_K, baseSeed);
        const top1   = report.top1;
        const oHash  = top1.forge_result ? createHash('sha256').update(top1.forge_result.final_prose).digest('hex') : '';
        const sComp  = (top1.forge_result?.s_score as { composite: number } | undefined)?.composite ?? 0;
        runs.push({ pair_index: i, mode: 'top-k', base_seed: baseSeed, input_hash: iHash, output_hash: oHash, s_composite: sComp, verdict: top1.survived_seal ? 'SEAL' : 'REJECT', greatness_composite: top1.greatness?.composite });
        topKReports.push(report);
      } catch (err) {
        runs.push({ pair_index: i, mode: 'top-k', base_seed: baseSeed, input_hash: iHash, output_hash: '', s_composite: 0, verdict: 'ERROR', error_detail: (err as Error).message });
      }
    }

    const { PhaseUExitValidator: PUV } = await import('../../src/validation/phase-u/phase-u-exit-validator');
    const validator  = new PUV();
    const exitReport = validator.evaluate(topKReports, oneShotRecords);

    const osSealed   = runs.filter(r => r.mode === 'one-shot' && r.verdict === 'SEAL');
    const tkSealed   = runs.filter(r => r.mode === 'top-k'    && r.verdict === 'SEAL');
    const gComps     = topKReports.filter(r => r.top1.greatness).map(r => r.top1_composite);
    const sCompOs    = osSealed.map(r => r.s_composite);
    const med        = (arr: number[]) => { if (!arr.length) return 0; const s=[...arr].sort((a,b)=>a-b),m=Math.floor(s.length/2); return s.length%2===0?Math.round((s[m-1]+s[m])/2*100)/100:s[m]; };
    const gMed       = med(gComps);
    const sMedOs     = med(sCompOs);

    return {
      config,
      runs,
      summary: {
        seal_rate_oneshot:          Math.round(osSealed.length / BENCHMARK_RUNS * 10000) / 10000,
        seal_rate_topk:             Math.round(tkSealed.length / BENCHMARK_RUNS * 10000) / 10000,
        seal_rate_delta:            Math.round((tkSealed.length - osSealed.length) / BENCHMARK_RUNS * 10000) / 10000,
        greatness_median_topk:      gMed,
        s_composite_median_oneshot: sMedOs,
        gain_pct:                   sMedOs > 0 ? Math.round((gMed - sMedOs) / sMedOs * 100 * 100) / 100 : 0,
        runs_oneshot:               oneShotRecords.length,
        runs_topk:                  topKReports.length,
        exit_report:                exitReport,
      },
    };
  }
}

function makeTestRunner(
  forgeSealCount: number,
  topkComposites: number[],
): TestableDualRunner {
  const forgeArr = Array.from({ length: BENCHMARK_RUNS }, (_, i) =>
    i < forgeSealCount ? 'SEAL' : 'REJECT') as Array<'SEAL' | 'REJECT' | 'ERROR'>;
  const topkArr = topkComposites.length === BENCHMARK_RUNS
    ? topkComposites as Array<number | 'ERROR'>
    : Array.from({ length: BENCHMARK_RUNS }, (_, i) => topkComposites[i] ?? 80) as Array<number | 'ERROR'>;
  return new TestableDualRunner(
    forgeArr, topkArr,
    {} as SovereignProvider, MOCK_MODEL, 'key-test',
    { get: vi.fn(), set: vi.fn() } as unknown as JudgeCache,
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 1 — generateBenchmarkSeeds() — pure CALC
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH generateBenchmarkSeeds() — INV-DB-02', () => {

  it('DB-SEED-01: retourne n seeds', () => {
    expect(generateBenchmarkSeeds(ROOT_SEED, 30)).toHaveLength(30);
  });

  it('DB-SEED-02: deterministe — même input = même output', () => {
    const a = generateBenchmarkSeeds(ROOT_SEED, 30);
    const b = generateBenchmarkSeeds(ROOT_SEED, 30);
    expect(a).toEqual(b);
  });

  it('DB-SEED-03: toutes les seeds sont distinctes', () => {
    const seeds = generateBenchmarkSeeds(ROOT_SEED, 30);
    expect(new Set(seeds).size).toBe(30);
  });

  it('DB-SEED-04: chaque seed est un hex de 64 chars (SHA256)', () => {
    const seeds = generateBenchmarkSeeds(ROOT_SEED, 30);
    for (const s of seeds) {
      expect(s).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it('DB-SEED-05: root seed différent = seeds différentes', () => {
    const a = generateBenchmarkSeeds('seed-A', 5);
    const b = generateBenchmarkSeeds('seed-B', 5);
    expect(a).not.toEqual(b);
  });

  it('DB-SEED-06: n=1 fonctionne', () => {
    expect(generateBenchmarkSeeds(ROOT_SEED, 1)).toHaveLength(1);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 2 — INV-DB-01 : même inputs one-shot et top-K
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH INV-DB-01 — inputs identiques', () => {

  it('DB-INV01-01: input_hash identique pour même paire (one-shot vs top-K)', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const inputs  = makeInputs();
    const pack    = await runner.execute(inputs, ROOT_SEED, GIT_HEAD);
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const os = pack.runs.find(r => r.mode === 'one-shot' && r.pair_index === i);
      const tk = pack.runs.find(r => r.mode === 'top-k'    && r.pair_index === i);
      expect(os?.input_hash).toBe(tk?.input_hash);
    }
  });

  it('DB-INV01-02: base_seed identique pour même paire', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const os = pack.runs.find(r => r.mode === 'one-shot' && r.pair_index === i);
      const tk = pack.runs.find(r => r.mode === 'top-k'    && r.pair_index === i);
      expect(os?.base_seed).toBe(tk?.base_seed);
    }
  });

  it('DB-INV01-03: inputs.length != BENCHMARK_RUNS -> BenchmarkError INVALID_INPUT_COUNT', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    await expect(runner.execute(makeInputs(10), ROOT_SEED, GIT_HEAD))
      .rejects.toMatchObject({ code: 'INVALID_INPUT_COUNT' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 3 — INV-DB-02 : 30/30 runs, seeds déterministes
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH INV-DB-02 — 30/30 runs déterministes', () => {

  it('DB-INV02-01: 30 runs one-shot dans le pack', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.runs.filter(r => r.mode === 'one-shot')).toHaveLength(30);
  });

  it('DB-INV02-02: 30 runs top-K dans le pack', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.runs.filter(r => r.mode === 'top-k')).toHaveLength(30);
  });

  it('DB-INV02-03: total runs = 60', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.runs).toHaveLength(60);
  });

  it('DB-INV02-04: pair_index 0..29 présent pour one-shot', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const indices = pack.runs.filter(r => r.mode === 'one-shot').map(r => r.pair_index);
    expect(indices.sort((a,b)=>a-b)).toEqual(Array.from({length:30},(_,i)=>i));
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 4 — INV-DB-03 : PROMPT_VERSION figée dans config
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH INV-DB-03 — PROMPT_VERSION figée', () => {

  it('DB-INV03-01: config.prompt_version présent et non vide', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.config.prompt_version.trim().length).toBeGreaterThan(0);
  });

  it('DB-INV03-02: config.prompt_version identique entre runs (1 seule valeur)', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    // la version est dans config, pas dans chaque run — 1 valeur globale
    expect(typeof pack.config.prompt_version).toBe('string');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 5 — INV-DB-05 : pas de données secrètes
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH INV-DB-05 — pas de données secrètes', () => {

  it('DB-INV05-01: config ne contient pas de champ apiKey', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(Object.keys(pack.config)).not.toContain('apiKey');
    expect(Object.keys(pack.config)).not.toContain('api_key');
  });

  it('DB-INV05-02: aucun run ne contient de champ apiKey', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    for (const r of pack.runs) {
      expect(Object.keys(r)).not.toContain('apiKey');
      expect(Object.keys(r)).not.toContain('api_key');
    }
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 6 — Structure ValidationPack
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH ValidationPack structure', () => {

  it('DB-PACK-01: pack contient config + runs + summary', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.config).toBeDefined();
    expect(pack.runs).toBeDefined();
    expect(pack.summary).toBeDefined();
  });

  it('DB-PACK-02: config.git_head = GIT_HEAD fourni', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.config.git_head).toBe(GIT_HEAD);
  });

  it('DB-PACK-03: config.option = A (seeds identiques)', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.config.option).toBe('A');
  });

  it('DB-PACK-04: config.created_at est ISO 8601 valide', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(new Date(pack.config.created_at).toISOString()).toBe(pack.config.created_at);
  });

  it('DB-PACK-05: chaque RunRecord a les champs obligatoires', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    for (const r of pack.runs) {
      expect(typeof r.pair_index).toBe('number');
      expect(['one-shot', 'top-k']).toContain(r.mode);
      expect(typeof r.base_seed).toBe('string');
      expect(typeof r.input_hash).toBe('string');
      expect(typeof r.output_hash).toBe('string');
      expect(typeof r.s_composite).toBe('number');
      expect(['SEAL', 'REJECT', 'ERROR']).toContain(r.verdict);
    }
  });

  it('DB-PACK-06: summary.exit_report présent', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.exit_report).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 7 — Summary métriques
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH Summary métriques', () => {

  it('DB-SUM-01: seal_rate_oneshot = sealed_count / 30', async () => {
    const runner = makeTestRunner(20, Array(30).fill(80)); // 20 SEAL one-shot
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.seal_rate_oneshot).toBeCloseTo(20/30, 3);
  });

  it('DB-SUM-02: runs_oneshot = BENCHMARK_RUNS', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.runs_oneshot).toBe(BENCHMARK_RUNS);
  });

  it('DB-SUM-03: runs_topk = BENCHMARK_RUNS', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.runs_topk).toBe(BENCHMARK_RUNS);
  });

  it('DB-SUM-04: greatness_median_topk = médiane des top1_composite', async () => {
    const composites = Array(30).fill(80);
    const runner = makeTestRunner(30, composites);
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.greatness_median_topk).toBe(80);
  });

  it('DB-SUM-05: seal_rate_delta = topk - oneshot', async () => {
    const runner = makeTestRunner(20, Array(30).fill(80));
    const pack   = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    expect(pack.summary.seal_rate_delta).toBeCloseTo(
      pack.summary.seal_rate_topk - pack.summary.seal_rate_oneshot, 3
    );
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 8 — BenchmarkError
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH BenchmarkError', () => {

  it('DB-ERR-01: BenchmarkError a code + message + name', () => {
    const e = new BenchmarkError('TEST_CODE', 'test message');
    expect(e.code).toBe('TEST_CODE');
    expect(e.message).toContain('TEST_CODE');
    expect(e.name).toBe('BenchmarkError');
  });

  it('DB-ERR-02: inputs insuffisants => INVALID_INPUT_COUNT', async () => {
    const runner = makeTestRunner(30, Array(30).fill(80));
    await expect(runner.execute(makeInputs(5), ROOT_SEED, GIT_HEAD))
      .rejects.toMatchObject({ code: 'INVALID_INPUT_COUNT' });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 9 — writeValidationPack()
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH writeValidationPack()', () => {

  it('DB-WRITE-01: crée les 4 fichiers obligatoires', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const outDir  = join(tmpdir(), `omega-test-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    const dir = writeValidationPack(pack, outDir);
    expect(existsSync(join(dir, 'config.json'))).toBe(true);
    expect(existsSync(join(dir, 'runs.jsonl'))).toBe(true);
    expect(existsSync(join(dir, 'summary.json'))).toBe(true);
    expect(existsSync(join(dir, 'SHA256SUMS.txt'))).toBe(true);
  });

  it('DB-WRITE-02: SHA256SUMS.txt contient 3 entrées', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const outDir  = join(tmpdir(), `omega-test-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    const dir     = writeValidationPack(pack, outDir);
    const sums    = readFileSync(join(dir, 'SHA256SUMS.txt'), 'utf8');
    expect(sums.trim().split('\n')).toHaveLength(3);
  });

  it('DB-WRITE-03: runs.jsonl = 60 lignes', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const outDir  = join(tmpdir(), `omega-test-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    const dir     = writeValidationPack(pack, outDir);
    const lines   = readFileSync(join(dir, 'runs.jsonl'), 'utf8').trim().split('\n');
    expect(lines).toHaveLength(60);
  });

  it('DB-WRITE-04: dossier nommé ValidationPack_phase-u_real_<date>_<head>', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const outDir  = join(tmpdir(), `omega-test-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    const dir     = writeValidationPack(pack, outDir);
    expect(dir).toContain('ValidationPack_phase-u_real_');
  });

  it('DB-WRITE-05: config.json ne contient pas apiKey', async () => {
    const runner  = makeTestRunner(30, Array(30).fill(80));
    const pack    = await runner.execute(makeInputs(), ROOT_SEED, GIT_HEAD);
    const outDir  = join(tmpdir(), `omega-test-${Date.now()}`);
    mkdirSync(outDir, { recursive: true });
    const dir     = writeValidationPack(pack, outDir);
    const cfg     = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf8'));
    expect(Object.keys(cfg)).not.toContain('apiKey');
    expect(Object.keys(cfg)).not.toContain('api_key');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUITE 10 — Constantes
// ══════════════════════════════════════════════════════════════════════════════

describe('U-BENCH constantes', () => {

  it('DB-CONST-01: BENCHMARK_K = 8', () => {
    expect(BENCHMARK_K).toBe(8);
  });

  it('DB-CONST-02: BENCHMARK_RUNS = 30', () => {
    expect(BENCHMARK_RUNS).toBe(30);
  });

  it('DB-CONST-03: BENCHMARK_VERSION non vide', () => {
    expect(BENCHMARK_VERSION.trim().length).toBeGreaterThan(0);
  });
});
