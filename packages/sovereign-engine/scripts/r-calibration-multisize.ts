/**
 * R-CALIBRATION — Multi-size judge calibration
 * 12 texts × 4 sizes = 48 GB V1 scores
 * Does the GB V1 score depend on passage length?
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const DATA = path.resolve(__dirname, '../src/scoring/data');

function r4(v: number): number { return Math.round(v * 10000) / 10000; }
function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdev(v: number[]): number { if (v.length < 2) return 0; const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1)); }
function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5 && s.split(/\s+/).length >= 3);
}
function skipGutenberg(text: string): string {
  for (const m of ['*** START OF', '***START OF']) {
    const idx = text.indexOf(m);
    if (idx !== -1) { const nl = text.indexOf('\n', idx); if (nl !== -1) return text.slice(nl + 1); }
  }
  return text;
}
function spearman(x: number[], y: number[]): number {
  const n = x.length; if (n < 5) return 0;
  function rank(a: number[]): number[] {
    const s = a.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n); let i = 0;
    while (i < n) { let j = i; while (j < n - 1 && s[j + 1].v === s[j].v) j++; const avg = (i + j) / 2 + 1; for (let k = i; k <= j; k++) r[s[k].i] = avg; i = j + 1; }
    return r;
  }
  const rx = rank(x), ry = rank(y); let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}

const TEXTS = [
  { file: 'flaubert_bovary_14155.txt', author: 'Flaubert', lang: 'FR', tier: 'S' },
  { file: 'flaubert_salammbo_10884.txt', author: 'Flaubert S.', lang: 'EN', tier: 'S' },
  { file: 'proust_swann_2650.txt', author: 'Proust', lang: 'FR', tier: 'S' },
  { file: 'hugo_miserables_17489.txt', author: 'Hugo', lang: 'FR', tier: 'S' },
  { file: 'stendhal_chartreuse_7524.txt', author: 'Stendhal', lang: 'FR', tier: 'S' },
  { file: 'maupassant_bel_ami_3088.txt', author: 'Maupassant', lang: 'FR', tier: 'S' },
  { file: 'balzac_illusions_13141.txt', author: 'Balzac', lang: 'FR', tier: 'S' },
  { file: 'pdf_blood_meridian_cormac_mccarthy.txt', author: 'McCarthy', lang: 'EN', tier: 'S' },
  { file: 'pdf_mrs_dalloway_virginia_woolf.txt', author: 'Woolf', lang: 'EN', tier: 'S' },
  { file: 'joyce_ulysse_4300.txt', author: 'Joyce', lang: 'EN', tier: 'S' },
  // Controls
  { file: 'cinquante_nuances_de_grey_french_edition_el_james.txt', author: '50 Nuances', lang: 'FR', tier: 'C' },
  { file: 'bound_by_the_don_jade_west.txt', author: 'Jade West', lang: 'EN', tier: 'C' },
];

const SIZES = [
  { name: 'SHORT_500w', words: 500 },
  { name: 'MEDIUM_1000w', words: 1000 },
  { name: 'LONG_2000w', words: 2000 },
  { name: 'FULL_20sent', sentences: 20 },
];

console.log('=' .repeat(70));
console.log('  R-CALIBRATION — Multi-Size Judge Calibration');
console.log('=' .repeat(70));

interface WindowResult {
  word_count: number; sentence_count: number;
  gb_v1: number; tier: string;
  cv_sent: number; f26b: number; f17_knife: number; f9a_contra: number;
  mean_sent_len: number;
}

const results: Array<{
  file: string; author: string; lang: string; tier_expected: string;
  windows: Record<string, WindowResult>;
}> = [];

for (const text of TEXTS) {
  const filePath = path.join(TXT, text.file);
  if (!fs.existsSync(filePath)) { console.log(`  SKIP: ${text.author} (not found)`); continue; }

  let content = fs.readFileSync(filePath, 'utf-8');
  content = skipGutenberg(content);
  const allWords = content.split(/\s+/);
  const allSents = splitSentences(content);

  if (allWords.length < 2500 || allSents.length < 25) {
    console.log(`  SKIP: ${text.author} (too short: ${allWords.length}w, ${allSents.length}s)`);
    continue;
  }

  const entry: typeof results[number] = {
    file: text.file, author: text.author, lang: text.lang,
    tier_expected: text.tier, windows: {},
  };

  for (const size of SIZES) {
    let passageText: string;
    if (size.sentences) {
      // FULL_20sent: first 20 sentences
      passageText = allSents.slice(0, size.sentences).join(' ');
    } else {
      // Word-based extraction from start of text
      passageText = allWords.slice(0, size.words).join(' ');
    }

    const sents = splitSentences(passageText);
    const sentLens = sents.map(s => s.split(/\s+/).length);
    const avgLen = mean(sentLens);
    const cv = avgLen > 0 ? stdev(sentLens) / avgLen : 0;

    const feats = computeAllGBFeatures(passageText);
    const gb = scoreGB(feats);
    const tier = gb >= 4.5 ? 'S' : gb >= 3.5 ? 'A' : gb >= 2.5 ? 'B' : gb >= 1.5 ? 'C' : 'D';

    entry.windows[size.name] = {
      word_count: passageText.split(/\s+/).length,
      sentence_count: sents.length,
      gb_v1: r4(gb), tier, cv_sent: r4(cv),
      f26b: r4(feats.f26b_long_sent_rate ?? 0),
      f17_knife: feats.f17_knife_count ?? 0,
      f9a_contra: r4(feats.f9a_contradiction_rate ?? 0),
      mean_sent_len: r4(avgLen),
    };
  }

  results.push(entry);
  // Print row
  const ws = entry.windows;
  console.log(`  ${text.author.padEnd(15)} ${Object.values(ws).map(w => `${w.gb_v1.toFixed(2)}(${w.tier})`).join('  ')}  ${text.lang}`);
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log(`\n${'='.repeat(80)}`);
console.log('  CALIBRATION TABLE');
console.log(`${'='.repeat(80)}`);
console.log(`  ${'Author'.padEnd(15)} ${'500w'.padStart(10)} ${'1000w'.padStart(10)} ${'2000w'.padStart(10)} ${'20sent'.padStart(10)} ${'Lang'.padStart(5)}`);
console.log('  ' + '-'.repeat(65));

for (const r of results) {
  const vals = SIZES.map(s => {
    const w = r.windows[s.name];
    return w ? `${w.gb_v1.toFixed(2)}(${w.tier})` : '---';
  });
  console.log(`  ${r.author.padEnd(15)} ${vals.map(v => v.padStart(10)).join(' ')} ${r.lang.padStart(5)}`);
}

// Averages by size
console.log('  ' + '-'.repeat(65));
const masters = results.filter(r => r.tier_expected === 'S');
const controls = results.filter(r => r.tier_expected === 'C');

for (const label of ['MASTERS', 'CONTROLS']) {
  const group = label === 'MASTERS' ? masters : controls;
  const vals = SIZES.map(s => {
    const gbs = group.map(r => r.windows[s.name]?.gb_v1).filter((v): v is number => v !== undefined);
    return gbs.length > 0 ? mean(gbs).toFixed(2) : '---';
  });
  console.log(`  ${label.padEnd(15)} ${vals.map(v => v.padStart(10)).join(' ')}`);
}

// Gap
const gapVals = SIZES.map(s => {
  const mGbs = masters.map(r => r.windows[s.name]?.gb_v1).filter((v): v is number => v !== undefined);
  const cGbs = controls.map(r => r.windows[s.name]?.gb_v1).filter((v): v is number => v !== undefined);
  return mGbs.length > 0 && cGbs.length > 0 ? (mean(mGbs) - mean(cGbs)).toFixed(2) : '---';
});
console.log(`  ${'GAP'.padEnd(15)} ${gapVals.map(v => v.padStart(10)).join(' ')}`);

// Size effect
console.log(`\n${'='.repeat(80)}`);
console.log('  SIZE EFFECT ANALYSIS');
console.log(`${'='.repeat(80)}`);

const wordCounts: number[] = [];
const gbScores: number[] = [];
for (const r of masters) {
  for (const s of SIZES) {
    const w = r.windows[s.name];
    if (w) { wordCounts.push(w.word_count); gbScores.push(w.gb_v1); }
  }
}
const corrWordsGB = spearman(wordCounts, gbScores);
console.log(`  Correlation (words × GB) on masters: ${corrWordsGB.toFixed(4)}`);
console.log(`  GB ${corrWordsGB > 0.2 ? 'INCREASES' : corrWordsGB < -0.2 ? 'DECREASES' : 'is STABLE'} with passage length`);

// Feature profiles
console.log(`\n${'='.repeat(80)}`);
console.log('  MASTER FEATURE PROFILES (500w extracts)');
console.log(`${'='.repeat(80)}`);
console.log(`  ${'Author'.padEnd(15)} ${'CV'.padStart(6)} ${'f26b'.padStart(6)} ${'f17'.padStart(5)} ${'f9a'.padStart(6)} ${'meanLen'.padStart(8)}`);
console.log('  ' + '-'.repeat(50));
for (const r of masters) {
  const w = r.windows['SHORT_500w'];
  if (w) console.log(`  ${r.author.padEnd(15)} ${w.cv_sent.toFixed(3).padStart(6)} ${w.f26b.toFixed(3).padStart(6)} ${String(w.f17_knife).padStart(5)} ${w.f9a_contra.toFixed(3).padStart(6)} ${w.mean_sent_len.toFixed(1).padStart(8)}`);
}
console.log('  ' + '-'.repeat(50));
const masterShort = masters.map(r => r.windows['SHORT_500w']).filter(Boolean);
if (masterShort.length > 0) {
  console.log(`  ${'MEAN'.padEnd(15)} ${mean(masterShort.map(w => w!.cv_sent)).toFixed(3).padStart(6)} ${mean(masterShort.map(w => w!.f26b)).toFixed(3).padStart(6)} ${mean(masterShort.map(w => w!.f17_knife)).toFixed(0).padStart(5)} ${mean(masterShort.map(w => w!.f9a_contra)).toFixed(3).padStart(6)} ${mean(masterShort.map(w => w!.mean_sent_len)).toFixed(1).padStart(8)}`);
}

// Recommended thresholds
const masterShortGBs = masters.map(r => r.windows['SHORT_500w']?.gb_v1).filter((v): v is number => v !== undefined);
const masterLongGBs = masters.map(r => r.windows['LONG_2000w']?.gb_v1).filter((v): v is number => v !== undefined);
const recShortS = masterShortGBs.length > 0 ? Math.min(...masterShortGBs) : 3.5;
const recLongS = masterLongGBs.length > 0 ? Math.min(...masterLongGBs) : 4.0;

console.log(`\n  Recommended S-tier threshold (SHORT 500w): ${recShortS.toFixed(2)} (min master score)`);
console.log(`  Recommended S-tier threshold (LONG 2000w): ${recLongS.toFixed(2)}`);
console.log(`  Current S-tier threshold: 4.50`);

// Save
fs.writeFileSync(path.join(DATA, 'JUDGE_CALIBRATION_MULTI_SIZE.json'), JSON.stringify({
  date: '2026-03-23',
  texts: results.length, sizes: SIZES.length,
  masters: results,
  summary: {
    by_size: Object.fromEntries(SIZES.map(s => {
      const mGbs = masters.map(r => r.windows[s.name]?.gb_v1).filter((v): v is number => v !== undefined);
      const cGbs = controls.map(r => r.windows[s.name]?.gb_v1).filter((v): v is number => v !== undefined);
      return [s.name, { master_mean: r4(mean(mGbs)), master_min: r4(Math.min(...mGbs)), master_max: r4(Math.max(...mGbs)), control_mean: r4(mean(cGbs)), gap: r4(mean(mGbs) - mean(cGbs)) }];
    })),
    size_effect: { corr_words_gb: r4(corrWordsGB), gb_increases: corrWordsGB > 0.2, recommended_s_short: r4(recShortS), recommended_s_long: r4(recLongS) },
    master_profiles_500w: {
      cv_mean: r4(mean(masterShort.map(w => w!.cv_sent))),
      f26b_mean: r4(mean(masterShort.map(w => w!.f26b))),
      f17_mean: r4(mean(masterShort.map(w => w!.f17_knife))),
      f9a_mean: r4(mean(masterShort.map(w => w!.f9a_contra))),
    },
  },
}, null, 2));

console.log(`\nSaved: ${path.join(DATA, 'JUDGE_CALIBRATION_MULTI_SIZE.json')}`);
console.log('=== R-CALIBRATION COMPLETE ===');
