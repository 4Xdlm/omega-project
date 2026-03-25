/**
 * analyze-full-metric-utility.ts — Full Metric Utility Analysis
 * Phase R — Corrélations, interactions, importance marginale de TOUTES les métriques
 *
 * ANALYSE PURE — ZÉRO modification du scoring
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Usage: npx tsx scripts/analyze-full-metric-utility.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Paths ────────────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, '..', '..', '..');
const CORPUS_FEATURES = resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_FEATURES_MASTER.json');
const CORPUS_TIERS = resolve(ROOT, 'omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const SEMANTIC_FEATURES = resolve(ROOT, 'omega-autopsie/results_phase_r/R6B_SEMANTIC_FEATURES_MASTER.json');

const REPORT_PATH = resolve(__dirname, '..', 'docs', 'OMEGA_METRIC_UTILITY_REPORT.md');
const DATA_PATH = resolve(__dirname, '..', 'src', 'scoring', 'data', 'METRIC_UTILITY_ANALYSIS.json');

// ── Types ────────────────────────────────────────────────────────────────────

interface CorpusEntry {
  filename: string;
  tier: string;
  language: string;
  word_count: number;
  features: Record<string, number>;
}

interface SemanticEntry {
  filename: string;
  tier: string;
  semantic_features: Record<string, number>;
}

interface TierEntry {
  filename: string;
  tier_suggestion: string;
  language: string;
}

// ── Tier mapping ─────────────────────────────────────────────────────────────

const TIER_SCORE: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };

// ── Math utilities ───────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function stdev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - mx;
    const dy = ys[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : num / denom;
}

// Simple OLS for multiple features → returns R²
function olesR2(X: number[][], y: number[]): number {
  const n = y.length;
  const p = X[0]?.length ?? 0;
  if (n < p + 2 || p === 0) return 0;

  // Standardize
  const yMean = mean(y);
  const yc = y.map(v => v - yMean);
  const ssTotal = yc.reduce((s, v) => s + v * v, 0);
  if (ssTotal === 0) return 0;

  // Normal equations: (X'X)β = X'y
  // Using simple iterative approach for small p
  const xMeans: number[] = [];
  const xStds: number[] = [];
  for (let j = 0; j < p; j++) {
    const col = X.map(r => r[j]);
    xMeans.push(mean(col));
    xStds.push(stdev(col) || 1);
  }

  // Standardized X
  const Xs = X.map(row => row.map((v, j) => (v - xMeans[j]) / xStds[j]));

  // Compute X'X
  const XtX: number[][] = Array.from({ length: p }, () => Array(p).fill(0));
  const Xty: number[] = Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      Xty[j] += Xs[i][j] * yc[i];
      for (let k = 0; k <= j; k++) {
        XtX[j][k] += Xs[i][j] * Xs[i][k];
      }
    }
  }
  // Symmetrize
  for (let j = 0; j < p; j++) {
    for (let k = j + 1; k < p; k++) {
      XtX[j][k] = XtX[k][j];
    }
  }

  // Solve via Cholesky or fallback to simple for p <= 1
  if (p === 1) {
    const beta = XtX[0][0] === 0 ? 0 : Xty[0] / XtX[0][0];
    const pred = Xs.map(r => r[0] * beta);
    const ssRes = pred.reduce((s, v, i) => s + (yc[i] - v) ** 2, 0);
    return Math.max(0, 1 - ssRes / ssTotal);
  }

  // Gauss elimination for small systems
  const aug: number[][] = XtX.map((row, i) => [...row, Xty[i]]);
  for (let col = 0; col < p; col++) {
    // Pivot
    let maxRow = col;
    for (let row = col + 1; row < p; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];

    const pivot = aug[col][col];
    if (Math.abs(pivot) < 1e-12) continue;

    for (let row = 0; row < p; row++) {
      if (row === col) continue;
      const factor = aug[row][col] / pivot;
      for (let k = col; k <= p; k++) {
        aug[row][k] -= factor * aug[col][k];
      }
    }
  }

  const beta: number[] = aug.map((row, i) =>
    Math.abs(row[i]) < 1e-12 ? 0 : row[p] / row[i]
  );

  // Predict and compute R²
  const pred = Xs.map(row => row.reduce((s, v, j) => s + v * beta[j], 0));
  const ssRes = pred.reduce((s, v, i) => s + (yc[i] - v) ** 2, 0);
  return Math.max(0, 1 - ssRes / ssTotal);
}

// ── Feature categories ───────────────────────────────────────────────────────

const FEATURE_CATEGORIES: Record<string, string> = {
  f1_mean: 'RYTHME', f1a_rhythm_variance: 'RYTHME', f1b_rhythm_ratio: 'RYTHME',
  f1_sentence_count: 'RYTHME',
  f5_verb_count: 'VERBE', f5_adj_count: 'VERBE', f5a_verb_density: 'VERBE',
  f5b_verb_adj_ratio: 'VERBE', f5c_action_verb_ratio: 'VERBE',
  f9a_adversative_count: 'NARRATION', f9a_contradiction_rate: 'NARRATION',
  f12_tense_switches: 'NARRATION',
  f15b_redundancy_compression: 'VOCABULAIRE',
  f16_hapax_count: 'VOCABULAIRE', f16_unique_bigrams: 'VOCABULAIRE',
  f16a_bigram_rarity: 'VOCABULAIRE', f16c_lexical_surprise: 'VOCABULAIRE',
  f17_knife_count: 'IMAGE', f17_banal_count: 'IMAGE', f17_contrast_spacing: 'IMAGE',
  f18f_ellipsis_final: 'PONCTUATION',
  f19_sentences_analyzed: 'ENTROPIE', f19a_approx_entropy: 'ENTROPIE',
  f19f_window_stdev: 'ENTROPIE', f19g_consistency_ratio: 'ENTROPIE',
  f21c_diacope_rate: 'RYTHME', f21d_rhythm_echo: 'RYTHME', f21e_ritual_index: 'RYTHME',
  f24a_banal_rate: 'IMAGE', f24b_apex_rate: 'IMAGE', f24c_contrast_delta: 'IMAGE',
  f24d_apex_isolation: 'IMAGE', f24e_contrast_score: 'IMAGE',
  f25a_description_density: 'DESCRIPTION', f25b_sensory_coverage: 'DESCRIPTION',
  f25c_time_suspension: 'DESCRIPTION', f25g_description_score: 'DESCRIPTION',
  f26a_mean_sub_markers: 'SYNTAXE', f26b_long_sent_rate: 'RYTHME', f26c_period_score: 'RYTHME',
  f27a_epistemic_rate: 'MODALITÉ', f27b_conditional_rate: 'MODALITÉ',
  f27c_negation_rate: 'MODALITÉ', f27d_modal_score: 'MODALITÉ',
  f28a_sil_rate: 'INTÉRIORITÉ', f28b_irony_density: 'INTÉRIORITÉ',
  f28c_interior_rate: 'INTÉRIORITÉ', f28d_sil_score: 'INTÉRIORITÉ',
  f29a_ttr_global: 'VOCABULAIRE', f29b_ttr_window: 'VOCABULAIRE',
  f29c_ttr_stdev: 'VOCABULAIRE', f29d_ttr_score: 'VOCABULAIRE',
  f30a_passe_simple_rate: 'TEMPS', f30b_imparfait_rate: 'TEMPS',
  f30c_present_rate: 'TEMPS', f30d_ps_imp_ratio: 'TEMPS',
  f33a_dots_count: 'PONCTUATION', f33b_commas_count: 'PONCTUATION',
  f33c_dot_comma_ratio: 'PONCTUATION',
  f34a_paragraph_count: 'STRUCTURE', f34b_para_per_1000w: 'STRUCTURE',
  f35a_hook_tension: 'ACCROCHE', f35c_hook_score: 'ACCROCHE',
  f36a_cliff_tension: 'SUSPENSE', f36b_cliff_incomplete: 'SUSPENSE', f36c_cliff_score: 'SUSPENSE',
  f38a_short_para_rate: 'VITESSE', f38b_punct_density: 'VITESSE', f38c_speed_score: 'VITESSE',
};

const SEMANTIC_CATEGORIES: Record<string, string> = {
  f_causal_chain_length: 'CAUSAL', f_causal_density: 'CAUSAL',
  f_contextual_precision: 'LEXICAL', f_desire_negation_rate: 'NARRATION',
  f_echo_density: 'RYTHME', f_entity_persistence: 'NARRATION',
  f_hapax_contextual_rate: 'LEXICAL', f_lexical_callback_rate: 'LEXICAL',
  f_lexical_progression: 'LEXICAL', f_motif_concentration: 'IMAGE',
  f_novelty_curve_slope: 'LEXICAL', f_perception_conflict_rate: 'NARRATION',
  f_pov_drift_rate: 'POV', f_pov_rupture_rate: 'POV', f_pov_stability: 'POV',
  f_rare_word_isolation: 'LEXICAL', f_referent_continuity: 'NARRATION',
  f_referent_orphan_rate: 'NARRATION', f_semantic_stagnation: 'LEXICAL',
  f_temporal_anchor_rate: 'NARRATION', f_tension_density: 'NARRATION',
  f_vocabulary_depth: 'VOCABULAIRE',
};

function getCategory(f: string): string {
  return FEATURE_CATEGORIES[f] || SEMANTIC_CATEGORIES[f] || 'AUTRE';
}

// ── Metaphor/Image features ──────────────────────────────────────────────────

const IMAGE_FEATURES = [
  'f24a_banal_rate', 'f24b_apex_rate', 'f24c_contrast_delta',
  'f24d_apex_isolation', 'f24e_contrast_score',
  'f17_knife_count', 'f17_banal_count', 'f17_contrast_spacing',
  'f16c_lexical_surprise', 'f16a_bigram_rarity',
  'f_motif_concentration',
];

const RHYTHM_FEATURES = ['f1_mean', 'f1a_rhythm_variance', 'f26b_long_sent_rate', 'f26c_period_score'];
const NARRATION_FEATURES = ['f28d_sil_score', 'f25g_description_score', 'f28c_interior_rate'];

// ── Mandatory interaction pairs ──────────────────────────────────────────────

const INTERACTION_PAIRS: [string, string][] = [
  ['f24a_banal_rate', 'f1a_rhythm_variance'],
  ['f24a_banal_rate', 'f35c_hook_score'],
  ['f24a_banal_rate', 'f38c_speed_score'],
  ['f24e_contrast_score', 'f28d_sil_score'],
  ['f16c_lexical_surprise', 'f25g_description_score'],
  ['f17_knife_count', 'f1_mean'],
  ['f24b_apex_rate', 'f26b_long_sent_rate'],
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

function main(): void {
  console.log('=== OMEGA FULL METRIC UTILITY ANALYSIS ===\n');

  // ── Step 1: Load ──────────────────────────────────────────────────────────

  console.log('[1/8] Loading data...');
  const corpusRaw: CorpusEntry[] = JSON.parse(readFileSync(CORPUS_FEATURES, 'utf-8'));
  const semanticRaw: SemanticEntry[] = JSON.parse(readFileSync(SEMANTIC_FEATURES, 'utf-8'));

  // Filter FR only
  const corpusFR = corpusRaw.filter(e => e.language === 'fr');
  console.log(`  Corpus total: ${corpusRaw.length}, FR only: ${corpusFR.length}`);

  // Build semantic lookup
  const semanticMap = new Map<string, Record<string, number>>();
  for (const s of semanticRaw) {
    semanticMap.set(s.filename, s.semantic_features);
  }

  // Merge features: stylistic + semantic
  interface WorkData {
    filename: string;
    tier: string;
    tier_score: number;
    features: Record<string, number>;
  }

  const works: WorkData[] = [];
  for (const entry of corpusFR) {
    const ts = TIER_SCORE[entry.tier];
    if (ts === undefined) continue;

    const allFeatures: Record<string, number> = { ...entry.features };
    const sem = semanticMap.get(entry.filename);
    if (sem) {
      for (const [k, v] of Object.entries(sem)) {
        allFeatures[k] = v;
      }
    }
    works.push({ filename: entry.filename, tier: entry.tier, tier_score: ts, features: allFeatures });
  }

  console.log(`  Works with merged features: ${works.length}`);

  // Collect all feature names
  const featureSet = new Set<string>();
  for (const w of works) {
    for (const k of Object.keys(w.features)) featureSet.add(k);
  }
  const allFeatures = [...featureSet].sort();
  console.log(`  Total features: ${allFeatures.length}`);

  // Build vectors
  const tierScores = works.map(w => w.tier_score);
  const featureVectors: Record<string, number[]> = {};
  for (const f of allFeatures) {
    featureVectors[f] = works.map(w => w.features[f] ?? 0);
  }

  // ── Step 2: Correlation matrix ────────────────────────────────────────────

  console.log('\n[2/8] Computing correlation matrix...');

  const corrWithTier: { feature: string; r: number; category: string }[] = [];
  for (const f of allFeatures) {
    const r = pearson(featureVectors[f], tierScores);
    corrWithTier.push({ feature: f, r, category: getCategory(f) });
  }
  corrWithTier.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  console.log('\n=== TOP 20 FEATURES CORRÉLÉES À LA QUALITÉ (tier) ===');
  for (let i = 0; i < Math.min(20, corrWithTier.length); i++) {
    const { feature, r, category } = corrWithTier[i];
    const sign = r >= 0 ? '+' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${feature.padEnd(30)} r=${sign}${r.toFixed(3)}  ${category}`);
  }

  // ── Step 3: Feature families ──────────────────────────────────────────────

  console.log('\n[3/8] Identifying feature families (|r| > 0.60)...');

  const corrMatrix: Record<string, Record<string, number>> = {};
  for (const f1 of allFeatures) {
    corrMatrix[f1] = {};
    for (const f2 of allFeatures) {
      if (f1 === f2) { corrMatrix[f1][f2] = 1; continue; }
      corrMatrix[f1][f2] = pearson(featureVectors[f1], featureVectors[f2]);
    }
  }

  // Simple union-find clustering
  const parent: Record<string, string> = {};
  function find(x: string): string {
    if (!parent[x]) parent[x] = x;
    while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; }
    return x;
  }
  function union(a: string, b: string): void {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }

  for (const f1 of allFeatures) {
    for (const f2 of allFeatures) {
      if (f1 >= f2) continue;
      if (Math.abs(corrMatrix[f1][f2]) > 0.60) {
        union(f1, f2);
      }
    }
  }

  const clusters: Record<string, string[]> = {};
  for (const f of allFeatures) {
    const root = find(f);
    if (!clusters[root]) clusters[root] = [];
    clusters[root].push(f);
  }

  const families = Object.values(clusters)
    .filter(c => c.length >= 2)
    .sort((a, b) => b.length - a.length);

  console.log('\n=== FAMILLES DE FEATURES (|r| > 0.60) ===');
  for (let i = 0; i < families.length; i++) {
    const fam = families[i];
    const cat = getCategory(fam[0]);
    console.log(`  Famille ${i + 1} (${cat}): ${fam.join(', ')}`);
  }

  // ── Step 4: Image/metaphor focus ──────────────────────────────────────────

  console.log('\n[4/8] Focus métaphore/image...');

  const tiers = ['S', 'A', 'B', 'C', 'D'];
  const imageAnalysis: Record<string, {
    corr_tier: number;
    corr_rhythm: Record<string, number>;
    corr_narration: Record<string, number>;
    mean_by_tier: Record<string, number>;
    std_by_tier: Record<string, number>;
  }> = {};

  const availableImageFeatures = IMAGE_FEATURES.filter(f => featureVectors[f]);

  for (const f of availableImageFeatures) {
    const corrRhythm: Record<string, number> = {};
    for (const rf of RHYTHM_FEATURES) {
      if (featureVectors[rf]) corrRhythm[rf] = pearson(featureVectors[f], featureVectors[rf]);
    }

    const corrNarration: Record<string, number> = {};
    for (const nf of NARRATION_FEATURES) {
      if (featureVectors[nf]) corrNarration[nf] = pearson(featureVectors[f], featureVectors[nf]);
    }

    const meanByTier: Record<string, number> = {};
    const stdByTier: Record<string, number> = {};
    for (const t of tiers) {
      const vals = works.filter(w => w.tier === t).map(w => w.features[f] ?? 0);
      meanByTier[t] = mean(vals);
      stdByTier[t] = stdev(vals);
    }

    imageAnalysis[f] = {
      corr_tier: pearson(featureVectors[f], tierScores),
      corr_rhythm: corrRhythm,
      corr_narration: corrNarration,
      mean_by_tier: meanByTier,
      std_by_tier: stdByTier,
    };
  }

  console.log('\n=== FOCUS IMAGE/MÉTAPHORE ===');
  console.log(`${'Feature'.padEnd(28)} r(tier)  mean_A  mean_B  mean_C  mean_D`);
  for (const f of availableImageFeatures) {
    const a = imageAnalysis[f];
    if (!a) continue;
    const line = `${f.padEnd(28)} ${a.corr_tier >= 0 ? '+' : ''}${a.corr_tier.toFixed(3)}  ${(a.mean_by_tier['A'] ?? 0).toFixed(3).padStart(6)}  ${(a.mean_by_tier['B'] ?? 0).toFixed(3).padStart(6)}  ${(a.mean_by_tier['C'] ?? 0).toFixed(3).padStart(6)}  ${(a.mean_by_tier['D'] ?? 0).toFixed(3).padStart(6)}`;
    console.log(`  ${line}`);
  }

  // ── Step 5: Stepwise regression ───────────────────────────────────────────

  console.log('\n[5/8] Utilité marginale (stepwise regression)...');

  // Start with most correlated feature, add by R² gain
  const remaining = new Set(corrWithTier.map(c => c.feature));
  const selected: string[] = [];
  const stepwiseResults: { step: number; feature: string; r2: number; gain: number }[] = [];
  let currentR2 = 0;

  const MAX_STEPS = Math.min(30, allFeatures.length);

  for (let step = 0; step < MAX_STEPS; step++) {
    let bestFeature = '';
    let bestR2 = currentR2;

    for (const f of remaining) {
      const testSet = [...selected, f];
      const X = works.map(w => testSet.map(feat => w.features[feat] ?? 0));
      const r2 = olesR2(X, tierScores);
      if (r2 > bestR2) {
        bestR2 = r2;
        bestFeature = f;
      }
    }

    if (!bestFeature || bestR2 - currentR2 < 0.0005) break;

    const gain = bestR2 - currentR2;
    selected.push(bestFeature);
    remaining.delete(bestFeature);
    stepwiseResults.push({ step: step + 1, feature: bestFeature, r2: bestR2, gain });
    currentR2 = bestR2;
  }

  console.log('\n=== UTILITÉ MARGINALE (R² cumulé) ===');
  for (const s of stepwiseResults) {
    const isImage = IMAGE_FEATURES.includes(s.feature) ? ' ← IMAGE' : '';
    console.log(`  Step ${String(s.step).padStart(2)}: +${s.feature.padEnd(30)} R²=${s.r2.toFixed(3)}  gain=+${s.gain.toFixed(3)}${isImage}`);
  }

  // ── Step 6: Interaction pairs ─────────────────────────────────────────────

  console.log('\n[6/8] Interactions critiques...');

  const interactionResults: {
    pair: string;
    r_A: number;
    r_B: number;
    r_AB_additive: number;
    r_AB_interaction: number;
    synergy: number;
  }[] = [];

  for (const [fA, fB] of INTERACTION_PAIRS) {
    if (!featureVectors[fA] || !featureVectors[fB]) continue;

    const rA = pearson(featureVectors[fA], tierScores);
    const rB = pearson(featureVectors[fB], tierScores);

    // Additive model R²
    const Xadd = works.map(w => [w.features[fA] ?? 0, w.features[fB] ?? 0]);
    const r2add = olesR2(Xadd, tierScores);

    // Interaction model R² (fA, fB, fA*fB)
    const Xint = works.map(w => {
      const a = w.features[fA] ?? 0;
      const b = w.features[fB] ?? 0;
      return [a, b, a * b];
    });
    const r2int = olesR2(Xint, tierScores);

    interactionResults.push({
      pair: `${fA} × ${fB}`,
      r_A: rA,
      r_B: rB,
      r_AB_additive: r2add,
      r_AB_interaction: r2int,
      synergy: r2int - r2add,
    });
  }

  // Add top synergistic pairs from image × quality features
  const topQuality = corrWithTier.slice(0, 10).map(c => c.feature);
  for (const imgF of availableImageFeatures) {
    for (const qF of topQuality) {
      if (imgF === qF) continue;
      if (INTERACTION_PAIRS.some(([a, b]) => (a === imgF && b === qF) || (a === qF && b === imgF))) continue;
      if (!featureVectors[imgF] || !featureVectors[qF]) continue;

      const Xadd = works.map(w => [w.features[imgF] ?? 0, w.features[qF] ?? 0]);
      const r2add = olesR2(Xadd, tierScores);
      const Xint = works.map(w => {
        const a = w.features[imgF] ?? 0;
        const b = w.features[qF] ?? 0;
        return [a, b, a * b];
      });
      const r2int = olesR2(Xint, tierScores);

      if (r2int - r2add > 0.005) {
        interactionResults.push({
          pair: `${imgF} × ${qF}`,
          r_A: pearson(featureVectors[imgF], tierScores),
          r_B: pearson(featureVectors[qF], tierScores),
          r_AB_additive: r2add,
          r_AB_interaction: r2int,
          synergy: r2int - r2add,
        });
      }
    }
  }

  interactionResults.sort((a, b) => b.synergy - a.synergy);

  console.log('\n=== INTERACTIONS CRITIQUES (top 15) ===');
  console.log(`${'Paire'.padEnd(55)} R²(add)  R²(int)  synergy`);
  for (let i = 0; i < Math.min(15, interactionResults.length); i++) {
    const ir = interactionResults[i];
    console.log(`  ${ir.pair.padEnd(53)} ${ir.r_AB_additive.toFixed(3)}    ${ir.r_AB_interaction.toFixed(3)}    ${ir.synergy >= 0 ? '+' : ''}${ir.synergy.toFixed(3)}`);
  }

  // ── Step 7: Cohen's d (Tier A vs rest) ────────────────────────────────────

  console.log('\n[7/8] Cohen\'s d — Tier A vs reste...');

  const worksA = works.filter(w => w.tier === 'A');
  const worksBCD = works.filter(w => w.tier !== 'A' && w.tier !== 'S');

  const cohensD: { feature: string; d: number; direction: string; category: string }[] = [];

  for (const f of allFeatures) {
    const valsA = worksA.map(w => w.features[f] ?? 0);
    const valsBCD = worksBCD.map(w => w.features[f] ?? 0);
    const allVals = [...valsA, ...valsBCD];
    const sdGlobal = stdev(allVals);

    if (sdGlobal < 1e-10) continue;

    const d = (mean(valsA) - mean(valsBCD)) / sdGlobal;
    const direction = d > 0 ? 'Les maîtres ont PLUS' : 'Les maîtres ont MOINS';

    cohensD.push({ feature: f, d, direction, category: getCategory(f) });
  }

  cohensD.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));

  console.log('\n=== CE QUI DISTINGUE TIER A DES AUTRES (Cohen\'s d) ===');
  for (let i = 0; i < Math.min(25, cohensD.length); i++) {
    const { feature, d, direction, category } = cohensD[i];
    const sign = d >= 0 ? '+' : '';
    console.log(`  ${String(i + 1).padStart(2)}. ${feature.padEnd(30)} d=${sign}${d.toFixed(3)}  ${direction}  ${category}`);
  }

  // ── Step 8: Generate report ───────────────────────────────────────────────

  console.log('\n[8/8] Generating report...');

  const reportLines: string[] = [];
  const r = (s: string) => reportLines.push(s);

  r('# OMEGA — Full Metric Utility Report');
  r(`**Date**: ${new Date().toISOString().split('T')[0]}`);
  r(`**Works analyzed**: ${works.length} (FR only)`);
  r(`**Features**: ${allFeatures.length} (${Object.keys(FEATURE_CATEGORIES).length} stylistic + ${Object.keys(SEMANTIC_CATEGORIES).length} semantic)`);
  r(`**Standard**: NASA-Grade L4 / DO-178C Level A`);
  r('');

  // Section 1: Top correlations
  r('## 1. Top 30 Features Corrélées à la Qualité');
  r('');
  r('| # | Feature | r(tier) | Category |');
  r('|---|---------|---------|----------|');
  for (let i = 0; i < Math.min(30, corrWithTier.length); i++) {
    const { feature, r: corr, category } = corrWithTier[i];
    r(`| ${i + 1} | ${feature} | ${corr >= 0 ? '+' : ''}${corr.toFixed(3)} | ${category} |`);
  }
  r('');

  // Section 2: Families
  r('## 2. Familles de Features (|r| > 0.60)');
  r('');
  for (let i = 0; i < families.length; i++) {
    const fam = families[i];
    r(`**Famille ${i + 1}** (${getCategory(fam[0])}): ${fam.join(', ')}`);
    r('');
  }

  // Section 3: Stepwise
  r('## 3. Utilité Marginale (Stepwise R²)');
  r('');
  r('| Step | Feature | R² cumulé | Gain | Image? |');
  r('|------|---------|-----------|------|--------|');
  for (const s of stepwiseResults) {
    const isImg = IMAGE_FEATURES.includes(s.feature) ? 'OUI' : '';
    r(`| ${s.step} | ${s.feature} | ${s.r2.toFixed(3)} | +${s.gain.toFixed(3)} | ${isImg} |`);
  }
  r('');

  // Section 4: Image focus
  r('## 4. Focus Métaphore/Image');
  r('');
  r('| Feature | r(tier) | mean_S | mean_A | mean_B | mean_C | mean_D |');
  r('|---------|---------|--------|--------|--------|--------|--------|');
  for (const f of availableImageFeatures) {
    const a = imageAnalysis[f];
    if (!a) continue;
    r(`| ${f} | ${a.corr_tier >= 0 ? '+' : ''}${a.corr_tier.toFixed(3)} | ${(a.mean_by_tier['S'] ?? 0).toFixed(3)} | ${(a.mean_by_tier['A'] ?? 0).toFixed(3)} | ${(a.mean_by_tier['B'] ?? 0).toFixed(3)} | ${(a.mean_by_tier['C'] ?? 0).toFixed(3)} | ${(a.mean_by_tier['D'] ?? 0).toFixed(3)} |`);
  }
  r('');

  // Cross-correlations for image features
  r('### Corrélations croisées (Image × Rythme)');
  r('');
  r(`| Feature | ${RHYTHM_FEATURES.join(' | ')} |`);
  r(`|---------|${RHYTHM_FEATURES.map(() => '---').join('|')}|`);
  for (const f of availableImageFeatures) {
    const a = imageAnalysis[f];
    if (!a) continue;
    const vals = RHYTHM_FEATURES.map(rf => {
      const v = a.corr_rhythm[rf];
      return v !== undefined ? `${v >= 0 ? '+' : ''}${v.toFixed(3)}` : 'N/A';
    });
    r(`| ${f} | ${vals.join(' | ')} |`);
  }
  r('');

  // Section 5: Interactions
  r('## 5. Interactions Critiques');
  r('');
  r('| Paire | r(A) | r(B) | R²(add) | R²(int) | Synergy |');
  r('|-------|------|------|---------|---------|---------|');
  for (let i = 0; i < Math.min(15, interactionResults.length); i++) {
    const ir = interactionResults[i];
    r(`| ${ir.pair} | ${ir.r_A >= 0 ? '+' : ''}${ir.r_A.toFixed(3)} | ${ir.r_B >= 0 ? '+' : ''}${ir.r_B.toFixed(3)} | ${ir.r_AB_additive.toFixed(3)} | ${ir.r_AB_interaction.toFixed(3)} | ${ir.synergy >= 0 ? '+' : ''}${ir.synergy.toFixed(3)} |`);
  }
  r('');

  // Section 6: Cohen's d
  r('## 6. Cohen\'s d — Tier A vs Reste');
  r('');
  r('| # | Feature | d | Direction | Category |');
  r('|---|---------|---|-----------|----------|');
  for (let i = 0; i < Math.min(30, cohensD.length); i++) {
    const { feature, d, direction, category } = cohensD[i];
    r(`| ${i + 1} | ${feature} | ${d >= 0 ? '+' : ''}${d.toFixed(3)} | ${direction} | ${category} |`);
  }
  r('');

  // Section 7: Recommendations
  r('## 7. Recommandations Poids SII');
  r('');
  r('Basé sur les données empiriques de cette analyse :');
  r('');

  const topStepwise = stepwiseResults.slice(0, 10);
  const topCohen = cohensD.slice(0, 10);
  const topCorr = corrWithTier.slice(0, 10);

  // Score features by combined importance
  const importanceScore: Record<string, number> = {};
  for (const s of topStepwise) {
    importanceScore[s.feature] = (importanceScore[s.feature] || 0) + s.gain * 100;
  }
  for (const c of topCohen) {
    importanceScore[c.feature] = (importanceScore[c.feature] || 0) + Math.abs(c.d);
  }
  for (const c of topCorr) {
    importanceScore[c.feature] = (importanceScore[c.feature] || 0) + Math.abs(c.r);
  }

  const ranked = Object.entries(importanceScore)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);

  r('| Feature | Importance combinée | Catégorie |');
  r('|---------|--------------------:|-----------|');
  for (const [f, score] of ranked) {
    r(`| ${f} | ${score.toFixed(3)} | ${getCategory(f)} |`);
  }
  r('');
  r('---');
  r('');
  r('*Généré par `scripts/analyze-full-metric-utility.ts` — ANALYSE PURE, 0 modification du scoring.*');

  // Write report
  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, reportLines.join('\n'), 'utf-8');
  console.log(`\n  Report saved: ${REPORT_PATH}`);

  // ── Save JSON data ────────────────────────────────────────────────────────

  const analysisData = {
    generated: new Date().toISOString(),
    works_count: works.length,
    features_count: allFeatures.length,
    correlations_with_tier: corrWithTier.slice(0, 50).map(c => ({
      feature: c.feature, r: +c.r.toFixed(4), category: c.category,
    })),
    families: families.map((fam, i) => ({
      id: i + 1, category: getCategory(fam[0]), features: fam,
    })),
    stepwise: stepwiseResults.map(s => ({
      step: s.step, feature: s.feature, r2: +s.r2.toFixed(4), gain: +s.gain.toFixed(4),
    })),
    image_analysis: Object.fromEntries(
      availableImageFeatures.map(f => [f, {
        corr_tier: +(imageAnalysis[f]?.corr_tier ?? 0).toFixed(4),
        mean_by_tier: Object.fromEntries(
          Object.entries(imageAnalysis[f]?.mean_by_tier ?? {}).map(([k, v]) => [k, +v.toFixed(4)])
        ),
        corr_rhythm: Object.fromEntries(
          Object.entries(imageAnalysis[f]?.corr_rhythm ?? {}).map(([k, v]) => [k, +v.toFixed(4)])
        ),
      }])
    ),
    interactions: interactionResults.slice(0, 20).map(ir => ({
      pair: ir.pair,
      r_A: +ir.r_A.toFixed(4),
      r_B: +ir.r_B.toFixed(4),
      r2_additive: +ir.r_AB_additive.toFixed(4),
      r2_interaction: +ir.r_AB_interaction.toFixed(4),
      synergy: +ir.synergy.toFixed(4),
    })),
    cohens_d: cohensD.slice(0, 30).map(c => ({
      feature: c.feature, d: +c.d.toFixed(4), category: c.category,
    })),
  };

  writeFileSync(DATA_PATH, JSON.stringify(analysisData, null, 2), 'utf-8');
  console.log(`  Data saved: ${DATA_PATH}`);

  console.log('\n=== ANALYSIS COMPLETE ===');
}

main();
