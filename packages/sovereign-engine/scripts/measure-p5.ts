/**
 * OMEGA — P5 Measurement Script (auto-scan ALL .txt in p5_test/)
 * Mesure TOUS les fichiers .txt trouvés dans le dossier p5_test
 * 
 * Usage: cd C:\Users\elric\omega-project\packages\sovereign-engine
 *        npx tsx scripts/measure-p5.ts
 * 
 * Pour ajouter des textes : copier les .txt dans
 *   omega-autopsie/results_rosetta/s0/p5_test/
 * et relancer le script.
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
const P5_DIR = path.resolve(ROOT, 'omega-autopsie/results_rosetta/s0/p5_test');

const scorer = fs.existsSync(METRO)
  ? new MultiStageScorer(COEFF, METRO)
  : new MultiStageScorer(COEFF);

function r(v: number): number { return Math.round(v * 10000) / 10000; }

// Auto-scan all .txt files
const allFiles = fs.readdirSync(P5_DIR)
  .filter(f => f.endsWith('.txt'))
  .sort();

console.log('');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`  OMEGA P5 — MESURE COMPLÈTE (${allFiles.length} fichiers)`);
console.log('═══════════════════════════════════════════════════════════════');
console.log('');

const results: Record<string, unknown>[] = [];

for (const file of allFiles) {
  const filePath = path.join(P5_DIR, file);
  const text = fs.readFileSync(filePath, 'utf-8');
  if (text.trim().length < 50) {
    console.log(`[SKIP] ${file} — vide ou trop court`);
    continue;
  }
  const label = file.replace('.txt', '').toUpperCase();
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
  const short = lens.filter(l => l <= 8).length;
  const medium = lens.filter(l => l > 8 && l < 25).length;
  const long = lens.filter(l => l >= 25).length;
  const knife = lens.filter(l => l <= 5).length;

  console.log(`═══ ${label} (${wc} mots, ${sents.length} phrases) ═══`);
  console.log(`  ┌─────────────────────────────────────────────┐`);
  console.log(`  │  R6 COMPOSITE : ${r(scoreResult.composite.score).toString().padEnd(28)}│`);
  console.log(`  │  LOCAL score  : ${r(scoreResult.local?.score ?? 0).toString().padEnd(28)}│`);
  console.log(`  │  ARC score    : ${r(scoreResult.arc?.score ?? 0).toString().padEnd(28)}│`);
  console.log(`  └─────────────────────────────────────────────┘`);
  console.log(`  RYTHME`);
  console.log(`    f1_mean (longueur moy)    : ${r(features['f1_mean'] ?? 0)}`);
  console.log(`    f1_variance               : ${r(features['f1a_rhythm_variance'] ?? 0)}`);
  console.log(`    f1_ratio (max/min)        : ${r(features['f1b_rhythm_ratio'] ?? 0)}`);
  console.log(`    Distribution              : ${r(short/sents.length*100)}% courtes | ${r(medium/sents.length*100)}% moy | ${r(long/sents.length*100)}% longues`);
  console.log(`  PHRASES-COUTEAU`);
  console.log(`    f17_knife (≤5 mots)       : ${features['f17_knife_count'] ?? 0} (${r(knife/sents.length*100)}%)`);
  console.log(`  RICHESSE LEXICALE`);
  console.log(`    f29d_ttr_score            : ${r(features['f29d_ttr_score'] ?? 0)}`);
  console.log(`  CONTRASTE`);
  console.log(`    f24e_contrast_score       : ${r(features['f24e_contrast_score'] ?? 0)}`);
  console.log(`  COMPRESSION / ORIGINALITÉ`);
  console.log(`    f15b_compression          : ${r(features['f15b_redundancy_compression'] ?? 0)}`);
  console.log(`    f16a_bigram_rarity        : ${r(features['f16a_bigram_rarity'] ?? 0)}`);
  console.log(`  DESCRIPTION / ÉMOTION`);
  console.log(`    f25g_description          : ${r(features['f25g_description_score'] ?? 0)}`);
  console.log(`    f27d_modal               : ${r(features['f27d_modal_score'] ?? 0)}`);
  console.log(`    f28d_sil                 : ${r(features['f28d_sil_score'] ?? 0)}`);
  console.log(`  STRUCTURE`);
  console.log(`    f35c_hook                : ${r(features['f35c_hook_score'] ?? 0)}`);
  console.log(`    f36c_cliff               : ${r(features['f36c_cliff_score'] ?? 0)}`);
  console.log(`    f38c_speed               : ${r(features['f38c_speed_score'] ?? 0)}`);
  console.log(`    f5a_verb_density         : ${r(features['f5a_verb_density'] ?? 0)}`);
  console.log(`    f5c_action_ratio         : ${r(features['f5c_action_verb_ratio'] ?? 0)}`);
  console.log('');

  results.push({
    label, file, wordCount: wc, sentenceCount: sents.length,
    r6_composite: r(scoreResult.composite.score),
    r6_local: r(scoreResult.local?.score ?? 0),
    r6_arc: r(scoreResult.arc?.score ?? 0),
    knife_count: knife,
    knife_pct: r(knife/sents.length*100),
    distribution: { 
      short_pct: r(short/sents.length*100), 
      medium_pct: r(medium/sents.length*100), 
      long_pct: r(long/sents.length*100) 
    },
    key_features: {
      f1_mean: r(features['f1_mean'] ?? 0),
      f1a_rhythm_variance: r(features['f1a_rhythm_variance'] ?? 0),
      f1b_rhythm_ratio: r(features['f1b_rhythm_ratio'] ?? 0),
      f5a_verb_density: r(features['f5a_verb_density'] ?? 0),
      f5c_action_verb_ratio: r(features['f5c_action_verb_ratio'] ?? 0),
      f15b_redundancy_compression: r(features['f15b_redundancy_compression'] ?? 0),
      f16a_bigram_rarity: r(features['f16a_bigram_rarity'] ?? 0),
      f17_knife_count: features['f17_knife_count'] ?? 0,
      f24e_contrast_score: r(features['f24e_contrast_score'] ?? 0),
      f25g_description_score: r(features['f25g_description_score'] ?? 0),
      f27d_modal_score: r(features['f27d_modal_score'] ?? 0),
      f28d_sil_score: r(features['f28d_sil_score'] ?? 0),
      f29d_ttr_score: r(features['f29d_ttr_score'] ?? 0),
      f35c_hook_score: r(features['f35c_hook_score'] ?? 0),
      f36c_cliff_score: r(features['f36c_cliff_score'] ?? 0),
      f38c_speed_score: r(features['f38c_speed_score'] ?? 0),
    },
  });
}

// Baseline
console.log('═══ BASELINE API S0 (médiane 370 tests) ═══');
console.log('  R6 composite : 50-60');
console.log('  f17_knife    : 0-2');
console.log('  f29d_ttr     : 0.72-0.74');
console.log('  f24e_contrast: 0.85-0.93');
console.log('');

const outPath = path.join(P5_DIR, 'p5_results_all.json');
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
console.log(`[SAVED] ${outPath}`);
