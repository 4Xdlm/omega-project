/**
 * OMEGA Phase R-5 — Validate V2 Scorer
 * Compare: Flaubert (tier S) vs GPT 5.4 vs Riviera vs other LLMs
 * Expected: S texts score HIGHER than LLM texts.
 *
 * Usage: cd packages/sovereign-engine && npx tsx scripts/r5-validate-v2.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');

const scorer = new MultiStageScorerV2();

interface TestCase {
  label: string;
  tier: string;
  path: string;
}

// Test cases: S-tier classics vs LLM outputs
const cases: TestCase[] = [
  // S-tier — Flaubert
  { label: 'Flaubert — Bovary',        tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_bovary_14155.txt' },
  { label: 'Flaubert — Education',     tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_education_14285.txt' },
  { label: 'Flaubert — Salammbo',      tier: 'S', path: 'omega-autopsie/corpus_r/txt/flaubert_salammbo_10884.txt' },
  // S-tier — Other canon
  { label: 'Hugo — Miserables',        tier: 'S', path: 'omega-autopsie/corpus_r/txt/les_miserables_victor_hugo.txt' },
  { label: 'Camus — La Peste',         tier: 'S', path: 'omega-autopsie/corpus_r/txt/la_peste_french_edition_albert_camus.txt' },
  { label: 'Zola — Bonheur des Dames', tier: 'S', path: 'omega-autopsie/corpus_r/txt/au_bonheur_des_dames_emile_zola.txt' },
  { label: 'Proust — Swann',           tier: 'S', path: 'omega-autopsie/corpus_r/txt/pdf_du_cote_de_chez_swann_marcel_proust.txt' },
  // LLM outputs (should score LOWER)
  { label: 'GPT 5.4 correction',       tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/chatgpt_5.4_correction.txt' },
  { label: 'GPT original',             tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/gpt.txt' },
  { label: 'Claude Code',              tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/claude_code.txt' },
  { label: 'Claude Opus',              tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/claude_opus.txt' },
  { label: 'Gemini',                   tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/gemini.txt' },
  { label: 'DeepSeek',                 tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/deepseek.txt' },
  { label: 'Perplexity',               tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/perplexity.txt' },
  { label: 'Riviera',                  tier: 'LLM', path: 'omega-autopsie/results_rosetta/s0/p5_test/riviera.txt' },
];

function extractMiddlePassage(text: string, wordCount: number = 500): string {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const center = Math.floor(words.length / 2);
  const start = Math.max(0, center - Math.floor(wordCount / 2));
  const end = Math.min(words.length, start + wordCount);
  return words.slice(start, end).join(' ');
}

console.log('');
console.log('='.repeat(80));
console.log('  OMEGA R-5 — VALIDATION V2 SCORER');
console.log('  Flaubert + Canon (S) vs LLM outputs');
console.log('='.repeat(80));
console.log('');

interface Result {
  label: string;
  tier: string;
  raw: number;
  score100: number;
  final: number;
  bonuses: string[];
  penalties: string[];
  wordCount: number;
}

const results: Result[] = [];

for (const tc of cases) {
  const fullPath = path.resolve(ROOT, tc.path);
  if (!fs.existsSync(fullPath)) {
    console.log(`[SKIP] ${tc.label} — file not found`);
    continue;
  }

  const text = fs.readFileSync(fullPath, 'utf-8');
  const passage = extractMiddlePassage(text, 500);
  const wc = passage.split(/\s+/).filter(w => w.length > 0).length;

  const features = computeTextFeatures(passage);
  const result = scorer.score(features, { wordCount: wc, text: passage });

  const activeBonuses = result.bonuses.filter(b => b.triggered).map(b => b.name);
  const activePenalties = result.penalties.filter(p => p.triggered).map(p => p.name);

  results.push({
    label: tc.label,
    tier: tc.tier,
    raw: result.raw,
    score100: result.score100,
    final: result.final,
    bonuses: activeBonuses,
    penalties: activePenalties,
    wordCount: wc,
  });
}

// Sort by final score descending
results.sort((a, b) => b.final - a.final);

// Display
console.log(`${'#'.padStart(3)}  ${'Label'.padEnd(30)} ${'Tier'.padStart(5)}  ${'Raw'.padStart(8)}  ${'Score'.padStart(6)}  ${'Final'.padStart(6)}  Bonuses/Penalties`);
console.log(`${'---'}  ${''.padEnd(30, '-')} ${''.padStart(5, '-')}  ${''.padStart(8, '-')}  ${''.padStart(6, '-')}  ${''.padStart(6, '-')}  ${''.padStart(25, '-')}`);

for (let i = 0; i < results.length; i++) {
  const r = results[i];
  const extras = [...r.bonuses.map(b => `+${b}`), ...r.penalties.map(p => p)].join(', ') || '-';
  console.log(
    `${(i + 1).toString().padStart(3)}  ${r.label.padEnd(30)} ${r.tier.padStart(5)}  ${r.raw.toFixed(4).padStart(8)}  ${r.score100.toFixed(1).padStart(6)}  ${r.final.toFixed(1).padStart(6)}  ${extras}`
  );
}

// Separator
console.log('');

// Stats
const sTierScores = results.filter(r => r.tier === 'S').map(r => r.final);
const llmScores = results.filter(r => r.tier === 'LLM').map(r => r.final);

const sMean = sTierScores.reduce((a, b) => a + b, 0) / sTierScores.length;
const llmMean = llmScores.reduce((a, b) => a + b, 0) / llmScores.length;
const sMin = Math.min(...sTierScores);
const llmMax = Math.max(...llmScores);

console.log('='.repeat(80));
console.log('  VERDICT');
console.log('='.repeat(80));
console.log(`  S-tier mean:  ${sMean.toFixed(1)}`);
console.log(`  LLM mean:     ${llmMean.toFixed(1)}`);
console.log(`  S-tier min:   ${sMin.toFixed(1)}`);
console.log(`  LLM max:      ${llmMax.toFixed(1)}`);
console.log(`  Gap S-LLM:    ${(sMean - llmMean).toFixed(1)} points`);
console.log(`  S min > LLM max? ${sMin > llmMax ? 'YES — CLEAN SEPARATION' : 'NO — OVERLAP EXISTS'}`);
console.log('');

// Count inversions (LLM scoring above any S)
let inversions = 0;
for (const llm of llmScores) {
  for (const s of sTierScores) {
    if (llm >= s) inversions++;
  }
}
const totalPairs = sTierScores.length * llmScores.length;
console.log(`  Inversions: ${inversions}/${totalPairs} (${(inversions / totalPairs * 100).toFixed(1)}% of S-LLM pairs)`);

const verdict = sMean > llmMean && inversions / totalPairs < 0.25
  ? 'PASS — V2 scorer correctly ranks S > LLM'
  : 'FAIL — V2 scorer does NOT reliably separate S from LLM';
console.log(`  VERDICT: ${verdict}`);
console.log('='.repeat(80));

// Save results
const outPath = path.resolve(ROOT, 'omega-autopsie/results_phase_r/R5_VALIDATION_V2.json');
fs.writeFileSync(outPath, JSON.stringify({
  results,
  summary: { s_mean: sMean, llm_mean: llmMean, s_min: sMin, llm_max: llmMax, inversions, total_pairs: totalPairs, verdict },
}, null, 2), 'utf-8');
console.log(`\n  Saved: ${outPath}`);
