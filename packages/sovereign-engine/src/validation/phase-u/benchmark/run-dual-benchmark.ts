/**
 * run-dual-benchmark.ts
 * U-BENCHMARK — 30 one-shot vs 30 top-K (Option A: seeds identiques)
 *
 * Livrables obligatoires (ValidationPack) :
 *   ValidationPack_phase-u_real_<date>_<head>/
 *     config.json      — provider, model, K, PROMPT_VERSION, head, created_at
 *     runs.jsonl       — 1 ligne par run (mode, pair_index, seed, inputHash,
 *                        outputHash, sComposite, verdict, greatnessComposite?)
 *     summary.json     — rates, medians, deltas, effet size
 *     SHA256SUMS.txt   — hash de tous les fichiers du pack
 *
 * Invariants :
 *   INV-DB-01 : même packets pour one-shot et top-K (30 paires identiques)
 *   INV-DB-02 : 30 runs one-shot + 30 runs top-K, seeds déterministes
 *   INV-DB-03 : GREATNESS_PROMPT_VERSION figée avant premier run
 *   INV-DB-04 : tie-break stable top-K via SelectionTrace
 *   INV-DB-05 : aucune donnée secrète dans ValidationPack
 *
 * Standard: NASA-Grade L4 / DO-178C
 */

import { createHash } from 'node:crypto';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SovereignProvider } from '../../../types.js';
import type { ForgePacketInput } from '../../../input/forge-packet-assembler.js';
import { runSovereignForge } from '../../../engine.js';
import { TopKSelectionEngine, generateDistinctSeeds, type KSelectionReport } from '../top-k-selection.js';
import {
  PhaseUExitValidator,
  type OneShotRecord,
  type PhaseUExitReport,
} from '../phase-u-exit-validator.js';
import type { JudgeCache } from '../../../judge-cache.js';
import { GREATNESS_PROMPT_VERSION } from '../greatness-judge.js';

// ── Configuration ─────────────────────────────────────────────────────────────

export const BENCHMARK_K       = 8;
export const BENCHMARK_RUNS    = 30;
export const BENCHMARK_VERSION = '1.0.0';

/** Génère n base-seeds déterministes à partir d'un root seed */
export function generateBenchmarkSeeds(rootSeed: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    createHash('sha256').update(`${rootSeed}:benchmark:${i}`).digest('hex')
  );
}

// ── Types ValidationPack ──────────────────────────────────────────────────────

export interface BenchmarkConfig {
  readonly version:        string;
  readonly benchmark_runs: number;
  readonly k:              number;
  readonly prompt_version: string;
  readonly git_head:       string;
  readonly provider_model: string;
  readonly root_seed:      string;
  readonly created_at:     string;
  readonly option:         'A';
}

export interface RunRecord {
  readonly pair_index:           number;
  readonly mode:                 'one-shot' | 'top-k';
  readonly base_seed:            string;
  readonly input_hash:           string;
  readonly output_hash:          string;
  readonly s_composite:          number;
  readonly verdict:              'SEAL' | 'REJECT' | 'ERROR';
  readonly greatness_composite?: number;
  readonly error_detail?:        string;
}

export interface BenchmarkSummary {
  readonly seal_rate_oneshot:          number;
  readonly seal_rate_topk:             number;
  readonly seal_rate_delta:            number;
  readonly greatness_median_topk:      number;
  readonly s_composite_median_oneshot: number;
  readonly gain_pct:                   number;
  readonly runs_oneshot:               number;
  readonly runs_topk:                  number;
  readonly exit_report:                PhaseUExitReport;
}

export interface ValidationPack {
  readonly config:  BenchmarkConfig;
  readonly runs:    RunRecord[];
  readonly summary: BenchmarkSummary;
}

export class BenchmarkError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly cause?: unknown,
  ) {
    super(`${code}: ${message}`);
    this.name = 'BenchmarkError';
  }
}

// ── Utilitaires ───────────────────────────────────────────────────────────────

function sha256str(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

function inputHash(input: ForgePacketInput): string {
  return sha256str(JSON.stringify(input));
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid    = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid];
}

// ── DualBenchmarkRunner ───────────────────────────────────────────────────────

export class DualBenchmarkRunner {
  private readonly topkEngine:    TopKSelectionEngine;
  private readonly exitValidator: PhaseUExitValidator;

  constructor(
    private readonly provider: SovereignProvider,
    private readonly modelId:  string,
    private readonly apiKey:   string,
    private readonly cache:    JudgeCache,
  ) {
    this.topkEngine   = new TopKSelectionEngine({ k: BENCHMARK_K, modelId, apiKey }, cache);
    this.exitValidator = new PhaseUExitValidator();
  }

  async execute(
    inputs:   ForgePacketInput[],
    rootSeed: string,
    gitHead:  string,
  ): Promise<ValidationPack> {
    if (inputs.length !== BENCHMARK_RUNS) {
      throw new BenchmarkError(
        'INVALID_INPUT_COUNT',
        `Expected ${BENCHMARK_RUNS} inputs, got ${inputs.length}`,
      );
    }

    const baseSeeds = generateBenchmarkSeeds(rootSeed, BENCHMARK_RUNS);

    const config: BenchmarkConfig = {
      version:        BENCHMARK_VERSION,
      benchmark_runs: BENCHMARK_RUNS,
      k:              BENCHMARK_K,
      prompt_version: GREATNESS_PROMPT_VERSION,
      git_head:       gitHead,
      provider_model: this.modelId,
      root_seed:      rootSeed,
      created_at:     new Date().toISOString(),
      option:         'A',
    };

    const runs:           RunRecord[]     = [];
    const oneShotRecords: OneShotRecord[] = [];
    const topKReports:    KSelectionReport[] = [];

    // ── Phase 1 : 30 one-shot ────────────────────────────────────────────────
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const baseSeed    = baseSeeds[i];
      const seededInput = injectSeed(inputs[i], baseSeed);
      const iHash       = inputHash(seededInput);

      process.stdout.write(`[ONE-SHOT ${i + 1}/${BENCHMARK_RUNS}] ... `);

      let record: RunRecord;
      try {
        const result = await runSovereignForge(seededInput, this.provider);
        const sScore = result.s_score as { composite?: number };
        const sComp  = typeof sScore?.composite === 'number' ? sScore.composite : 0;
        const oHash  = result.verdict === 'SEAL' ? sha256str(result.final_prose) : '';

        record = {
          pair_index: i, mode: 'one-shot', base_seed: baseSeed,
          input_hash: iHash, output_hash: oHash,
          s_composite: sComp, verdict: result.verdict,
        };
        oneShotRecords.push({ run_id: `os-${i}`, verdict: result.verdict, s_composite: sComp });
        console.log(`${result.verdict} (s=${sComp.toFixed(1)})`);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        record = {
          pair_index: i, mode: 'one-shot', base_seed: baseSeed,
          input_hash: iHash, output_hash: '', s_composite: 0,
          verdict: 'ERROR', error_detail: detail,
        };
        oneShotRecords.push({ run_id: `os-${i}`, verdict: 'REJECT', s_composite: 0 });
        console.log(`ERROR: ${detail.slice(0, 120)}`);
      }
      runs.push(record);
    }

    // ── Phase 2 : 30 top-K ───────────────────────────────────────────────────
    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const baseSeed = baseSeeds[i];
      const iHash    = inputHash(injectSeed(inputs[i], baseSeed));

      process.stdout.write(`[TOP-K ${i + 1}/${BENCHMARK_RUNS}] K=${BENCHMARK_K} ... `);

      let record: RunRecord;
      try {
        const report = await this.topkEngine.run(inputs[i], this.provider, BENCHMARK_K, baseSeed);
        const top1   = report.top1;
        const sScore = top1.forge_result?.s_score as { composite?: number } | undefined;
        const sComp  = typeof sScore?.composite === 'number' ? sScore.composite : 0;
        const oHash  = top1.forge_result ? sha256str(top1.forge_result.final_prose) : '';
        const gComp  = top1.greatness?.composite ?? 0;

        record = {
          pair_index: i, mode: 'top-k', base_seed: baseSeed,
          input_hash: iHash, output_hash: oHash,
          s_composite: sComp, verdict: top1.survived_seal ? 'SEAL' : 'REJECT',
          greatness_composite: gComp,
        };
        topKReports.push(report);
        console.log(`${top1.survived_seal ? 'SEAL' : 'REJECT'} (g=${gComp.toFixed(1)}, survivors=${report.k_survived_seal}/${BENCHMARK_K})`);
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        // ZERO_SURVIVORS = 0/K variants passed SEAL — valid data point, not an error
        const isZeroSurvivors = detail.includes('ZERO_SURVIVORS');
        record = {
          pair_index: i, mode: 'top-k', base_seed: baseSeed,
          input_hash: iHash, output_hash: '', s_composite: 0,
          verdict: isZeroSurvivors ? 'REJECT' : 'ERROR',
          error_detail: isZeroSurvivors ? undefined : detail,
        };
        console.log(isZeroSurvivors
          ? `REJECT (0/${BENCHMARK_K} survived SEAL)`
          : `ERROR: ${detail.slice(0, 120)}`);
      }
      runs.push(record);
    }

    // ── Phase 3 : ExitValidator + Summary ────────────────────────────────────
    const exitReport    = this.exitValidator.evaluate(topKReports, oneShotRecords);
    const osSealed      = runs.filter(r => r.mode === 'one-shot' && r.verdict === 'SEAL');
    const tkSealed      = runs.filter(r => r.mode === 'top-k'    && r.verdict === 'SEAL');
    const gComposites   = topKReports.filter(r => r.top1.greatness).map(r => r.top1_composite);
    const sCompOsSealed = osSealed.map(r => r.s_composite);
    const gMedian       = median(gComposites);
    const sMedianOs     = median(sCompOsSealed);
    const gainPct       = sMedianOs > 0
      ? Math.round(((gMedian - sMedianOs) / sMedianOs) * 100 * 100) / 100
      : 0;

    const summary: BenchmarkSummary = {
      seal_rate_oneshot:          Math.round(osSealed.length / BENCHMARK_RUNS * 10000) / 10000,
      seal_rate_topk:             Math.round(tkSealed.length / BENCHMARK_RUNS * 10000) / 10000,
      seal_rate_delta:            Math.round((tkSealed.length - osSealed.length) / BENCHMARK_RUNS * 10000) / 10000,
      greatness_median_topk:      gMedian,
      s_composite_median_oneshot: sMedianOs,
      gain_pct:                   gainPct,
      runs_oneshot:               oneShotRecords.length,
      runs_topk:                  topKReports.length,
      exit_report:                exitReport,
    };

    return { config, runs, summary };
  }
}

// ── ValidationPack writer ─────────────────────────────────────────────────────

export function writeValidationPack(pack: ValidationPack, outputDir: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const head = pack.config.git_head.slice(0, 8);
  const name = `ValidationPack_phase-u_real_${date}_${head}`;
  const dir  = join(outputDir, name);

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(join(dir, 'config.json'),  JSON.stringify(pack.config,   null, 2), 'utf8');
  writeFileSync(join(dir, 'runs.jsonl'),   pack.runs.map(r => JSON.stringify(r)).join('\n'), 'utf8');
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(pack.summary,  null, 2), 'utf8');

  // SHA256SUMS.txt — readFileSync importé en haut (pas de require en ESM)
  const files = ['config.json', 'runs.jsonl', 'summary.json'];
  const sums  = files.map(f => {
    const hash = createHash('sha256').update(readFileSync(join(dir, f))).digest('hex');
    return `${hash}  ${f}`;
  }).join('\n');
  writeFileSync(join(dir, 'SHA256SUMS.txt'), sums, 'utf8');

  return dir;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function injectSeed(input: ForgePacketInput, seed: string): ForgePacketInput {
  // ForgePacketInput a un champ optionnel seeds (ForgeSeeds) — on l'enrichit
  const existing = (input as Record<string, unknown>).seeds as Record<string, unknown> ?? {};
  return { ...input, seeds: { ...existing, generation: seed } } as ForgePacketInput;
}
