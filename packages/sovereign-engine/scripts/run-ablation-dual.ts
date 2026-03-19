/**
 * OMEGA — Ablation Study: 4 configs × 8 MOCK scenes
 * Tests which R6 components add value.
 *
 * Config A: R6 complet (after fix)
 * Config B: R6 sans type_modifiers (all types = DESCRIPTION)
 * Config C: R6 sans position_modifiers (P_rel ignored)
 * Config D: R6 sans ARC (LOCAL seul, α=1.0, β=0.0)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { getProfileNames } from '../src/scoring/quality-profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

// Import MOCK prose from dual bench (parse from file)
const DUAL_SCRIPT = fs.readFileSync(path.resolve(__dirname, 'run-benchmark-dual.ts'), 'utf-8');

function extractProse(sceneId: string): string {
  const marker = `'${sceneId}': \``;
  const start = DUAL_SCRIPT.indexOf(marker);
  if (start === -1) return '';
  const proseStart = start + marker.length;
  const proseEnd = DUAL_SCRIPT.indexOf('`,', proseStart);
  if (proseEnd === -1) return '';
  return DUAL_SCRIPT.substring(proseStart, proseEnd);
}

const LEGACY_COMPOSITES: Record<string, number> = {
  'w4-confrontation': 88.41, 'w4-elegie': 92.42, 'w4-panique': 93.58,
  'w4-contemplation': 91.94, 'w4-dialogue-tendu': 92.40, 'w4-lyrique': 91.35,
  'w4-action': 91.10, 'w4-monologue': 87.71,
};

const SCENE_IDS = Object.keys(LEGACY_COMPOSITES);
const LABELS: Record<string, string> = {
  'w4-confrontation': 'Confrontation', 'w4-elegie': 'Élégie', 'w4-panique': 'Panique',
  'w4-contemplation': 'Contemplation', 'w4-dialogue-tendu': 'Dialogue tendu',
  'w4-lyrique': 'Desc. lyrique', 'w4-action': 'Action pure', 'w4-monologue': 'Monologue',
};

function pad(s: string, n: number): string { return s.substring(0, n).padEnd(n); }
function rpad(s: string, n: number): string { return s.substring(0, n).padStart(n); }

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function spearmanRho(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 3) return 0;
  const n = x.length;
  function ranks(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[sorted[k].i] = avgRank;
      i = j + 1;
    }
    return r;
  }
  const rx = ranks(x);
  const ry = ranks(y);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

interface ConfigResult {
  name: string;
  scores: Record<string, number>;
  median: number;
  rho: number;
}

function main(): void {
  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro
    ? new MultiStageScorer(COEFF_PATH, METRO_PATH)
    : new MultiStageScorer(COEFF_PATH);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — ABLATION STUDY (4 configs × 8 scenes)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Normalization: ${scorer.isNormalized() ? 'ACTIVE' : 'OFF'}`);
  console.log('');

  // Pre-compute features for all scenes
  const sceneData: Array<{ id: string; prose: string; features: Record<string, number>; wordCount: number }> = [];
  for (const id of SCENE_IDS) {
    const prose = extractProse(id);
    if (!prose) { console.error(`Missing prose: ${id}`); continue; }
    const features = computeTextFeatures(prose);
    sceneData.push({ id, prose, features, wordCount: prose.split(/\s+/).length });
  }

  const v3 = SCENE_IDS.map(id => LEGACY_COMPOSITES[id]);
  const configs: ConfigResult[] = [];

  // ── Config A: R6 complet ──────────────────────────────────────────
  {
    const scores: Record<string, number> = {};
    for (const s of sceneData) {
      const r = scorer.score(s.features, { wordCount: s.wordCount, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: s.prose });
      scores[s.id] = r.composite.score;
    }
    const vals = SCENE_IDS.map(id => scores[id]);
    configs.push({ name: 'A: R6 complet', scores, median: median(vals), rho: spearmanRho(v3, vals) });
  }

  // ── Config B: R6 sans type_modifiers (force DESCRIPTION) ──────────
  {
    const scores: Record<string, number> = {};
    for (const s of sceneData) {
      // Force passage_type to DESCRIPTION by not passing text (detector falls to features-only)
      // and zeroing out the features that trigger non-DESCRIPTION types
      const neutralFeatures = { ...s.features };
      // Remove dialogue/action/introspection triggers
      delete neutralFeatures['f34b_para_per_1000w'];
      delete neutralFeatures['f33a_dots_count'];
      delete neutralFeatures['f5a_verb_density'];
      delete neutralFeatures['f38c_speed_score'];
      delete neutralFeatures['f28d_sil_score'];
      delete neutralFeatures['f27d_modal_score'];
      delete neutralFeatures['f12b_tense_switch_rate'];
      neutralFeatures['f1_mean'] = 20; // prevent ACTION (f1_mean < 12)
      const r = scorer.score(neutralFeatures, { wordCount: s.wordCount, pRel: 0.5, profile: 'STRATOSPHERIQUE' });
      scores[s.id] = r.composite.score;
    }
    const vals = SCENE_IDS.map(id => scores[id]);
    configs.push({ name: 'B: sans type_mod', scores, median: median(vals), rho: spearmanRho(v3, vals) });
  }

  // ── Config C: R6 sans position_modifiers (P_rel = undefined) ──────
  {
    const scores: Record<string, number> = {};
    for (const s of sceneData) {
      const r = scorer.score(s.features, { wordCount: s.wordCount, profile: 'STRATOSPHERIQUE', text: s.prose });
      // pRel undefined → position modifiers default to 1.0
      scores[s.id] = r.composite.score;
    }
    const vals = SCENE_IDS.map(id => scores[id]);
    configs.push({ name: 'C: sans P_rel', scores, median: median(vals), rho: spearmanRho(v3, vals) });
  }

  // ── Config D: LOCAL seul (ignore ARC) ─────────────────────────────
  {
    const scores: Record<string, number> = {};
    for (const s of sceneData) {
      const r = scorer.score(s.features, { wordCount: s.wordCount, pRel: 0.5, profile: 'STRATOSPHERIQUE', text: s.prose });
      // Use LOCAL score only (α=1.0, β=0.0)
      scores[s.id] = r.local.score;
    }
    const vals = SCENE_IDS.map(id => scores[id]);
    configs.push({ name: 'D: LOCAL seul', scores, median: median(vals), rho: spearmanRho(v3, vals) });
  }

  // ── Print results ─────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log(`  ${pad('Scene', 18)} ${pad('V3', 7)} ${configs.map(c => pad(c.name.substring(0, 16), 17)).join(' ')}`);
  console.log('  ' + '─'.repeat(75));

  for (const id of SCENE_IDS) {
    const label = LABELS[id] ?? id;
    const v3Score = LEGACY_COMPOSITES[id];
    const vals = configs.map(c => rpad((c.scores[id] ?? 0).toFixed(2), 7));
    console.log(`  ${pad(label, 18)} ${rpad(v3Score.toFixed(2), 7)} ${vals.map(v => pad(v, 17)).join(' ')}`);
  }

  console.log('  ' + '─'.repeat(75));
  console.log(`  ${pad('Médiane', 18)} ${rpad(median(v3).toFixed(2), 7)} ${configs.map(c => pad(rpad(c.median.toFixed(2), 7), 17)).join(' ')}`);
  console.log(`  ${pad('Spearman ρ', 18)} ${pad('', 7)} ${configs.map(c => pad(rpad(c.rho.toFixed(4), 7), 17)).join(' ')}`);
  console.log('');

  // ── Delta analysis ────────────────────────────────────────────────

  console.log('═══════════════════════════════════════════════════════════════════════════════');
  console.log('  ABLATION DELTAS (vs Config A = baseline)');
  console.log('═══════════════════════════════════════════════════════════════════════════════');

  const baseConfig = configs[0];
  for (let i = 1; i < configs.length; i++) {
    const c = configs[i];
    const deltaMed = c.median - baseConfig.median;
    const deltaRho = c.rho - baseConfig.rho;
    const impact = Math.abs(deltaMed) > 1.0 || Math.abs(deltaRho) > 0.1 ? 'SIGNIFICANT' : 'MINOR';
    console.log(`  ${pad(c.name, 20)} Δmedian=${(deltaMed >= 0 ? '+' : '') + deltaMed.toFixed(2).padStart(6)}  Δρ=${(deltaRho >= 0 ? '+' : '') + deltaRho.toFixed(4).padStart(7)}  → ${impact}`);
  }
  console.log('');

  // ── Save results ──────────────────────────────────────────────────

  const outDir = path.resolve(__dirname, '../sessions');
  const dateStr = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const outPath = path.join(outDir, `Ablation_${dateStr}.json`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ configs: configs.map(c => ({ ...c })) }, null, 2));
  console.log(`[ABLATION] Results: ${outPath}`);
}

main();
