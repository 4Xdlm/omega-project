/**
 * OMEGA Phase R-5bis — Test depth features
 * Compare Flaubert (13 extraits) vs Riviera (7) vs GPT (5)
 *
 * Usage: cd packages/sovereign-engine && npx tsx scripts/r5bis-depth-test.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeDepthFeatures } from '../src/scoring/depth-features.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

// ═══════════════════════════════════════════════════════════════════════
// EXTRACT PASSAGES
// ═══════════════════════════════════════════════════════════════════════

function extractPassages(text: string, count: number, windowWords: number = 500): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < windowWords) return [text];

  const passages: string[] = [];
  for (let i = 0; i < count; i++) {
    const pos = (i + 1) / (count + 1); // evenly spaced
    const center = Math.floor(words.length * pos);
    const start = Math.max(0, center - Math.floor(windowWords / 2));
    const end = Math.min(words.length, start + windowWords);
    passages.push(words.slice(start, end).join(' '));
  }
  return passages;
}

// ═══════════════════════════════════════════════════════════════════════
// TEST CASES
// ═══════════════════════════════════════════════════════════════════════

interface Source {
  label: string;
  category: 'FLAUBERT' | 'LLM_RIVIERA' | 'LLM_GPT' | 'CANON';
  path: string;
  passageCount: number;
}

const sources: Source[] = [
  // 13 Flaubert extraits (from 4 works, ~3 per work + 1 extra from Bovary)
  { label: 'Flaubert-Bovary', category: 'FLAUBERT', path: 'omega-autopsie/corpus_r/txt/flaubert_bovary_14155.txt', passageCount: 4 },
  { label: 'Flaubert-Education', category: 'FLAUBERT', path: 'omega-autopsie/corpus_r/txt/flaubert_education_14285.txt', passageCount: 3 },
  { label: 'Flaubert-Salammbo', category: 'FLAUBERT', path: 'omega-autopsie/corpus_r/txt/flaubert_salammbo_10884.txt', passageCount: 3 },
  { label: 'Flaubert-TroisContes', category: 'FLAUBERT', path: 'omega-autopsie/corpus_r/txt/flaubert_trois_contes_10719.txt', passageCount: 3 },

  // 7 Riviera extraits
  { label: 'Riviera', category: 'LLM_RIVIERA', path: 'omega-autopsie/results_rosetta/s0/p5_test/riviera.txt', passageCount: 3 },
  { label: 'Riviera-test', category: 'LLM_RIVIERA', path: 'omega-autopsie/results_rosetta/s0/p5_test/test_riviera.txt', passageCount: 4 },

  // 5 GPT extraits
  { label: 'GPT-5.4', category: 'LLM_GPT', path: 'omega-autopsie/results_rosetta/s0/p5_test/chatgpt_5.4_correction.txt', passageCount: 2 },
  { label: 'GPT-original', category: 'LLM_GPT', path: 'omega-autopsie/results_rosetta/s0/p5_test/gpt.txt', passageCount: 3 },
];

// ═══════════════════════════════════════════════════════════════════════
// RUN
// ═══════════════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(90));
console.log('  OMEGA R-5bis — DEPTH FEATURES TEST');
console.log('  Flaubert (S) vs Riviera (LLM) vs GPT (LLM)');
console.log('='.repeat(90));
console.log('');

interface PassageResult {
  source: string;
  category: string;
  passageIndex: number;
  features: Record<string, number>;
}

const allResults: PassageResult[] = [];
const featureNames: string[] = [];

for (const src of sources) {
  const fullPath = path.resolve(ROOT, src.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`[SKIP] ${src.label} — not found`);
    continue;
  }

  const text = fs.readFileSync(fullPath, 'utf-8');
  const passages = extractPassages(text, src.passageCount, 500);

  for (let i = 0; i < passages.length; i++) {
    const features = computeDepthFeatures(passages[i]);
    allResults.push({
      source: `${src.label}[${i}]`,
      category: src.category,
      passageIndex: i,
      features,
    });

    if (featureNames.length === 0) {
      featureNames.push(...Object.keys(features).sort());
    }
  }

  console.log(`  ${src.label}: ${passages.length} passages extracted`);
}

// ═══════════════════════════════════════════════════════════════════════
// AGGREGATE BY CATEGORY
// ═══════════════════════════════════════════════════════════════════════

type Category = 'FLAUBERT' | 'LLM_RIVIERA' | 'LLM_GPT';
const categories: Category[] = ['FLAUBERT', 'LLM_RIVIERA', 'LLM_GPT'];

interface CategoryStats {
  mean: number;
  median: number;
  n: number;
}

function computeStats(vals: number[]): CategoryStats {
  const n = vals.length;
  if (n === 0) return { mean: 0, median: 0, n: 0 };
  const sorted = [...vals].sort((a, b) => a - b);
  const m = vals.reduce((a, b) => a + b, 0) / n;
  const med = n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;
  return { mean: Math.round(m * 10000) / 10000, median: Math.round(med * 10000) / 10000, n };
}

const statsByFeature: Record<string, Record<string, CategoryStats>> = {};

for (const feat of featureNames) {
  statsByFeature[feat] = {};
  for (const cat of categories) {
    const vals = allResults.filter(r => r.category === cat).map(r => r.features[feat] ?? 0);
    statsByFeature[feat][cat] = computeStats(vals);
  }
}

// ═══════════════════════════════════════════════════════════════════════
// DISPLAY
// ═══════════════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(90));
console.log('  MOYENNES PAR CATEGORIE');
console.log('='.repeat(90));
console.log('');

const hdr = `  ${'Feature'.padEnd(30)} ${'Flaubert'.padStart(10)} ${'Riviera'.padStart(10)} ${'GPT'.padStart(10)}  ${'F>R?'.padStart(5)} ${'F>G?'.padStart(5)} ${'Delta%'.padStart(8)}`;
console.log(hdr);
console.log('  ' + '-'.repeat(86));

let discriminantCount = 0;
const featureVerdicts: Array<{ feature: string; fMean: number; rMean: number; gMean: number; verdict: string; delta: number }> = [];

for (const feat of featureNames) {
  const fStats = statsByFeature[feat].FLAUBERT;
  const rStats = statsByFeature[feat].LLM_RIVIERA;
  const gStats = statsByFeature[feat].LLM_GPT;

  const fBeatR = fStats.mean > rStats.mean ? 'YES' : 'NO';
  const fBeatG = fStats.mean > gStats.mean ? 'YES' : 'NO';

  // Delta: (Flaubert - max(Riviera, GPT)) / Flaubert * 100
  const llmMax = Math.max(rStats.mean, gStats.mean);
  const delta = fStats.mean !== 0 ? ((fStats.mean - llmMax) / Math.abs(fStats.mean)) * 100 : 0;

  const verdict = fBeatR === 'YES' && fBeatG === 'YES' ? 'DISC' : (fBeatR === 'NO' && fBeatG === 'NO' ? 'INV' : 'MIX');
  if (verdict === 'DISC') discriminantCount++;

  featureVerdicts.push({
    feature: feat,
    fMean: fStats.mean,
    rMean: rStats.mean,
    gMean: gStats.mean,
    verdict,
    delta: Math.round(delta * 10) / 10,
  });

  console.log(
    `  ${feat.padEnd(30)} ${fStats.mean.toFixed(4).padStart(10)} ${rStats.mean.toFixed(4).padStart(10)} ${gStats.mean.toFixed(4).padStart(10)}  ${fBeatR.padStart(5)} ${fBeatG.padStart(5)} ${(delta >= 0 ? '+' : '') + delta.toFixed(1) + '%'}`
  );
}

// ═══════════════════════════════════════════════════════════════════════
// INDIVIDUAL RESULTS TABLE
// ═══════════════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(90));
console.log('  DETAIL PAR EXTRAIT');
console.log('='.repeat(90));
console.log('');

// Show key features
const keyFeats = ['f_clause_per_sentence', 'f_subordination_depth', 'f_info_density', 'f_variance_of_variance', 'f_negation_density', 'f_indirect_libre_score'];
const shortNames = ['Clause/S', 'SubDpth', 'InfoD', 'VarVar', 'NegD', 'IndLib'];

let detailHdr = `  ${'Source'.padEnd(28)}`;
for (const sn of shortNames) detailHdr += ` ${sn.padStart(8)}`;
console.log(detailHdr);
console.log('  ' + '-'.repeat(28 + shortNames.length * 9));

for (const r of allResults) {
  let line = `  ${r.source.padEnd(28)}`;
  for (const feat of keyFeats) {
    const v = r.features[feat] ?? 0;
    line += ` ${v.toFixed(4).padStart(8)}`;
  }
  console.log(line);
}

// ═══════════════════════════════════════════════════════════════════════
// VERDICT
// ═══════════════════════════════════════════════════════════════════════

console.log('');
console.log('='.repeat(90));
console.log('  VERDICT R-5bis');
console.log('='.repeat(90));
console.log('');
console.log(`  Features totales: ${featureNames.length}`);
console.log(`  DISCRIMINANTES (Flaubert > Riviera ET Flaubert > GPT): ${discriminantCount}`);

const discFeats = featureVerdicts.filter(v => v.verdict === 'DISC').sort((a, b) => b.delta - a.delta);
const invFeats = featureVerdicts.filter(v => v.verdict === 'INV');

if (discFeats.length > 0) {
  console.log('');
  console.log('  DISCRIMINANTES (triees par delta):');
  for (const f of discFeats) {
    console.log(`    ${f.feature.padEnd(30)} F=${f.fMean.toFixed(4)}  R=${f.rMean.toFixed(4)}  G=${f.gMean.toFixed(4)}  delta=${f.delta > 0 ? '+' : ''}${f.delta}%`);
  }
}

if (invFeats.length > 0) {
  console.log('');
  console.log('  INVERSEES (LLM > Flaubert):');
  for (const f of invFeats) {
    console.log(`    ${f.feature.padEnd(30)} F=${f.fMean.toFixed(4)}  R=${f.rMean.toFixed(4)}  G=${f.gMean.toFixed(4)}`);
  }
}

console.log('');
const overallVerdict = discriminantCount >= 5
  ? 'PASS — Depth features separent Flaubert des LLM. Integrer dans V3.'
  : discriminantCount >= 3
    ? 'PARTIAL — Certaines features discriminantes. Affiner avant integration.'
    : 'FAIL — Features de profondeur insuffisantes.';
console.log(`  VERDICT: ${overallVerdict}`);
console.log('='.repeat(90));

// Save results
const outPath = path.resolve(ROOT, 'omega-autopsie/results_phase_r/R5BIS_DEPTH_FEATURES.json');
fs.writeFileSync(outPath, JSON.stringify({
  feature_stats: statsByFeature,
  feature_verdicts: featureVerdicts,
  individual_results: allResults,
  summary: {
    total_features: featureNames.length,
    discriminant_count: discriminantCount,
    discriminant_features: discFeats.map(f => f.feature),
    inverted_features: invFeats.map(f => f.feature),
    verdict: overallVerdict,
  },
}, null, 2), 'utf-8');
console.log(`\n  Saved: ${outPath}`);
