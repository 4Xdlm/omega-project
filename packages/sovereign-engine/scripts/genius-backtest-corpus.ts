/**
 * ═══════════════════════════════════════════════════════════════════════════
 * OMEGA BLOC 4 — GENIUS ENGINE BACKTEST (D2)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Backtest G=(D×S×I×R×V) sur le corpus 881 œuvres.
 * 0 API — CALC pur via scoreGenius() de @omega/phonetic-stack.
 *
 * D2 exige : r(G, Tier_EN_max) ≥ 0.40 avant toute intégration.
 *
 * Usage : cd packages/sovereign-engine && npx tsx scripts/genius-backtest-corpus.ts
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scoreGenius, type GeniusAnalysis } from '@omega/phonetic-stack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ═══════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════

const CORPUS_DIR = path.resolve(__dirname, '../../../omega-autopsie/corpus_r');
const TXT_DIR = path.join(CORPUS_DIR, 'txt');
const FEATURES_JSON = path.join(CORPUS_DIR, 'CORPUS_FEATURES_MASTER.json');
const OUTPUT_DIR = path.resolve(__dirname, '../sessions/GENIUS_BACKTEST_BLOC4');

// Max words to analyze per work (3000w = sweet spot for R² FR)
const MAX_WORDS = 3000;

// Tier encoding
const TIER_NUM: Record<string, number> = { S: 4, A: 3, B: 2, C: 1, D: 0 };

// G weights (from omega-p0-adapter.ts — calibrated 2026-02-21)
const G_WEIGHTS = { D: 0.25, S: 0.15, I: 0.05, R: 0.35, V: 0.20 };

// ═══════════════════════════════════════════════════════════════════════════
// STATS HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

function spearmanR(x: number[], y: number[]): number {
  function rank(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; i++) ranks[sorted[i].i] = i + 1;
    return ranks;
  }
  return pearsonR(rank(x), rank(y));
}

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return lo === hi ? sorted[lo] : sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface CorpusEntry {
  filename: string;
  tier: string;
  language: string;
  word_count: number;
}

interface BacktestResult {
  filename: string;
  tier: string;
  tier_num: number;
  language: string;
  word_count: number;
  words_analyzed: number;
  D: number;
  S: number;
  I: number;
  R: number;
  V: number;
  G_geometric: number;  // (D×S×I×R×V)^(1/5)
  G_weighted: number;   // 0.35R+0.25D+0.20V+0.15S+0.05I
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('OMEGA BLOC 4 — GENIUS ENGINE BACKTEST (D2)');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`Corpus: ${FEATURES_JSON}`);
  console.log(`Texts: ${TXT_DIR}`);
  console.log(`Max words: ${MAX_WORDS}`);
  console.log();

  // Load corpus metadata
  const corpusRaw: any[] = JSON.parse(fs.readFileSync(FEATURES_JSON, 'utf-8'));
  // Filter: only S/A/B/C tiers (D = noise), and skip files without tier
  const corpus: CorpusEntry[] = corpusRaw
    .filter(e => e.tier && ['S', 'A', 'B', 'C'].includes(e.tier))
    .map(e => ({
      filename: e.filename,
      tier: e.tier,
      language: e.language ?? 'fr',
      word_count: e.word_count ?? 0,
    }));

  console.log(`Corpus loaded: ${corpus.length} works (filtered S/A/B/C)`);
  console.log(`  FR: ${corpus.filter(c => c.language === 'fr').length}`);
  console.log(`  EN: ${corpus.filter(c => c.language === 'en').length}`);
  console.log();

  // Process each work
  const results: BacktestResult[] = [];
  let processed = 0;
  let errors = 0;

  for (const entry of corpus) {
    processed++;
    const txtPath = path.join(TXT_DIR, entry.filename);

    if (!fs.existsSync(txtPath)) {
      errors++;
      results.push({
        filename: entry.filename, tier: entry.tier, tier_num: TIER_NUM[entry.tier] ?? 0,
        language: entry.language, word_count: entry.word_count, words_analyzed: 0,
        D: 0, S: 0, I: 0, R: 0, V: 0, G_geometric: 0, G_weighted: 0,
        error: 'FILE_NOT_FOUND',
      });
      continue;
    }

    try {
      const fullText = fs.readFileSync(txtPath, 'utf-8');
      const words = fullText.split(/\s+/).filter(w => w.length > 0);
      const truncated = words.slice(0, MAX_WORDS).join(' ');
      const wordsAnalyzed = Math.min(words.length, MAX_WORDS);

      if (wordsAnalyzed < 100) {
        errors++;
        results.push({
          filename: entry.filename, tier: entry.tier, tier_num: TIER_NUM[entry.tier] ?? 0,
          language: entry.language, word_count: entry.word_count, words_analyzed: wordsAnalyzed,
          D: 0, S: 0, I: 0, R: 0, V: 0, G_geometric: 0, G_weighted: 0,
          error: 'TOO_SHORT',
        });
        continue;
      }

      const analysis: GeniusAnalysis = scoreGenius(truncated);

      const D = analysis.axes.density.score;
      const S = analysis.axes.surprise.score;
      const I_val = analysis.axes.inevitability.score;
      const R = analysis.axes.resonance.score;
      const V = analysis.axes.voice.score;

      // Geometric mean (original formula)
      const G_geo = Math.pow(D * S * I_val * R * V, 1 / 5);
      // Weighted sum (calibrated formula from omega-p0-adapter)
      const G_w = G_WEIGHTS.D * D + G_WEIGHTS.S * S + G_WEIGHTS.I * I_val + G_WEIGHTS.R * R + G_WEIGHTS.V * V;

      results.push({
        filename: entry.filename, tier: entry.tier, tier_num: TIER_NUM[entry.tier] ?? 0,
        language: entry.language, word_count: entry.word_count, words_analyzed: wordsAnalyzed,
        D, S, I: I_val, R, V,
        G_geometric: Math.round(G_geo * 100) / 100,
        G_weighted: Math.round(G_w * 100) / 100,
      });

      if (processed % 50 === 0) {
        console.log(`  [${processed}/${corpus.length}] ${entry.filename.slice(0, 40)}... G_w=${G_w.toFixed(1)}`);
      }
    } catch (err: any) {
      errors++;
      results.push({
        filename: entry.filename, tier: entry.tier, tier_num: TIER_NUM[entry.tier] ?? 0,
        language: entry.language, word_count: entry.word_count, words_analyzed: 0,
        D: 0, S: 0, I: 0, R: 0, V: 0, G_geometric: 0, G_weighted: 0,
        error: err.message?.slice(0, 200),
      });
    }
  }

  console.log(`\nProcessed: ${processed} | Errors: ${errors}\n`);

  // ═══════════════════════════════════════════════════════════════════════
  // ANALYSIS
  // ═══════════════════════════════════════════════════════════════════════

  const valid = results.filter(r => !r.error);
  const fr = valid.filter(r => r.language === 'fr');
  const en = valid.filter(r => r.language === 'en');

  // EN bimodal split (L37b) : mean_sent threshold from corpus data
  // Minimaliste = short sentences (Hemingway), Maximaliste = long (Faulkner)
  // We use G_weighted median as a rough proxy for now
  const enGMedian = percentile(en.map(r => r.G_weighted), 50);
  // Split EN into clusters by whether their style is ample or percutant
  // Use D (density) as proxy: high D = maximaliste, low D = minimaliste
  const enDMedian = percentile(en.map(r => r.D), 50);
  const en_min = en.filter(r => r.D <= enDMedian);
  const en_max = en.filter(r => r.D > enDMedian);

  function analyzeGroup(label: string, group: BacktestResult[]) {
    if (group.length < 5) {
      console.log(`\n${label}: trop peu de données (${group.length})`);
      return;
    }

    const tiers = group.map(r => r.tier_num);
    const gw = group.map(r => r.G_weighted);
    const gg = group.map(r => r.G_geometric);
    const ds = group.map(r => r.D);
    const ss = group.map(r => r.S);
    const is_ = group.map(r => r.I);
    const rs = group.map(r => r.R);
    const vs = group.map(r => r.V);

    console.log(`\n═══ ${label} (n=${group.length}) ═══`);
    console.log(`Tier distribution: S=${group.filter(r => r.tier === 'S').length} A=${group.filter(r => r.tier === 'A').length} B=${group.filter(r => r.tier === 'B').length} C=${group.filter(r => r.tier === 'C').length}`);


    // Corrélations G vs Tier
    const rGwTier = pearsonR(gw, tiers);
    const rGgTier = pearsonR(gg, tiers);
    const sGwTier = spearmanR(gw, tiers);
    const sGgTier = spearmanR(gg, tiers);

    console.log(`\nG_weighted  vs Tier: Pearson r=${rGwTier.toFixed(3)} | Spearman ρ=${sGwTier.toFixed(3)}`);
    console.log(`G_geometric vs Tier: Pearson r=${rGgTier.toFixed(3)} | Spearman ρ=${sGgTier.toFixed(3)}`);

    // Corrélations par sous-axe
    const rDT = pearsonR(ds, tiers);
    const rST = pearsonR(ss, tiers);
    const rIT = pearsonR(is_, tiers);
    const rRT = pearsonR(rs, tiers);
    const rVT = pearsonR(vs, tiers);

    console.log(`\nAxes vs Tier (Pearson r):`);
    console.log(`  D (density)       : r=${rDT.toFixed(3)}`);
    console.log(`  S (surprise)      : r=${rST.toFixed(3)}`);
    console.log(`  I (inevitability)  : r=${rIT.toFixed(3)}`);
    console.log(`  R (resonance)     : r=${rRT.toFixed(3)}`);
    console.log(`  V (voice)         : r=${rVT.toFixed(3)}`);

    // Spearman par sous-axe
    const sDT = spearmanR(ds, tiers);
    const sST = spearmanR(ss, tiers);
    const sIT = spearmanR(is_, tiers);
    const sRT = spearmanR(rs, tiers);
    const sVT = spearmanR(vs, tiers);

    console.log(`\nAxes vs Tier (Spearman ρ):`);
    console.log(`  D : ρ=${sDT.toFixed(3)}`);
    console.log(`  S : ρ=${sST.toFixed(3)}`);
    console.log(`  I : ρ=${sIT.toFixed(3)}`);
    console.log(`  R : ρ=${sRT.toFixed(3)}`);
    console.log(`  V : ρ=${sVT.toFixed(3)}`);

    // Percentiles G_weighted
    console.log(`\nG_weighted percentiles: P10=${percentile(gw, 10).toFixed(1)} P25=${percentile(gw, 25).toFixed(1)} P50=${percentile(gw, 50).toFixed(1)} P75=${percentile(gw, 75).toFixed(1)} P90=${percentile(gw, 90).toFixed(1)}`);
    console.log(`G_weighted mean=${mean(gw).toFixed(1)} std=${std(gw).toFixed(1)}`);

    // Moyenne par tier
    for (const t of ['S', 'A', 'B', 'C']) {
      const tierGroup = group.filter(r => r.tier === t);
      if (tierGroup.length === 0) continue;
      const tGw = mean(tierGroup.map(r => r.G_weighted));
      const tGg = mean(tierGroup.map(r => r.G_geometric));
      const tD = mean(tierGroup.map(r => r.D));
      const tS = mean(tierGroup.map(r => r.S));
      const tI = mean(tierGroup.map(r => r.I));
      const tR = mean(tierGroup.map(r => r.R));
      const tV = mean(tierGroup.map(r => r.V));
      console.log(`  Tier ${t} (n=${tierGroup.length}): G_w=${tGw.toFixed(1)} G_g=${tGg.toFixed(1)} | D=${tD.toFixed(1)} S=${tS.toFixed(1)} I=${tI.toFixed(1)} R=${tR.toFixed(1)} V=${tV.toFixed(1)}`);
    }

    // Verdict D2
    const verdict = Math.abs(rGwTier) >= 0.40 ? 'PASS (r≥0.40)' : 'FAIL (r<0.40)';
    console.log(`\n→ VERDICT D2 pour ${label}: ${verdict}`);

    return { label, n: group.length, rGwTier, sGwTier, rGgTier, rDT, rST, rIT, rRT, rVT };
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RUN ANALYSIS ON ALL GROUPS
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('ANALYSE PAR GROUPE');
  console.log('═══════════════════════════════════════════════════════════');

  const verdicts: any[] = [];
  verdicts.push(analyzeGroup('ALL (FR+EN)', valid));
  verdicts.push(analyzeGroup('FR', fr));
  verdicts.push(analyzeGroup('EN', en));
  verdicts.push(analyzeGroup('EN_MIN (minimaliste — D ≤ médiane)', en_min));
  verdicts.push(analyzeGroup('EN_MAX (maximaliste — D > médiane)', en_max));

  // Tier S only
  const tierS = valid.filter(r => r.tier === 'S');
  const tierS_FR = fr.filter(r => r.tier === 'S');
  const tierS_EN = en.filter(r => r.tier === 'S');
  verdicts.push(analyzeGroup('TIER_S_ALL', tierS));
  verdicts.push(analyzeGroup('TIER_S_FR', tierS_FR));
  verdicts.push(analyzeGroup('TIER_S_EN', tierS_EN));

  // ═══════════════════════════════════════════════════════════════════════
  // VERDICT D2 FINAL
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n\n═══════════════════════════════════════════════════════════');
  console.log('VERDICT D2 — GENIUS ENGINE BACKTEST');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\nCritère D2 : r(G, Tier_EN_max) ≥ 0.40\n');

  const enMaxVerdict = verdicts.find(v => v?.label?.includes('EN_MAX'));
  if (enMaxVerdict) {
    const pass = Math.abs(enMaxVerdict.rGwTier) >= 0.40;
    console.log(`EN_MAX : r(G_w, Tier) = ${enMaxVerdict.rGwTier.toFixed(3)}`);
    console.log(`VERDICT D2 : ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) {
      console.log('\nSi FAIL : Genius Engine ne résout pas L38 en l\'état.');
      console.log('Actions : recalibrer poids D,S,I,R,V ou activer sous-dimensions une par une.');
    }
  } else {
    console.log('EN_MAX : données insuffisantes');
  }

  console.log('\nRésumé par groupe :');
  for (const v of verdicts.filter(Boolean)) {
    const pass = Math.abs(v.rGwTier) >= 0.40;
    console.log(`  ${v.label.padEnd(40)} r=${v.rGwTier.toFixed(3)} ρ=${v.sGwTier.toFixed(3)} ${pass ? '✅' : '❌'}`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SAVE RESULTS
  // ═══════════════════════════════════════════════════════════════════════

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const output = {
    timestamp: new Date().toISOString(),
    corpus_size: corpus.length,
    processed: valid.length,
    errors,
    max_words: MAX_WORDS,
    g_weights: G_WEIGHTS,
    verdicts: verdicts.filter(Boolean),
    results: valid.map(r => ({
      filename: r.filename,
      tier: r.tier,
      language: r.language,
      D: r.D, S: r.S, I: r.I, R: r.R, V: r.V,
      G_weighted: r.G_weighted,
      G_geometric: r.G_geometric,
    })),
  };

  const jsonPath = path.join(OUTPUT_DIR, 'genius_backtest.json');
  fs.writeFileSync(jsonPath, JSON.stringify(output, null, 2));
  console.log(`\nSaved: ${jsonPath}`);

  // Rapport texte
  const report = [
    '# GENIUS ENGINE BACKTEST — BLOC 4 (D2)',
    `Date: ${new Date().toISOString()}`,
    `Corpus: ${valid.length} œuvres (${fr.length} FR, ${en.length} EN)`,
    `Max words: ${MAX_WORDS}`,
    `Errors: ${errors}`,
    '',
  ];
  for (const v of verdicts.filter(Boolean)) {
    const pass = Math.abs(v.rGwTier) >= 0.40;
    report.push(`## ${v.label} (n=${v.n})`);
    report.push(`r(G_w, Tier) = ${v.rGwTier.toFixed(3)} | ρ = ${v.sGwTier.toFixed(3)} | ${pass ? 'PASS' : 'FAIL'}`);
    report.push(`Axes: D=${v.rDT.toFixed(3)} S=${v.rST.toFixed(3)} I=${v.rIT.toFixed(3)} R=${v.rRT.toFixed(3)} V=${v.rVT.toFixed(3)}`);
    report.push('');
  }

  const reportPath = path.join(OUTPUT_DIR, 'genius_backtest_report.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  console.log(`Saved: ${reportPath}`);

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('BACKTEST TERMINÉ');
  console.log('═══════════════════════════════════════════════════════════');
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
