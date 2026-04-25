/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — BENCH ANAPHORE GATE β (calibration métrique opening_repetition_rate)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/bench-anaphore-gate-beta.ts
 * Version:  v1 (2026-04-25 — bench Anaphore Gate Option β post-finding mode '1' inerte)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Parent :  commit 9859659d (engine.ts WIP Anaphore Gate scellé shadow default)
 * Spec :    OMEGA/outputs/BENCH_ANAPHORE_GATE_BETA_SPEC_DRAFT.md (amendé ChatGPT)
 *
 * OBJECTIF (Option β)
 * ───────────────────
 * Calibrer la métrique `opening_repetition_rate` (delta-style.ts:160-175) et
 * son seuil `SOVEREIGN_CONFIG.OPENING_REPETITION_MAX = 0.10` AVANT toute
 * implémentation REJECT réelle (Option α future).
 *
 * Question scientifique principale : la métrique est-elle un radar fiable ?
 *   - (a) Discrimine-t-elle adversariales vs canoniques ?
 *   - (b) Le seuil 0.10 est-il calibré (pas trop sensible aux canoniques) ?
 *   - (c) Stable inter-seeds ?
 *
 * PROTOCOLE
 * ─────────
 * - 12 scènes (6 adv + 4 canon + 2 borderline) via BENCH_CORPUS_ANAPHORE
 * - 2 modes Anaphore Gate : '0' (off, baseline strict) + 'shadow' (gate logue)
 * - 3 seeds par scène (A, B, C)
 * - Total : 2 × 12 × 3 = 72 runs
 * - Modèle qwen3:32b via Ollama (avec keep_alive 24h post-F-T31-1)
 * - Métrique calculée directement (duplicate detectOpeningRepetition pour autonomie)
 * - SHA256 prose pour B5 NO-OP runtime check
 *
 * CRITÈRES PASS (multi-critère, amendé ChatGPT 2026-04-25)
 * ────────────────────────────────────────────────────────
 * - B1 : mean(adv) - mean(canon) ≥ +0.05
 * - B2 : mean(borderline) strictement entre mean(canon) et mean(adv)
 * - B3 : faux positifs canon (EXCEEDED) ≤ 1/24 sur 24 runs canon agrégés
 * - B4 : CV (coef. variation) inter-seeds par famille ≤ 0.30
 * - B5 : sha256(post_prose) identique mode '0' vs 'shadow' pour chaque (scene, seed) — 0/36 paires divergentes
 *
 * USAGE :
 *   $env:OLLAMA_MODEL = "qwen3:32b"
 *   $env:OLLAMA_KEEP_ALIVE = "24h"
 *   npx tsx scripts/bench-anaphore-gate-beta.ts
 *
 * SORTIE :
 *   outputs/bench_anaphore_gate_beta/YYYY-MM-DD_HHmmss/
 *     ├── runs.jsonl        — 72 lignes
 *     ├── summary.json      — agrégation par mode×classe + verdicts B1-B5
 *     └── verdict.md        — rapport humain
 *
 * INVARIANT : ce script NE modifie PAS le pipeline OMEGA. Il consomme uniquement
 * generateChunkedDraft + une duplication locale de detectOpeningRepetition.
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
import {
  BENCH_CORPUS_ANAPHORE,
  type BenchSceneAnaphore,
  type AnaphoreClass,
} from './bench-anaphore-corpus.js';

// ESM-safe __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const SEEDS = ['A', 'B', 'C'] as const;
const MODES = ['0', 'shadow'] as const;
const BENCH_ID = `BENCH_ANAPHORE_BETA_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;

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

// SOVEREIGN_CONFIG.OPENING_REPETITION_MAX = 0.10 (config.ts:150)
const OPENING_REPETITION_THRESHOLD = 0.10;

// Critères PASS (cf. spec amendée)
const B1_DELTA_THRESHOLD = 0.05;       // mean(adv) - mean(canon) ≥ 0.05
const B3_FP_MAX_COUNT = 1;              // ≤ 1/24 runs canon EXCEEDED
const B4_CV_MAX = 0.30;                 // CV ≤ 0.30 par famille
const B5_DIVERGENCE_MAX = 0;            // 0 paires divergentes mode 0 vs shadow

// ──────────────────────────────────────────────────────────────────────────────
// OUTPUT PATHS
// ──────────────────────────────────────────────────────────────────────────────

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const sessionDir = path.resolve(__dirname, '..', 'outputs', 'bench_anaphore_gate_beta', ts);
fs.mkdirSync(sessionDir, { recursive: true });

const runsFile = path.join(sessionDir, 'runs.jsonl');
const summaryFile = path.join(sessionDir, 'summary.json');
const verdictFile = path.join(sessionDir, 'verdict.md');

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

interface RunRecord {
  readonly bench_id: string;
  readonly run_id: string;
  readonly scene_id: string;
  readonly scene_family: string;
  readonly anaphore_class: AnaphoreClass;
  readonly mode: typeof MODES[number];
  readonly seed_label: string;
  readonly seed_value: string;
  readonly finish_reason: 'ok' | 'error';
  readonly error_msg: string | null;
  readonly duration_ms: number;
  readonly output_words: number;
  readonly sentences_count: number;
  readonly opening_repetition_rate: number;
  readonly exceeded_threshold: boolean;
  readonly post_prose_sha256: string;
  readonly ts_start_iso: string;
  readonly ts_end_iso: string;
}

interface SceneStats {
  readonly scene_id: string;
  readonly anaphore_class: AnaphoreClass;
  readonly mean_opening_rep: number;
  readonly cv_inter_seeds: number;
  readonly exceeded_count: number;
  readonly runs_count: number;
}

interface ClassStats {
  readonly mean: number;
  readonly std: number;
  readonly cv: number;
  readonly exceeded_count: number;
  readonly total_runs: number;
}

interface GateVerdict {
  readonly id: 'B1' | 'B2' | 'B3' | 'B4' | 'B5';
  readonly description: string;
  readonly observed: string;
  readonly threshold: string;
  readonly pass: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS — métrique dupliquée pour autonomie
// ──────────────────────────────────────────────────────────────────────────────

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/** Duplique detectOpeningRepetition de delta-style.ts:160-175 pour autonomie. */
function computeOpeningRepetitionRate(prose: string): { rate: number; sentencesCount: number } {
  const sentences = prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sentences.length === 0) return { rate: 0, sentencesCount: 0 };

  const firstWords = sentences.map((s) => {
    const words = s.trim().split(/\s+/);
    return words[0]?.toLowerCase() ?? '';
  }).filter((w) => w.length > 0);

  if (firstWords.length === 0) return { rate: 0, sentencesCount: sentences.length };

  const wordCounts: Record<string, number> = {};
  for (const word of firstWords) {
    wordCounts[word] = (wordCounts[word] ?? 0) + 1;
  }

  const maxCount = Math.max(...Object.values(wordCounts));
  return { rate: maxCount / firstWords.length, sentencesCount: sentences.length };
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function stdDev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const mu = mean(values);
  const variance = values.reduce((sum, v) => sum + (v - mu) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function cv(values: readonly number[]): number {
  const mu = mean(values);
  if (mu === 0) return 0;
  return stdDev(values) / mu;
}

// ──────────────────────────────────────────────────────────────────────────────
// EXECUTION
// ──────────────────────────────────────────────────────────────────────────────

async function runOne(
  scene: BenchSceneAnaphore,
  mode: typeof MODES[number],
  seedLabel: string,
  runIdx: number,
  totalRuns: number,
): Promise<RunRecord> {
  const runId = `${BENCH_ID}_${scene.id}_${mode}_${seedLabel}`;
  const seedValue = `${BENCH_ID}_${scene.id}_${seedLabel}`;  // Identique pour mode 0 et shadow → assure prose identique théorique

  process.env.OMEGA_ANAPHORE_GATE = mode;
  process.env.OMEGA_ADAPTIVE_CHUNKING = '1';
  process.env.OMEGA_PROVIDER = 'ollama';
  // Désactiver Dédale (hors scope ce bench)
  process.env.OMEGA_DEDALE_MODE = '0';

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
  console.log(`[${runIdx}/${totalRuns}] scene=${scene.id} class=${scene.anaphoreClass} mode=${mode} seed=${seedLabel} ...`);

  let finishReason: RunRecord['finish_reason'] = 'ok';
  let errorMsg: string | null = null;
  let outputWords = 0;
  let proseSha256 = '';
  let openingRep = 0;
  let sentencesCount = 0;

  try {
    const result = await generateChunkedDraft(input, provider);
    outputWords = result.total_words;
    proseSha256 = sha256(result.prose);
    const metric = computeOpeningRepetitionRate(result.prose);
    openingRep = metric.rate;
    sentencesCount = metric.sentencesCount;
  } catch (err) {
    finishReason = 'error';
    errorMsg = err instanceof Error ? err.message : String(err);
  }

  const tsEnd = new Date();
  const durationMs = Date.now() - tStart;
  const exceeded = openingRep > OPENING_REPETITION_THRESHOLD;
  const tag = finishReason === 'ok'
    ? `opening_rep=${(openingRep * 100).toFixed(1)}% sentences=${sentencesCount} ${exceeded ? 'EXCEEDED' : 'OK'}`
    : `ERR: ${errorMsg?.slice(0, 50)}`;
  console.log(`  → ${finishReason} words=${outputWords} dur=${Math.round(durationMs / 1000)}s ${tag}`);

  return {
    bench_id: BENCH_ID,
    run_id: runId,
    scene_id: scene.id,
    scene_family: scene.family,
    anaphore_class: scene.anaphoreClass,
    mode,
    seed_label: seedLabel,
    seed_value: seedValue,
    finish_reason: finishReason,
    error_msg: errorMsg,
    duration_ms: durationMs,
    output_words: outputWords,
    sentences_count: sentencesCount,
    opening_repetition_rate: openingRep,
    exceeded_threshold: exceeded,
    post_prose_sha256: proseSha256,
    ts_start_iso: tsStart.toISOString(),
    ts_end_iso: tsEnd.toISOString(),
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATION & GATE VERDICT
// ──────────────────────────────────────────────────────────────────────────────

function aggregatePerScene(records: readonly RunRecord[]): SceneStats[] {
  const byScene = new Map<string, RunRecord[]>();
  for (const r of records) {
    if (r.finish_reason !== 'ok') continue;
    const list = byScene.get(r.scene_id) ?? [];
    list.push(r);
    byScene.set(r.scene_id, list);
  }
  return Array.from(byScene.entries()).map(([scene_id, runs]) => {
    const rates = runs.map((r) => r.opening_repetition_rate);
    return {
      scene_id,
      anaphore_class: runs[0].anaphore_class,
      mean_opening_rep: mean(rates),
      cv_inter_seeds: cv(rates),
      exceeded_count: runs.filter((r) => r.exceeded_threshold).length,
      runs_count: runs.length,
    };
  });
}

function aggregatePerClass(records: readonly RunRecord[], cls: AnaphoreClass): ClassStats {
  const filtered = records.filter((r) => r.finish_reason === 'ok' && r.anaphore_class === cls);
  const rates = filtered.map((r) => r.opening_repetition_rate);
  return {
    mean: mean(rates),
    std: stdDev(rates),
    cv: cv(rates),
    exceeded_count: filtered.filter((r) => r.exceeded_threshold).length,
    total_runs: filtered.length,
  };
}

function computeGateVerdicts(records: readonly RunRecord[]): GateVerdict[] {
  const adv = aggregatePerClass(records, 'adversarial');
  const canon = aggregatePerClass(records, 'canonical');
  const border = aggregatePerClass(records, 'borderline');
  const sceneStats = aggregatePerScene(records);

  // B1 : mean(adv) - mean(canon) ≥ 0.05
  const b1Delta = adv.mean - canon.mean;

  // B2 : mean(border) strictement entre mean(canon) et mean(adv)
  const b2Pass = border.mean > canon.mean && border.mean < adv.mean;

  // B3 : exceeded canon ≤ 1/24
  const b3Pass = canon.exceeded_count <= B3_FP_MAX_COUNT;

  // B4 : CV par famille ≤ 0.30
  const b4ByClass = {
    adversarial: cv(records.filter((r) => r.finish_reason === 'ok' && r.anaphore_class === 'adversarial').map((r) => r.opening_repetition_rate)),
    canonical: cv(records.filter((r) => r.finish_reason === 'ok' && r.anaphore_class === 'canonical').map((r) => r.opening_repetition_rate)),
    borderline: cv(records.filter((r) => r.finish_reason === 'ok' && r.anaphore_class === 'borderline').map((r) => r.opening_repetition_rate)),
  };
  const b4Pass = b4ByClass.adversarial <= B4_CV_MAX && b4ByClass.canonical <= B4_CV_MAX && b4ByClass.borderline <= B4_CV_MAX;

  // B5 : SHA256 prose identique mode 0 vs shadow par paire (scene, seed)
  let b5Divergent = 0;
  let b5TotalPairs = 0;
  const byPair = new Map<string, { mode0: string; modeShadow: string }>();
  for (const r of records) {
    if (r.finish_reason !== 'ok') continue;
    const key = `${r.scene_id}_${r.seed_label}`;
    const entry = byPair.get(key) ?? { mode0: '', modeShadow: '' };
    if (r.mode === '0') entry.mode0 = r.post_prose_sha256;
    if (r.mode === 'shadow') entry.modeShadow = r.post_prose_sha256;
    byPair.set(key, entry);
  }
  for (const [, entry] of byPair) {
    if (entry.mode0 && entry.modeShadow) {
      b5TotalPairs += 1;
      if (entry.mode0 !== entry.modeShadow) b5Divergent += 1;
    }
  }

  return [
    {
      id: 'B1',
      description: 'Discrimination adv vs canon',
      observed: `Δmean = ${b1Delta.toFixed(4)} (adv=${adv.mean.toFixed(4)} - canon=${canon.mean.toFixed(4)})`,
      threshold: `≥ ${B1_DELTA_THRESHOLD}`,
      pass: b1Delta >= B1_DELTA_THRESHOLD,
    },
    {
      id: 'B2',
      description: 'Borderline placement',
      observed: `border=${border.mean.toFixed(4)} (canon=${canon.mean.toFixed(4)} | adv=${adv.mean.toFixed(4)})`,
      threshold: `mean(canon) < mean(border) < mean(adv)`,
      pass: b2Pass,
    },
    {
      id: 'B3',
      description: 'Faux positifs canon',
      observed: `${canon.exceeded_count}/${canon.total_runs} EXCEEDED`,
      threshold: `≤ ${B3_FP_MAX_COUNT}/24`,
      pass: b3Pass,
    },
    {
      id: 'B4',
      description: 'CV inter-seeds par famille',
      observed: `adv=${b4ByClass.adversarial.toFixed(3)} canon=${b4ByClass.canonical.toFixed(3)} border=${b4ByClass.borderline.toFixed(3)}`,
      threshold: `≤ ${B4_CV_MAX} chaque famille`,
      pass: b4Pass,
    },
    {
      id: 'B5',
      description: 'NO-OP runtime mode shadow',
      observed: `${b5Divergent}/${b5TotalPairs} paires divergentes`,
      threshold: `= ${B5_DIVERGENCE_MAX}`,
      pass: b5Divergent === B5_DIVERGENCE_MAX,
    },
  ];
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const scenes = BENCH_CORPUS_ANAPHORE;
  const totalRuns = scenes.length * MODES.length * SEEDS.length;

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(' OMEGA — BENCH ANAPHORE GATE β (calibration métrique)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Model            : ${PROVIDER_OPTIONS.model}`);
  console.log(`Ollama URL       : ${PROVIDER_OPTIONS.baseUrl}`);
  console.log(`Modes            : ${MODES.join(', ')} (Anaphore Gate)`);
  console.log(`Scènes           : ${scenes.length} (6 adv + 4 canon + 2 borderline)`);
  console.log(`Seeds/scène      : ${SEEDS.length} (${SEEDS.join(', ')})`);
  console.log(`Total runs       : ${totalRuns}`);
  console.log(`Wall-time estimé : ~${Math.round(totalRuns * 90 / 60)} min`);
  console.log(`Threshold opening: ${(OPENING_REPETITION_THRESHOLD * 100).toFixed(0)}%`);
  console.log(`Session dir      : ${sessionDir}`);
  console.log('═══════════════════════════════════════════════════════════════════\n');

  const allRecords: RunRecord[] = [];
  let runIdx = 0;

  // Boucle externe : scènes × modes × seeds (3 niveaux)
  for (const scene of scenes) {
    for (const mode of MODES) {
      for (const seedLabel of SEEDS) {
        runIdx += 1;
        const record = await runOne(scene, mode, seedLabel, runIdx, totalRuns);
        allRecords.push(record);
        fs.appendFileSync(runsFile, JSON.stringify(record) + '\n', 'utf8');
      }
    }
  }

  // Agrégation
  const verdicts = computeGateVerdicts(allRecords);
  const sceneStats = aggregatePerScene(allRecords);
  const classStats = {
    adversarial: aggregatePerClass(allRecords, 'adversarial'),
    canonical: aggregatePerClass(allRecords, 'canonical'),
    borderline: aggregatePerClass(allRecords, 'borderline'),
  };

  const allPass = verdicts.every((v) => v.pass);
  const passedCount = verdicts.filter((v) => v.pass).length;

  // Summary JSON
  const summary = {
    bench_id: BENCH_ID,
    ts_start: allRecords[0]?.ts_start_iso ?? null,
    ts_end: allRecords[allRecords.length - 1]?.ts_end_iso ?? null,
    total_runs: allRecords.length,
    total_duration_min: Math.round(allRecords.reduce((s, r) => s + r.duration_ms, 0) / 60000),
    model: PROVIDER_OPTIONS.model,
    threshold: OPENING_REPETITION_THRESHOLD,
    class_stats: classStats,
    scene_stats: sceneStats,
    gate_verdicts: verdicts,
    overall: {
      passed: passedCount,
      total: verdicts.length,
      verdict: allPass ? 'PASS' : passedCount >= 4 ? 'CONDITIONAL_PASS' : 'REJECT',
    },
  };
  fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2), 'utf8');

  // Verdict markdown
  const verdictMd = [
    `# BENCH ANAPHORE GATE β — ${BENCH_ID}`,
    '',
    `**Date** : ${new Date().toISOString()}`,
    `**Runs** : ${allRecords.length} (${scenes.length} scènes × ${MODES.length} modes × ${SEEDS.length} seeds)`,
    `**Modèle** : ${PROVIDER_OPTIONS.model}`,
    `**Durée** : ${summary.total_duration_min} min`,
    `**Threshold** : ${(OPENING_REPETITION_THRESHOLD * 100).toFixed(0)}%`,
    `**Parent** : commit 9859659d (engine.ts WIP Anaphore Gate scellé shadow default)`,
    '',
    '## Stats par classe',
    '',
    '| Classe | Mean opening_rep | Std | CV | Exceeded | Total |',
    '|---|---|---|---|---|---|',
    `| Adversarial | ${classStats.adversarial.mean.toFixed(4)} | ${classStats.adversarial.std.toFixed(4)} | ${classStats.adversarial.cv.toFixed(3)} | ${classStats.adversarial.exceeded_count} | ${classStats.adversarial.total_runs} |`,
    `| Canonical | ${classStats.canonical.mean.toFixed(4)} | ${classStats.canonical.std.toFixed(4)} | ${classStats.canonical.cv.toFixed(3)} | ${classStats.canonical.exceeded_count} | ${classStats.canonical.total_runs} |`,
    `| Borderline | ${classStats.borderline.mean.toFixed(4)} | ${classStats.borderline.std.toFixed(4)} | ${classStats.borderline.cv.toFixed(3)} | ${classStats.borderline.exceeded_count} | ${classStats.borderline.total_runs} |`,
    '',
    '## Stats par scène',
    '',
    '| Scene | Class | Mean opening_rep | CV inter-seeds | Exceeded | Runs |',
    '|---|---|---|---|---|---|',
    ...sceneStats.map((s) => `| ${s.scene_id} | ${s.anaphore_class} | ${s.mean_opening_rep.toFixed(4)} | ${s.cv_inter_seeds.toFixed(3)} | ${s.exceeded_count} | ${s.runs_count} |`),
    '',
    '## Gate verdicts (multi-critère)',
    '',
    '| ID | Critère | Observé | Seuil | PASS |',
    '|---|---|---|---|---|',
    ...verdicts.map((v) => `| ${v.id} | ${v.description} | ${v.observed} | ${v.threshold} | ${v.pass ? '✅' : '❌'} |`),
    '',
    `## VERDICT GLOBAL : ${summary.overall.verdict}`,
    '',
    `**${passedCount}/${verdicts.length} critères PASS**`,
    '',
    allPass
      ? '→ GO Option α : implémenter REJECT réel (intégration R6 rejection sampling)'
      : passedCount >= 4
      ? '→ CONDITIONAL_PASS : identifier critère faillant + arbitrage Francky'
      : '→ REJECT métrique : abandonner ou recalibrer seuil/feature',
    '',
  ].join('\n');
  fs.writeFileSync(verdictFile, verdictMd, 'utf8');

  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log(` AGRÉGATION FINALE`);
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Adversarial   : mean=${classStats.adversarial.mean.toFixed(4)} cv=${classStats.adversarial.cv.toFixed(3)} exceeded=${classStats.adversarial.exceeded_count}/${classStats.adversarial.total_runs}`);
  console.log(`Canonical     : mean=${classStats.canonical.mean.toFixed(4)} cv=${classStats.canonical.cv.toFixed(3)} exceeded=${classStats.canonical.exceeded_count}/${classStats.canonical.total_runs}`);
  console.log(`Borderline    : mean=${classStats.borderline.mean.toFixed(4)} cv=${classStats.borderline.cv.toFixed(3)} exceeded=${classStats.borderline.exceeded_count}/${classStats.borderline.total_runs}`);
  console.log('───────────────────────────────────────────────────────────────────');
  for (const v of verdicts) {
    console.log(`${v.pass ? '✅' : '❌'} ${v.id} : ${v.description} | ${v.observed} | seuil ${v.threshold}`);
  }
  console.log('───────────────────────────────────────────────────────────────────');
  console.log(`[VERDICT] ${summary.overall.verdict} (${passedCount}/${verdicts.length} critères PASS)`);
  console.log(`[OUTPUT] Runs JSONL : ${runsFile}`);
  console.log(`[OUTPUT] Summary    : ${summaryFile}`);
  console.log(`[OUTPUT] Verdict MD : ${verdictFile}`);
}

main().catch((err) => {
  console.error('[BENCH ANAPHORE β] Fatal error:', err);
  process.exit(1);
});
