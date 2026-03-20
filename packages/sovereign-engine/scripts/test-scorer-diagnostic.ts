/**
 * OMEGA — TEST DÉCISIF : Le scorer sait-il faire la différence ?
 * 
 * Compare des extraits de 500 mots de :
 *   - Flaubert (Madame Bovary, L'Éducation sentimentale, Salammbô)
 *   - Riviera (Sonnet 3.5, quasi zéro consigne)
 *   - GPT 5.4 P5 (meilleur LLM prompt éduqué)
 * 
 * Si le scorer sépare Flaubert des LLM → il marche, il sature sur les longs textes
 * Si tout le monde score pareil → le scorer est aveugle
 * 
 * Usage: cd C:\Users\elric\omega-project\packages\sovereign-engine
 *        npx tsx scripts/test-scorer-diagnostic.ts
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '../../..');
const COEFF = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO = path.resolve(ROOT, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

const scorer = fs.existsSync(METRO)
  ? new MultiStageScorer(COEFF, METRO)
  : new MultiStageScorer(COEFF);

function r(v: number): number { return Math.round(v * 10000) / 10000; }

// Extract ~500 words from a text at a given offset (in words)
function extractPassage(text: string, offsetWords: number, targetWords: number): string {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const start = Math.min(offsetWords, words.length - targetWords);
  const passage = words.slice(start, start + targetWords).join(' ');
  return passage;
}

function scorePassage(label: string, text: string) {
  const wc = text.split(/\s+/).filter(w => w.length > 0).length;
  const features = computeTextFeatures(text);
  const scoreResult = scorer.score(features, {
    wordCount: wc,
    pRel: 0.5,
    profile: 'STRATOSPHERIQUE',
    text,
  });
  
  const sents = text.split(/(?<=[.!?…»])\s+/).map(s => s.trim()).filter(s => s.length > 5);
  const lens = sents.map(s => s.split(/\s+/).length);
  const knife = lens.filter(l => l <= 5).length;
  
  return {
    label, wc, sents: sents.length,
    r6: r(scoreResult.composite.score),
    r6_local: r(scoreResult.local?.score ?? 0),
    r6_arc: r(scoreResult.arc?.score ?? 0),
    f17_knife: knife,
    f17_pct: r(knife / Math.max(sents.length, 1) * 100),
    f1_mean: r(features['f1_mean'] ?? 0),
    f1_var: r(features['f1a_rhythm_variance'] ?? 0),
    f15b: r(features['f15b_redundancy_compression'] ?? 0),
    f16a: r(features['f16a_bigram_rarity'] ?? 0),
    f24e: r(features['f24e_contrast_score'] ?? 0),
    f25g: r(features['f25g_description_score'] ?? 0),
    f27d: r(features['f27d_modal_score'] ?? 0),
    f28d: r(features['f28d_sil_score'] ?? 0),
    f29d: r(features['f29d_ttr_score'] ?? 0),
    f35c: r(features['f35c_hook_score'] ?? 0),
    f36c: r(features['f36c_cliff_score'] ?? 0),
  };
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log('  OMEGA — TEST DÉCISIF : LE SCORER SAIT-IL VOIR ?');
console.log('  Extraits de 500 mots — même longueur — même scorer');
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const CACHE = path.resolve(ROOT, 'omega-autopsie/gutenberg_cache');
const P5DIR = path.resolve(ROOT, 'omega-autopsie/results_rosetta/s0/p5_test');

// --- FLAUBERT ---
const flaubertFiles = [
  { file: 'flaubert_bovary_14155.txt', label: 'FLAUBERT_Bovary', offsets: [500, 2000, 5000, 10000, 20000] },
  { file: 'flaubert_education_14285.txt', label: 'FLAUBERT_Education', offsets: [500, 3000, 8000, 15000] },
  { file: 'flaubert_salammbo_10884.txt', label: 'FLAUBERT_Salammbo', offsets: [500, 3000, 8000, 15000] },
];

const allResults: Record<string, unknown>[] = [];

console.log('═══ FLAUBERT (extraits 500 mots) ═══\n');
for (const { file, label, offsets } of flaubertFiles) {
  const text = fs.readFileSync(path.join(CACHE, file), 'utf-8');
  for (const offset of offsets) {
    const passage = extractPassage(text, offset, 500);
    const tag = `${label}_@${offset}`;
    const result = scorePassage(tag, passage);
    allResults.push(result);
    console.log(`  ${tag.padEnd(35)} R6=${result.r6}  f17=${result.f17_knife}(${result.f17_pct}%)  f15b=${result.f15b}  f29d=${result.f29d}  f24e=${result.f24e}  f28d=${result.f28d}`);
  }
}

// --- RIVIERA (extraits 500 mots à différents endroits) ---
console.log('\n═══ RIVIERA / Sonnet 3.5 (extraits 500 mots) ═══\n');
const rivieraFiles = fs.readdirSync(P5DIR).filter(f => f.includes('riviera') || f.includes('test_riviera'));
if (rivieraFiles.length > 0) {
  const rivText = fs.readFileSync(path.join(P5DIR, rivieraFiles[0]), 'utf-8');
  const rivWords = rivText.split(/\s+/).length;
  const rivOffsets = [500, 2000, 5000, 10000, 20000, 40000, 60000];
  for (const offset of rivOffsets) {
    if (offset + 500 > rivWords) continue;
    const passage = extractPassage(rivText, offset, 500);
    const tag = `RIVIERA_@${offset}`;
    const result = scorePassage(tag, passage);
    allResults.push(result);
    console.log(`  ${tag.padEnd(35)} R6=${result.r6}  f17=${result.f17_knife}(${result.f17_pct}%)  f15b=${result.f15b}  f29d=${result.f29d}  f24e=${result.f24e}  f28d=${result.f28d}`);
  }
} else {
  console.log('  [!] Riviera non trouvé dans p5_test/');
}

// --- GPT 5.4 P5 (extraits 500 mots) ---
console.log('\n═══ GPT 5.4 P5 (extraits 500 mots) ═══\n');
const gptFile = fs.readdirSync(P5DIR).find(f => f.startsWith('gpt'));
if (gptFile) {
  const gptText = fs.readFileSync(path.join(P5DIR, gptFile), 'utf-8');
  const gptWords = gptText.split(/\s+/).length;
  const gptOffsets = [0, 500, 1000, 1500, 2000];
  for (const offset of gptOffsets) {
    if (offset + 500 > gptWords) continue;
    const passage = extractPassage(gptText, offset, 500);
    const tag = `GPT5.4_P5_@${offset}`;
    const result = scorePassage(tag, passage);
    allResults.push(result);
    console.log(`  ${tag.padEnd(35)} R6=${result.r6}  f17=${result.f17_knife}(${result.f17_pct}%)  f15b=${result.f15b}  f29d=${result.f29d}  f24e=${result.f24e}  f28d=${result.f28d}`);
  }
}

// --- MOYENNES PAR CATÉGORIE ---
console.log('\n═══════════════════════════════════════════════════════════════');
console.log('  MOYENNES PAR CATÉGORIE');
console.log('═══════════════════════════════════════════════════════════════\n');

function avg(arr: number[]): number { return arr.length ? r(arr.reduce((a,b) => a+b, 0) / arr.length) : 0; }

const flaubertR = allResults.filter(r => (r as any).label.startsWith('FLAUBERT'));
const rivieraR = allResults.filter(r => (r as any).label.startsWith('RIVIERA'));
const gptR = allResults.filter(r => (r as any).label.startsWith('GPT'));

const categories = [
  { name: 'FLAUBERT (13 extraits)', data: flaubertR },
  { name: 'RIVIERA  (7 extraits)', data: rivieraR },
  { name: 'GPT 5.4  (5 extraits)', data: gptR },
];

for (const { name, data } of categories) {
  if (data.length === 0) { console.log(`  ${name}: pas de données`); continue; }
  const d = data as any[];
  console.log(`  ${name}:`);
  console.log(`    R6 composite  : ${avg(d.map(x => x.r6))}  (min=${Math.min(...d.map(x => x.r6))} max=${Math.max(...d.map(x => x.r6))})`);
  console.log(`    f17 knife %   : ${avg(d.map(x => x.f17_pct))}%`);
  console.log(`    f15b compr.   : ${avg(d.map(x => x.f15b))}`);
  console.log(`    f29d TTR      : ${avg(d.map(x => x.f29d))}`);
  console.log(`    f24e contraste: ${avg(d.map(x => x.f24e))}`);
  console.log(`    f28d SIL      : ${avg(d.map(x => x.f28d))}`);
  console.log(`    f25g descript. : ${avg(d.map(x => x.f25g))}`);
  console.log(`    f1_mean       : ${avg(d.map(x => x.f1_mean))}`);
  console.log('');
}

// Save
const outPath = path.resolve(P5DIR, 'scorer_diagnostic.json');
fs.writeFileSync(outPath, JSON.stringify(allResults, null, 2));
console.log(`[SAVED] ${outPath}`);
