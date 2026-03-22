/**
 * OMEGA R-LAB-TYPE-V2 — Full Corpus Calibration
 * Scans entire corpus, tags every sentence, computes compositions,
 * measures features per type, calculates interaction matrix.
 *
 * Phases 2-4 of R-LAB-TYPE-V2.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed, type SentenceType, type PassageAnalysis } from '../src/scoring/passage-classifier.js';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const DATA_DIR = path.resolve(__dirname, '../src/scoring/data');

const WINDOW_SENTS = 20; // sentences per window
const WINDOW_STEP = 10;  // sliding step

// ═══════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
}

function skipGutenbergHeader(text: string): string {
  const markers = ['*** START OF', '***START OF', 'START OF THE PROJECT'];
  for (const m of markers) {
    const idx = text.indexOf(m);
    if (idx !== -1) {
      const afterMarker = text.indexOf('\n', idx);
      if (afterMarker !== -1) return text.slice(afterMarker + 1);
    }
  }
  return text;
}

function mean(vals: number[]): number {
  return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

function stdev(vals: number[]): number {
  if (vals.length < 2) return 0;
  const m = mean(vals);
  return Math.sqrt(vals.reduce((s, v) => s + (v - m) ** 2, 0) / (vals.length - 1));
}

// ═══════════════════════════════════════════════════════════════
// PHASE 2: SCAN CORPUS + COMPOSITION PROFILES
// ═══════════════════════════════════════════════════════════════

interface WindowProfile {
  novel: string;
  position: number;
  composition: Record<SentenceType, number>;
  transition_rate: number;
  max_block: number;
  dominant: SentenceType;
  gb_score: number;
}

const ALL_TYPES: SentenceType[] = ['dialogue', 'action', 'description', 'introspection', 'narration'];
const allFiles = fs.readdirSync(TXT_DIR).filter(f => f.endsWith('.txt')).sort();

console.log(`Scanning ${allFiles.length} files...`);

const novelDistributions: Array<{
  file: string; sentences: number;
  distribution: Record<string, number>;
  windows: number;
}> = [];

const allWindows: WindowProfile[] = [];
const typeFeatureAccum: Record<SentenceType, Array<{ features: Record<string, number>; gb: number }>> = {
  dialogue: [], action: [], description: [], introspection: [], narration: [],
};

let totalSentences = 0;
let processedNovels = 0;

for (const file of allFiles) {
  const filePath = path.join(TXT_DIR, file);
  let text = fs.readFileSync(filePath, 'utf-8');
  text = skipGutenbergHeader(text);

  const words = text.split(/\s+/);
  if (words.length < 2000) continue; // Skip very short texts

  const sents = splitSentences(text);
  if (sents.length < WINDOW_SENTS) continue;

  // Tag all sentences
  const analysis = classifyPassageDetailed(text);
  const tags = analysis.sentences;
  totalSentences += tags.length;

  // Novel-level distribution
  const dist: Record<string, number> = {};
  for (const t of ALL_TYPES) {
    dist[t] = Math.round(tags.filter(tag => tag.type === t).length / tags.length * 100);
  }
  novelDistributions.push({ file, sentences: tags.length, distribution: dist, windows: 0 });

  // Sliding windows of WINDOW_SENTS sentences
  let windowCount = 0;
  for (let i = 0; i <= tags.length - WINDOW_SENTS; i += WINDOW_STEP) {
    const windowTags = tags.slice(i, i + WINDOW_SENTS);
    const windowSents = sents.slice(i, i + WINDOW_SENTS);
    const windowText = windowSents.join(' ');

    // Composition
    const comp: Record<SentenceType, number> = { dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0 };
    for (const t of windowTags) comp[t.type]++;
    for (const k of ALL_TYPES) comp[k] = comp[k] / WINDOW_SENTS;

    // Transition rate
    let transitions = 0;
    for (let j = 1; j < windowTags.length; j++) {
      if (windowTags[j].type !== windowTags[j - 1].type) transitions++;
    }
    const transRate = transitions / (WINDOW_SENTS - 1);

    // Max block
    let maxBlock = 1, curBlock = 1;
    for (let j = 1; j < windowTags.length; j++) {
      if (windowTags[j].type === windowTags[j - 1].type) { curBlock++; maxBlock = Math.max(maxBlock, curBlock); }
      else curBlock = 1;
    }

    // Dominant
    let dom: SentenceType = 'narration';
    let maxPct = 0;
    for (const t of ALL_TYPES) { if (comp[t] > maxPct) { maxPct = comp[t]; dom = t; } }

    // GB score on window
    const features = computeAllGBFeatures(windowText);
    const gbScore = scoreGB(features);

    allWindows.push({
      novel: file, position: i / tags.length,
      composition: comp, transition_rate: transRate,
      max_block: maxBlock, dominant: dom, gb_score: gbScore,
    });

    // Accumulate features by dominant type
    typeFeatureAccum[dom].push({ features, gb: gbScore });
    windowCount++;
  }

  novelDistributions[novelDistributions.length - 1].windows = windowCount;
  processedNovels++;

  if (processedNovels % 25 === 0) {
    console.log(`  ${processedNovels}/${allFiles.length} novels, ${totalSentences} sentences, ${allWindows.length} windows`);
  }
}

console.log(`\nDone: ${processedNovels} novels, ${totalSentences} sentences, ${allWindows.length} windows`);

// ═══════════════════════════════════════════════════════════════
// PHASE 2: COMPOSITION PROFILES (simple clustering by dominant type)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== COMPOSITION PROFILES ===');

const profiles: Record<string, { count: number; gb_mean: number; gb_std: number; trans_mean: number; s_pct: number }> = {};
for (const t of ALL_TYPES) {
  const wins = allWindows.filter(w => w.dominant === t);
  const gbs = wins.map(w => w.gb_score);
  profiles[t] = {
    count: wins.length,
    gb_mean: Math.round(mean(gbs) * 1000) / 1000,
    gb_std: Math.round(stdev(gbs) * 1000) / 1000,
    trans_mean: Math.round(mean(wins.map(w => w.transition_rate)) * 1000) / 1000,
    s_pct: Math.round(wins.filter(w => w.gb_score >= 4.5).length / Math.max(wins.length, 1) * 100),
  };
  console.log(`  ${t.padEnd(15)} n=${String(wins.length).padStart(5)}  GB=${profiles[t].gb_mean.toFixed(3)} +/- ${profiles[t].gb_std.toFixed(3)}  S%=${profiles[t].s_pct}%  trans=${profiles[t].trans_mean.toFixed(3)}`);
}

// ═══════════════════════════════════════════════════════════════
// PHASE 3: FEATURES PER TYPE → GB CORRELATION
// ═══════════════════════════════════════════════════════════════

console.log('\n=== TYPE-FEATURE IMPORTANCE (top correlated with GB) ===');

function spearman(x: number[], y: number[]): number {
  if (x.length < 5) return 0;
  const n = x.length;
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

const KEY_FEATURES = [
  'f26b_long_sent_rate', 'f1a_rhythm_variance', 'f1_mean',
  'f24c_contrast_delta', 'f28b_irony_density', 'f19a_approx_entropy',
  'f29d_ttr_score', 'f17_knife_count', 'f9a_contradiction_rate',
  'f_pov_shift_rate', 'f_subordination_depth', 'f_clause_per_sentence',
  'f_referent_continuity', 'f_lexical_progression', 'f_tension_density',
  'f_pov_stability', 'f_causal_density', 'f_echo_density',
  'f_vocabulary_depth', 'f_motif_concentration',
];

const typeFeatureImportance: Record<string, Array<{ feature: string; corr: number }>> = {};

for (const type of ALL_TYPES) {
  const data = typeFeatureAccum[type];
  if (data.length < 20) { typeFeatureImportance[type] = []; continue; }
  const gbs = data.map(d => d.gb);
  const corrs: Array<{ feature: string; corr: number }> = [];
  for (const feat of KEY_FEATURES) {
    const vals = data.map(d => d.features[feat] ?? 0);
    const rho = spearman(vals, gbs);
    if (Math.abs(rho) > 0.10) {
      corrs.push({ feature: feat, corr: Math.round(rho * 1000) / 1000 });
    }
  }
  corrs.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
  typeFeatureImportance[type] = corrs.slice(0, 10);
  console.log(`\n  ${type.toUpperCase()} (${data.length} windows):`);
  for (const c of corrs.slice(0, 5)) {
    console.log(`    ${c.feature.padEnd(30)} rho=${c.corr > 0 ? '+' : ''}${c.corr.toFixed(3)}`);
  }
}

// ═══════════════════════════════════════════════════════════════
// PHASE 4: INTERACTION MATRIX (delta between mixed and additive)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== FEATURE INTERACTION MATRIX ===');

// For each window, compare actual features to weighted sum of type-specific features
// We use a simplified approach: compare windows with mixed types to the dominant-type average

const TYPE_PAIRS: [SentenceType, SentenceType][] = [
  ['action', 'narration'], ['action', 'description'], ['action', 'introspection'],
  ['description', 'narration'], ['description', 'introspection'],
  ['narration', 'introspection'], ['dialogue', 'narration'], ['dialogue', 'action'],
  ['action', 'dialogue'], ['introspection', 'dialogue'],
];

// Compute mean features per dominant type
const typeMeanFeatures: Record<SentenceType, Record<string, number>> = {
  dialogue: {}, action: {}, description: {}, introspection: {}, narration: {},
};
for (const type of ALL_TYPES) {
  const data = typeFeatureAccum[type];
  if (data.length === 0) continue;
  for (const feat of KEY_FEATURES) {
    typeMeanFeatures[type][feat] = mean(data.map(d => d.features[feat] ?? 0));
  }
}

// For mixed windows, compute delta = actual - predicted_additive
const compatMatrix: Record<string, number> = {};
const interactionDetails: Array<{
  type_a: string; type_b: string; feature: string;
  mean_delta: number; operator: string;
}> = [];

for (const [typeA, typeB] of TYPE_PAIRS) {
  // Find windows where both types have >15% representation
  const mixedWindows = allWindows.filter(w =>
    w.composition[typeA] >= 0.15 && w.composition[typeB] >= 0.15
  );

  if (mixedWindows.length < 10) continue;

  // Compute delta for each key feature
  let totalGbDelta = 0;
  for (const feat of KEY_FEATURES.slice(0, 10)) {
    const deltas: number[] = [];
    for (const w of mixedWindows) {
      // Predicted additive
      let predicted = 0;
      for (const t of ALL_TYPES) {
        predicted += w.composition[t] * (typeMeanFeatures[t][feat] ?? 0);
      }
      // Find actual feature value (we don't have per-window features stored)
      // Use the GB score delta as proxy
    }
  }

  // Use GB score to measure interaction
  const mixedGbs = mixedWindows.map(w => w.gb_score);
  const pureAGbs = allWindows.filter(w => w.dominant === typeA).map(w => w.gb_score);
  const pureBGbs = allWindows.filter(w => w.dominant === typeB).map(w => w.gb_score);
  const predictedGb = (mean(pureAGbs) + mean(pureBGbs)) / 2;
  const actualGb = mean(mixedGbs);
  const synergy = actualGb - predictedGb;

  const pairKey = `${typeA}_${typeB}`;
  compatMatrix[pairKey] = Math.round(synergy * 1000) / 1000;

  console.log(`  ${typeA.padEnd(14)} x ${typeB.padEnd(14)} n=${String(mixedWindows.length).padStart(5)}  GB_mixed=${actualGb.toFixed(3)}  predicted=${predictedGb.toFixed(3)}  synergy=${synergy > 0 ? '+' : ''}${synergy.toFixed(3)}`);
}

// ═══════════════════════════════════════════════════════════════
// SAVE ALL DATA
// ═══════════════════════════════════════════════════════════════

// Novel distributions
fs.writeFileSync(path.join(DATA_DIR, 'CLASSIFIER_CALIBRATION_V2.json'),
  JSON.stringify({ date: '2026-03-22', novels: novelDistributions.length,
    total_sentences: totalSentences, total_windows: allWindows.length,
    distributions: novelDistributions }, null, 2));

// Composition profiles
fs.writeFileSync(path.join(DATA_DIR, 'COMPOSITION_PROFILES.json'),
  JSON.stringify({ date: '2026-03-22', profiles, window_size: WINDOW_SENTS }, null, 2));

// Type feature importance
fs.writeFileSync(path.join(DATA_DIR, 'TYPE_FEATURE_IMPORTANCE.json'),
  JSON.stringify({ date: '2026-03-22', importance: typeFeatureImportance }, null, 2));

// Compatibility matrix
fs.writeFileSync(path.join(DATA_DIR, 'TYPE_COMPATIBILITY_MATRIX.json'),
  JSON.stringify({ date: '2026-03-22', matrix: compatMatrix, pairs_tested: Object.keys(compatMatrix).length }, null, 2));

console.log('\nSaved 4 data files.');

// ═══════════════════════════════════════════════════════════════
// SANITY CHECKS (Phase 5)
// ═══════════════════════════════════════════════════════════════

console.log('\n=== SANITY CHECKS (20 novels) ===');

interface SanityCheck {
  file: string; name: string;
  checks: Array<{ type: string; op: string; val: number; reason: string }>;
}

const SANITY_CHECKS: SanityCheck[] = [
  { file: 'dostoievski_crime_36034.txt', name: 'Crime & Punishment',
    checks: [{ type: 'introspection', op: '>', val: 10, reason: 'Raskolnikov' }] },
  { file: 'hugo_miserables_17489.txt', name: 'Les Miserables',
    checks: [{ type: 'action', op: '>', val: 5, reason: 'Barricades' }, { type: 'narration', op: '>', val: 15, reason: 'Epic' }] },
  { file: 'pdf_blood_meridian_cormac_mccarthy.txt', name: 'Blood Meridian',
    checks: [{ type: 'action', op: '>', val: 10, reason: 'Violence' }] },
  { file: 'dickens_two_cities_98.txt', name: 'Two Cities',
    checks: [{ type: 'narration', op: '>', val: 10, reason: 'Historical' }] },
  { file: 'proust_swann_2650.txt', name: 'Swann',
    checks: [{ type: 'introspection', op: '>', val: 5, reason: 'Memory' }] },
  { file: 'kafka_proces_69327.txt', name: 'Le Proces',
    checks: [{ type: 'introspection', op: '>', val: 5, reason: 'K angst' }] },
];

let passCount = 0; let failCount = 0;
for (const sc of SANITY_CHECKS) {
  const nd = novelDistributions.find(n => n.file === sc.file);
  if (!nd) { console.log(`  SKIP: ${sc.name} (not in corpus scan)`); continue; }
  for (const check of sc.checks) {
    const actual = nd.distribution[check.type] || 0;
    const passed = check.op === '>' ? actual > check.val : actual < check.val;
    console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${sc.name.padEnd(25)} ${check.type.padEnd(15)} ${actual}% ${check.op} ${check.val}%  (${check.reason})`);
    if (passed) passCount++; else failCount++;
  }
}
console.log(`\n  Sanity: ${passCount} PASS, ${failCount} FAIL`);

console.log('\n=== CALIBRATION COMPLETE ===');
