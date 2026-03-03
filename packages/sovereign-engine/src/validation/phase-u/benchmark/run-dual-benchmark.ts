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
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalize, sha256 as omegaSha256 } from '@omega/canon-kernel';
import type { SovereignProvider } from '../../../types.js';
import type { ForgePacketInput } from '../../../input/forge-packet-assembler.js';
import { runSovereignForge } from '../../../engine.js';
import { TopKSelectionEngine, generateDistinctSeeds, type KSelectionReport } from '../top-k-selection.js';
import {
  PhaseUExitValidator,
  type OneShotRecord,
  type PhaseUExitReport,
} from '../phase-u-exit-validator.js';
import { GreatnessJudge } from '../greatness-judge.js';
import type { JudgeCache } from '../../../judge-cache.js';
import { GREATNESS_PROMPT_VERSION } from '../greatness-judge.js';

// ── Configuration ─────────────────────────────────────────────────────────────

export const BENCHMARK_K       = 8;   // K=4 si budget serré, K=16 si illimité
export const BENCHMARK_RUNS    = 30;  // paires one-shot / top-K
export const BENCHMARK_VERSION = '1.0.0';

/** Génère 30 base-seeds déterministes à partir d'un root seed */
export function generateBenchmarkSeeds(rootSeed: string, n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    createHash('sha256').update(`${rootSeed}:benchmark:${i}`).digest('hex')
  );
}

// ── Types ValidationPack ──────────────────────────────────────────────────────

export interface BenchmarkConfig {
  readonly version:               string;
  readonly benchmark_runs:        number;
  readonly k:                     number;
  readonly prompt_version:        string;
  readonly git_head:              string;
  readonly provider_model:        string;
  readonly root_seed:             string;
  readonly created_at:            string;
  readonly option:                'A';   // seeds identiques one-shot / top-K
}

export interface RunRecord {
  readonly pair_index:            number;   // 0..29
  readonly mode:                  'one-shot' | 'top-k';
  readonly base_seed:             string;
  readonly input_hash:            string;   // SHA256(canonicalize(input))
  readonly output_hash:           string;   // SHA256(final_prose) ou '' si REJECT
  readonly s_composite:           number;   // score S-Oracle [0,100]
  readonly verdict:               'SEAL' | 'REJECT' | 'ERROR';
  readonly greatness_composite?:  number;   // top-K uniquement, top-1
  readonly error_detail?:         string;
}

export interface BenchmarkSummary {
  readonly seal_rate_oneshot:     number;
  readonly seal_rate_topk:        number;
  readonly seal_rate_delta:       number;
  readonly greatness_median_topk: number;
  readonly s_composite_median_oneshot: number;
  readonly gain_pct:              number;
  readonly runs_oneshot:          number;
  readonly runs_topk:             number;
  readonly exit_report:           PhaseUExitReport;
}

export interface ValidationPack {
  readonly config:   BenchmarkConfig;
  readonly runs:     RunRecord[];
  readonly summary:  BenchmarkSummary;
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
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100
    : sorted[mid];
}

// ── DualBenchmarkRunner ───────────────────────────────────────────────────────

export class DualBenchmarkRunner {
  private readonly topkEngine:  TopKSelectionEngine;
  private readonly exitValidator: PhaseUExitValidator;

  constructor(
    private readonly provider:   SovereignProvider,
    private readonly modelId:    string,
    private readonly apiKey:     string,
    private readonly cache:      JudgeCache,
  ) {
    this.topkEngine   = new TopKSelectionEngine(
      { k: BENCHMARK_K, modelId, apiKey },
      cache,
    );
    this.exitValidator = new PhaseUExitValidator();
  }

  /** Injecte un TopKSelectionEngine custom (pour tests) */
  static withEngine(
    engine: TopKSelectionEngine,
    provider: SovereignProvider,
    modelId: string,
    apiKey: string,
    cache: JudgeCache,
  ): DualBenchmarkRunner {
    const inst = new DualBenchmarkRunner(provider, modelId, apiKey, cache);
    (inst as unknown as { topkEngine: TopKSelectionEngine }).topkEngine = engine;
    return inst;
  }

  /**
   * Exécute le benchmark complet :
   *   - 30 runs one-shot (INV-DB-01 : même inputs)
   *   - 30 runs top-K    (INV-DB-01 : même inputs)
   *   - Produit ValidationPack
   */
  async execute(
    inputs: ForgePacketInput[],   // longueur = BENCHMARK_RUNS (INV-DB-01)
    rootSeed: string,
    gitHead: string,
  ): Promise<ValidationPack> {
    // INV-DB-01 : vérification longueur
    if (inputs.length !== BENCHMARK_RUNS) {
      throw new BenchmarkError(
        'INVALID_INPUT_COUNT',
        `Expected ${BENCHMARK_RUNS} inputs, got ${inputs.length}`,
      );
    }

    // INV-DB-02 : seeds déterministes
    const baseSeeds = generateBenchmarkSeeds(rootSeed, BENCHMARK_RUNS);

    // INV-DB-03 : PROMPT_VERSION figée (vérifiée à l'import)
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

    const runs: RunRecord[] = [];

    // ── Phase 1 : 30 runs one-shot ────────────────────────────────────────────
    const oneShotRecords: OneShotRecord[] = [];

    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const input    = inputs[i];
      const baseSeed = baseSeeds[i];
      // INV-DB-01 : injecter le seed dans l'input
      const seededInput = injectSeed(input, baseSeed);
      const iHash = inputHash(seededInput);

      let record: RunRecord;
      try {
        const result = await runSovereignForge(seededInput, this.provider);
        const oHash  = result.verdict === 'SEAL' ? sha256str(result.final_prose) : '';
        const sComp  = (result.s_score as Record<string, unknown>)?.composite as number ?? 0;

        record = {
          pair_index:   i,
          mode:         'one-shot',
          base_seed:    baseSeed,
          input_hash:   iHash,
          output_hash:  oHash,
          s_composite:  sComp,
          verdict:      result.verdict,
        };
        oneShotRecords.push({ run_id: `os-${i}`, verdict: result.verdict, s_composite: sComp });
      } catch (err) {
        record = {
          pair_index:   i,
          mode:         'one-shot',
          base_seed:    baseSeed,
          input_hash:   iHash,
          output_hash:  '',
          s_composite:  0,
          verdict:      'ERROR',
          error_detail: err instanceof Error ? err.message : String(err),
        };
        oneShotRecords.push({ run_id: `os-${i}`, verdict: 'REJECT', s_composite: 0 });
      }
      runs.push(record);
    }

    // ── Phase 2 : 30 runs top-K ───────────────────────────────────────────────
    const topKReports: KSelectionReport[] = [];

    for (let i = 0; i < BENCHMARK_RUNS; i++) {
      const input    = inputs[i];
      const baseSeed = baseSeeds[i];   // INV-DB-01 : même seed que one-shot
      const iHash    = inputHash(injectSeed(input, baseSeed));

      let record: RunRecord;
      try {
        const report = await this.topkEngine.run(
          input,
          this.provider,
          BENCHMARK_K,
          baseSeed,
        );
        const top1     = report.top1;
        const oHash    = top1.forge_result ? sha256str(top1.forge_result.final_prose) : '';
        const sComp    = (top1.forge_result?.s_score as Record<string, unknown>)?.composite as number ?? 0;
        const gComp    = top1.greatness?.composite ?? 0;

        record = {
          pair_index:          i,
          mode:                'top-k',
          base_seed:           baseSeed,
          input_hash:          iHash,
          output_hash:         oHash,
          s_composite:         sComp,
          verdict:             top1.survived_seal ? 'SEAL' : 'REJECT',
          greatness_composite: gComp,
        };
        topKReports.push(report);
      } catch (err) {
        record = {
          pair_index:   i,
          mode:         'top-k',
          base_seed:    baseSeed,
          input_hash:   iHash,
          output_hash:  '',
          s_composite:  0,
          verdict:      'ERROR',
          error_detail: err instanceof Error ? err.message : String(err),
        };
      }
      runs.push(record);
    }

    // ── Phase 3 : ExitValidator + Summary ────────────────────────────────────
    const exitReport = this.exitValidator.evaluate(topKReports, oneShotRecords);

    const oneShotSealed  = runs.filter(r => r.mode === 'one-shot' && r.verdict === 'SEAL');
    const topKSealed     = runs.filter(r => r.mode === 'top-k'    && r.verdict === 'SEAL');
    const sealRateOs     = oneShotSealed.length / BENCHMARK_RUNS;
    const sealRateTk     = topKSealed.length    / BENCHMARK_RUNS;
    const gComposites    = topKReports
      .filter(r => r.top1.greatness !== undefined)
      .map(r => r.top1_composite);
    const sCompOsSealed  = oneShotSealed.map(r => r.s_composite);
    const gMedian        = median(gComposites);
    const sMedianOs      = median(sCompOsSealed);
    const gainPct        = sMedianOs > 0
      ? Math.round(((gMedian - sMedianOs) / sMedianOs) * 100 * 100) / 100
      : 0;

    const summary: BenchmarkSummary = {
      seal_rate_oneshot:          Math.round(sealRateOs * 10000) / 10000,
      seal_rate_topk:             Math.round(sealRateTk * 10000) / 10000,
      seal_rate_delta:            Math.round((sealRateTk - sealRateOs) * 10000) / 10000,
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

/**
 * Écrit le ValidationPack dans un dossier horodaté.
 * INV-DB-05 : pas de donnée secrète (apiKey jamais écrite).
 * Retourne le chemin du dossier créé.
 */
export function writeValidationPack(
  pack: ValidationPack,
  outputDir: string,
): string {
  const date  = new Date().toISOString().slice(0, 10);
  const head  = pack.config.git_head.slice(0, 8);
  const name  = `ValidationPack_phase-u_real_${date}_${head}`;
  const dir   = join(outputDir, name);

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  // config.json — INV-DB-05 : apiKey absent
  const configSafe = { ...pack.config };
  writeFileSync(join(dir, 'config.json'), JSON.stringify(configSafe, null, 2), 'utf8');

  // runs.jsonl — 1 ligne par run
  const runsJsonl = pack.runs.map(r => JSON.stringify(r)).join('\n');
  writeFileSync(join(dir, 'runs.jsonl'), runsJsonl, 'utf8');

  // summary.json
  writeFileSync(join(dir, 'summary.json'), JSON.stringify(pack.summary, null, 2), 'utf8');

  // SHA256SUMS.txt
  const files = ['config.json', 'runs.jsonl', 'summary.json'];
  const sums  = files.map(f => {
    const content = require('node:fs').readFileSync(join(dir, f));
    const hash    = createHash('sha256').update(content).digest('hex');
    return `${hash}  ${f}`;
  }).join('\n');
  writeFileSync(join(dir, 'SHA256SUMS.txt'), sums, 'utf8');

  return dir;
}

// ── Helper ────────────────────────────────────────────────────────────────────

function injectSeed(input: ForgePacketInput, seed: string): ForgePacketInput {
  return {
    ...input,
    seeds: {
      ...((input as Record<string, unknown>).seeds as object ?? {}),
      generation: seed,
    },
  } as ForgePacketInput;
}
