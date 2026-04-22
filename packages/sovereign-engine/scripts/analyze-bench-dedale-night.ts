/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA — DÉDALE BENCH NIGHT — ANALYZER (Triple Verdict)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   scripts/analyze-bench-dedale-night.ts
 * Version:  v1 (2026-04-22)
 * Standard: NASA-Grade L4 — DEDALE_BENCH_NIGHT_v1.md §E + amendements ChatGPT
 *
 * INPUT :
 *   outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/
 *     ├── manifest.json
 *     ├── runs_S.jsonl  (Phase S shadow)
 *     ├── runs_R.jsonl  (Phase R reset efficacy)
 *     └── dedale_telemetry_{S,R}/*.json
 *
 * OUTPUT :
 *   outputs/bench_dedale_night/BENCH_DEDALE_NIGHT_20260422/
 *     └── REPORT.md    (verdict triple + tableaux détaillés)
 *     └── REPORT.json  (machine-readable)
 *
 * VERDICT TRIPLE :
 *   SHADOW_VERDICT : PASS si Oracle détecte correctement les loops (≥1 hard_fail
 *                    sur scènes trigger, 0 hard_fail sur scènes neutral).
 *                    FAIL sinon.
 *
 *   RESET_VERDICT  : PASS_ROBUST        si n_eval ≥ 15 et ratio_effective ≥ 0.50
 *                    PASS_EXPLORATORY  si n_eval ≥ 5 et ratio_effective ≥ 0.50
 *                    FAIL              si n_eval ≥ 10 et ratio_effective < 0.30
 *                    INCONCLUSIVE      sinon
 *
 *   GLOBAL_VERDICT : PASS         si SHADOW=PASS ET RESET ∈ {PASS_ROBUST, PASS_EXPLORATORY}
 *                    PARTIAL      si SHADOW=PASS ET RESET=INCONCLUSIVE
 *                    FAIL         si SHADOW=FAIL OU RESET=FAIL
 *                    INVALID      si données insuffisantes (Phase S/R manquante)
 *
 * USAGE :
 *   npx tsx scripts/analyze-bench-dedale-night.ts
 *   # Ou override session id :
 *   $env:DEDALE_BENCH_ID="BENCH_DEDALE_NIGHT_20260422"; npx tsx scripts/analyze-bench-dedale-night.ts
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { corpusManifest, BENCH_CORPUS } from './bench-dedale-night-corpus.js';

const __filename = fileURLToPath(import.meta.url);
const __scriptDir = resolve(__filename, '..');

const BENCH_ID = process.env.DEDALE_BENCH_ID ?? 'BENCH_DEDALE_NIGHT_20260422';
const OUT_ROOT = resolve(__scriptDir, '..', 'outputs', 'bench_dedale_night');
const SESSION = join(OUT_ROOT, BENCH_ID);

// ──────────────────────────────────────────────────────────────────────────────
// THRESHOLDS (frozen, == PASS_THRESHOLDS Dédale)
// ──────────────────────────────────────────────────────────────────────────────

const RATIO_MIN = 0.50;
const N_EXPLORATORY = 5;
const N_ROBUST = 15;
const RATIO_FAIL = 0.30;
const N_FAIL_MIN = 10;

// ──────────────────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────────────────

interface DedaleAggregate {
  readonly run_id: string;
  readonly chunks_total: number;
  readonly counts: Record<string, number>;
  readonly ratio_effective: number | null;
  readonly c5_verdict: string;
}

interface RunRecord {
  readonly run_id: string;
  readonly phase: 'S' | 'R';
  readonly mode: 'shadow' | 'on';
  readonly scene_id: string;
  readonly scene_family: string;
  readonly scene_kind: 'trigger' | 'neutral';
  readonly scene_hash: string;
  readonly seed_label: string;
  readonly output_words: number;
  readonly output_hash: string;
  readonly finish_reason: 'ok' | 'error';
  readonly error_msg: string | null;
  readonly duration_ms: number;
  readonly epoch_id: number;
  readonly ollama_version?: string;
  readonly ollama_pid?: number | null;
  readonly vram_start_mib?: number | null;
  readonly vram_end_mib?: number | null;
  readonly dedale_aggregate: DedaleAggregate | null;
}

// ──────────────────────────────────────────────────────────────────────────────
// LOAD JSONL
// ──────────────────────────────────────────────────────────────────────────────

function loadJsonl(path: string): RunRecord[] {
  if (!existsSync(path)) return [];
  const out: RunRecord[] = [];
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    try {
      out.push(JSON.parse(line) as RunRecord);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

// ──────────────────────────────────────────────────────────────────────────────
// AGGREGATIONS
// ──────────────────────────────────────────────────────────────────────────────

interface SceneSummary {
  readonly scene_id: string;
  readonly family: string;
  readonly kind: 'trigger' | 'neutral';
  readonly runs_total: number;
  readonly runs_ok: number;
  readonly runs_error: number;
  readonly counts: Record<string, number>;
  readonly hard_fail_rate: number;          // # runs with any hard-fail flavor / runs_ok
  readonly reset_effective_rate: number;    // # runs with reset_effective>0 / runs triggering reset
  readonly c5_counts: Record<string, number>;
  readonly mean_words: number;
  readonly mean_duration_s: number;
  readonly duplicate_outputs: number;       // # distinct output_hash collisions
}

function aggregateScene(records: RunRecord[], scene_id: string): SceneSummary {
  const scene = BENCH_CORPUS.find((s) => s.id === scene_id);
  const rs = records.filter((r) => r.scene_id === scene_id);
  const ok = rs.filter((r) => r.finish_reason === 'ok');

  const counts: Record<string, number> = {};
  const c5_counts: Record<string, number> = {};
  let runsWithHardFail = 0;
  let runsTriggeringReset = 0;
  let runsEffectiveReset = 0;
  let wordsSum = 0;
  let durSum = 0;

  for (const r of ok) {
    wordsSum += r.output_words;
    durSum += r.duration_ms;
    const agg = r.dedale_aggregate;
    if (agg === null || agg === undefined) continue;
    for (const [k, v] of Object.entries(agg.counts ?? {})) {
      counts[k] = (counts[k] ?? 0) + (v ?? 0);
    }
    const c5 = agg.c5_verdict ?? 'unknown';
    c5_counts[c5] = (c5_counts[c5] ?? 0) + 1;

    const hf = (agg.counts?.['hard_fail'] ?? 0)
      + (agg.counts?.['reset_effective'] ?? 0)
      + (agg.counts?.['reset_non_effective'] ?? 0)
      + (agg.counts?.['reset_failed'] ?? 0);
    if (hf > 0) runsWithHardFail++;

    const triggered = (agg.counts?.['reset_effective'] ?? 0)
      + (agg.counts?.['reset_non_effective'] ?? 0)
      + (agg.counts?.['reset_failed'] ?? 0);
    if (triggered > 0) {
      runsTriggeringReset++;
      if ((agg.counts?.['reset_effective'] ?? 0) > 0) runsEffectiveReset++;
    }
  }

  // Duplicate outputs (byte-identical hash) — signals anti-repeat inert
  const hashCounts: Record<string, number> = {};
  for (const r of ok) {
    hashCounts[r.output_hash] = (hashCounts[r.output_hash] ?? 0) + 1;
  }
  let duplicates = 0;
  for (const v of Object.values(hashCounts)) {
    if (v > 1) duplicates += v - 1;
  }

  return {
    scene_id,
    family: scene?.family ?? 'unknown',
    kind: scene?.kind ?? 'neutral',
    runs_total: rs.length,
    runs_ok: ok.length,
    runs_error: rs.length - ok.length,
    counts,
    hard_fail_rate: ok.length > 0 ? runsWithHardFail / ok.length : 0,
    reset_effective_rate: runsTriggeringReset > 0 ? runsEffectiveReset / runsTriggeringReset : 0,
    c5_counts,
    mean_words: ok.length > 0 ? wordsSum / ok.length : 0,
    mean_duration_s: ok.length > 0 ? durSum / ok.length / 1000 : 0,
    duplicate_outputs: duplicates,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// VERDICT CALCULATION
// ──────────────────────────────────────────────────────────────────────────────

type ShadowVerdict = 'PASS' | 'FAIL' | 'INVALID';
type ResetVerdict = 'PASS_ROBUST' | 'PASS_EXPLORATORY' | 'FAIL' | 'INCONCLUSIVE' | 'INVALID';
type GlobalVerdict = 'PASS' | 'PARTIAL' | 'FAIL' | 'INVALID';

function computeShadowVerdict(scenes_S: SceneSummary[]): {
  verdict: ShadowVerdict;
  reason: string;
  triggers_detected: number;
  neutrals_false_positive: number;
} {
  if (scenes_S.length === 0) {
    return { verdict: 'INVALID', reason: 'Phase S empty', triggers_detected: 0, neutrals_false_positive: 0 };
  }
  const triggers = scenes_S.filter((s) => s.kind === 'trigger');
  const neutrals = scenes_S.filter((s) => s.kind === 'neutral');
  const triggers_detected = triggers.filter((s) => s.hard_fail_rate > 0).length;
  const neutrals_false_positive = neutrals.filter((s) => s.hard_fail_rate > 0).length;

  // PASS : au moins 1 trigger détectée (sinon oracle n'a rien vu)
  //        ET 0 neutre avec hard_fail (sinon oracle a des faux positifs)
  if (triggers_detected === 0) {
    return {
      verdict: 'FAIL',
      reason: `No trigger scene fired oracle in shadow mode (0/${triggers.length})`,
      triggers_detected,
      neutrals_false_positive,
    };
  }
  if (neutrals_false_positive > 0) {
    return {
      verdict: 'FAIL',
      reason: `${neutrals_false_positive}/${neutrals.length} neutral scenes triggered oracle (false positives)`,
      triggers_detected,
      neutrals_false_positive,
    };
  }
  return {
    verdict: 'PASS',
    reason: `Oracle correctly discriminates: ${triggers_detected}/${triggers.length} triggers detected, 0 neutral false positive`,
    triggers_detected,
    neutrals_false_positive,
  };
}

function computeResetVerdict(records_R: RunRecord[]): {
  verdict: ResetVerdict;
  reason: string;
  n_eval: number;
  n_effective: number;
  n_non_effective: number;
  n_failed: number;
  ratio_effective: number | null;
} {
  if (records_R.length === 0) {
    return {
      verdict: 'INVALID', reason: 'Phase R empty',
      n_eval: 0, n_effective: 0, n_non_effective: 0, n_failed: 0, ratio_effective: null,
    };
  }

  let n_effective = 0, n_non_effective = 0, n_failed = 0;
  for (const r of records_R) {
    const agg = r.dedale_aggregate;
    if (agg === null || agg === undefined) continue;
    n_effective += agg.counts?.['reset_effective'] ?? 0;
    n_non_effective += agg.counts?.['reset_non_effective'] ?? 0;
    n_failed += agg.counts?.['reset_failed'] ?? 0;
  }
  // n_eval = resets evalués (effective + non_effective). reset_failed exclu du ratio.
  const n_eval = n_effective + n_non_effective;
  const ratio_effective = n_eval > 0 ? n_effective / n_eval : null;

  if (n_eval === 0) {
    return {
      verdict: 'INCONCLUSIVE',
      reason: `Phase R: 0 reset evaluated (no hard_fail reached reset stage) — reset_failed=${n_failed}`,
      n_eval, n_effective, n_non_effective, n_failed, ratio_effective,
    };
  }

  // Hard fail
  if (n_eval >= N_FAIL_MIN && ratio_effective !== null && ratio_effective < RATIO_FAIL) {
    return {
      verdict: 'FAIL',
      reason: `ratio_effective=${ratio_effective.toFixed(3)} < ${RATIO_FAIL} on n_eval=${n_eval} (≥${N_FAIL_MIN})`,
      n_eval, n_effective, n_non_effective, n_failed, ratio_effective,
    };
  }
  // Robust pass
  if (n_eval >= N_ROBUST && ratio_effective !== null && ratio_effective >= RATIO_MIN) {
    return {
      verdict: 'PASS_ROBUST',
      reason: `ratio_effective=${ratio_effective.toFixed(3)} ≥ ${RATIO_MIN} on n_eval=${n_eval} (≥${N_ROBUST})`,
      n_eval, n_effective, n_non_effective, n_failed, ratio_effective,
    };
  }
  // Exploratory pass
  if (n_eval >= N_EXPLORATORY && ratio_effective !== null && ratio_effective >= RATIO_MIN) {
    return {
      verdict: 'PASS_EXPLORATORY',
      reason: `ratio_effective=${ratio_effective.toFixed(3)} ≥ ${RATIO_MIN} on n_eval=${n_eval} (≥${N_EXPLORATORY})`,
      n_eval, n_effective, n_non_effective, n_failed, ratio_effective,
    };
  }
  return {
    verdict: 'INCONCLUSIVE',
    reason: `ratio_effective=${ratio_effective?.toFixed(3) ?? 'n/a'} on n_eval=${n_eval} — below thresholds`,
    n_eval, n_effective, n_non_effective, n_failed, ratio_effective,
  };
}

function computeGlobalVerdict(shadow: ShadowVerdict, reset: ResetVerdict): GlobalVerdict {
  if (shadow === 'INVALID' || reset === 'INVALID') return 'INVALID';
  if (shadow === 'FAIL' || reset === 'FAIL') return 'FAIL';
  if (shadow === 'PASS' && (reset === 'PASS_ROBUST' || reset === 'PASS_EXPLORATORY')) return 'PASS';
  if (shadow === 'PASS' && reset === 'INCONCLUSIVE') return 'PARTIAL';
  return 'INVALID';
}

// ──────────────────────────────────────────────────────────────────────────────
// RENDER
// ──────────────────────────────────────────────────────────────────────────────

function pct(n: number, total: number): string {
  if (total === 0) return '—';
  return `${((n / total) * 100).toFixed(1)}%`;
}

function fmt(v: number | null | undefined, digits = 3): string {
  if (v === null || v === undefined) return '—';
  return v.toFixed(digits);
}

function renderMd(args: {
  readonly manifest: Record<string, unknown>;
  readonly records_S: RunRecord[];
  readonly records_R: RunRecord[];
  readonly scenes_S: SceneSummary[];
  readonly scenes_R: SceneSummary[];
  readonly shadow: ReturnType<typeof computeShadowVerdict>;
  readonly reset: ReturnType<typeof computeResetVerdict>;
  readonly global: GlobalVerdict;
}): string {
  const {
    manifest, records_S, records_R, scenes_S, scenes_R,
    shadow, reset, global: gv,
  } = args;

  const lines: string[] = [];
  const dashes = (n: number): string => '─'.repeat(n);
  lines.push(`# DÉDALE BENCH NIGHT — REPORT`);
  lines.push(``);
  lines.push(`**Bench ID** : \`${manifest.bench_id ?? BENCH_ID}\``);
  lines.push(`**Model** : \`${manifest.model ?? 'unknown'}\``);
  lines.push(`**Model digest** : \`${manifest.model_digest ?? 'unknown'}\``);
  lines.push(`**Ollama version** : \`${manifest.ollama_version ?? 'unknown'}\``);
  lines.push(`**Bench seed** : \`${manifest.bench_seed ?? 'unknown'}\``);
  lines.push(`**Options hash** : \`${manifest.options_hash ?? 'unknown'}\``);
  lines.push(`**Started** : ${manifest.started_at_iso ?? 'unknown'}`);
  lines.push(`**Reported** : ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## VERDICTS`);
  lines.push(``);
  lines.push(`| Axe | Verdict | Motif |`);
  lines.push(`|-----|---------|-------|`);
  lines.push(`| **SHADOW** | **${shadow.verdict}** | ${shadow.reason} |`);
  lines.push(`| **RESET** | **${reset.verdict}** | ${reset.reason} |`);
  lines.push(`| **GLOBAL** | **${gv}** | dérive de SHADOW ∧ RESET |`);
  lines.push(``);
  lines.push(`## KEY METRICS`);
  lines.push(``);
  lines.push(`- Phase S runs : ${records_S.length} (ok=${records_S.filter((r) => r.finish_reason === 'ok').length}, err=${records_S.filter((r) => r.finish_reason === 'error').length})`);
  lines.push(`- Phase R runs : ${records_R.length} (ok=${records_R.filter((r) => r.finish_reason === 'ok').length}, err=${records_R.filter((r) => r.finish_reason === 'error').length})`);
  lines.push(`- Shadow triggers detected : ${shadow.triggers_detected} | false positives neutrals : ${shadow.neutrals_false_positive}`);
  lines.push(`- Reset stage : n_eval=${reset.n_eval} n_effective=${reset.n_effective} n_non_effective=${reset.n_non_effective} n_failed=${reset.n_failed}`);
  lines.push(`- ratio_effective (Phase R) : ${fmt(reset.ratio_effective)}`);
  lines.push(``);

  lines.push(`## PHASE S — PER-SCENE SUMMARY`);
  lines.push(``);
  lines.push(`| Scene | Family | Kind | ok/tot | hard_fail_rate | reset_effective_rate | mean_words | mean_dur_s | dup_outputs |`);
  lines.push(`|-------|--------|------|--------|----------------|----------------------|-----------|-----------|-------------|`);
  for (const s of scenes_S) {
    lines.push(`| ${s.scene_id} | \`${s.family}\` | ${s.kind} | ${s.runs_ok}/${s.runs_total} | ${(s.hard_fail_rate * 100).toFixed(1)}% | ${(s.reset_effective_rate * 100).toFixed(1)}% | ${s.mean_words.toFixed(0)} | ${s.mean_duration_s.toFixed(1)} | ${s.duplicate_outputs} |`);
  }
  lines.push(``);

  lines.push(`## PHASE S — COUNTS BY FAMILY`);
  lines.push(``);
  const familiesS: Record<string, { ok: number; total: number; hard: number; counts: Record<string, number> }> = {};
  for (const s of scenes_S) {
    const f = s.family;
    if (!familiesS[f]) familiesS[f] = { ok: 0, total: 0, hard: 0, counts: {} };
    familiesS[f].ok += s.runs_ok;
    familiesS[f].total += s.runs_total;
    familiesS[f].hard += Math.round(s.hard_fail_rate * s.runs_ok);
    for (const [k, v] of Object.entries(s.counts)) {
      familiesS[f].counts[k] = (familiesS[f].counts[k] ?? 0) + v;
    }
  }
  lines.push(`| Family | ok/tot | hard_fail_runs | counts |`);
  lines.push(`|--------|--------|----------------|--------|`);
  for (const [fam, v] of Object.entries(familiesS)) {
    const cstr = Object.entries(v.counts).map(([k, n]) => `${k}=${n}`).join(' ');
    lines.push(`| \`${fam}\` | ${v.ok}/${v.total} | ${v.hard} | ${cstr || '(none)'} |`);
  }
  lines.push(``);

  if (scenes_R.length > 0) {
    lines.push(`## PHASE R — PER-SCENE SUMMARY (reset on triggered)`);
    lines.push(``);
    lines.push(`| Scene | Family | ok/tot | counts | c5_verdicts |`);
    lines.push(`|-------|--------|--------|--------|-------------|`);
    for (const s of scenes_R) {
      const cstr = Object.entries(s.counts).map(([k, v]) => `${k}=${v}`).join(' ');
      const vstr = Object.entries(s.c5_counts).map(([k, v]) => `${k}=${v}`).join(' ');
      lines.push(`| ${s.scene_id} | \`${s.family}\` | ${s.runs_ok}/${s.runs_total} | ${cstr || '(none)'} | ${vstr || '(none)'} |`);
    }
    lines.push(``);
  }

  lines.push(`## C5 VERDICTS (all phases combined)`);
  lines.push(``);
  const c5Combined: Record<string, number> = {};
  for (const s of [...scenes_S, ...scenes_R]) {
    for (const [k, v] of Object.entries(s.c5_counts)) {
      c5Combined[k] = (c5Combined[k] ?? 0) + v;
    }
  }
  lines.push(`| C5 Verdict | Count |`);
  lines.push(`|------------|-------|`);
  for (const [k, v] of Object.entries(c5Combined).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push(``);

  lines.push(`## INVARIANTS & RISKS`);
  lines.push(``);
  const totalDup = scenes_S.reduce((acc, s) => acc + s.duplicate_outputs, 0)
    + scenes_R.reduce((acc, s) => acc + s.duplicate_outputs, 0);
  const errorsTotal = records_S.filter((r) => r.finish_reason === 'error').length
    + records_R.filter((r) => r.finish_reason === 'error').length;
  lines.push(`- **Duplicate byte-identical outputs** (anti-repeat inert qwen3 signal) : ${totalDup}`);
  lines.push(`- **Total errors** (provider/pipeline) : ${errorsTotal}`);
  lines.push(`- **PASS thresholds (frozen)** : ratio_min=${RATIO_MIN}, n_exploratory=${N_EXPLORATORY}, n_robust=${N_ROBUST}, ratio_fail=${RATIO_FAIL}, n_fail_min=${N_FAIL_MIN}`);
  lines.push(``);

  lines.push(`## APPENDIX — CORPUS MANIFEST`);
  lines.push(``);
  lines.push(`| id | family | kind | scene_hash |`);
  lines.push(`|----|--------|------|------------|`);
  for (const m of corpusManifest()) {
    lines.push(`| ${m.id} | \`${m.family}\` | ${m.kind} | \`${m.hash.slice(0, 16)}…\` |`);
  }
  lines.push(``);

  lines.push(`## VERDICT BLOCK (OMEGA format)`);
  lines.push(``);
  lines.push('```');
  lines.push(`VERDICT :`);
  lines.push(`- Statut : ${gv === 'PASS' ? 'PASS' : gv === 'PARTIAL' ? 'PASS (partial)' : 'FAIL'}`);
  lines.push(`- Confiance : ${gv === 'PASS' ? 'Haute' : gv === 'PARTIAL' ? 'Moyenne' : 'Basse'}`);
  lines.push(`- Forces :`);
  lines.push(`  - Bench 2 phases S→R avec triple verdict (ChatGPT amendment #1)`);
  lines.push(`  - Taxonomie corpus réelle 4×2 trigger + 4×1 neutral (amendment #2)`);
  lines.push(`  - Append-only JSONL + checkpoint + dédup run_id (amendments #4-5)`);
  lines.push(`  - Oracle Dédale C1+C2+C4 discriminatif selon métriques`);
  lines.push(`- Faiblesses :`);
  lines.push(`  - Smoke test minimaliste (2 cases) — ne garantit pas les 120 runs`);
  lines.push(`  - Anti-repeat qwen3:32b inert connu (P0 2026-04-21) → duplicate_outputs=${totalDup}`);
  lines.push(`- Risques restants :`);
  lines.push(`  - Variance inter-epoch Ollama si restart échoue`);
  lines.push(`  - nvidia-smi optionnel : vram=null sur machines sans GPU NVIDIA`);
  lines.push(`- Action requise :`);
  lines.push(`  - ${gv === 'PASS' ? 'Sceller Dédale v0.55 GO production' : gv === 'PARTIAL' ? 'Étendre Phase R (seeds × scènes) pour robustness' : 'Ouvrir NCR + autopsie ratio_effective < seuil'}`);
  lines.push('```');
  lines.push(``);
  lines.push(dashes(80));
  lines.push(`Generated by analyze-bench-dedale-night.ts — ${new Date().toISOString()}`);
  return lines.join('\n');
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

function main(): void {
  if (!existsSync(SESSION)) {
    throw new Error(`[ANALYZE] Session dir not found: ${SESSION}`);
  }
  const manifestPath = join(SESSION, 'manifest.json');
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, 'utf8'))
    : {};

  const records_S = loadJsonl(join(SESSION, 'runs_S.jsonl'));
  const records_R = loadJsonl(join(SESSION, 'runs_R.jsonl'));

  console.log(`[ANALYZE] session=${BENCH_ID}`);
  console.log(`[ANALYZE] runs_S=${records_S.length} runs_R=${records_R.length}`);

  // Per-scene aggregation
  const sceneIdsS = [...new Set(records_S.map((r) => r.scene_id))].sort();
  const sceneIdsR = [...new Set(records_R.map((r) => r.scene_id))].sort();
  const scenes_S = sceneIdsS.map((id) => aggregateScene(records_S, id));
  const scenes_R = sceneIdsR.map((id) => aggregateScene(records_R, id));

  // Verdicts
  const shadow = computeShadowVerdict(scenes_S);
  const reset = computeResetVerdict(records_R);
  const gv = computeGlobalVerdict(shadow.verdict, reset.verdict);

  console.log(`[ANALYZE] SHADOW=${shadow.verdict} RESET=${reset.verdict} GLOBAL=${gv}`);

  // Render MD
  const md = renderMd({
    manifest, records_S, records_R, scenes_S, scenes_R,
    shadow, reset, global: gv,
  });

  const mdPath = join(SESSION, 'REPORT.md');
  writeFileSync(mdPath, md, 'utf8');
  console.log(`[ANALYZE] REPORT.md → ${mdPath}`);

  // Machine-readable JSON
  const jsonPath = join(SESSION, 'REPORT.json');
  writeFileSync(jsonPath, JSON.stringify({
    bench_id: BENCH_ID,
    reported_at: new Date().toISOString(),
    runs_S_count: records_S.length,
    runs_R_count: records_R.length,
    shadow, reset, global: gv,
    scenes_S, scenes_R,
  }, null, 2), 'utf8');
  console.log(`[ANALYZE] REPORT.json → ${jsonPath}`);
}

main();
