/**
 * OMEGA — R6 Benchmark: Normalized Multi-Stage Scorer
 *
 * Mode MOCK: reads text files from gutenberg_cache, normalizes to 0-100.
 * Mode API: (future) uses runSovereignForge() + compares V3 vs R6 scoring.
 *
 * Usage:
 *   npx tsx scripts/run-benchmark-r6.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { getProfileNames } from '../src/scoring/quality-profiles.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');

const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');
const CACHE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');
const OUT_DIR = path.resolve(__dirname, '../sessions');

const TEXT_SOURCES = [
  { file: 'flaubert_bovary_14155.txt', author: 'flaubert', title: 'Madame Bovary', lang: 'fr', extractWords: 600, offsetWords: 5000 },
  { file: 'flaubert_bovary_14155.txt', author: 'flaubert', title: 'Bovary (mid)', lang: 'fr', extractWords: 600, offsetWords: 50000 },
  { file: 'hugo_miserables_17489.txt', author: 'hugo', title: 'Les Miserables', lang: 'fr', extractWords: 600, offsetWords: 20000 },
  { file: 'zola_bete_10007.txt', author: 'zola', title: 'Bete Humaine', lang: 'fr', extractWords: 600, offsetWords: 10000 },
  { file: 'stendhal_chartreuse_7524.txt', author: 'stendhal', title: 'Chartreuse', lang: 'fr', extractWords: 600, offsetWords: 15000 },
  { file: 'flaubert_education_14285.txt', author: 'flaubert', title: 'Education Sent.', lang: 'fr', extractWords: 600, offsetWords: 8000 },
  { file: 'austen_pride_1342.txt', author: 'austen', title: 'Pride & Prej.', lang: 'en', extractWords: 600, offsetWords: 10000 },
  { file: 'hugo_travailleurs_10907.txt', author: 'hugo', title: 'Travailleurs', lang: 'fr', extractWords: 600, offsetWords: 12000 },
];

function extractPassage(filePath: string, offsetWords: number, nWords: number): string {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const words = raw.split(/\s+/);
  const start = Math.min(offsetWords, Math.max(words.length - nWords, 0));
  return words.slice(start, start + nWords).join(' ');
}

function pad(s: string, n: number): string { return s.substring(0, n).padEnd(n); }
function rpad(s: string, n: number): string { return s.substring(0, n).padStart(n); }

function main(): void {
  console.log('OMEGA — Phase R6 Benchmark (MOCK mode, NORMALIZED 0-100)');
  console.log(`Coefficients: ${COEFF_PATH}`);
  console.log(`Metrology: ${METRO_PATH}`);

  // Create scorer WITH normalization
  const scorer = new MultiStageScorer(COEFF_PATH, METRO_PATH);
  console.log(`Normalization: ${scorer.isNormalized() ? 'ACTIVE' : 'OFF'}`);

  // Also create scorer WITHOUT normalization for comparison
  const scorerRaw = new MultiStageScorer(COEFF_PATH);

  const profileNames = getProfileNames();

  // ── Scoring ──────────────────────────────────────────────────────
  interface Row {
    label: string;
    rawComposite: number;
    normComposite: number;
    normLocal: number;
    normArc: number;
    confidence: number;
    passageType: string;
    activeFeatures: number;
    totalFeatures: number;
    profileScores: Record<string, { composite: number; seal: boolean }>;
    featureCount: number;
  }

  const rows: Row[] = [];

  for (const src of TEXT_SOURCES) {
    const filePath = path.join(CACHE_DIR, src.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${src.file} not found`);
      continue;
    }

    const text = extractPassage(filePath, src.offsetWords, src.extractWords);
    const actualWords = text.split(/\s+/).length;
    const features = computeTextFeatures(text);

    // Raw score (no normalization)
    const rawResult = scorerRaw.score(features, { wordCount: actualWords });

    // Normalized score
    const normResult = scorer.score(features, { wordCount: actualWords });

    // All profiles (normalized)
    const profileScores: Record<string, { composite: number; seal: boolean }> = {};
    for (const pName of profileNames) {
      const pr = scorer.score(features, { wordCount: actualWords, profile: pName });
      profileScores[pName] = { composite: pr.composite.score, seal: pr.seal_eligible };
    }

    rows.push({
      label: `${src.author}/${src.title}`,
      rawComposite: rawResult.composite.score,
      normComposite: normResult.composite.score,
      normLocal: normResult.local.score,
      normArc: normResult.arc.score,
      confidence: normResult.composite.confidence,
      passageType: normResult.passage_type,
      activeFeatures: normResult.local.active_features,
      totalFeatures: normResult.local.total_features,
      profileScores,
      featureCount: Object.keys(features).length,
    });
  }

  // ── Main Table ───────────────────────────────────────────────────
  console.log(`\n${'='.repeat(90)}`);
  console.log('BENCH R6 — NORMALIZED SCORING (0-100)');
  console.log(`${'='.repeat(90)}`);
  console.log(
    pad('Scene', 22) + rpad('Raw', 8) + rpad('Norm', 8) + rpad('LOCAL', 8) +
    rpad('ARC', 8) + rpad('Conf', 8) + rpad('Type', 14) + rpad('Active', 8)
  );
  console.log('-'.repeat(90));

  for (const r of rows) {
    console.log(
      pad(r.label, 22) +
      rpad(r.rawComposite.toFixed(1), 8) +
      rpad(r.normComposite.toFixed(1), 8) +
      rpad(r.normLocal.toFixed(1), 8) +
      rpad(r.normArc.toFixed(1), 8) +
      rpad(r.confidence.toFixed(3), 8) +
      rpad(r.passageType, 14) +
      rpad(`${r.activeFeatures}/${r.totalFeatures}`, 8)
    );
  }

  // Averages
  console.log('-'.repeat(90));
  const avgNorm = rows.reduce((s, r) => s + r.normComposite, 0) / rows.length;
  const avgConf = rows.reduce((s, r) => s + r.confidence, 0) / rows.length;
  console.log(
    pad('AVERAGE', 22) +
    rpad('', 8) +
    rpad(avgNorm.toFixed(1), 8) +
    rpad('', 8) + rpad('', 8) +
    rpad(avgConf.toFixed(3), 8)
  );

  // ── Profile Cross Table ──────────────────────────────────────────
  console.log(`\n${'='.repeat(90)}`);
  console.log('CROSS TABLE — 6 PROFILES (normalized 0-100)');
  console.log(`${'='.repeat(90)}`);
  const header = pad('Scene', 22) + profileNames.map(p => rpad(p.substring(0, 8), 10)).join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of rows) {
    const scores = profileNames.map(p => {
      const ps = r.profileScores[p];
      const seal = ps.seal ? ' S' : '  ';
      return rpad(`${ps.composite.toFixed(1)}${seal}`, 10);
    }).join('');
    console.log(pad(r.label, 22) + scores);
  }

  console.log('-'.repeat(header.length));
  const avgRow = pad('AVERAGE', 22) + profileNames.map(p => {
    const avg = rows.reduce((s, r) => s + r.profileScores[p].composite, 0) / rows.length;
    return rpad(avg.toFixed(1), 10);
  }).join('');
  console.log(avgRow);

  // ── Feature Summary ──────────────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('FEATURE STATS');
  console.log(`${'='.repeat(60)}`);
  console.log(`Features per passage: ${rows[0]?.featureCount ?? 0}`);
  console.log(`Active features (LOCAL): ${rows[0]?.activeFeatures ?? 0}/${rows[0]?.totalFeatures ?? 0}`);
  console.log(`Normalization: ACTIVE (Gaussian P10/P90 approximation)`);

  // ── Save ─────────────────────────────────────────────────────────
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `bench_r6_mock_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const output = {
    generated_at: new Date().toISOString(),
    mode: 'MOCK_NORMALIZED',
    normalization: 'Gaussian P10/P90 approximation from R1 cv_matrix',
    results: rows.map(r => ({ ...r })),
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nResults saved: ${outPath}`);

  // ── API bench instructions ───────────────────────────────────────
  console.log(`\n${'='.repeat(60)}`);
  console.log('TO RUN WITH API (Francky):');
  console.log(`${'='.repeat(60)}`);
  console.log('  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
  console.log('  npm run benchmark:phase-w');
  console.log('  # Then compare V3 scores with R6 normalized scores');
}

main();
