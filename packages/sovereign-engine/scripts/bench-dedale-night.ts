/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DÉDALE BENCH NIGHT — RUNNER 2 PHASES (S → R)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/bench-dedale-night.ts
 * Version:  v1 (2026-04-22)
 * Standard: NASA-Grade L4 — DEDALE_BENCH_NIGHT_v1.md §F (amendements ChatGPT intégrés)
 *
 * MISSION :
 *   Valider empiriquement Dédale v0.55 RESET-FIRST sur qwen3:32b local (Ollama)
 *   en 2 phases :
 *
 *   PHASE S (SHADOW) — discovery des boucles
 *     - OMEGA_DEDALE_MODE=shadow
 *     - 12 scènes × 10 seeds = 120 runs ordonnés aléatoirement (seed bench fixé)
 *     - Oracle évalue, télémétrie capturée, AUCUN reset déclenché
 *     - Objectif : mesurer taux de hard_fail par scène/famille, valider C1+C2+C4
 *
 *   PHASE R (ON) — efficacy du reset
 *     - OMEGA_DEDALE_MODE=on
 *     - Uniquement les scènes où Phase S a observé ≥1 hard_fail
 *     - Mêmes 10 seeds × N scènes triggered
 *     - Objectif : mesurer ratio_effective = resets_effective / (resets_effective + resets_non_effective)
 *
 * CORRECTIONS CHATGPT APPLIQUÉES :
 *   1. Split 2 phases Shadow/Reset (shadow ne reset pas, donc mesures séparées)
 *   2. Taxonomie réelle 4×2 + 4×1 (familles distinctes, pas 12 clones)
 *   3. Randomisation ordre scène×seed + epochs (restart Ollama /20 runs)
 *   4. Append-only JSONL par run + checkpoint /5 runs
 *   5. Dédup par run_id à la reprise
 *   6. Smoke test = 1 trigger + 1 neutral (2 cases, pas 1)
 *   7. Télémétrie étendue (scene_hash, prompt_hash, output_hash, vram, pid, epoch_id)
 *   8. Push remote 9e69be42 = prérequis humain AVANT lancement (bloque bench, pas code)
 *
 * USAGE :
 *   # Smoke test (2 cases ~5min)
 *   $env:DEDALE_BENCH_PHASE="smoke"; npx tsx scripts/bench-dedale-night.ts
 *
 *   # Phase S (shadow, ~5h)
 *   $env:DEDALE_BENCH_PHASE="S"; npx tsx scripts/bench-dedale-night.ts
 *
 *   # Phase R (on, scenes triggered uniquement, ~5h au pire)
 *   $env:DEDALE_BENCH_PHASE="R"; npx tsx scripts/bench-dedale-night.ts
 *
 *   # Phase R2 (ADR-005 r2 mini-bench: N02+T04+T01 × 10 seeds = 30 runs, ~1h15)
 *   $env:DEDALE_BENCH_PHASE="R2"; npx tsx scripts/bench-dedale-night.ts
 *
 *   # Resume (relecture run_id existants, skip)
 *   $env:DEDALE_BENCH_RESUME="1"; npx tsx scripts/bench-dedale-night.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, appendFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';

// Opt-in adaptive (requis pour activer Dédale)
process.env.OMEGA_ADAPTIVE_CHUNKING = process.env.OMEGA_ADAPTIVE_CHUNKING ?? '1';
// Kill best-of-N (isoler Dédale)
process.env.OMEGA_DUEL_RUNS = process.env.OMEGA_DUEL_RUNS ?? '0';
// Kill R6 gate (isoler Dédale)
process.env.OMEGA_R6_GATE = process.env.OMEGA_R6_GATE ?? '0';

import { generateChunkedDraft } from '../src/generation/chunked-generator.js';
import { createOllamaProvider } from '../src/runtime/ollama-provider.js';
import type { ChunkedGenerationInput } from '../src/generation/chunked-generator.js';
import {
  BENCH_CORPUS,
  getTriggerScenes,
  hashScene,
  corpusManifest,
  type BenchScene,
} from './bench-dedale-night-corpus.js';

const __filename = fileURLToPath(import.meta.url);
const __scriptDir = resolve(__filename, '..');

// ──────────────────────────────────────────────────────────────────────────────
// CONFIG
// ──────────────────────────────────────────────────────────────────────────────

const BENCH_ID = 'BENCH_DEDALE_NIGHT_20260422';
const BENCH_SEED = process.env.DEDALE_BENCH_SEED ?? BENCH_ID;
const SEEDS_PER_SCENE = 10;
const EPOCH_SIZE = 20;                             // Restart Ollama every N runs
const CHECKPOINT_INTERVAL = 5;                     // Persist checkpoint every N runs
const OLLAMA_MODEL = process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b';
const OLLAMA_URL = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const PHASE = (process.env.DEDALE_BENCH_PHASE ?? 'S').toUpperCase();
const RESUME = process.env.DEDALE_BENCH_RESUME === '1';
const OUT_ROOT = resolve(__scriptDir, '..', 'outputs', 'bench_dedale_night');

// Fixed seed labels A..J (10 seeds per scene)
const SEED_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'] as const;

// ──────────────────────────────────────────────────────────────────────────────
// DETERMINISTIC PRNG (for ordering, NOT for LLM seed)
// ──────────────────────────────────────────────────────────────────────────────

/** Mulberry32 PRNG — déterministe, seedé par BENCH_SEED */
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function seedStringToNumber(s: string): number {
  const h = createHash('sha256').update(s).digest();
  return h.readUInt32BE(0);
}

/** Fisher-Yates shuffle déterministe */
function shuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ──────────────────────────────────────────────────────────────────────────────
// RUN LIST BUILDER
// ──────────────────────────────────────────────────────────────────────────────

interface RunSpec {
  readonly run_id: string;
  readonly phase: 'S' | 'R' | 'R2';
  readonly scene_id: string;
  readonly seed_label: string;
  readonly seed_str: string;          // passed to LLM
}

function buildRunSpecs(
  scenes: readonly BenchScene[],
  phase: 'S' | 'R' | 'R2',
): RunSpec[] {
  const specs: RunSpec[] = [];
  for (const scene of scenes) {
    for (const label of SEED_LABELS) {
      const seed_str = `${BENCH_SEED}_${scene.id}_${label}`;
      const run_id = `${phase}_${scene.id}_${label}`;
      specs.push({ run_id, phase, scene_id: scene.id, seed_label: label, seed_str });
    }
  }
  return specs;
}

// ──────────────────────────────────────────────────────────────────────────────
// OLLAMA LIFECYCLE — health + restart (epoch boundary)
// ──────────────────────────────────────────────────────────────────────────────

async function ollamaHealthy(): Promise<boolean> {
  try {
    const url = `${OLLAMA_URL}/api/tags`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return res.ok;
  } catch {
    return false;
  }
}

/** Restart Ollama process (OS-specific). Non-fatal on failure. */
async function restartOllama(): Promise<void> {
  console.log('[EPOCH] Restarting Ollama...');
  try {
    if (process.platform === 'win32') {
      execSync(
        'powershell.exe -NoProfile -Command "Get-Process -Name ollama*,ollama-app -ErrorAction SilentlyContinue | Stop-Process -Force; Start-Sleep -Seconds 3; Start-Process -FilePath ollama -ArgumentList \'serve\' -WindowStyle Hidden"',
        { stdio: 'ignore' },
      );
    } else {
      execSync('pkill -f ollama 2>/dev/null || true; sleep 3; nohup ollama serve > /dev/null 2>&1 &', {
        stdio: 'ignore', shell: '/bin/bash',
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[EPOCH] restart Ollama WARN (non-fatal): ${msg}`);
  }

  // Wait up to 60s for healthy
  const tStart = Date.now();
  while (Date.now() - tStart < 60_000) {
    if (await ollamaHealthy()) {
      console.log('[EPOCH] Ollama healthy');
      return;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, 2000));
  }
  console.warn('[EPOCH] Ollama did not become healthy within 60s — proceeding anyway');
}

function getOllamaPid(): number | null {
  try {
    if (process.platform === 'win32') {
      const out = execSync(
        'powershell.exe -NoProfile -Command "(Get-Process -Name ollama -ErrorAction SilentlyContinue | Select-Object -First 1).Id"',
        { encoding: 'utf8' },
      ).trim();
      const pid = parseInt(out, 10);
      return Number.isFinite(pid) ? pid : null;
    } else {
      const out = execSync('pgrep -f "ollama serve" | head -1', { encoding: 'utf8' }).trim();
      const pid = parseInt(out, 10);
      return Number.isFinite(pid) ? pid : null;
    }
  } catch {
    return null;
  }
}

function getVramMib(): number | null {
  try {
    const out = execSync('nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits', {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    const n = parseInt(out.split('\n')[0] || '', 10);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function getOllamaVersion(): string {
  try {
    return execSync('ollama --version', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return 'unknown';
  }
}

async function getModelDigest(model: string): Promise<string> {
  try {
    // /api/tags returns { models: [{ name, digest, ... }, ...] }
    const url = `${OLLAMA_URL}/api/tags`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return 'unknown';
    const j = (await res.json()) as { models?: Array<{ name?: string; digest?: string }> };
    const found = j.models?.find((m) => m.name === model);
    return found?.digest ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// TELEMETRY — per-run record structure
// ──────────────────────────────────────────────────────────────────────────────

interface DedaleAggregate {
  readonly run_id: string;
  readonly chunks_total: number;
  readonly counts: Record<string, number>;
  readonly ratio_effective: number | null;
  readonly c5_verdict: string;
}

interface RunRecord {
  readonly bench_id: string;
  readonly bench_seed: string;
  readonly run_id: string;              // Phase + scene + seed label (unique)
  readonly phase: 'S' | 'R' | 'R2';
  readonly mode: 'shadow' | 'on';
  readonly scene_id: string;
  readonly scene_family: string;
  readonly scene_kind: 'trigger' | 'neutral';
  readonly scene_hash: string;
  readonly seed_label: string;
  readonly seed_str: string;
  readonly prompt_hash: string;         // sha256(sceneBrief+signatureWords+contract)
  readonly options_hash: string;        // sha256 of PROVIDER_OPTIONS
  readonly output_hash: string;         // sha256(prose)
  readonly output_words: number;
  readonly output_chars: number;
  readonly finish_reason: 'ok' | 'error';
  readonly error_msg: string | null;
  readonly duration_ms: number;
  readonly started_at_iso: string;
  readonly ended_at_iso: string;
  readonly epoch_id: number;
  readonly ollama_version: string;
  readonly ollama_pid: number | null;
  readonly model: string;
  readonly model_digest: string;
  readonly vram_start_mib: number | null;
  readonly vram_end_mib: number | null;
  readonly dedale_run_id: string | null; // id donné par Dédale telemetry
  readonly dedale_aggregate: DedaleAggregate | null;
  // ── Runner v2 (optional — legacy Phase S records remain valid) ──────────
  /** sha256(chunk_text) for each generated chunk, aligned with *_c{n}.txt. */
  readonly chunk_text_hashes?: readonly string[];
  /** Number of chunks actually generated (may differ from chunks_total in Dédale aggregate on error). */
  readonly chunk_count?: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// PROVIDER OPTIONS (stable, hashable)
// ──────────────────────────────────────────────────────────────────────────────

const PROVIDER_OPTIONS = {
  model: OLLAMA_MODEL,
  baseUrl: OLLAMA_URL,
  draftTemperature: 0.85,
  judgeTemperature: 0.0,
  draftMaxTokens: 2048,
  judgeMaxTokens: 256,
  repeatPenalty: 1.4,
  frequencyPenalty: 0.6,
  repeatLastN: 256,
} as const;

function optionsHash(): string {
  return createHash('sha256').update(JSON.stringify(PROVIDER_OPTIONS)).digest('hex');
}

/**
 * Runner v2 — Stable SHA-256 hex over UTF-8 text.
 * Used to fingerprint raw chunk text dumped to chunks_text_{phase}/ so that
 * downstream audits (mini-bench 30 runs, post-mortem of oracle false positives,
 * §ADR-005 §VALIDATION EMPIRIQUE NB1) can prove byte-for-byte integrity of
 * the text that was scored — without depending on Dédale's internal telemetry.
 */
function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function promptHash(scene: BenchScene): string {
  const payload = [
    scene.id,
    scene.family,
    scene.sceneBrief,
    scene.signatureWords.join('|'),
    JSON.stringify(scene.emotionContract),
  ].join('\n---\n');
  return createHash('sha256').update(payload).digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────────
// SESSION SETUP — output dirs
// ──────────────────────────────────────────────────────────────────────────────

function sessionDir(): string {
  const d = join(OUT_ROOT, BENCH_ID);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function telemetryDirFor(phase: 'S' | 'R' | 'R2'): string {
  const d = join(sessionDir(), `dedale_telemetry_${phase}`);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

/**
 * Runner v2 — Flat directory holding raw chunk text dumps for a phase.
 * File layout: chunks_text_{phase}/{run_id}_c{n}.txt
 * Sidecar:     chunks_text_{phase}/{run_id}_index.jsonl
 *
 * Rationale (ADR-005 §VALIDATION EMPIRIQUE NB1):
 *   Phase S stored only oracle metrics (C1/C2/C4), not the raw chunks that
 *   produced them. Auditing the ~3% residual false positives from N02 was
 *   therefore impossible. Runner v2 closes this gap without touching Dédale's
 *   internal telemetry contract.
 */
function chunksTextDirFor(phase: 'S' | 'R' | 'R2'): string {
  const d = join(sessionDir(), `chunks_text_${phase}`);
  if (!existsSync(d)) mkdirSync(d, { recursive: true });
  return d;
}

function runsJsonlPath(phase: 'S' | 'R' | 'R2'): string {
  return join(sessionDir(), `runs_${phase}.jsonl`);
}

function checkpointPath(phase: 'S' | 'R' | 'R2'): string {
  return join(sessionDir(), `checkpoint_${phase}.json`);
}

function manifestPath(): string {
  return join(sessionDir(), 'manifest.json');
}

// ──────────────────────────────────────────────────────────────────────────────
// RESUME — load existing run_ids (dedup by run_id)
// ──────────────────────────────────────────────────────────────────────────────

function loadCompletedRunIds(phase: 'S' | 'R' | 'R2'): Set<string> {
  const p = runsJsonlPath(phase);
  const done = new Set<string>();
  if (!existsSync(p)) return done;
  const lines = readFileSync(p, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as { run_id?: string; finish_reason?: string };
      if (typeof r.run_id === 'string' && r.finish_reason === 'ok') {
        done.add(r.run_id);
      }
    } catch {
      // malformed line, skip
    }
  }
  return done;
}

// ──────────────────────────────────────────────────────────────────────────────
// LOAD DÉDALE AGGREGATE — scan telemetry dir for latest run_id matching
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Dédale écrit 1 fichier JSON par run dans telemetry_dir.
 * On cherche le plus récent créé après tStart qui matche le run OMEGA en cours.
 * Fallback: retourne null si rien trouvé (non-fatal).
 */
function loadLatestDedaleAggregate(dir: string, tStartMs: number): DedaleAggregate | null {
  if (!existsSync(dir)) return null;
  let best: { path: string; mtime: number } | null = null;
  let debugSeen = 0;
  try {
    for (const f of readdirSync(dir)) {
      // Exclude chunks.jsonl sidecar, keep only aggregate *.json
      if (!f.endsWith('.json') || f.endsWith('.jsonl')) continue;
      if (!f.startsWith('dedale_run_')) continue;
      const fp = join(dir, f);
      const st = statSync(fp);
      debugSeen++;
      // tStartMs tolerance: accept files written up to 1s BEFORE run start
      // (FS mtime granularity on Windows can lag; Dédale writes via atomic rename)
      if (st.mtimeMs + 1000 < tStartMs) continue;
      if (best === null || st.mtimeMs > best.mtime) {
        best = { path: fp, mtime: st.mtimeMs };
      }
    }
    if (best === null) {
      if (debugSeen > 0) {
        console.warn(`[DEDALE-READ] ${debugSeen} file(s) seen, 0 kept (tStartMs=${tStartMs}) dir=${dir}`);
      }
      return null;
    }
    const raw = readFileSync(best.path, 'utf8');
    const j = JSON.parse(raw);
    const counts: Record<string, number> = {};
    if (j && typeof j.counts === 'object' && j.counts !== null) {
      for (const [k, v] of Object.entries(j.counts as Record<string, unknown>)) {
        if (typeof v === 'number') counts[k] = v;
      }
    }
    return {
      run_id: String(j?.run_id ?? 'unknown'),
      chunks_total: typeof j?.chunks_total === 'number' ? j.chunks_total : 0,
      counts,
      ratio_effective: typeof j?.ratio_effective === 'number' ? j.ratio_effective : null,
      c5_verdict: String(j?.c5_verdict ?? 'unknown'),
    };
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// WRITE HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function appendRunRecord(phase: 'S' | 'R' | 'R2', rec: RunRecord): void {
  appendFileSync(runsJsonlPath(phase), JSON.stringify(rec) + '\n', { encoding: 'utf8' });
}

function writeCheckpoint(phase: 'S' | 'R' | 'R2', payload: object): void {
  writeFileSync(checkpointPath(phase), JSON.stringify(payload, null, 2), { encoding: 'utf8' });
}

async function writeManifest(): Promise<void> {
  const payload = {
    bench_id: BENCH_ID,
    bench_seed: BENCH_SEED,
    started_at_iso: new Date().toISOString(),
    model: OLLAMA_MODEL,
    ollama_url: OLLAMA_URL,
    ollama_version: getOllamaVersion(),
    model_digest: await getModelDigest(OLLAMA_MODEL),
    seeds_per_scene: SEEDS_PER_SCENE,
    epoch_size: EPOCH_SIZE,
    checkpoint_interval: CHECKPOINT_INTERVAL,
    options_hash: optionsHash(),
    provider_options: PROVIDER_OPTIONS,
    corpus: corpusManifest(),
    env: {
      OMEGA_ADAPTIVE_CHUNKING: process.env.OMEGA_ADAPTIVE_CHUNKING,
      OMEGA_DUEL_RUNS: process.env.OMEGA_DUEL_RUNS,
      OMEGA_R6_GATE: process.env.OMEGA_R6_GATE,
    },
  };
  writeFileSync(manifestPath(), JSON.stringify(payload, null, 2), { encoding: 'utf8' });
}

// ──────────────────────────────────────────────────────────────────────────────
// CORE — run one scene × seed
// ──────────────────────────────────────────────────────────────────────────────

async function runOne(
  scene: BenchScene,
  spec: RunSpec,
  phase: 'S' | 'R' | 'R2',
  epochId: number,
  telemDir: string,
  chunksTextDir: string,
): Promise<RunRecord> {
  // Dédale mode set per-run (S→shadow, R→on)
  process.env.OMEGA_DEDALE_MODE = phase === 'S' ? 'shadow' : 'on';
  process.env.OMEGA_DEDALE_TELEMETRY_DIR = telemDir;

  const tStart = performance.now();
  const tStartMs = Date.now();
  const started_at_iso = new Date(tStartMs).toISOString();
  const vram_start = getVramMib();

  const provider = createOllamaProvider(PROVIDER_OPTIONS);

  const input: ChunkedGenerationInput = {
    sceneBrief: scene.sceneBrief,
    signatureWords: scene.signatureWords,
    language: scene.language,
    seed: spec.seed_str,
    emotionContract: scene.emotionContract,
  };

  let prose = '';
  let finish_reason: 'ok' | 'error' = 'ok';
  let error_msg: string | null = null;
  let chunkTexts: readonly string[] = [];

  try {
    const result = await generateChunkedDraft(input, provider);
    prose = result.chunks.join('\n\n');
    chunkTexts = result.chunks;
  } catch (err) {
    finish_reason = 'error';
    error_msg = err instanceof Error ? err.message : String(err);
  }

  // ── Runner v2 — dump raw chunk text + hashes (ADR-005 §VALIDATION EMPIRIQUE NB1) ──
  // Synchronous writes are intentional: we want files on disk before the run
  // record appends to runs_{phase}.jsonl so a crash never leaves dangling refs.
  // Error-path runs emit an empty array and NO files (nothing to fingerprint).
  const chunkTextHashes: string[] = [];
  if (chunkTexts.length > 0) {
    const indexPath = join(chunksTextDir, `${spec.run_id}_index.jsonl`);
    for (let ci = 0; ci < chunkTexts.length; ci++) {
      const chunkText = chunkTexts[ci];
      const h = sha256Hex(chunkText);
      chunkTextHashes.push(h);
      const chunkPath = join(chunksTextDir, `${spec.run_id}_c${ci + 1}.txt`);
      try {
        writeFileSync(chunkPath, chunkText, { encoding: 'utf8' });
        appendFileSync(
          indexPath,
          JSON.stringify({
            run_id: spec.run_id,
            chunk_idx: ci + 1,
            chunk_text_hash: h,
            chars: chunkText.length,
          }) + '\n',
          { encoding: 'utf8' },
        );
      } catch (werr) {
        // Non-fatal: dump failure must not break the bench. The hash stays in
        // the run record so integrity can still be verified on whatever made it.
        const m = werr instanceof Error ? werr.message : String(werr);
        console.warn(`[RUNNER-V2] chunk text dump WARN (non-fatal) run=${spec.run_id} ci=${ci + 1}: ${m}`);
      }
    }
  }

  const duration_ms = performance.now() - tStart;
  const vram_end = getVramMib();
  const ended_at_iso = new Date().toISOString();

  const output_hash = createHash('sha256').update(prose).digest('hex');
  const output_words = prose ? prose.split(/\s+/).filter(Boolean).length : 0;
  const output_chars = prose.length;

  // Try to find Dédale aggregate JSON written by finalizeRun
  const agg = loadLatestDedaleAggregate(telemDir, tStartMs);

  const rec: RunRecord = {
    bench_id: BENCH_ID,
    bench_seed: BENCH_SEED,
    run_id: spec.run_id,
    phase,
    mode: phase === 'S' ? 'shadow' : 'on',
    scene_id: scene.id,
    scene_family: scene.family,
    scene_kind: scene.kind,
    scene_hash: hashScene(scene),
    seed_label: spec.seed_label,
    seed_str: spec.seed_str,
    prompt_hash: promptHash(scene),
    options_hash: optionsHash(),
    output_hash,
    output_words,
    output_chars,
    finish_reason,
    error_msg,
    duration_ms: Math.round(duration_ms),
    started_at_iso,
    ended_at_iso,
    epoch_id: epochId,
    ollama_version: getOllamaVersion(),
    ollama_pid: getOllamaPid(),
    model: OLLAMA_MODEL,
    model_digest: await getModelDigest(OLLAMA_MODEL),
    vram_start_mib: vram_start,
    vram_end_mib: vram_end,
    dedale_run_id: agg?.run_id ?? null,
    dedale_aggregate: agg,
    chunk_text_hashes: chunkTextHashes,
    chunk_count: chunkTexts.length,
  };

  return rec;
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE RUNNER
// ──────────────────────────────────────────────────────────────────────────────

async function runPhase(
  phase: 'S' | 'R' | 'R2',
  scenes: readonly BenchScene[],
  label: string,
): Promise<void> {
  const telemDir = telemetryDirFor(phase);
  const chunksTextDir = chunksTextDirFor(phase);
  const completed = RESUME ? loadCompletedRunIds(phase) : new Set<string>();
  if (RESUME && completed.size > 0) {
    console.log(`[RESUME] phase=${phase} skipping ${completed.size} completed runs`);
  }

  // Build + shuffle
  const rng = mulberry32(seedStringToNumber(`${BENCH_SEED}_${phase}`));
  const allSpecs = buildRunSpecs(scenes, phase);
  const ordered = shuffle(allSpecs, rng);
  const todo = ordered.filter((s) => !completed.has(s.run_id));

  console.log(`\n═══════════════════════════════════════════════════════════`);
  console.log(`  PHASE ${phase} — ${label}`);
  console.log(`  scenes=${scenes.length} seeds/scene=${SEEDS_PER_SCENE}`);
  console.log(`  total_runs=${allSpecs.length} todo=${todo.length} completed=${completed.size}`);
  console.log(`  epoch_size=${EPOCH_SIZE} checkpoint=${CHECKPOINT_INTERVAL}`);
  console.log(`═══════════════════════════════════════════════════════════\n`);

  let epochId = 0;
  let runInEpoch = 0;
  let runsDone = 0;
  const t0 = Date.now();

  for (let i = 0; i < todo.length; i++) {
    const spec = todo[i];
    const scene = BENCH_CORPUS.find((s) => s.id === spec.scene_id);
    if (scene === undefined) {
      console.warn(`[SKIP] scene ${spec.scene_id} not found — skipping`);
      continue;
    }

    // Epoch rollover
    if (runInEpoch === 0 && runsDone > 0) {
      epochId++;
      await restartOllama();
    }

    // Health pre-check
    if (!(await ollamaHealthy())) {
      console.warn('[HEALTH] Ollama unhealthy before run — attempting restart');
      await restartOllama();
    }

    const tRun = Date.now();
    console.log(`[RUN ${runsDone + 1}/${todo.length}] phase=${phase} epoch=${epochId} scene=${spec.scene_id} seed=${spec.seed_label}`);
    const rec = await runOne(scene, spec, phase, epochId, telemDir, chunksTextDir);
    appendRunRecord(phase, rec);
    runsDone++;
    runInEpoch++;

    const dur = Math.round((Date.now() - tRun) / 1000);
    const eta = runsDone > 0
      ? Math.round(((Date.now() - t0) / runsDone) * (todo.length - runsDone) / 60000)
      : 0;
    console.log(`  → ${rec.finish_reason} words=${rec.output_words} dur=${dur}s ETA=${eta}min dedale=${rec.dedale_aggregate?.c5_verdict ?? 'n/a'}`);
    if (rec.error_msg) {
      console.log(`  [ERR] ${rec.error_msg.slice(0, 200)}`);
    }

    // Checkpoint
    if (runsDone % CHECKPOINT_INTERVAL === 0) {
      writeCheckpoint(phase, {
        last_run_id: spec.run_id,
        runs_done: runsDone,
        runs_todo: todo.length - runsDone,
        epoch_id: epochId,
        updated_at_iso: new Date().toISOString(),
      });
    }

    // Epoch boundary
    if (runInEpoch >= EPOCH_SIZE) {
      runInEpoch = 0;
    }
  }

  // Final checkpoint
  writeCheckpoint(phase, {
    last_run_id: null,
    runs_done: runsDone,
    runs_todo: 0,
    epoch_id: epochId,
    completed: true,
    finished_at_iso: new Date().toISOString(),
  });
  console.log(`\n[PHASE ${phase}] DONE — runs_done=${runsDone} duration=${Math.round((Date.now() - t0) / 60000)}min`);
}

// ──────────────────────────────────────────────────────────────────────────────
// PHASE R SCENE SELECTION — scenes with ≥1 hard_fail in Phase S
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Parse Phase S runs_S.jsonl and return scene_ids where at least one run had
 * a Dédale count for hard_fail/reset_effective/reset_non_effective > 0.
 * In shadow mode, we count any verdict != 'no_loop' as "triggered".
 */
function selectTriggeredScenesFromPhaseS(): readonly BenchScene[] {
  const p = runsJsonlPath('S');
  if (!existsSync(p)) {
    console.warn('[PHASE R] runs_S.jsonl not found — falling back to ALL trigger scenes');
    return getTriggerScenes();
  }
  const hit = new Set<string>();
  const lines = readFileSync(p, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const r = JSON.parse(line) as RunRecord;
      if (r.dedale_aggregate === null || r.dedale_aggregate === undefined) continue;
      const c = r.dedale_aggregate.counts ?? {};
      const triggered =
        (c['hard_fail'] ?? 0) > 0 ||
        (c['reset_effective'] ?? 0) > 0 ||
        (c['reset_non_effective'] ?? 0) > 0 ||
        (c['reset_failed'] ?? 0) > 0;
      if (triggered) hit.add(r.scene_id);
    } catch {
      /* skip */
    }
  }
  const triggered = BENCH_CORPUS.filter((s) => hit.has(s.id));
  console.log(`[PHASE R] triggered scenes from Phase S: ${triggered.map((s) => s.id).join(',') || '(none)'}`);
  if (triggered.length === 0) {
    console.warn('[PHASE R] no triggered scene in Phase S — fallback to ALL trigger scenes for conservative coverage');
    return getTriggerScenes();
  }
  return triggered;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — DÉDALE BENCH NIGHT v1 (qwen3:32b local)');
  console.log(`  BENCH_ID=${BENCH_ID}`);
  console.log(`  BENCH_SEED=${BENCH_SEED}`);
  console.log(`  PHASE=${PHASE}`);
  console.log(`  RESUME=${RESUME}`);
  console.log(`  MODEL=${OLLAMA_MODEL} URL=${OLLAMA_URL}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await writeManifest();

  if (PHASE === 'SMOKE') {
    // Smoke: 1 trigger (T01) + 1 neutral (N01), 1 seed each, shadow mode
    console.log('[SMOKE] 2 cases: T01 (trigger) + N01 (neutral) — shadow mode');
    const scenes = BENCH_CORPUS.filter((s) => s.id === 'T01' || s.id === 'N01');
    // Limit to 1 seed (seed A) — override SEED_LABELS via custom runPhase
    const telemDir = telemetryDirFor('S');
    const chunksTextDir = chunksTextDirFor('S');
    let epochId = 0;
    for (const scene of scenes) {
      const spec: RunSpec = {
        run_id: `SMOKE_${scene.id}_A`,
        phase: 'S',
        scene_id: scene.id,
        seed_label: 'A',
        seed_str: `${BENCH_SEED}_SMOKE_${scene.id}_A`,
      };
      if (!(await ollamaHealthy())) await restartOllama();
      console.log(`[SMOKE] scene=${scene.id}`);
      const rec = await runOne(scene, spec, 'S', epochId, telemDir, chunksTextDir);
      appendRunRecord('S', rec);
      console.log(`  → ${rec.finish_reason} words=${rec.output_words} dur=${Math.round(rec.duration_ms / 1000)}s dedale=${rec.dedale_aggregate?.c5_verdict ?? 'n/a'}`);
      if (rec.error_msg) console.log(`  [ERR] ${rec.error_msg.slice(0, 200)}`);
    }
    console.log('\n[SMOKE] DONE — check outputs/bench_dedale_night/${BENCH_ID}/runs_S.jsonl');
    return;
  }

  if (PHASE === 'S') {
    await runPhase('S', BENCH_CORPUS, 'Shadow discovery on ALL 12 scenes');
  } else if (PHASE === 'R') {
    const triggered = selectTriggeredScenesFromPhaseS();
    await runPhase('R', triggered, `Reset efficacy on ${triggered.length} triggered scenes`);
  } else if (PHASE === 'R2') {
    // ADR-005 r2 mini-bench: validate composite oracle rule
    //   hard_fail = (C1 > c1_high) OR (C1 > c1_low AND C4 < c4)
    // Scenes: N02 (residual FP target) + T04 + T01 (TP recovery targets)
    // 3 scenes × 10 seeds A..J = 30 runs, shadow mode, qwen3:32b
    const R2_SCENE_IDS: readonly string[] = ['N02', 'T04', 'T01'];
    const r2Scenes = BENCH_CORPUS.filter((s) => R2_SCENE_IDS.includes(s.id));
    if (r2Scenes.length !== R2_SCENE_IDS.length) {
      const found = r2Scenes.map((s) => s.id).join(',');
      throw new Error(`[PHASE R2] expected ${R2_SCENE_IDS.join(',')} in BENCH_CORPUS, found only: ${found}`);
    }
    await runPhase('R2', r2Scenes, `ADR-005 r2 mini-bench on ${R2_SCENE_IDS.join(',')} (composite C1/C4 rule)`);
  } else {
    throw new Error(`[MAIN] Unknown DEDALE_BENCH_PHASE='${PHASE}' (expected: SMOKE|S|R|R2)`);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  PHASE COMPLETE');
  console.log(`  Output: ${sessionDir()}`);
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch((err) => {
  console.error('[FATAL]', err);
  process.exit(1);
});
