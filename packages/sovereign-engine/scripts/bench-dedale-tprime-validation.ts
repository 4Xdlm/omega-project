/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DÉDALE BENCH T' VALIDATION (Task #31)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/bench-dedale-tprime-validation.ts
 * Version:  v1 (2026-04-24 — Task #31 validation empirique fix NCR_DEDALE_RESET_HEALTH)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Parent :  commit 28339b2b (NCR_DEDALE_RESET_HEALTH scellé)
 *
 * OBJECTIF
 * ─────────
 * Prouver empiriquement que Dédale en mode `on` (reset effectif, pas shadow)
 * fait chuter le HF rate sur les scènes adversariales T' calibrées.
 *
 * Bench smoke T' shadow (72 runs nuit 2026-04-23/24) a montré :
 *   - 6/6 adv scènes (T'01..T'06) HF rate ∈ [56%, 78%] sur oracle_attempt_1
 *
 * Hypothèse Task #31 :
 *   Avec Dédale ON (reset ACTIF, propagation DedaleResetFailedError),
 *   le verdict final des chunks doit basculer de `hard_fail` vers
 *   `reset_effective` (reset a corrigé la boucle) ou `reset_non_effective`
 *   (reset tenté mais boucle persiste).
 *
 * ATTENDU :
 *   - {no_loop, reset_effective} ≥ 85%  → fix validé
 *   - {reset_non_effective, reset_failed} ≤ 15%  → résidus acceptables
 *
 * PROTOCOLE
 * ─────────
 * - 6 scènes adversariales T' (T'01..T'06, via BENCH_CORPUS_TPRIME)
 * - 5 seeds par scène (A/B/C/D/E) = 30 runs
 * - Dédale mode `on` (reset actif)
 * - Modèle qwen3:32b via Ollama (mêmes params que bench nuit)
 * - Télémétrie Dédale capturée par run (outputs/dedale_telemetry_tprime_validation/)
 * - Parse oracle_attempt_1.verdict + final verdict par chunk
 * - Agrégation par scène + gate PASS/FAIL
 *
 * USAGE :
 *   $env:OMEGA_DEDALE_MODE = "on"
 *   $env:OLLAMA_MODEL = "qwen3:32b"
 *   npx tsx scripts/bench-dedale-tprime-validation.ts
 *
 * SORTIE :
 *   outputs/bench_dedale_tprime_validation/YYYY-MM-DD_HHmmss/
 *     ├── runs.jsonl        — 1 ligne par run
 *     ├── summary.json      — agrégation par scène + gate verdict
 *     └── verdict.md        — rapport humain
 *
 * INVARIANT : ce script NE modifie PAS bench-dedale-night.ts (principe
 * "sable vs béton" — le runner principal reste frozen jusqu'à ce que T' ait
 * définitivement mérité son badge).
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  generateChunkedDraft,
  type ChunkedGenerationInput,
} from '../src/generation/chunked-generator.js';
import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import { BENCH_CORPUS_TPRIME, getAdversarialScenes } from './bench-dedale-tprime-corpus.js';

// ESM-safe __dirname (pattern identique à dryrun-v2b-shadow.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const SEEDS = ['A', 'B', 'C', 'D', 'E'] as const;  // 5 seeds par scène
const BENCH_ID = `BENCH_TPRIME_VALIDATION_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

const PROVIDER_OPTIONS = {
  model: process.env.OLLAMA_MODEL ?? 'qwen3:32b',
  baseUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
  draftTemperature: 0.85,
  judgeTemperature: 0.0,
  draftMaxTokens: 2048,
  judgeMaxTokens: 256,
  repeatPenalty: 1.4,
  frequencyPenalty: 0.6,
  repeatLastN: 256,
} as const;

// Gate verdict (hypothèse Task #31)
const GATE_GREEN_THRESHOLD = 0.85;   // {no_loop, reset_effective} ≥ 85%
const GATE_RED_THRESHOLD = 0.15;     // {reset_non_effective, reset_failed} ≤ 15%

// ──────────────────────────────────────────────────────────────────────────────
// OUTPUT PATHS
// ──────────────────────────────────────────────────────────────────────────────

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const sessionDir = path.resolve(__dirname, '..', 'outputs', 'bench_dedale_tprime_validation', ts);
fs.mkdirSync(sessionDir, { recursive: true });

const runsFile = path.join(sessionDir, 'runs.jsonl');
const summaryFile = path.join(sessionDir, 'summary.json');
const verdictFile = path.join(sessionDir, 'verdict.md');
const telemetryDir = path.join(sessionDir, 'dedale_telemetry');

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

interface RunRecord {
  readonly bench_id: string;
  readonly run_id: string;
  readonly scene_id: string;
  readonly scene_family: string;
  readonly seed_label: string;
  readonly seed_value: string;
  readonly finish_reason: 'ok' | 'error';
  readonly error_msg: string | null;
  readonly duration_ms: number;
  readonly output_words: number;
  readonly output_hash: string;
  readonly chunks_total: number;
  readonly dedale_counts: {
    readonly no_loop: number;
    readonly reset_effective: number;
    readonly reset_non_effective: number;
    readonly reset_failed: number;
  };
  readonly oracle_attempt_1_hard_fail_count: number;
  readonly c5_verdict: string | null;
  readonly ts_start_iso: string;
  readonly ts_end_iso: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

function parseDedaleTelemetry(runTelemetryDir: string): {
  chunks_total: number;
  counts: RunRecord['dedale_counts'];
  oracle_attempt_1_hard_fail_count: number;
  c5_verdict: string | null;
} {
  const counts = { no_loop: 0, reset_effective: 0, reset_non_effective: 0, reset_failed: 0 };
  let oracleA1HF = 0;
  let c5 = null as string | null;
  let chunksTotal = 0;

  if (!fs.existsSync(runTelemetryDir)) {
    return { chunks_total: 0, counts, oracle_attempt_1_hard_fail_count: 0, c5_verdict: null };
  }

  const files = fs.readdirSync(runTelemetryDir);
  const chunksJsonl = files.find((f) => f.endsWith('_chunks.jsonl'));
  const aggregateJson = files.find((f) => f.endsWith('.json') && !f.endsWith('_chunks.jsonl'));

  if (chunksJsonl !== undefined) {
    const content = fs.readFileSync(path.join(runTelemetryDir, chunksJsonl), 'utf8');
    for (const line of content.split('\n').filter((l) => l.trim().startsWith('{'))) {
      try {
        const entry = JSON.parse(line) as {
          verdict?: keyof typeof counts;
          oracle_attempt_1?: { verdict?: string };
        };
        chunksTotal += 1;
        if (entry.verdict && entry.verdict in counts) counts[entry.verdict] += 1;
        if (entry.oracle_attempt_1?.verdict === 'hard_fail') oracleA1HF += 1;
      } catch { /* skip */ }
    }
  }

  if (aggregateJson !== undefined) {
    try {
      const agg = JSON.parse(fs.readFileSync(path.join(runTelemetryDir, aggregateJson), 'utf8')) as {
        c5_verdict?: string;
      };
      c5 = agg.c5_verdict ?? null;
    } catch { /* skip */ }
  }

  return { chunks_total: chunksTotal, counts, oracle_attempt_1_hard_fail_count: oracleA1HF, c5_verdict: c5 };
}

async function runOne(scene: ReturnType<typeof getAdversarialScenes>[number], seedLabel: string, runIdx: number, totalRuns: number): Promise<RunRecord> {
  const runId = `${BENCH_ID}_${scene.id.replace("'", 'p')}_${seedLabel}`;
  const seedValue = `${BENCH_ID}_${scene.id}_${seedLabel}`;
  const runTelemetryDir = path.join(telemetryDir, `${scene.id.replace("'", 'p')}_${seedLabel}`);
  fs.mkdirSync(runTelemetryDir, { recursive: true });

  process.env.OMEGA_DEDALE_MODE = 'on';
  process.env.OMEGA_DEDALE_TELEMETRY_DIR = runTelemetryDir;
  process.env.OMEGA_ADAPTIVE_CHUNKING = '1';
  process.env.OMEGA_PROVIDER = 'ollama';

  const provider = createOllamaProvider(PROVIDER_OPTIONS);
  const input: ChunkedGenerationInput = {
    sceneBrief: scene.sceneBrief,
    signatureWords: scene.signatureWords,
    language: scene.language,
    seed: seedValue,
    emotionContract: scene.emotionContract,
  };

  const tsStart = new Date();
  const tStart = Date.now();
  console.log(`[${runIdx}/${totalRuns}] scene=${scene.id} seed=${seedLabel} (Dédale=ON) ...`);

  let finishReason: RunRecord['finish_reason'] = 'ok';
  let errorMsg: string | null = null;
  let outputWords = 0;
  let outputHash = '';

  try {
    const result = await generateChunkedDraft(input, provider);
    outputWords = result.total_words;
    outputHash = sha256(result.prose).slice(0, 16);
  } catch (err) {
    finishReason = 'error';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const tsEnd = new Date();
  const durationMs = Date.now() - tStart;
  const telem = parseDedaleTelemetry(runTelemetryDir);

  const total = Math.max(telem.chunks_total, 1);
  const greenPct = (telem.counts.no_loop + telem.counts.reset_effective) / total;
  const tag = finishReason === 'ok' ? `${(greenPct * 100).toFixed(0)}% green` : `ERR: ${errorMsg?.slice(0, 50)}`;
  console.log(`  → ${finishReason} words=${outputWords} dur=${Math.round(durationMs / 1000)}s chunks=${telem.chunks_total} counts=${JSON.stringify(telem.counts)} ${tag}`);

  return {
    bench_id: BENCH_ID,
    run_id: runId,
    scene_id: scene.id,
    scene_family: scene.family,
    seed_label: seedLabel,
    seed_value: seedValue,
    finish_reason: finishReason,
    error_msg: errorMsg,
    duration_ms: durationMs,
    output_words: outputWords,
    output_hash: outputHash,
    chunks_total: telem.chunks_total,
    dedale_counts: telem.counts,
    oracle_attempt_1_hard_fail_count: telem.oracle_attempt_1_hard_fail_count,
    c5_verdict: telem.c5_verdict,
    ts_start_iso: tsStart.toISOString(),
    ts_end_iso: tsEnd.toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const scenes = getAdversarialScenes();  // T'01..T'06
  const totalRuns = scenes.length * SEEDS.length;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' OMEGA — DÉDALE BENCH T\' VALIDATION (Task #31)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Model            : ${PROVIDER_OPTIONS.model}`);
  console.log(`Ollama URL       : ${PROVIDER_OPTIONS.baseUrl}`);
  console.log(`Dédale mode      : ON (reset actif)`);
  console.log(`Scènes adv       : ${scenes.length} (${scenes.map((s) => s.id).join(', ')})`);
  console.log(`Seeds/scène      : ${SEEDS.length} (${SEEDS.join(', ')})`);
  console.log(`Total runs       : ${totalRuns}`);
  console.log(`Wall-time estimé : ~${Math.round(totalRuns * 100 / 60)} min`);
  console.log(`Session dir      : ${sessionDir}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const tBench = Date.now();
  const allRecords: RunRecord[] = [];
  let runIdx = 0;

  for (const scene of scenes) {
    for (const seedLabel of SEEDS) {
      runIdx += 1;
      const rec = await runOne(scene, seedLabel, runIdx, totalRuns);
      allRecords.push(rec);
      fs.appendFileSync(runsFile, JSON.stringify(rec) + '\n', 'utf8');
    }
  }

  const benchMin = Math.round((Date.now() - tBench) / 60000);
  console.log(`\n[TOTAL] ${runIdx} runs en ${benchMin} min\n`);

  // ─── Agrégation par scène ───
  const perScene: Record<string, {
    runs: number;
    chunks: number;
    counts: RunRecord['dedale_counts'];
    oracle_a1_hf: number;
    green_pct: number;
    red_pct: number;
  }> = {};

  for (const scene of scenes) {
    const sceneRecords = allRecords.filter((r) => r.scene_id === scene.id);
    const chunks = sceneRecords.reduce((s, r) => s + r.chunks_total, 0);
    const counts = sceneRecords.reduce(
      (acc, r) => ({
        no_loop: acc.no_loop + r.dedale_counts.no_loop,
        reset_effective: acc.reset_effective + r.dedale_counts.reset_effective,
        reset_non_effective: acc.reset_non_effective + r.dedale_counts.reset_non_effective,
        reset_failed: acc.reset_failed + r.dedale_counts.reset_failed,
      }),
      { no_loop: 0, reset_effective: 0, reset_non_effective: 0, reset_failed: 0 },
    );
    const oracleA1HF = sceneRecords.reduce((s, r) => s + r.oracle_attempt_1_hard_fail_count, 0);
    const total = Math.max(chunks, 1);
    const green = (counts.no_loop + counts.reset_effective) / total;
    const red = (counts.reset_non_effective + counts.reset_failed) / total;
    perScene[scene.id] = {
      runs: sceneRecords.length,
      chunks,
      counts,
      oracle_a1_hf: oracleA1HF,
      green_pct: green,
      red_pct: red,
    };
  }

  // ─── Global ───
  const globalChunks = Object.values(perScene).reduce((s, v) => s + v.chunks, 0);
  const globalCounts = Object.values(perScene).reduce(
    (acc, v) => ({
      no_loop: acc.no_loop + v.counts.no_loop,
      reset_effective: acc.reset_effective + v.counts.reset_effective,
      reset_non_effective: acc.reset_non_effective + v.counts.reset_non_effective,
      reset_failed: acc.reset_failed + v.counts.reset_failed,
    }),
    { no_loop: 0, reset_effective: 0, reset_non_effective: 0, reset_failed: 0 },
  );
  const globalOracleA1HF = Object.values(perScene).reduce((s, v) => s + v.oracle_a1_hf, 0);
  const globalGreen = (globalCounts.no_loop + globalCounts.reset_effective) / Math.max(globalChunks, 1);
  const globalRed = (globalCounts.reset_non_effective + globalCounts.reset_failed) / Math.max(globalChunks, 1);

  const gate_pass = globalGreen >= GATE_GREEN_THRESHOLD && globalRed <= GATE_RED_THRESHOLD;

  // ─── Display tableau ───
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' AGRÉGATION PAR SCÈNE');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`${'scene'.padEnd(6)} ${'chunks'.padStart(7)} ${'no_loop'.padStart(8)} ${'reset_eff'.padStart(10)} ${'reset_ne'.padStart(9)} ${'reset_fail'.padStart(10)} ${'green%'.padStart(8)} ${'oracle_a1_hf'.padStart(13)}`);
  console.log('-'.repeat(90));
  for (const scene of scenes) {
    const v = perScene[scene.id];
    const c = v.counts;
    console.log(`${scene.id.padEnd(6)} ${String(v.chunks).padStart(7)} ${String(c.no_loop).padStart(8)} ${String(c.reset_effective).padStart(10)} ${String(c.reset_non_effective).padStart(9)} ${String(c.reset_failed).padStart(10)} ${(v.green_pct * 100).toFixed(1).padStart(7)}% ${String(v.oracle_a1_hf).padStart(13)}`);
  }
  console.log('-'.repeat(90));
  console.log(`${'TOTAL'.padEnd(6)} ${String(globalChunks).padStart(7)} ${String(globalCounts.no_loop).padStart(8)} ${String(globalCounts.reset_effective).padStart(10)} ${String(globalCounts.reset_non_effective).padStart(9)} ${String(globalCounts.reset_failed).padStart(10)} ${(globalGreen * 100).toFixed(1).padStart(7)}% ${String(globalOracleA1HF).padStart(13)}`);
  console.log();
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' GATE VALIDATION FIX NCR_DEDALE_RESET_HEALTH');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Green rate (no_loop + reset_effective) : ${(globalGreen * 100).toFixed(1)}%  (gate ≥ ${(GATE_GREEN_THRESHOLD * 100).toFixed(0)}%)`);
  console.log(`Red rate (reset_non_eff + reset_fail)   : ${(globalRed * 100).toFixed(1)}%  (gate ≤ ${(GATE_RED_THRESHOLD * 100).toFixed(0)}%)`);
  console.log(`Oracle attempt_1 hard_fail (info)       : ${globalOracleA1HF} / ${globalChunks} chunks`);
  console.log();
  if (gate_pass) {
    console.log('[VERDICT] TASK #31 = PASS ✅ Fix NCR_DEDALE_RESET_HEALTH validé empiriquement');
  } else {
    console.log('[VERDICT] TASK #31 = FAIL ❌ Fix insuffisant — investigation requise');
  }

  // ─── Summary JSON ───
  const summary = {
    bench_id: BENCH_ID,
    ts_start: allRecords[0]?.ts_start_iso,
    ts_end: allRecords[allRecords.length - 1]?.ts_end_iso,
    total_runs: runIdx,
    total_duration_min: benchMin,
    model: PROVIDER_OPTIONS.model,
    dedale_mode: 'on',
    per_scene: perScene,
    global: {
      chunks_total: globalChunks,
      counts: globalCounts,
      oracle_a1_hf: globalOracleA1HF,
      green_pct: globalGreen,
      red_pct: globalRed,
    },
    gate: {
      green_threshold: GATE_GREEN_THRESHOLD,
      red_threshold: GATE_RED_THRESHOLD,
      pass: gate_pass,
    },
  };
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

  // ─── Verdict markdown ───
  const md = [
    `# BENCH DÉDALE T' VALIDATION — ${BENCH_ID}`,
    '',
    `**Date** : ${new Date().toISOString()}`,
    `**Runs** : ${runIdx} (${scenes.length} scènes × ${SEEDS.length} seeds)`,
    `**Modèle** : ${PROVIDER_OPTIONS.model}`,
    `**Durée** : ${benchMin} min`,
    `**Parent** : commit 28339b2b (NCR_DEDALE_RESET_HEALTH scellé)`,
    '',
    '## Résultats globaux',
    '',
    `- Chunks totaux : ${globalChunks}`,
    `- no_loop : ${globalCounts.no_loop} (${((globalCounts.no_loop / globalChunks) * 100).toFixed(1)}%)`,
    `- reset_effective : ${globalCounts.reset_effective} (${((globalCounts.reset_effective / globalChunks) * 100).toFixed(1)}%)`,
    `- reset_non_effective : ${globalCounts.reset_non_effective} (${((globalCounts.reset_non_effective / globalChunks) * 100).toFixed(1)}%)`,
    `- reset_failed : ${globalCounts.reset_failed} (${((globalCounts.reset_failed / globalChunks) * 100).toFixed(1)}%)`,
    `- Green rate : **${(globalGreen * 100).toFixed(1)}%** (gate ≥ ${(GATE_GREEN_THRESHOLD * 100).toFixed(0)}%)`,
    `- Red rate : **${(globalRed * 100).toFixed(1)}%** (gate ≤ ${(GATE_RED_THRESHOLD * 100).toFixed(0)}%)`,
    '',
    `## VERDICT : ${gate_pass ? '**PASS ✅**' : '**FAIL ❌**'}`,
    '',
    gate_pass ? '**Fix NCR_DEDALE_RESET_HEALTH validé empiriquement.**' : '**Fix insuffisant — investigation requise.**',
    '',
  ].join('\n');
  fs.writeFileSync(verdictFile, md, 'utf8');

  console.log(`\n[OUTPUT] Runs JSONL : ${runsFile}`);
  console.log(`[OUTPUT] Summary    : ${summaryFile}`);
  console.log(`[OUTPUT] Verdict MD : ${verdictFile}`);

  process.exit(gate_pass ? 0 : 1);
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(2);
});
