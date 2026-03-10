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
import type { MacroSScore } from '../../../oracle/s-score.js';
import { SOVEREIGN_CONFIG } from '../../../config.js';
import {
  shouldApplyPolish,
  applyPolishPass,
  verifyAxesStability,
  type PolishAxesSnapshot,
} from '../polish-engine.js';
import { judgeAestheticV3 } from '../../../oracle/aesthetic-oracle.js';

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

export interface MacroAxesDetail {
  readonly ecc:  number;
  readonly rci:  number;
  readonly sii:  number;
  readonly ifi:  number;
  readonly aai:  number;
  readonly min_axis: number;
}

export interface SubAxesDetail {
  readonly rci_parts: Record<string, number>; // rhythm/signature/hook_presence/euphony/voice_conformity
  readonly sii_parts: Record<string, number>; // anti_cliche/necessity/metaphor_novelty
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
  // U-LOG-AXES-01: telemetry
  readonly macro_axes?:          MacroAxesDetail;
  readonly sub_axes?:            SubAxesDetail;
  readonly gate_fail_reasons?:   string[]; // INV-LOG-01: non-vide si REJECT
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

// ── U-LOG-AXES-01: telemetry extractors ─────────────────────────────────────

function extractMacroDetail(macroScore: MacroSScore | null | undefined): MacroAxesDetail | undefined {
  if (!macroScore?.macro_axes) return undefined;
  const m = macroScore.macro_axes;
  return {
    ecc:      Math.round(m.ecc.score  * 10) / 10,
    rci:      Math.round(m.rci.score  * 10) / 10,
    sii:      Math.round(m.sii.score  * 10) / 10,
    ifi:      Math.round(m.ifi.score  * 10) / 10,
    aai:      Math.round(m.aai.score  * 10) / 10,
    min_axis: Math.round(macroScore.min_axis * 10) / 10,
  };
}

function extractSubAxes(macroScore: MacroSScore | null | undefined): SubAxesDetail | undefined {
  if (!macroScore?.macro_axes) return undefined;
  const m = macroScore.macro_axes;
  const toParts = (subScores: readonly { name: string; score: number }[]) =>
    Object.fromEntries(subScores.map(s => [s.name, Math.round(s.score * 10) / 10]));
  return {
    rci_parts: toParts(m.rci.sub_scores as { name: string; score: number }[]),
    sii_parts: toParts(m.sii.sub_scores as { name: string; score: number }[]),
  };
}

function extractGateFailReasons(macroScore: MacroSScore | null | undefined, verdict: string): string[] {
  if (verdict !== 'REJECT' && verdict !== 'PITCH') return [];
  if (!macroScore?.macro_axes) return ['macro_score=N/A'];
  const reasons: string[] = [];
  const m  = macroScore.macro_axes;
  const cfg = SOVEREIGN_CONFIG;
  if (macroScore.composite < cfg.ZONES.GREEN.min_composite)
    reasons.push(`composite=${macroScore.composite.toFixed(1)}<${cfg.ZONES.GREEN.min_composite}`);
  if (macroScore.min_axis  < cfg.ZONES.GREEN.min_axis)
    reasons.push(`min_axis=${macroScore.min_axis.toFixed(1)}<${cfg.ZONES.GREEN.min_axis}`);
  if (m.ecc.score < cfg.MACRO_FLOORS.ecc)
    reasons.push(`ecc=${m.ecc.score.toFixed(1)}<floor_${cfg.MACRO_FLOORS.ecc}`);
  if (m.rci.score < cfg.MACRO_FLOORS.rci)
    reasons.push(`rci=${m.rci.score.toFixed(1)}<floor_${cfg.MACRO_FLOORS.rci}`);
  if (m.sii.score < cfg.MACRO_FLOORS.sii)
    reasons.push(`sii=${m.sii.score.toFixed(1)}<floor_${cfg.MACRO_FLOORS.sii}`);
  if (m.ifi.score < cfg.MACRO_FLOORS.ifi)
    reasons.push(`ifi=${m.ifi.score.toFixed(1)}<floor_${cfg.MACRO_FLOORS.ifi}`);
  if (m.aai.score < cfg.MACRO_FLOORS.aai)
    reasons.push(`aai=${m.aai.score.toFixed(1)}<floor_${cfg.MACRO_FLOORS.aai}`);
  return reasons.length > 0 ? reasons : ['REJECT:unknown'];
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
  private readonly k:             number;

  constructor(
    private readonly provider: SovereignProvider,
    private readonly modelId:  string,
    private readonly apiKey:   string,
    private readonly cache:    JudgeCache,
    k: number = BENCHMARK_K,
  ) {
    this.k            = k;
    this.topkEngine   = new TopKSelectionEngine({ k, modelId, apiKey }, cache);
    this.exitValidator = new PhaseUExitValidator();
  }

  async execute(
    inputs:   ForgePacketInput[],
    rootSeed: string,
    gitHead:  string,
  ): Promise<ValidationPack> {
    const nRuns = inputs.length;
    if (nRuns === 0) {
      throw new BenchmarkError('INVALID_INPUT_COUNT', 'inputs array is empty');
    }

    const baseSeeds = generateBenchmarkSeeds(rootSeed, nRuns);

    const config: BenchmarkConfig = {
      version:        BENCHMARK_VERSION,
      benchmark_runs: nRuns,
      k:              this.k,
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

    // ── Phase 1 : one-shot ────────────────────────────────────────────────
    for (let i = 0; i < nRuns; i++) {
      const baseSeed    = baseSeeds[i];
      const seededInput = injectSeed(inputs[i], baseSeed);
      const iHash       = inputHash(seededInput);

      process.stdout.write(`[ONE-SHOT ${i + 1}/${nRuns}] ... `);

      let record: RunRecord;
      try {
        const result      = await runSovereignForge(seededInput, this.provider);
        const sComp        = typeof result.s_score?.composite === 'number' ? result.s_score.composite : 0;
        const oHash        = result.verdict === 'SEAL' ? sha256str(result.final_prose) : '';
        const macroDetail  = extractMacroDetail(result.macro_score);
        const subAxes      = extractSubAxes(result.macro_score);
        const gateReasons  = extractGateFailReasons(result.macro_score, result.verdict);

        // Console: macro axes
        const axesLog = macroDetail
          ? `ecc=${macroDetail.ecc} | rci=${macroDetail.rci} | sii=${macroDetail.sii} | ifi=${macroDetail.ifi} | aai=${macroDetail.aai}`
          : 'macro_axes=N/A';
        // Console: RCI sub-axes
        const rciLog = subAxes?.rci_parts
          ? '  RCI: ' + Object.entries(subAxes.rci_parts).map(([k,v]) => `${k}=${v}`).join(' | ')
          : '';
        // Console: SII sub-axes
        const siiLog = subAxes?.sii_parts
          ? '  SII: ' + Object.entries(subAxes.sii_parts).map(([k,v]) => `${k}=${v}`).join(' | ')
          : '';
        // Console: gate reasons
        const gateLog = gateReasons.length > 0 ? '  GATE: ' + gateReasons.join(', ') : '';

        record = {
          pair_index: i, mode: 'one-shot', base_seed: baseSeed,
          input_hash: iHash, output_hash: oHash,
          s_composite: sComp, verdict: result.verdict,
          macro_axes:       macroDetail,
          sub_axes:         subAxes,
          gate_fail_reasons: gateReasons,
        };
        oneShotRecords.push({ run_id: `os-${i}`, verdict: result.verdict, s_composite: sComp });
        console.log(`${result.verdict} (s=${sComp.toFixed(1)}) | ${axesLog}`);
        if (rciLog)  console.log(rciLog);
        if (siiLog)  console.log(siiLog);
        if (gateLog) console.log(gateLog);
      } catch (err) {
        // CreditExhaustedError — propagate immediately, do not swallow
        if (err instanceof Error && err.name === 'CreditExhaustedError') throw err;
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

    // ── Phase 2 : top-K ────────────────────────────────────────────────────────
    for (let i = 0; i < nRuns; i++) {
      const baseSeed = baseSeeds[i];
      const iHash    = inputHash(injectSeed(inputs[i], baseSeed));

      process.stdout.write(`[TOP-K ${i + 1}/${nRuns}] K=${this.k} ... `);

      let record: RunRecord;
      try {
        const report = await this.topkEngine.run(inputs[i], this.provider, this.k, baseSeed);
        const top1   = report.top1;
        const sScore = top1.forge_result?.s_score as { composite?: number } | undefined;
        const sComp  = typeof sScore?.composite === 'number' ? sScore.composite : 0;
        const oHash  = top1.forge_result ? sha256str(top1.forge_result.final_prose) : '';
        const gComp  = top1.greatness?.composite ?? 0;

        // ── U-ROSETTE-10: Polish Engine sur le champion Top-K ───────────────────────────────
        // Conditions : champion n'est pas SEAL, composite >= 89, forge_packet disponible
        let polishedVerdict: 'SEAL' | 'REJECT' = top1.survived_seal ? 'SEAL' : 'REJECT';
        let polishedComposite = sComp;
        let polishedOutputHash = oHash;
        let polishLog = '';

        const forgeResult = top1.forge_result;
        const macroAxes = forgeResult?.macro_score?.macro_axes;
        const forgePacket = forgeResult?.forge_packet;

        if (!top1.survived_seal && forgeResult && macroAxes && forgePacket) {
          const axesBefore: PolishAxesSnapshot = {
            composite: sComp,
            ecc:  macroAxes.ecc.score,
            rci:  macroAxes.rci.score,
            sii:  macroAxes.sii.score,
            ifi:  macroAxes.ifi.score,
            aai:  macroAxes.aai.score,
            metaphor_novelty: (() => {
              const siiSub = macroAxes.sii.sub_scores as { name: string; score: number }[];
              return siiSub.find(s => s.name === 'metaphor_novelty')?.score ?? 70;
            })(),
            necessity: (() => {
              const siiSub = macroAxes.sii.sub_scores as { name: string; score: number }[];
              return siiSub.find(s => s.name === 'necessity')?.score ?? 85;
            })(),
            anti_cliche: (() => {
              const siiSub = macroAxes.sii.sub_scores as { name: string; score: number }[];
              return siiSub.find(s => s.name === 'anti_cliche')?.score ?? 90;
            })(),
          };

          const decision = shouldApplyPolish(axesBefore);
          if (decision.should_polish) {
            process.stdout.write(`  [POLISH] ${decision.reason} ... `);
            try {
              const polishResult = await applyPolishPass(
                forgeResult.final_prose, axesBefore, this.provider, 1,
                `polish-topk-${i}-${baseSeed.slice(0, 8)}`,
                decision.target_axis ?? 'sii',  // INV-PE-09: ciblage dynamique
              );

              if (polishResult.status === 'POLISHED') {
                // Rescorer la prose polie avec judgeAestheticV3
                const rescored = await judgeAestheticV3(
                  forgePacket, polishResult.polished_prose, this.provider,
                  forgeResult.symbol_map, forgeResult.physics_audit,
                );

                const axesAfter: PolishAxesSnapshot = {
                  composite: rescored.composite,
                  ecc: rescored.macro_axes?.ecc.score ?? axesBefore.ecc,
                  rci: rescored.macro_axes?.rci.score ?? axesBefore.rci,
                  sii: rescored.macro_axes?.sii.score ?? axesBefore.sii,
                  ifi: rescored.macro_axes?.ifi.score ?? axesBefore.ifi,
                  aai: rescored.macro_axes?.aai.score ?? axesBefore.aai,
                  metaphor_novelty: (() => {
                    const sub = rescored.macro_axes?.sii.sub_scores as { name: string; score: number }[] | undefined;
                    return sub?.find(s => s.name === 'metaphor_novelty')?.score ?? axesBefore.metaphor_novelty;
                  })(),
                  necessity: axesBefore.necessity,
                  anti_cliche: axesBefore.anti_cliche,
                };

                const stability = verifyAxesStability(axesBefore, axesAfter);

                if (stability.stability_ok && rescored.composite > sComp) {
                  polishedComposite = rescored.composite;
                  polishedOutputHash = createHash('sha256').update(polishResult.polished_prose).digest('hex');
                  polishedVerdict = (rescored.verdict === 'SEAL') ? 'SEAL' : 'REJECT';
                  polishLog = ` | POLISH=ACCEPTED composite=${sComp.toFixed(1)}→${polishedComposite.toFixed(1)} sii=${axesBefore.sii.toFixed(1)}→${axesAfter.sii.toFixed(1)}`;
                } else {
                  polishLog = ` | POLISH=REJECTED_${stability.stability_ok ? 'NO_GAIN' : 'REGRESSION'} axes=[${stability.failed_axes.join(',')}]`;
                }
              } else {
                polishLog = ` | POLISH=${polishResult.status}`;
              }
            } catch (polishErr) {
              // FAIL-CLOSED : erreur polish non bloquante
              polishLog = ` | POLISH=FAIL_INFRA:${String(polishErr).slice(0, 60)}`;
            }
          } else {
            polishLog = ` | POLISH=NO_OP:${decision.reason.slice(0, 80)}`;
          }
        }
        // ── Fin Polish Engine ────────────────────────────────────────────────────────────────

        record = {
          pair_index: i, mode: 'top-k', base_seed: baseSeed,
          input_hash: iHash, output_hash: polishedOutputHash,
          s_composite: polishedComposite, verdict: polishedVerdict,
          greatness_composite: gComp,
        };
        topKReports.push(report);
        // FIX-K-LOG: use this.k (runtime value) not BENCHMARK_K (hardcoded 8).
        // In BENCH_MICRO mode K=3 → was showing survivors=X/8, now shows X/3.
        // Also surface k_candidates for U-ROSETTE-02 diagnostics.
        console.log(`${polishedVerdict} (g=${gComp.toFixed(1)}, candidates=${report.k_candidates}/${this.k}, survivors=${report.k_survived_seal}/${this.k})${polishLog}`);
      } catch (err) {
        // CreditExhaustedError — propagate immediately, do not swallow
        if (err instanceof Error && err.name === 'CreditExhaustedError') throw err;
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
          ? `REJECT (0/${this.k} survived SEAL)`
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
      seal_rate_oneshot:          Math.round(osSealed.length / nRuns * 10000) / 10000,
      seal_rate_topk:             Math.round(tkSealed.length / nRuns * 10000) / 10000,
      seal_rate_delta:            Math.round((tkSealed.length - osSealed.length) / nRuns * 10000) / 10000,
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
