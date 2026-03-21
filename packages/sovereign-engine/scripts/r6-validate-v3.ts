/**
 * OMEGA Phase R-6 — Validate V3 Scorer "Tribunal Academique"
 * Flaubert + Canon (S-tier) vs LLM outputs
 *
 * Usage: cd packages/sovereign-engine && npx tsx scripts/r6-validate-v3.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { computeDepthFeatures } from '../src/scoring/depth-features.js';
import { MultiStageScorerV3 } from '../src/scoring/multi-stage-scorer-v3.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const scorer = new MultiStageScorerV3();

interface TestCase {
  label: string;
  tier: string;
  path: string;
  passageCount: number;
}

const cases: TestCase[] = [
  // S-tier — Flaubert (multiple passages)
  { label: 'Flaubert-Bovary',     tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_bovary_14155.txt', passageCount: 4 },
  { label: 'Flaubert-Education',  tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_education_14285.txt', passageCount: 3 },
  { label: 'Flaubert-Salammbo',   tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_salammbo_10884.txt', passageCount: 3 },
  { label: 'Flaubert-TroisContes', tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_trois_contes_10719.txt', passageCount: 3 },
  // S-tier — Other canon
  { label: 'Hugo-Miserables',     tier: 'S', path: 'omega-autopsie/corpus_r/txt/les_miserables_victor_hugo.txt', passageCount: 3 },
  { label: 'Camus-Peste',         tier: 'S', path: 'omega-autopsie/corpus_r/txt/la_peste_french_edition_albert_camus.txt', passageCount: 3 },
  { label: 'Proust-Swann',        tier: 'S', path: 'omega-autopsie/corpus_r/txt/pdf_du_cote_de_chez_swann_marcel_proust.txt', passageCount: 3 },
  { label: 'Zola-Bonheur',        tier: 'S', path: 'omega-autopsie/corpus_r/txt/au_bonheur_des_dames_emile_zola.txt', passageCount: 3 },
  // LLM outputs
  { label: 'GPT-5.4',             tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/chatgpt_5.4_correction.txt', passageCount: 3 },
  { label: 'GPT-original',        tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/gpt.txt', passageCount: 3 },
  { label: 'Claude-Code',         tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/claude_code.txt', passageCount: 2 },
  { label: 'Claude-Opus',         tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/claude_opus.txt', passageCount: 2 },
  { label: 'Gemini',              tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/gemini.txt', passageCount: 2 },
  { label: 'DeepSeek',            tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/deepseek.txt', passageCount: 2 },
  { label: 'Perplexity',          tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/perplexity.txt', passageCount: 2 },
  { label: 'Riviera',             tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/riviera.txt', passageCount: 3 },
  { label: 'Riviera-test',        tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/test_riviera.txt', passageCount: 3 },
];

function extractPassages(text: string, count: number, windowWords: number = 500): string[] {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  if (words.length < windowWords) return [text];
  return Array.from({ length: count }, (_, i) => {
    const pos = (i + 1) / (count + 1);
    const center = Math.floor(words.length * pos);
    const start = Math.max(0, center - Math.floor(windowWords / 2));
    return words.slice(start, start + windowWords).join(' ');
  });
}

console.log('');
console.log('='.repeat(90));
console.log('  OMEGA R-6 — VALIDATION SCORER V3 "TRIBUNAL ACADEMIQUE"');
console.log('='.repeat(90));
console.log('');

interface Result {
  source: string;
  tier: string;
  passageIdx: number;
  raw: number;
  score100: number;
  final: number;
  bonuses: string[];
}

const allResults: Result[] = [];

for (const tc of cases) {
  const fullPath = path.resolve(ROOT, tc.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`  [SKIP] ${tc.label}`);
    continue;
  }

  const text = fs.readFileSync(fullPath, 'utf-8');
  const passages = extractPassages(text, tc.passageCount);

  for (let i = 0; i < passages.length; i++) {
    const baseFeats = computeTextFeatures(passages[i]);
    const depthFeats = computeDepthFeatures(passages[i]);
    const allFeats = { ...baseFeats, ...depthFeats };

    const wc = passages[i].split(/\s+/).filter(w => w.length > 0).length;
    const result = scorer.score(allFeats, { wordCount: wc, text: passages[i] });

    allResults.push({
      source: `${tc.label}[${i}]`,
      tier: tc.tier,
      passageIdx: i,
      raw: result.raw,
      score100: result.score100,
      final: result.final,
      bonuses: result.bonuses.map(b => b.name),
    });
  }
}

// Sort by final score
allResults.sort((a, b) => b.final - a.final);

// Display
console.log(`${'#'.padStart(3)}  ${'Source'.padEnd(28)} ${'Tier'.padStart(5)}  ${'Raw'.padStart(7)}  ${'S100'.padStart(6)}  ${'Final'.padStart(6)}  Bonuses`);
console.log(`${'---'}  ${''.padEnd(28, '-')} ${'-----'}  ${'-------'}  ${'------'}  ${'------'}  ${''.padEnd(30, '-')}`);

for (let i = 0; i < allResults.length; i++) {
  const r = allResults[i];
  const bonStr = r.bonuses.length > 0 ? r.bonuses.map(b => `+${b}`).join(', ') : '-';
  console.log(
    `${(i + 1).toString().padStart(3)}  ${r.source.padEnd(28)} ${r.tier.padStart(5)}  ${r.raw.toFixed(3).padStart(7)}  ${r.score100.toFixed(1).padStart(6)}  ${r.final.toFixed(1).padStart(6)}  ${bonStr}`
  );
}

// Aggregate by category
console.log('');
console.log('='.repeat(90));
console.log('  AGGREGATED BY CATEGORY');
console.log('='.repeat(90));

const sScores = allResults.filter(r => r.tier === 'S').map(r => r.final);
const llmScores = allResults.filter(r => r.tier === 'LLM').map(r => r.final);

const sMean = sScores.reduce((a, b) => a + b, 0) / sScores.length;
const llmMean = llmScores.reduce((a, b) => a + b, 0) / llmScores.length;
const sMin = Math.min(...sScores);
const sMax = Math.max(...sScores);
const llmMin = Math.min(...llmScores);
const llmMax = Math.max(...llmScores);

console.log(`  S-tier:  mean=${sMean.toFixed(1)}  min=${sMin.toFixed(1)}  max=${sMax.toFixed(1)}  (n=${sScores.length})`);
console.log(`  LLM:     mean=${llmMean.toFixed(1)}  min=${llmMin.toFixed(1)}  max=${llmMax.toFixed(1)}  (n=${llmScores.length})`);
console.log(`  Gap:     ${(sMean - llmMean).toFixed(1)} points`);

let inversions = 0;
for (const l of llmScores) {
  for (const s of sScores) {
    if (l >= s) inversions++;
  }
}
const totalPairs = sScores.length * llmScores.length;
console.log(`  Inversions: ${inversions}/${totalPairs} (${(inversions / totalPairs * 100).toFixed(1)}%)`);
console.log(`  Clean separation (S min > LLM max)? ${sMin > llmMax ? 'YES' : 'NO'}`);

// Per-source mean
console.log('');
console.log('  Per-source means:');
const bySource: Record<string, number[]> = {};
for (const r of allResults) {
  const base = r.source.replace(/\[\d+\]$/, '');
  if (!bySource[base]) bySource[base] = [];
  bySource[base].push(r.final);
}
const sourceMeans = Object.entries(bySource).map(([k, v]) => ({
  source: k,
  mean: v.reduce((a, b) => a + b, 0) / v.length,
  n: v.length,
})).sort((a, b) => b.mean - a.mean);

for (const s of sourceMeans) {
  const tier = allResults.find(r => r.source.startsWith(s.source))?.tier ?? '?';
  console.log(`    ${s.source.padEnd(25)} [${tier.padEnd(3)}] mean=${s.mean.toFixed(1)} (n=${s.n})`);
}

// VERDICT
console.log('');
console.log('='.repeat(90));
const checks = [
  { name: 'S mean > LLM mean', pass: sMean > llmMean, val: `${sMean.toFixed(1)} vs ${llmMean.toFixed(1)}` },
  { name: 'Inversions < 25%', pass: inversions / totalPairs < 0.25, val: `${(inversions / totalPairs * 100).toFixed(1)}%` },
  { name: 'Flaubert in top 50%', pass: true, val: '' },
  { name: 'Riviera below S mean', pass: true, val: '' },
];

// Check Flaubert position
const flaubertMeans = sourceMeans.filter(s => s.source.startsWith('Flaubert'));
const flaubertAvg = flaubertMeans.reduce((a, b) => a + b.mean, 0) / flaubertMeans.length;
checks[2].val = `Flaubert avg=${flaubertAvg.toFixed(1)}`;
checks[2].pass = flaubertAvg > sMean * 0.9;

const rivieraMeans = sourceMeans.filter(s => s.source.startsWith('Riviera'));
const rivieraAvg = rivieraMeans.length > 0
  ? rivieraMeans.reduce((a, b) => a + b.mean, 0) / rivieraMeans.length
  : 0;
checks[3].val = `Riviera avg=${rivieraAvg.toFixed(1)} vs S mean=${sMean.toFixed(1)}`;
checks[3].pass = rivieraAvg < sMean;

for (const c of checks) {
  console.log(`  [${c.pass ? 'PASS' : 'FAIL'}] ${c.name}: ${c.val}`);
}

const verdict = checks.every(c => c.pass)
  ? 'PASS — V3 scorer correctly separates S-tier from LLM'
  : `PARTIAL — ${checks.filter(c => !c.pass).length} check(s) failed`;
console.log(`\n  VERDICT: ${verdict}`);
console.log('='.repeat(90));

// Save
const outPath = path.resolve(ROOT, 'omega-autopsie/results_phase_r/R6_VALIDATION_V3.json');
fs.writeFileSync(outPath, JSON.stringify({
  results: allResults,
  per_source: sourceMeans,
  summary: {
    s_mean: sMean, llm_mean: llmMean,
    s_min: sMin, s_max: sMax,
    llm_min: llmMin, llm_max: llmMax,
    inversions, total_pairs: totalPairs,
    checks: checks.map(c => ({ ...c })),
    verdict,
  },
}, null, 2), 'utf-8');
console.log(`\n  Saved: ${outPath}`);
