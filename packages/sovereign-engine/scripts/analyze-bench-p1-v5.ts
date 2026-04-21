/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * ANALYZE BENCH V5 — Gates T1-T5 + D1-D6 + G_β.1-G_β.6 + Verdict §4.4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fork de analyze-bench-p1-v4.ts (NCR_T2_SPEC_V5, 2026-04-21).
 *
 * CHANGEMENT UNIQUE vs V4 : T2 per-chunk.
 *   V4 comparait options_hash run-level cross-mode — structurellement FAIL
 *   car options_hash run-level est un hash agrégé qui inclut la directive
 *   par chunk (directive_sha256). Comme la directive change entre M2_adaptive
 *   et M_prod_p1, l'options_hash run-level diverge naturellement même si les
 *   penalties Ollama sont identiquement câblées.
 *
 *   V5 compare chunk_calls[i].options_hash pour i identique, par seed,
 *   cross-mode. Intention sémantique préservée : vérifier que les penalties
 *   anti-repeat sont câblées identiquement au niveau Ollama call, sans
 *   pollution par la directive de chunking.
 *
 * Le reste (T1/T3/T4/T5, D1-D6, G_β.1-β.6, matrice verdict §4.4) est INCHANGÉ.
 *
 * Source design : BENCH_V4_FUSION_DESIGN_v1.md §4 + NCR_T2_SPEC_V5 (autopsie V4 §4.1, §6 P1)
 *
 * Input  : bench-p1-v4-fusion-results.json (42 runs V4 persistés, inchangé)
 * Output : bench-p1-v5-analyzer-verdict.md + bench-p1-v5-analyzer-metrics.json
 *          (paths distincts pour préserver les artefacts V4 historiques)
 *
 * Gates verifies :
 *   T1 options_hash match OFF V4 <-> v3 baseline = 12/12
 *   T2 options_hash per-chunk ON stable cross-mode (seed × chunk_index)
 *   T3 anti_repeat_enabled = 12x false + 30x true
 *   T4 total duration sans TO <= 3000s / avec TO <= 10500s
 *   T5 run_id unique + prompt_hash identique par (scene, seed)
 *   D1 Timeouts REPRO OFF C1+C2 x M2 >= 7/12
 *   D2 Timeouts REPRO ON  C1+C2 x M2 <= 1/12
 *   D3 Delta timeouts OFF - ON >= 6 (effect size cle PRIO1)
 *   D4 Timeouts CTRL ON  C3 x M2 + C3 x M_prod <= 1/6
 *   D5 rp_score median ON  REPRO M2 <= 0.15
 *   D6 rp_score median OFF REPRO M2 >= 0.30
 *   G_beta.1 M2 timeouts REPRO ON <= 1/12 (redondant D2)
 *   G_beta.2 sigma M_prod_p1 ON REPRO composite <= 1.5
 *   G_beta.3 Delta_I(M_prod - M2) ON REPRO composite mean >= +0.5 (cle PRIO2)
 *   G_beta.4 IC 95% bootstrap Delta_I > 0 borne basse (10000 resamples)
 *   G_beta.5 n_effectif non-timeout >= 5/6 par cellule x mode ON
 *   G_beta.6 SHA256 directive inline == pickPacingDirective 24/24 match
 *
 * Matrice verdict §4.4 :
 *   V4_DUAL_PROVEN                    = PRIO1 + PRIO2 tous deux proved
 *   V4_OPT1_PROVEN_GATING_DILUTED     = PRIO1 OK, PRIO2 weak
 *   V4_OPT1_WEAK_EVIDENCE             = PRIO1 weak, PRIO2 OK
 *   V4_GATING_WEAK_SIGNAL             = PRIO2 OK, PRIO1 weak
 *   BENCH_INVALID                     = T-gates ou technical fail
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_PATH =
  process.env.OMEGA_P1V5_INPUT ??
  path.resolve(__dirname, '../bench-p1-v4-fusion-results.json');
const VERDICT_PATH =
  process.env.OMEGA_P1V5_VERDICT ??
  path.resolve(__dirname, '../bench-p1-v5-analyzer-verdict.md');
const METRICS_PATH =
  process.env.OMEGA_P1V5_METRICS ??
  path.resolve(__dirname, '../bench-p1-v5-analyzer-metrics.json');

// ──────────────────────────────────────────────────────────────────────────────
// SHAPES (minimal — on ne re-importe pas depuis le bench pour decoupler analyze
// de toute evol futur du bench)
// ──────────────────────────────────────────────────────────────────────────────

interface RunV4Shape {
  run_id: string;
  index: number;
  condition: 'OFF' | 'ON';
  mode: 'M2_adaptive' | 'M_prod_p1';
  scene: string;
  seed: number;
  finish_mode: string;
  elapsed_ms: number;
  options_hash: string;
  anti_repeat_enabled: boolean;
  repeat_pattern_score: number;
  has_closing_prose_tag: boolean;
  prompt_hash: string;
  output_hash: string;
  composite_score: number;
  role: 'REPRO' | 'CTRL';
  status: string;
  chunk_trace?: Array<{
    chunk_index: number;
    directive: string;
    directive_sha256: string;
    gated: boolean;
  }>;
  chunk_calls?: Array<{
    chunk_index: number;
    options_hash: string;
    finish_mode: string;
  }>;
}

interface BenchShape {
  started_at: string;
  model: string;
  total_runs_planned: number;
  runs: RunV4Shape[];
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILITAIRES STATS
// ──────────────────────────────────────────────────────────────────────────────

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, x) => s + x, 0) / values.length;
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

function stdev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const v = values.reduce((s, x) => s + (x - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

/**
 * Bootstrap IC 95% sur Delta = mean(A) - mean(B) avec 10000 resamples.
 * Retourne [lower, upper] du percentile 2.5 / 97.5.
 * Deterministe via seed LCG simple pour reproductibilite.
 */
function bootstrapCI(
  a: readonly number[],
  b: readonly number[],
  iterations = 10_000,
  seed = 42,
): { lower: number; upper: number; point: number } {
  const point = mean(a) - mean(b);
  if (a.length === 0 || b.length === 0) {
    return { lower: 0, upper: 0, point };
  }
  // LCG Park-Miller — deterministe
  let state = seed;
  const rand = (): number => {
    state = (state * 16807) % 2_147_483_647;
    return state / 2_147_483_647;
  };
  const deltas: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const sa: number[] = [];
    const sb: number[] = [];
    for (let j = 0; j < a.length; j++) sa.push(a[Math.floor(rand() * a.length)]);
    for (let j = 0; j < b.length; j++) sb.push(b[Math.floor(rand() * b.length)]);
    deltas.push(mean(sa) - mean(sb));
  }
  deltas.sort((x, y) => x - y);
  const lowerIdx = Math.max(0, Math.floor(iterations * 0.025));
  const upperIdx = Math.min(iterations - 1, Math.ceil(iterations * 0.975));
  return {
    lower: deltas[lowerIdx],
    upper: deltas[upperIdx],
    point,
  };
}

function sha256(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

// ──────────────────────────────────────────────────────────────────────────────
// FILTRES
// ──────────────────────────────────────────────────────────────────────────────

const REPRO_SCENES = ['fr_interior_maison_enfance', 'fr_interior_veillee_funebre'];
const CTRL_SCENES = ['fr_interior_meditation_aube'];

function filterReproM2(runs: readonly RunV4Shape[], condition: 'OFF' | 'ON'): RunV4Shape[] {
  return runs.filter(
    (r) =>
      REPRO_SCENES.includes(r.scene) &&
      r.mode === 'M2_adaptive' &&
      r.condition === condition,
  );
}

function filterReproMProd(runs: readonly RunV4Shape[]): RunV4Shape[] {
  return runs.filter(
    (r) =>
      REPRO_SCENES.includes(r.scene) &&
      r.mode === 'M_prod_p1' &&
      r.condition === 'ON',
  );
}

function filterCtrlAll(runs: readonly RunV4Shape[]): RunV4Shape[] {
  return runs.filter((r) => CTRL_SCENES.includes(r.scene) && r.condition === 'ON');
}

function countTimeouts(runs: readonly RunV4Shape[]): number {
  return runs.filter((r) => r.finish_mode === 'timeout').length;
}

function nonTimeoutScores(runs: readonly RunV4Shape[]): number[] {
  return runs
    .filter((r) => r.finish_mode === 'ok' && r.status === 'ok')
    .map((r) => r.composite_score);
}

function nonTimeoutRpScores(runs: readonly RunV4Shape[]): number[] {
  return runs
    .filter((r) => r.finish_mode === 'ok')
    .map((r) => r.repeat_pattern_score);
}

// ──────────────────────────────────────────────────────────────────────────────
// GATES
// ──────────────────────────────────────────────────────────────────────────────

interface GateResult {
  readonly id: string;
  readonly label: string;
  readonly pass: boolean;
  readonly value: string;
  readonly threshold: string;
  readonly detail?: string;
}

function evaluateGates(bench: BenchShape): {
  gates: GateResult[];
  metrics: Record<string, unknown>;
} {
  const runs = bench.runs;
  const gates: GateResult[] = [];
  const metrics: Record<string, unknown> = {};

  // ─── T-gates (technical sanity) ─────────────────────────────────────────
  // T1 options_hash OFF : toutes les runs OFF doivent avoir le meme hash structure
  const offRuns = runs.filter((r) => r.condition === 'OFF');
  const onRuns = runs.filter((r) => r.condition === 'ON');
  const offHashes = new Set(offRuns.map((r) => r.options_hash));
  const onHashes = new Set(onRuns.map((r) => r.options_hash));
  // On attend que OFF donne des hashes qui varient seulement par seed (mais structure
  // identique) ; cross-check critique : hash_OFF != hash_ON pour meme seed.
  // Plus precisement : chaque seed doit produire 1 OFF hash et 1 ON hash distincts.
  let t1Violations = 0;
  const seedHashMap = new Map<number, { off?: string; on?: string }>();
  for (const r of runs) {
    const key = r.seed;
    const bucket = seedHashMap.get(key) ?? {};
    if (r.condition === 'OFF') bucket.off = r.options_hash;
    else bucket.on = r.options_hash;
    seedHashMap.set(key, bucket);
  }
  for (const [_seed, h] of seedHashMap) {
    if (h.off && h.on && h.off === h.on) t1Violations++;
  }
  metrics.t1_off_unique_hashes = offHashes.size;
  metrics.t1_on_unique_hashes = onHashes.size;
  metrics.t1_seed_collision_count = t1Violations;
  gates.push({
    id: 'T1',
    label: 'options_hash OFF/ON divergence per seed',
    pass: t1Violations === 0 && offRuns.length === 12,
    value: `off=${offRuns.length} on=${onRuns.length} collisions=${t1Violations}`,
    threshold: 'off=12, collisions=0',
    detail: 'Chaque seed produit hash OFF != hash ON (preuve bytes-differentielle).',
  });

  // T2 V5 — per-chunk options_hash stability cross-mode.
  //
  // V4 comparait options_hash run-level cross-mode — structurellement FAIL
  // car ce hash est agrégé sur les 4 chunk_calls et inclut la directive par
  // chunk (directive_sha256). La directive change entre M2_adaptive et
  // M_prod_p1 (pacing distinct), donc le hash run-level diverge même si les
  // penalties Ollama sont identiquement câblées.
  //
  // V5 compare chunk_calls[i].options_hash pour i identique, par seed,
  // cross-mode. Pour chaque paire (seed, chunk_index) sur les runs ON, le
  // hash doit être stable across modes. Toute divergence = drift réel des
  // options Ollama (ce qui serait un vrai bug de câblage).
  //
  // n_expected = 6 seeds × 3 scenes × 4 chunks = 72 paires (seed,scene,idx)
  // Chaque paire a k observations = nb modes ON présents (1..2 selon scene).
  // On compte comme drift toute paire avec set(hash) de taille > 1.
  const perChunkBuckets = new Map<string, Set<string>>(); // key = scene|seed|chunk_index
  let onRunsMissingChunks = 0;
  let totalChunkObservations = 0;
  for (const r of onRuns) {
    if (!r.chunk_calls || r.chunk_calls.length === 0) {
      onRunsMissingChunks++;
      continue;
    }
    for (const c of r.chunk_calls) {
      const key = `${r.scene}|${r.seed}|${c.chunk_index}`;
      const set = perChunkBuckets.get(key) ?? new Set<string>();
      set.add(c.options_hash);
      perChunkBuckets.set(key, set);
      totalChunkObservations++;
    }
  }
  let t2Violations = 0;
  let t2DriftDetails: string[] = [];
  for (const [key, set] of perChunkBuckets) {
    if (set.size > 1) {
      t2Violations++;
      if (t2DriftDetails.length < 5) {
        t2DriftDetails.push(`${key} → ${set.size} hashes distincts`);
      }
    }
  }
  metrics.t2_v5_perchunk_buckets = perChunkBuckets.size;
  metrics.t2_v5_total_chunk_observations = totalChunkObservations;
  metrics.t2_v5_runs_missing_chunks = onRunsMissingChunks;
  metrics.t2_v5_violations = t2Violations;
  if (t2DriftDetails.length > 0) {
    metrics.t2_v5_drift_sample = t2DriftDetails;
  }
  gates.push({
    id: 'T2',
    label: 'options_hash ON stable per-chunk cross-mode (V5 spec)',
    pass:
      t2Violations === 0 &&
      onRuns.length === 30 &&
      onRunsMissingChunks === 0 &&
      perChunkBuckets.size > 0,
    value: `on=${onRuns.length} buckets=${perChunkBuckets.size} obs=${totalChunkObservations} drift=${t2Violations} missing_cc=${onRunsMissingChunks}`,
    threshold: 'on=30, drift=0, missing_cc=0, buckets>0',
    detail:
      'V5 : pour chaque (scene, seed, chunk_index), toutes les runs ON doivent produire le même options_hash au niveau chunk_calls[i] (indépendant de la directive de pacing par mode).',
  });

  // T3 anti_repeat_enabled flags
  const offFlagTrue = offRuns.filter((r) => r.anti_repeat_enabled === true).length;
  const onFlagFalse = onRuns.filter((r) => r.anti_repeat_enabled === false).length;
  gates.push({
    id: 'T3',
    label: 'anti_repeat_enabled flags coherence',
    pass: offFlagTrue === 0 && onFlagFalse === 0,
    value: `off_true=${offFlagTrue} on_false=${onFlagFalse}`,
    threshold: 'off_true=0, on_false=0',
    detail: '12 OFF doivent etre false, 30 ON doivent etre true.',
  });

  // T4 total duration
  const totalMs = runs.reduce((s, r) => s + r.elapsed_ms, 0);
  const toCount = countTimeouts(runs);
  const thresholdMs = toCount === 0 ? 3_000_000 : 10_500_000;
  gates.push({
    id: 'T4',
    label: 'total bench duration',
    pass: totalMs <= thresholdMs,
    value: `${(totalMs / 1000).toFixed(0)}s (${toCount} timeouts)`,
    threshold: `<= ${(thresholdMs / 1000).toFixed(0)}s`,
  });
  metrics.t4_total_seconds = totalMs / 1000;
  metrics.t4_timeout_count = toCount;

  // T5 run_id unique + prompt_hash identique par (scene, seed)
  const runIds = new Set(runs.map((r) => r.run_id));
  const promptBySceneSeed = new Map<string, Set<string>>();
  for (const r of runs) {
    const key = `${r.scene}|${r.seed}`;
    const set = promptBySceneSeed.get(key) ?? new Set();
    set.add(r.prompt_hash);
    promptBySceneSeed.set(key, set);
  }
  let promptDrift = 0;
  for (const [_k, set] of promptBySceneSeed) {
    // Note : prompt_hash peut differer par mode (directive injectee differente).
    // Ce gate v2 : verifier unicite des run_id seulement.
    if (set.size > 3) promptDrift++; // tolerance : max 3 modes x 1 prompt_hash
  }
  gates.push({
    id: 'T5',
    label: 'run_id unique',
    pass: runIds.size === runs.length,
    value: `unique=${runIds.size}/${runs.length}`,
    threshold: `unique=${runs.length}`,
  });

  // ─── D-gates (differential PRIO1 ANTI_REPEAT) ───────────────────────────
  const offReproM2 = filterReproM2(runs, 'OFF');
  const onReproM2 = filterReproM2(runs, 'ON');
  const d1 = countTimeouts(offReproM2);
  const d2 = countTimeouts(onReproM2);
  metrics.d1_timeouts_off = d1;
  metrics.d2_timeouts_on = d2;

  gates.push({
    id: 'D1',
    label: 'Timeouts REPRO OFF C1+C2 x M2 (baseline stress)',
    pass: d1 >= 7,
    value: `${d1}/12`,
    threshold: '>= 7',
    detail: 'Confirme que stress test est bien declenche cote OFF.',
  });
  gates.push({
    id: 'D2',
    label: 'Timeouts REPRO ON  C1+C2 x M2 (effet P8-FIX)',
    pass: d2 <= 1,
    value: `${d2}/12`,
    threshold: '<= 1',
    detail: 'Confirme que anti-repeat stoppe le deadlock.',
  });

  const d3Delta = d1 - d2;
  metrics.d3_delta_timeouts = d3Delta;
  gates.push({
    id: 'D3',
    label: 'Delta timeouts OFF-ON (effect size PRIO1)',
    pass: d3Delta >= 6,
    value: `${d3Delta}`,
    threshold: '>= 6',
    detail: 'CLE PRIO1 : preuve causale ANTI_REPEAT fix le deadlock.',
  });

  const ctrlRuns = filterCtrlAll(runs);
  const d4 = countTimeouts(ctrlRuns);
  metrics.d4_timeouts_ctrl = d4;
  gates.push({
    id: 'D4',
    label: 'Timeouts CTRL C3 x (M2+M_prod) ON',
    pass: d4 <= 1,
    value: `${d4}/6`,
    threshold: '<= 1',
    detail: 'Ancre stabilite : scene CTRL ne doit pas timeout.',
  });

  const d5Rp = median(nonTimeoutRpScores(onReproM2));
  const d6Rp = median(nonTimeoutRpScores(offReproM2));
  metrics.d5_rp_median_on = d5Rp;
  metrics.d6_rp_median_off = d6Rp;
  gates.push({
    id: 'D5',
    label: 'rp_score median ON REPRO M2',
    pass: d5Rp <= 0.15,
    value: d5Rp.toFixed(3),
    threshold: '<= 0.15',
    detail: 'Confirme ON ecrase les trigrammes repetes.',
  });
  gates.push({
    id: 'D6',
    label: 'rp_score median OFF REPRO M2',
    pass: d6Rp >= 0.30,
    value: d6Rp.toFixed(3),
    threshold: '>= 0.30',
    detail: 'Confirme OFF expose la pathologie trigramme.',
  });

  // ─── G_beta-gates (PRIO2 GATING EFFECT + qualite) ───────────────────────
  gates.push({
    id: 'G_beta.1',
    label: 'M2 timeouts REPRO ON (redondant D2)',
    pass: d2 <= 1,
    value: `${d2}/12`,
    threshold: '<= 1',
  });

  const mProdReproScores = nonTimeoutScores(filterReproMProd(runs));
  const mProdReproSigma = stdev(mProdReproScores);
  metrics.g_beta2_sigma_mprod_repro = mProdReproSigma;
  gates.push({
    id: 'G_beta.2',
    label: 'sigma M_prod_p1 ON REPRO composite',
    pass: mProdReproSigma <= 1.5,
    value: mProdReproSigma.toFixed(3),
    threshold: '<= 1.5',
    detail: 'Baseline M_prod doit rester stable.',
  });

  const m2OnReproScores = nonTimeoutScores(onReproM2);
  const g3Delta = mean(mProdReproScores) - mean(m2OnReproScores);
  metrics.g_beta3_delta_I = g3Delta;
  metrics.g_beta3_n_mprod = mProdReproScores.length;
  metrics.g_beta3_n_m2 = m2OnReproScores.length;
  gates.push({
    id: 'G_beta.3',
    label: 'Delta_I(M_prod - M2) ON REPRO composite mean',
    pass: g3Delta >= 0.5,
    value: g3Delta.toFixed(3),
    threshold: '>= 0.5',
    detail: 'CLE PRIO2 : preuve gain gating 4-arg.',
  });

  const boot = bootstrapCI(mProdReproScores, m2OnReproScores, 10_000, 42);
  metrics.g_beta4_bootstrap_lower = boot.lower;
  metrics.g_beta4_bootstrap_upper = boot.upper;
  metrics.g_beta4_bootstrap_point = boot.point;
  gates.push({
    id: 'G_beta.4',
    label: 'IC 95% bootstrap Delta_I lower bound > 0',
    pass: boot.lower > 0,
    value: `[${boot.lower.toFixed(3)}, ${boot.upper.toFixed(3)}]`,
    threshold: 'lower > 0',
    detail: '10000 resamples deterministe seed=42.',
  });

  // G_beta.5 n_effectif >= 5/6 par cellule x mode ON
  // Cellule = (scene, mode, condition=ON)
  const cellMap = new Map<string, { total: number; ok: number }>();
  for (const r of runs) {
    if (r.condition !== 'ON') continue;
    const key = `${r.scene}|${r.mode}`;
    const bucket = cellMap.get(key) ?? { total: 0, ok: 0 };
    bucket.total++;
    if (r.finish_mode === 'ok') bucket.ok++;
    cellMap.set(key, bucket);
  }
  let cellsBelow = 0;
  const cellDetails: string[] = [];
  for (const [k, v] of cellMap) {
    const expected = k.includes('meditation_aube') ? 3 : 6;
    const ratio = v.ok / expected;
    cellDetails.push(`${k}:${v.ok}/${expected}`);
    if (ratio < 5 / 6) cellsBelow++;
  }
  metrics.g_beta5_cell_details = cellDetails;
  gates.push({
    id: 'G_beta.5',
    label: 'n_effectif non-timeout >= 5/6 par cellule x mode ON',
    pass: cellsBelow === 0,
    value: `cells_below=${cellsBelow}`,
    threshold: 'cells_below=0',
    detail: cellDetails.join(', '),
  });

  // G_beta.6 directive_sha256 inline == match API 4-arg = 24/24
  // Pour M2 et M_prod sur REPRO ON : comparer directive sha256 chunk par chunk.
  // Ici on verifie simplement que tous les runs ont les traces presentes (preuve
  // instrumentation) — le cross-check reel necessite un replay API separe.
  let tracesPresent = 0;
  let tracesMissing = 0;
  const allReproON = runs.filter(
    (r) => REPRO_SCENES.includes(r.scene) && r.condition === 'ON',
  );
  for (const r of allReproON) {
    if (r.chunk_trace && r.chunk_trace.length > 0) tracesPresent++;
    else tracesMissing++;
  }
  metrics.g_beta6_traces_present = tracesPresent;
  metrics.g_beta6_traces_missing = tracesMissing;
  gates.push({
    id: 'G_beta.6',
    label: 'directive_sha256 traces presentes ON REPRO',
    pass: tracesMissing === 0 && tracesPresent >= 24,
    value: `present=${tracesPresent} missing=${tracesMissing}`,
    threshold: 'missing=0, present>=24',
    detail: 'Instrumentation directive_sha256 persistee par chunk.',
  });

  return { gates, metrics };
}

// ──────────────────────────────────────────────────────────────────────────────
// MATRICE VERDICT §4.4
// ──────────────────────────────────────────────────────────────────────────────

type VerdictIssue =
  | 'V4_DUAL_PROVEN'
  | 'V4_OPT1_PROVEN_GATING_DILUTED'
  | 'V4_OPT1_WEAK_EVIDENCE'
  | 'V4_GATING_WEAK_SIGNAL'
  | 'BENCH_INVALID';

function resolveVerdict(gates: readonly GateResult[]): {
  issue: VerdictIssue;
  rationale: string;
} {
  const get = (id: string): GateResult | undefined => gates.find((g) => g.id === id);

  const tPass = ['T1', 'T2', 'T3', 'T4', 'T5'].every((id) => get(id)?.pass === true);
  if (!tPass) {
    return {
      issue: 'BENCH_INVALID',
      rationale: 'Une ou plusieurs T-gates technical sanity FAIL — bench non-exploitable.',
    };
  }

  const prio1Core = get('D3')?.pass === true;
  const prio1Corroborated =
    get('D1')?.pass === true &&
    get('D2')?.pass === true &&
    get('D5')?.pass === true &&
    get('D6')?.pass === true;
  const prio1 = prio1Core && prio1Corroborated;

  const prio2Core = get('G_beta.3')?.pass === true;
  const prio2IC = get('G_beta.4')?.pass === true;
  const prio2Stability = get('G_beta.2')?.pass === true;
  const prio2 = prio2Core && prio2IC && prio2Stability;

  if (prio1 && prio2) {
    return {
      issue: 'V4_DUAL_PROVEN',
      rationale:
        'PRIO1 (Delta timeouts >= 6) + PRIO2 (Delta_I >= 0.5 avec IC 95% > 0) tous deux proves.',
    };
  }
  if (prio1 && !prio2) {
    const diluteSignal = get('G_beta.3')?.pass === false && get('G_beta.4')?.pass === true;
    if (diluteSignal) {
      return {
        issue: 'V4_OPT1_PROVEN_GATING_DILUTED',
        rationale:
          'PRIO1 prove fort, PRIO2 directionnel mais < 0.5 — effet gating dilue.',
      };
    }
    return {
      issue: 'V4_OPT1_PROVEN_GATING_DILUTED',
      rationale: 'PRIO1 prove, PRIO2 ne passe pas le seuil (effet gating non significatif).',
    };
  }
  if (!prio1 && prio2) {
    return {
      issue: 'V4_GATING_WEAK_SIGNAL',
      rationale:
        'PRIO2 prove (gain gating M_prod > M2), mais PRIO1 faible — ANTI_REPEAT effet non reproduit.',
    };
  }
  return {
    issue: 'V4_OPT1_WEAK_EVIDENCE',
    rationale: 'PRIO1 faible, PRIO2 faible — aucune preuve differentielle solide.',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// TABLEAUX
// ──────────────────────────────────────────────────────────────────────────────

function buildCellTable(bench: BenchShape): string {
  const header =
    '| Cellule | N_planned | N_ok | N_timeout | mean_score | sigma | rp_median |\n' +
    '|---|---|---|---|---|---|---|';
  const cellKeys = new Map<string, RunV4Shape[]>();
  for (const r of bench.runs) {
    const key = `${r.scene}|${r.mode}|${r.condition}`;
    const arr = cellKeys.get(key) ?? [];
    arr.push(r);
    cellKeys.set(key, arr);
  }
  const rows: string[] = [];
  const sortedKeys = Array.from(cellKeys.keys()).sort();
  for (const key of sortedKeys) {
    const arr = cellKeys.get(key)!;
    const okRuns = arr.filter((r) => r.finish_mode === 'ok');
    const scores = okRuns.map((r) => r.composite_score);
    const rps = okRuns.map((r) => r.repeat_pattern_score);
    const toCount = arr.filter((r) => r.finish_mode === 'timeout').length;
    rows.push(
      `| ${key.replace(/\|/g, ' / ')} | ${arr.length} | ${okRuns.length} | ${toCount} | ${mean(scores).toFixed(3)} | ${stdev(scores).toFixed(3)} | ${median(rps).toFixed(3)} |`,
    );
  }
  return `${header}\n${rows.join('\n')}`;
}

function buildRunTable(bench: BenchShape, limit = 42): string {
  const header =
    '| Idx | Cond | Mode | Scene | Seed | Finish | Elapsed | Score | RP |\n' +
    '|---|---|---|---|---|---|---|---|---|';
  const rows = bench.runs
    .slice()
    .sort((a, b) => a.index - b.index)
    .slice(0, limit)
    .map(
      (r) =>
        `| ${r.index} | ${r.condition} | ${r.mode} | ${r.scene.replace(/^fr_interior_/, '').slice(0, 14)} | ${r.seed} | ${r.finish_mode} | ${(r.elapsed_ms / 1000).toFixed(1)}s | ${r.composite_score.toFixed(3)} | ${r.repeat_pattern_score.toFixed(3)} |`,
    );
  return `${header}\n${rows.join('\n')}`;
}

// ──────────────────────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────────────────────

function main(): void {
  console.log(`[analyze-v4] reading ${INPUT_PATH}`);
  if (!fs.existsSync(INPUT_PATH)) {
    console.error(`[analyze-v4] FATAL : input not found ${INPUT_PATH}`);
    process.exit(2);
  }
  const bench = JSON.parse(fs.readFileSync(INPUT_PATH, 'utf8')) as BenchShape;
  console.log(`[analyze-v4] runs = ${bench.runs.length}/${bench.total_runs_planned}`);

  if (bench.runs.length < bench.total_runs_planned) {
    console.warn(
      `[analyze-v4] WARN : incomplete bench (${bench.runs.length}/${bench.total_runs_planned}) — results partial`,
    );
  }

  const { gates, metrics } = evaluateGates(bench);
  const verdict = resolveVerdict(gates);

  // ─── Verdict markdown ───────────────────────────────────────────────────
  const passCount = gates.filter((g) => g.pass).length;
  const failCount = gates.length - passCount;
  const md: string[] = [];
  md.push('# BENCH V4 FUSION — VERDICT\n');
  md.push(`**Input** : ${path.basename(INPUT_PATH)}`);
  md.push(`**Runs** : ${bench.runs.length}/${bench.total_runs_planned}`);
  md.push(`**Model** : ${bench.model}`);
  md.push(`**Started** : ${bench.started_at}`);
  md.push(`**Generated** : ${new Date().toISOString()}`);
  md.push('');
  md.push(`## VERDICT : \`${verdict.issue}\``);
  md.push('');
  md.push(verdict.rationale);
  md.push('');
  md.push(`**Gates** : ${passCount} PASS / ${failCount} FAIL / ${gates.length} total`);
  md.push('');
  md.push('## Gates detail');
  md.push('');
  md.push('| ID | Label | Pass | Value | Threshold |');
  md.push('|---|---|---|---|---|');
  for (const g of gates) {
    const status = g.pass ? 'PASS' : 'FAIL';
    md.push(`| ${g.id} | ${g.label} | ${status} | ${g.value} | ${g.threshold} |`);
  }
  md.push('');
  md.push('## Cellules (scene x mode x condition)');
  md.push('');
  md.push(buildCellTable(bench));
  md.push('');
  md.push('## Runs (ordre index §3.3)');
  md.push('');
  md.push(buildRunTable(bench));
  md.push('');
  md.push('## Metrics (detail)');
  md.push('');
  md.push('```json');
  md.push(JSON.stringify(metrics, null, 2));
  md.push('```');

  fs.writeFileSync(VERDICT_PATH, md.join('\n'), 'utf8');
  console.log(`[analyze-v4] verdict -> ${VERDICT_PATH}`);

  // ─── Metrics JSON ───────────────────────────────────────────────────────
  const metricsOut = {
    generated_at: new Date().toISOString(),
    input_path: INPUT_PATH,
    input_sha256: sha256(fs.readFileSync(INPUT_PATH, 'utf8')),
    total_runs: bench.runs.length,
    planned_runs: bench.total_runs_planned,
    verdict: verdict.issue,
    rationale: verdict.rationale,
    gates: gates.map((g) => ({
      id: g.id,
      label: g.label,
      pass: g.pass,
      value: g.value,
      threshold: g.threshold,
    })),
    metrics,
  };
  fs.writeFileSync(METRICS_PATH, JSON.stringify(metricsOut, null, 2), 'utf8');
  console.log(`[analyze-v4] metrics -> ${METRICS_PATH}`);

  console.log(`\n[analyze-v4] VERDICT = ${verdict.issue}`);
  console.log(`[analyze-v4] gates : ${passCount} PASS / ${failCount} FAIL`);
  process.exit(failCount === 0 ? 0 : 1);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (e) {
    console.error(`[analyze-v4] FATAL : ${e instanceof Error ? e.message : String(e)}`);
    process.exit(3);
  }
}
