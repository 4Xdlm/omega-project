/**
 * OMEGA — R5 Benchmark: Multi-Stage Scorer Validation
 *
 * Mode MOCK: reads text files from gutenberg_cache, computes F24-F38 features,
 * scores with the multi-stage scorer across 6 quality profiles.
 *
 * Usage:
 *   npx tsx scripts/run-benchmark-r5.ts
 *
 * Reads external text files — no hardcoded literary content.
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

// ── Config ─────────────────────────────────────────────────────────────

const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const CACHE_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/gutenberg_cache');
const OUT_DIR = path.resolve(__dirname, '../sessions');

/** Text sources: file in gutenberg_cache -> metadata */
const TEXT_SOURCES: Array<{
  file: string;
  author: string;
  title: string;
  lang: string;
  extractWords: number;
  offsetWords: number;
}> = [
  { file: 'flaubert_bovary_14155.txt', author: 'flaubert', title: 'Madame Bovary', lang: 'fr', extractWords: 600, offsetWords: 5000 },
  { file: 'flaubert_bovary_14155.txt', author: 'flaubert', title: 'Madame Bovary (ch.mid)', lang: 'fr', extractWords: 600, offsetWords: 50000 },
  { file: 'hugo_miserables_17489.txt', author: 'hugo', title: 'Les Miserables', lang: 'fr', extractWords: 600, offsetWords: 20000 },
  { file: 'zola_bete_10007.txt', author: 'zola', title: 'La Bete Humaine', lang: 'fr', extractWords: 600, offsetWords: 10000 },
  { file: 'stendhal_chartreuse_7524.txt', author: 'stendhal', title: 'Chartreuse de Parme', lang: 'fr', extractWords: 600, offsetWords: 15000 },
  { file: 'flaubert_education_14285.txt', author: 'flaubert', title: 'Education Sentimentale', lang: 'fr', extractWords: 600, offsetWords: 8000 },
  { file: 'austen_pride_1342.txt', author: 'austen', title: 'Pride and Prejudice', lang: 'en', extractWords: 600, offsetWords: 10000 },
  { file: 'hugo_travailleurs_10907.txt', author: 'hugo', title: 'Travailleurs de la Mer', lang: 'fr', extractWords: 600, offsetWords: 12000 },
];

// Extended mode: 1500 words
const TEXT_SOURCES_EXTENDED = TEXT_SOURCES.map(s => ({ ...s, extractWords: 1500 }));

// ── Utils ──────────────────────────────────────────────────────────────

function extractPassage(filePath: string, offsetWords: number, nWords: number): string {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const words = raw.split(/\s+/);
  const start = Math.min(offsetWords, Math.max(words.length - nWords, 0));
  const end = Math.min(start + nWords, words.length);
  return words.slice(start, end).join(' ');
}

interface SceneResult {
  source: string;
  author: string;
  title: string;
  lang: string;
  wordCount: number;
  features: Record<string, number>;
  featureCount: number;
  profiles: Record<string, {
    composite: number;
    local: number;
    arc: number;
    confidence: number;
    activeFeatures: number;
    passageType: string;
    sealEligible: boolean;
  }>;
}

// ── Main ───────────────────────────────────────────────────────────────

function runBench(sources: typeof TEXT_SOURCES, label: string): SceneResult[] {
  const scorer = new MultiStageScorer(COEFF_PATH);
  const profileNames = getProfileNames();
  const results: SceneResult[] = [];

  console.log(`\n${'='.repeat(70)}`);
  console.log(`OMEGA R5 BENCH — ${label}`);
  console.log(`${'='.repeat(70)}\n`);

  for (const src of sources) {
    const filePath = path.join(CACHE_DIR, src.file);
    if (!fs.existsSync(filePath)) {
      console.log(`  SKIP: ${src.file} not found`);
      continue;
    }

    const text = extractPassage(filePath, src.offsetWords, src.extractWords);
    const actualWords = text.split(/\s+/).length;

    // Compute features
    const features = computeTextFeatures(text);
    const featureCount = Object.keys(features).length;

    // Score with each profile
    const profiles: SceneResult['profiles'] = {};
    for (const pName of profileNames) {
      const result = scorer.score(features, {
        wordCount: actualWords,
        profile: pName,
      });
      profiles[pName] = {
        composite: result.composite.score,
        local: result.local.score,
        arc: result.arc.score,
        confidence: result.composite.confidence,
        activeFeatures: result.local.active_features + result.arc.active_features,
        passageType: result.passage_type,
        sealEligible: result.seal_eligible,
      };
    }

    const sceneResult: SceneResult = {
      source: src.file,
      author: src.author,
      title: src.title,
      lang: src.lang,
      wordCount: actualWords,
      features,
      featureCount,
      profiles,
    };
    results.push(sceneResult);

    // Print
    const defaultProfile = profiles['STRATOSPHERIQUE'];
    console.log(`  ${src.author}/${src.title} (${actualWords}w)`);
    console.log(`    Features: ${featureCount} | Type: ${defaultProfile.passageType}`);
    console.log(`    STRATO: ${defaultProfile.composite.toFixed(2)} (conf=${defaultProfile.confidence.toFixed(3)}, active=${defaultProfile.activeFeatures})`);
  }

  return results;
}

function printProfileCrossTable(results: SceneResult[]): void {
  const profileNames = getProfileNames();

  console.log(`\n${'='.repeat(70)}`);
  console.log('CROSS TABLE — 6 PROFILES x SCENES');
  console.log(`${'='.repeat(70)}\n`);

  // Header
  const header = 'Scene'.padEnd(30) + profileNames.map(p => p.substring(0, 7).padStart(9)).join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const r of results) {
    const label = `${r.author}/${r.title.substring(0, 20)}`.padEnd(30);
    const scores = profileNames.map(p => {
      const pr = r.profiles[p];
      const seal = pr.sealEligible ? ' S' : '  ';
      return `${pr.composite.toFixed(1)}${seal}`.padStart(9);
    }).join('');
    console.log(`${label}${scores}`);
  }

  // Summary row
  console.log('-'.repeat(header.length));
  const avgRow = 'AVERAGE'.padEnd(30) + profileNames.map(p => {
    const avg = results.reduce((s, r) => s + r.profiles[p].composite, 0) / results.length;
    return avg.toFixed(1).padStart(9);
  }).join('');
  console.log(avgRow);
}

function printFeatureSummary(results: SceneResult[]): void {
  console.log(`\n${'='.repeat(70)}`);
  console.log('FEATURE SUMMARY');
  console.log(`${'='.repeat(70)}\n`);

  // Collect all feature names
  const allFeatures = new Set<string>();
  for (const r of results) {
    for (const f of Object.keys(r.features)) {
      allFeatures.add(f);
    }
  }

  // Print key features with mean/min/max across scenes
  const keyFeatures = [
    'f1_mean', 'f24e_contrast_score', 'f25g_description_score', 'f26c_period_score',
    'f27d_modal_score', 'f28d_sil_score', 'f29d_ttr_score', 'f30d_ps_imp_ratio',
    'f33c_dot_comma_ratio', 'f34b_para_per_1000w', 'f35c_hook_score',
    'f36c_cliff_score', 'f38c_speed_score',
  ];

  console.log('Feature'.padEnd(30) + 'Mean'.padStart(10) + 'Min'.padStart(10) + 'Max'.padStart(10));
  console.log('-'.repeat(60));

  for (const feat of keyFeatures) {
    const vals = results.map(r => r.features[feat]).filter(v => v !== undefined);
    if (vals.length === 0) continue;
    const m = vals.reduce((a, b) => a + b, 0) / vals.length;
    const mn = Math.min(...vals);
    const mx = Math.max(...vals);
    console.log(
      feat.padEnd(30) +
      m.toFixed(4).padStart(10) +
      mn.toFixed(4).padStart(10) +
      mx.toFixed(4).padStart(10)
    );
  }

  console.log(`\nTotal features computed: ${allFeatures.size}`);
}

// ── Entry Point ────────────────────────────────────────────────────────

function main(): void {
  console.log('OMEGA — Phase R5 Benchmark (MOCK mode)');
  console.log(`Coefficients: ${COEFF_PATH}`);
  console.log(`Text sources: ${CACHE_DIR}`);

  // MODE 1: 600 words
  const results600 = runBench(TEXT_SOURCES, 'MODE 1 — 600 words');
  printProfileCrossTable(results600);
  printFeatureSummary(results600);

  // MODE 2: 1500 words
  const results1500 = runBench(TEXT_SOURCES_EXTENDED, 'MODE 2 — 1500 words');
  printProfileCrossTable(results1500);

  // Confidence comparison
  console.log(`\n${'='.repeat(70)}`);
  console.log('CONFIDENCE COMPARISON — 600w vs 1500w');
  console.log(`${'='.repeat(70)}\n`);
  console.log('Scene'.padEnd(30) + '600w conf'.padStart(12) + '1500w conf'.padStart(12) + 'Delta'.padStart(10));
  console.log('-'.repeat(64));
  for (let i = 0; i < results600.length; i++) {
    const r600 = results600[i];
    const r1500 = results1500[i];
    if (!r600 || !r1500) continue;
    const c600 = r600.profiles['STRATOSPHERIQUE'].confidence;
    const c1500 = r1500.profiles['STRATOSPHERIQUE'].confidence;
    const label = `${r600.author}/${r600.title.substring(0, 20)}`.padEnd(30);
    console.log(`${label}${c600.toFixed(4).padStart(12)}${c1500.toFixed(4).padStart(12)}${(c1500 - c600).toFixed(4).padStart(10)}`);
  }

  // Save results
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `bench_r5_mock_${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const output = {
    generated_at: new Date().toISOString(),
    mode: 'MOCK',
    mode1_600w: results600.map(r => ({ ...r, features: undefined })),
    mode2_1500w: results1500.map(r => ({ ...r, features: undefined })),
    feature_details_600w: results600.map(r => ({ source: r.source, features: r.features })),
  };
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nResults saved: ${outPath}`);
}

main();
