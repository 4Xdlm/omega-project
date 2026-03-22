/**
 * OMEGA P0-BIS — Feature Parity Validation (Python vs TS)
 * Compares 42 features on 8 API bench proses against Python reference dumps.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROSE_DIR = path.resolve(__dirname, '../sessions/UnifiedBench_API_2026-03-22T11-41-04_bd46af12/prose');

const SCENES = [
  'w4-confrontation', 'w4-elegie', 'w4-panique', 'w4-contemplation',
  'w4-dialogue-tendu', 'w4-lyrique', 'w4-action', 'w4-monologue',
];

const GB_FEATURES = [
  'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
  'f24c_contrast_delta', 'f28b_irony_density', 'f27a_epistemic_rate',
  'f9a_contradiction_rate', 'f19a_approx_entropy', 'f27d_modal_score',
  'f26c_period_score', 'f_pov_shift_rate', 'f_subordination_depth',
  'f_clause_per_sentence', 'f17_knife_count', 'f29d_ttr_score',
  'f35c_hook_score', 'f36c_cliff_score',
  'ix_mean_x_subdepth', 'ix_pov_x_irony', 'ix_variance_x_longrate',
  'f_referent_continuity', 'f_referent_orphan_rate', 'f_entity_persistence',
  'f_lexical_progression', 'f_semantic_stagnation', 'f_novelty_curve_slope',
  'f_contextual_precision', 'f_rare_word_isolation',
  'f_hapax_contextual_rate', 'f_vocabulary_depth',
  'f_tension_density', 'f_desire_negation_rate', 'f_perception_conflict_rate',
  'f_pov_drift_rate', 'f_pov_rupture_rate', 'f_pov_stability',
  'f_causal_density', 'f_causal_chain_length', 'f_temporal_anchor_rate',
  'f_echo_density', 'f_lexical_callback_rate', 'f_motif_concentration',
];

function tolerance(feat: string): number {
  if (feat.startsWith('f17_') || feat.startsWith('f_causal_chain')) return 0.5;
  if (feat.startsWith('ix_')) return 1.0;
  // POV features: 1 transition difference on ~40 sentences = ~0.025 delta
  if (feat.startsWith('f_pov_')) return 0.03;
  return 0.01;
}

let totalFails = 0;
let totalChecks = 0;
const pyScores: number[] = [];
const tsScores: number[] = [];

for (const scene of SCENES) {
  const prosePath = path.join(PROSE_DIR, `${scene}.txt`);
  const pyPath = path.join(PROSE_DIR, `${scene}_features_python.json`);
  if (!fs.existsSync(prosePath) || !fs.existsSync(pyPath)) {
    console.log(`SKIP: ${scene} (missing files)`);
    continue;
  }

  const prose = fs.readFileSync(prosePath, 'utf-8');
  const pyData = JSON.parse(fs.readFileSync(pyPath, 'utf-8'));
  const pyFeats: Record<string, number> = pyData.features;

  const tsFeats = computeAllGBFeatures(prose);
  const pyScore = scoreGB(pyFeats);
  const tsScore = scoreGB(tsFeats);
  pyScores.push(pyScore);
  tsScores.push(tsScore);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`  ${scene}  (${prose.split(/\s+/).length} words)`);
  console.log(`  GB score: Python=${pyScore.toFixed(4)}  TS=${tsScore.toFixed(4)}  delta=${Math.abs(pyScore - tsScore).toFixed(4)}`);
  console.log(`${'='.repeat(70)}`);

  let sceneFails = 0;
  for (const feat of GB_FEATURES) {
    const py = pyFeats[feat] ?? 0;
    const ts = tsFeats[feat] ?? 0;
    const delta = Math.abs(py - ts);
    const tol = tolerance(feat);
    totalChecks++;
    if (delta > tol) {
      console.log(`  FAIL  ${feat.padEnd(35)} py=${String(py).padStart(10)}  ts=${String(ts).padStart(10)}  delta=${delta.toFixed(4)}  tol=${tol}`);
      sceneFails++;
      totalFails++;
    }
  }
  if (sceneFails === 0) {
    console.log(`  ALL 42 FEATURES WITHIN TOLERANCE`);
  } else {
    console.log(`  ${sceneFails} FEATURES OUT OF TOLERANCE`);
  }
}

// Spearman on GB scores
function spearman(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  function rank(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i;
      while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[sorted[k].i] = avg;
      i = j + 1;
    }
    return r;
  }
  const rx = rank(x), ry = rank(y);
  let d2 = 0;
  for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const rho = spearman(pyScores, tsScores);

console.log(`\n${'='.repeat(70)}`);
console.log(`  PARITY SUMMARY`);
console.log(`${'='.repeat(70)}`);
console.log(`  Scenes tested: ${pyScores.length}`);
console.log(`  Feature checks: ${totalChecks}`);
console.log(`  Failures: ${totalFails}`);
console.log(`  GB score Spearman (py vs ts): ${rho.toFixed(4)}`);

console.log(`\n  Scene scores:`);
for (let i = 0; i < SCENES.length && i < pyScores.length; i++) {
  const d = Math.abs(pyScores[i] - tsScores[i]);
  const ok = d < 0.05 ? 'OK' : 'FAIL';
  console.log(`    ${SCENES[i].padEnd(25)} py=${pyScores[i].toFixed(4)}  ts=${tsScores[i].toFixed(4)}  delta=${d.toFixed(4)}  [${ok}]`);
}

const maxDelta = Math.max(...pyScores.map((p, i) => Math.abs(p - tsScores[i])));
console.log(`\n  Max GB score delta: ${maxDelta.toFixed(4)}`);
console.log(`  Spearman >= 0.95: ${rho >= 0.95 ? 'PASS' : 'FAIL'}`);
console.log(`  All features within tolerance: ${totalFails === 0 ? 'PASS' : 'FAIL'}`);
console.log(`${'='.repeat(70)}`);

if (totalFails > 0 || rho < 0.95 || maxDelta >= 0.05) {
  process.exit(1);
}
