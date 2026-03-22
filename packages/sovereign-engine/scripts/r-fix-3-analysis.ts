/**
 * R-FIX-3 — FIX 2 (Hurst local) + FIX 3 (Causal deep audit)
 * Also remeasures residual to verify FIX 1.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyPassageDetailed, type SentenceType } from '../src/scoring/passage-classifier.js';
import { computeAllGBFeatures } from '../src/scoring/gb-scorer.js';
import { scoreGB } from '../src/scoring/gb-inference.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TXT_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/txt');
const TIERS_PATH = path.resolve(__dirname, '../../../omega-autopsie/corpus_r/CORPUS_TIERS_V3.json');
const DATA_DIR = path.resolve(__dirname, '../src/scoring/data');

const ALL_TYPES: SentenceType[] = ['dialogue', 'action', 'description', 'introspection', 'narration'];
const tiersData = JSON.parse(fs.readFileSync(TIERS_PATH, 'utf-8')) as Array<{ filename: string; tier_suggestion: string }>;
const tierLookup: Record<string, string> = {};
for (const e of tiersData) tierLookup[e.filename] = e.tier_suggestion || '?';

function mean(v: number[]): number { return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; }
function stdev(v: number[]): number {
  if (v.length < 2) return 0;
  const m = mean(v); return Math.sqrt(v.reduce((s, x) => s + (x - m) ** 2, 0) / (v.length - 1));
}
function r4(v: number): number { return Math.round(v * 10000) / 10000; }
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
  if (x.length < 5) return 0;
  const n = x.length;
  function rank(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const r = new Array<number>(n);
    let i = 0;
    while (i < n) {
      let j = i; while (j < n - 1 && sorted[j + 1].v === sorted[j].v) j++;
      const avg = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) r[sorted[k].i] = avg;
      i = j + 1;
    }
    return r;
  }
  const rx = rank(x), ry = rank(y);
  let d2 = 0; for (let i = 0; i < n; i++) d2 += (rx[i] - ry[i]) ** 2;
  return 1 - (6 * d2) / (n * (n * n - 1));
}
function computeHurst(series: number[]): number {
  if (series.length < 50) return 0.5;
  const sizes = [8, 16, 32, 64, 128, 256].filter(n => n <= series.length / 2);
  if (sizes.length < 2) return 0.5;
  const logRS: [number, number][] = [];
  for (const n of sizes) {
    const rsVals: number[] = [];
    for (let start = 0; start + n <= series.length; start += n) {
      const block = series.slice(start, start + n);
      const m = mean(block);
      const cum: number[] = []; let sum = 0;
      for (const d of block.map(x => x - m)) { sum += d; cum.push(sum); }
      const R = Math.max(...cum) - Math.min(...cum);
      const S = stdev(block);
      if (S > 0) rsVals.push(R / S);
    }
    if (rsVals.length > 0) logRS.push([Math.log(n), Math.log(mean(rsVals))]);
  }
  if (logRS.length < 2) return 0.5;
  const xs = logRS.map(p => p[0]), ys = logRS.map(p => p[1]);
  const xm = mean(xs), ym = mean(ys);
  let num = 0, den = 0;
  for (let i = 0; i < xs.length; i++) { num += (xs[i] - xm) * (ys[i] - ym); den += (xs[i] - xm) ** 2; }
  return den > 0 ? Math.max(0, Math.min(1, num / den)) : 0.5;
}

// ═══════════════════════════════════════════════════════════════
// SCAN CORPUS
// ═══════════════════════════════════════════════════════════════

const allFiles = fs.readdirSync(TXT_DIR).filter(f => f.endsWith('.txt')).sort();
console.log(`Scanning ${allFiles.length} files for FIX 2 + FIX 3...`);

// FIX 1: remeasure residual
let totalSents = 0;
let residualSents = 0;

// FIX 2: Hurst local
interface HurstLocalResult {
  file: string; tier: string;
  h_mean: number; h_std: number; h_range: number; h_drops: number;
  gb_mean: number;
}
const hurstLocal: HurstLocalResult[] = [];

// FIX 3: per-author windows for quintile analysis
const authorWindows: Record<string, Array<{ comp: Record<SentenceType, number>; gb: number; typeEntropy: number }>> = {};

let processed = 0;
for (const file of allFiles) {
  let text = fs.readFileSync(path.join(TXT_DIR, file), 'utf-8');
  text = skipGutenberg(text);
  const words = text.split(/\s+/);
  if (words.length < 2000) continue;

  const tier = tierLookup[file] || '?';
  const sents = splitSentences(text);
  if (sents.length < 50) continue;

  // Tag
  const analysis = classifyPassageDetailed(text);
  const tags = analysis.sentences;
  totalSents += tags.length;
  for (const t of tags) {
    if (t.residual > 0.5) residualSents++;
  }

  // FIX 2: Hurst local on sentence lengths
  const sentLens = sents.map(s => s.split(/\s+/).length);
  const localH: number[] = [];
  const LOCAL_WIN = 50;
  const LOCAL_STEP = 25;
  for (let i = 0; i <= sentLens.length - LOCAL_WIN; i += LOCAL_STEP) {
    localH.push(computeHurst(sentLens.slice(i, i + LOCAL_WIN)));
  }

  if (localH.length >= 3) {
    let drops = 0;
    for (let i = 1; i < localH.length; i++) {
      if (localH[i] - localH[i - 1] < -0.05) drops++;
    }

    // GB mean for this novel (sample 5 windows of 500 words)
    const gbSamples: number[] = [];
    for (let pos = 0.2; pos <= 0.8; pos += 0.15) {
      const start = Math.max(0, Math.floor(words.length * pos) - 250);
      const windowText = words.slice(start, start + 500).join(' ');
      gbSamples.push(scoreGB(computeAllGBFeatures(windowText)));
    }

    hurstLocal.push({
      file, tier,
      h_mean: r4(mean(localH)),
      h_std: r4(stdev(localH)),
      h_range: r4(Math.max(...localH) - Math.min(...localH)),
      h_drops: drops,
      gb_mean: r4(mean(gbSamples)),
    });
  }

  // FIX 3: per-author windows (sample 10 windows per novel)
  const authorKey = file.split('_')[0];
  if (!authorWindows[authorKey]) authorWindows[authorKey] = [];

  for (let pos = 0.1; pos <= 0.9; pos += 0.1) {
    const start = Math.max(0, Math.floor(tags.length * pos) - 10);
    const winTags = tags.slice(start, start + 20);
    if (winTags.length < 10) continue;

    const comp: Record<SentenceType, number> = { dialogue: 0, action: 0, description: 0, introspection: 0, narration: 0 };
    for (const t of winTags) for (const k of ALL_TYPES) comp[k] += t.scores[k];
    const ct = Object.values(comp).reduce((a, b) => a + b, 0);
    if (ct > 0) for (const k of ALL_TYPES) comp[k] /= ct;

    const winText = sents.slice(start, start + 20).join(' ');
    const gb = scoreGB(computeAllGBFeatures(winText));

    // Type entropy
    const probs = Object.values(comp);
    const entropy = -probs.filter(p => p > 0).reduce((s, p) => s + p * Math.log2(p), 0);

    authorWindows[authorKey].push({ comp, gb, typeEntropy: entropy });
  }

  processed++;
  if (processed % 50 === 0) console.log(`  ${processed}/${allFiles.length}`);
}

console.log(`\nDone: ${processed} novels`);

// ═══════════════════════════════════════════════════════════════
// FIX 1: RESIDUAL REMEASURE
// ═══════════════════════════════════════════════════════════════

const newResidualPct = r4(residualSents / totalSents);
console.log(`\n=== FIX 1: RESIDUAL ===`);
console.log(`  Previous: 36.9%`);
console.log(`  Current: ${(newResidualPct * 100).toFixed(1)}% (${residualSents}/${totalSents})`);
console.log(`  Target: <15%`);
console.log(`  Verdict: ${newResidualPct < 0.15 ? 'PASS' : newResidualPct < 0.20 ? 'PASS (minimal)' : 'FAIL'}`);

// ═══════════════════════════════════════════════════════════════
// FIX 2: HURST LOCAL
// ═══════════════════════════════════════════════════════════════

console.log(`\n=== FIX 2: HURST LOCAL ===`);

// T-test S vs A on H_mean
const hS = hurstLocal.filter(h => h.tier === 'S');
const hA = hurstLocal.filter(h => h.tier === 'A');
const meanS = mean(hS.map(h => h.h_mean));
const meanA = mean(hA.map(h => h.h_mean));
const stdS = stdev(hS.map(h => h.h_mean));
const stdA = stdev(hA.map(h => h.h_mean));
const pooledStd = Math.sqrt(((stdS ** 2 * (hS.length - 1)) + (stdA ** 2 * (hA.length - 1))) / (hS.length + hA.length - 2));
const tStat = (meanA - meanS) / (pooledStd * Math.sqrt(1 / hS.length + 1 / hA.length));
const cohensD = (meanA - meanS) / pooledStd;

console.log(`  S-tier: H_mean=${meanS.toFixed(4)} +/- ${stdS.toFixed(4)} (n=${hS.length})`);
console.log(`  A-tier: H_mean=${meanA.toFixed(4)} +/- ${stdA.toFixed(4)} (n=${hA.length})`);
console.log(`  t-test: t=${tStat.toFixed(3)}, Cohen's d=${cohensD.toFixed(3)}`);
console.log(`  (t>1.96 → p<0.05; d>0.2 → small effect; d>0.5 → medium)`);

// H_std by tier
console.log('\n  Hurst LOCAL metrics by tier:');
console.log(`  ${'Tier'.padEnd(5)} ${'H_mean'.padStart(8)} ${'H_std'.padStart(8)} ${'H_range'.padStart(8)} ${'H_drops'.padStart(8)} ${'n'.padStart(5)}`);
for (const t of ['S', 'A', 'B', 'C', 'D']) {
  const vals = hurstLocal.filter(h => h.tier === t);
  if (vals.length === 0) continue;
  console.log(`  ${t.padEnd(5)} ${mean(vals.map(v => v.h_mean)).toFixed(4).padStart(8)} ${mean(vals.map(v => v.h_std)).toFixed(4).padStart(8)} ${mean(vals.map(v => v.h_range)).toFixed(4).padStart(8)} ${mean(vals.map(v => v.h_drops)).toFixed(2).padStart(8)} ${String(vals.length).padStart(5)}`);
}

// H_std x GB correlation
const allHstd = hurstLocal.map(h => h.h_std);
const allGBmean = hurstLocal.map(h => h.gb_mean);
const hstdGBrho = spearman(allHstd, allGBmean);
console.log(`\n  H_std x GB Spearman: ${hstdGBrho.toFixed(4)}`);

fs.writeFileSync(path.join(DATA_DIR, 'HURST_LOCAL_ANALYSIS.json'), JSON.stringify({
  date: '2026-03-22',
  novels: hurstLocal.length,
  by_tier: Object.fromEntries(['S', 'A', 'B', 'C', 'D'].map(t => {
    const v = hurstLocal.filter(h => h.tier === t);
    return [t, {
      h_mean: r4(mean(v.map(x => x.h_mean))),
      h_std: r4(mean(v.map(x => x.h_std))),
      h_range: r4(mean(v.map(x => x.h_range))),
      h_drops: r4(mean(v.map(x => x.h_drops))),
      n: v.length,
    }];
  })),
  t_test_S_vs_A: { t: r4(tStat), cohens_d: r4(cohensD), s_mean: r4(meanS), a_mean: r4(meanA) },
  h_std_gb_spearman: r4(hstdGBrho),
}, null, 2));

// ═══════════════════════════════════════════════════════════════
// FIX 3: CAUSAL DEEP AUDIT
// ═══════════════════════════════════════════════════════════════

console.log(`\n=== FIX 3: CAUSAL DEEP AUDIT ===`);

// Quintile analysis: top 20 authors by mean GB
const authorGB: Array<{ author: string; gb_mean: number; wins: typeof authorWindows[string] }> = [];
for (const [author, wins] of Object.entries(authorWindows)) {
  if (wins.length < 20) continue;
  authorGB.push({ author, gb_mean: mean(wins.map(w => w.gb)), wins });
}
authorGB.sort((a, b) => b.gb_mean - a.gb_mean);
const top20 = authorGB.slice(0, 20);

console.log(`  Top 20 authors by GB (n >= 20 windows):`);

let diversityHigherInTop = 0;
let diversityTotal = 0;
for (const { author, wins } of top20) {
  const gbs = wins.map(w => w.gb);
  const p80 = gbs.sort((a, b) => b - a)[Math.floor(gbs.length * 0.2)];
  const p20 = gbs.sort((a, b) => a - b)[Math.floor(gbs.length * 0.2)];

  const topQ = wins.filter(w => w.gb >= p80);
  const botQ = wins.filter(w => w.gb <= p20);

  if (topQ.length >= 3 && botQ.length >= 3) {
    const topEntropy = mean(topQ.map(w => w.typeEntropy));
    const botEntropy = mean(botQ.map(w => w.typeEntropy));
    diversityTotal++;
    if (topEntropy > botEntropy) diversityHigherInTop++;
    console.log(`    ${author.padEnd(20)} n=${wins.length} top_entropy=${topEntropy.toFixed(3)} bot_entropy=${botEntropy.toFixed(3)} ${topEntropy > botEntropy ? 'DIVERSE_TOP' : 'DIVERSE_BOT'}`);
  }
}

console.log(`\n  Quintile analysis: ${diversityHigherInTop}/${diversityTotal} masters have MORE diverse top quintile`);
console.log(`  Verdict: ${diversityHigherInTop > diversityTotal * 0.6 ? 'DIVERSITY HELPS' : diversityHigherInTop > diversityTotal * 0.4 ? 'MIXED' : 'NO EFFECT'}`);

// Bootstrap CI on global synergies (simplified — use all author windows)
const allWins = Object.values(authorWindows).flat();
console.log(`\n  Bootstrap CI (2000 resamples) on 5 synergy pairs:`);

const SYNERGY_PAIRS: [SentenceType, SentenceType][] = [
  ['dialogue', 'narration'], ['narration', 'introspection'],
  ['description', 'narration'], ['dialogue', 'action'], ['introspection', 'dialogue'],
];

const bootstrapResults: Record<string, { mean: number; ci_low: number; ci_high: number; significant: boolean }> = {};

for (const [tA, tB] of SYNERGY_PAIRS) {
  const mixed = allWins.filter(w => w.comp[tA] >= 0.15 && w.comp[tB] >= 0.15);
  const pureA = allWins.filter(w => w.comp[tA] >= 0.5);
  const pureB = allWins.filter(w => w.comp[tB] >= 0.5);

  if (mixed.length < 50 || pureA.length < 20 || pureB.length < 20) {
    console.log(`    ${tA}x${tB}: INSUFFICIENT DATA (mixed=${mixed.length})`);
    continue;
  }

  const predicted = (mean(pureA.map(w => w.gb)) + mean(pureB.map(w => w.gb))) / 2;
  const actual = mean(mixed.map(w => w.gb));
  const synergy = actual - predicted;

  // Bootstrap
  const bootSynergies: number[] = [];
  for (let b = 0; b < 2000; b++) {
    // Resample mixed
    const bootMixed: number[] = [];
    for (let i = 0; i < mixed.length; i++) bootMixed.push(mixed[Math.floor(Math.random() * mixed.length)].gb);
    const bootPureA: number[] = [];
    for (let i = 0; i < pureA.length; i++) bootPureA.push(pureA[Math.floor(Math.random() * pureA.length)].gb);
    const bootPureB: number[] = [];
    for (let i = 0; i < pureB.length; i++) bootPureB.push(pureB[Math.floor(Math.random() * pureB.length)].gb);
    const bootPred = (mean(bootPureA) + mean(bootPureB)) / 2;
    bootSynergies.push(mean(bootMixed) - bootPred);
  }

  bootSynergies.sort((a, b) => a - b);
  const ci_low = bootSynergies[Math.floor(0.025 * bootSynergies.length)];
  const ci_high = bootSynergies[Math.floor(0.975 * bootSynergies.length)];
  const significant = ci_low > 0 || ci_high < 0;

  const key = `${tA}_x_${tB}`;
  bootstrapResults[key] = { mean: r4(synergy), ci_low: r4(ci_low), ci_high: r4(ci_high), significant };
  console.log(`    ${tA.padEnd(14)}x${tB.padEnd(14)} syn=${synergy > 0 ? '+' : ''}${synergy.toFixed(4)} CI=[${ci_low.toFixed(4)}, ${ci_high.toFixed(4)}] ${significant ? 'SIGNIFICANT' : 'NOT SIG'}`);
}

fs.writeFileSync(path.join(DATA_DIR, 'CAUSAL_DEEP_AUDIT.json'), JSON.stringify({
  date: '2026-03-22',
  residual_pct: newResidualPct,
  quintile_analysis: { diverse_top: diversityHigherInTop, total: diversityTotal, verdict: diversityHigherInTop > diversityTotal * 0.6 ? 'DIVERSITY_HELPS' : 'MIXED' },
  bootstrap_ci: bootstrapResults,
}, null, 2));

console.log('\n=== R-FIX-3 COMPLETE ===');
