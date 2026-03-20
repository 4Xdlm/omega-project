/**
 * OMEGA — Rosetta Measure: compute 49 features on prose files
 * Reads .txt files from results_rosetta/02_prose_*.txt,
 * computes TS features + spaCy features, scores with R6,
 * outputs results_rosetta/03_features_llm.json
 *
 * Also loads R2 classical profiles (Phase 4),
 * computes the Rosette table (Phase 5),
 * and confusion matrix (Phase 7).
 *
 * Usage: npx tsx scripts/rosetta-measure.ts
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import { MultiStageScorer } from '../src/scoring/multi-stage-scorer.js';
import { computeSpacyFeatures, isSpacyBridgeAvailable } from '../src/scoring/spacy-bridge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../..');
const ROSETTA_DIR = path.resolve(ROOT_DIR, 'omega-autopsie/results_rosetta');
const R2_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r2/OMEGA_PASSAGE_TYPES.json');
const COEFF_PATH = path.resolve(__dirname, '../src/scoring/data/OMEGA_COEFFICIENTS_PROPORTIONNELS_v1.json');
const METRO_PATH = path.resolve(ROOT_DIR, 'omega-autopsie/results_r1/OMEGA_METROLOGIE_EMPIRIQUE_v1.json');

const STYLES = ['DESCRIPTION', 'ACTION', 'INTROSPECTION', 'CONTEMPLATION', 'LYRIQUE', 'DIALOGUE', 'TRANSITION'];

// R2 types that exist in the passage types JSON
const R2_TYPES = ['ACTION', 'DESCRIPTION', 'DIALOGUE', 'INTROSPECTION', 'TRANSITION'];

// Mapping: LLM style → R2 baseline for comparison
const STYLE_TO_R2: Record<string, string> = {
  DESCRIPTION: 'DESCRIPTION',
  ACTION: 'ACTION',
  INTROSPECTION: 'INTROSPECTION',
  CONTEMPLATION: 'DESCRIPTION',  // closest R2 type
  LYRIQUE: 'DESCRIPTION',        // closest R2 type
  DIALOGUE: 'DIALOGUE',
  TRANSITION: 'TRANSITION',
};

// Features in LOCAL_600 weight table (the 49 that matter for scoring)
const LOCAL_600_FEATURES = [
  'f12_tense_switches','f15b_redundancy_compression','f16_hapax_count','f16_unique_bigrams',
  'f16a_bigram_rarity','f16c_lexical_surprise','f17_banal_count','f17_contrast_spacing',
  'f17_knife_count','f18a_fragment_rate','f18b_nominal_rate','f18f_ellipsis_final',
  'f19_sentences_analyzed','f19a_approx_entropy','f19f_window_stdev','f19g_consistency_ratio',
  'f1_mean','f1_sentence_count','f1b_rhythm_ratio','f21c_diacope_rate','f21d_rhythm_echo',
  'f21e_ritual_index','f24a_banal_rate','f24c_contrast_delta','f24d_apex_isolation',
  'f25a_description_density','f25b_sensory_coverage','f27d_modal_score','f29c_ttr_stdev',
  'f29d_ttr_score','f30a_passe_simple_rate','f30c_present_rate','f30d_ps_imp_ratio',
  'f33b_commas_count','f35a_hook_tension','f35c_hook_score','f36a_cliff_tension',
  'f36b_cliff_incomplete','f36c_cliff_score','f5_adj_count','f5_lex_verb_count',
  'f5_verb_count','f5a_lex_verb_density','f5a_verb_density','f5b_verb_adj_ratio',
  'f5c_action_verb_ratio','f9a_adversative_count','f9a_contradiction_rate','style_f5a_thresh',
];

// Key features for Rosette comparison (human-readable subset)
const KEY_FEATURES = [
  'f1_mean', 'f5a_verb_density', 'f25g_description_score', 'f28d_sil_score',
  'f27d_modal_score', 'f38c_speed_score', 'f29d_ttr_score', 'f24e_contrast_score',
  'f1b_rhythm_ratio', 'f15b_redundancy_compression', 'f16a_bigram_rarity',
  'f5c_action_verb_ratio', 'f17_knife_count', 'f9a_contradiction_rate',
  'f21c_diacope_rate', 'f36c_cliff_score', 'f35c_hook_score',
];

function round(v: number, d: number): number {
  const f = 10 ** d;
  return Math.round(v * f) / f;
}

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  OMEGA — ROSETTA MEASURE (Phases 3-5, 7)');
  console.log('═══════════════════════════════════════════════════════════');

  const spacyAvailable = isSpacyBridgeAvailable();
  console.log(`spaCy bridge: ${spacyAvailable ? 'AVAILABLE' : 'NOT AVAILABLE'}`);

  // ── Phase 3: Measure features on LLM prose ────────────────────────

  const featuresLlm: Record<string, Record<string, number>> = {};
  const scoresLlm: Record<string, { composite: number; local: number; arc: number }> = {};

  const hasMetro = fs.existsSync(METRO_PATH);
  const scorer = hasMetro
    ? new MultiStageScorer(COEFF_PATH, METRO_PATH)
    : new MultiStageScorer(COEFF_PATH);

  let proseCount = 0;
  for (const style of STYLES) {
    const prosePath = path.join(ROSETTA_DIR, `02_prose_${style}.txt`);
    if (!fs.existsSync(prosePath)) {
      console.log(`  SKIP ${style}: ${prosePath} not found`);
      continue;
    }

    const prose = fs.readFileSync(prosePath, 'utf-8');
    const wordCount = prose.split(/\s+/).length;
    console.log(`  ${style}: ${wordCount} words`);

    // TS features (44)
    const features = computeTextFeatures(prose);

    // spaCy features (5)
    if (spacyAvailable) {
      try {
        const spacyF = await computeSpacyFeatures(prose, 'fr');
        Object.assign(features, spacyF);
      } catch { /* continue with 44 */ }
    }

    featuresLlm[style] = features;

    // Score
    const r = scorer.score(features, {
      wordCount,
      pRel: 0.5,
      profile: 'STRATOSPHERIQUE',
      text: prose,
    });
    scoresLlm[style] = {
      composite: r.composite.score,
      local: r.local.score,
      arc: r.arc.score,
    };
    console.log(`    R6=${r.composite.score.toFixed(2)} LOC=${r.local.score.toFixed(2)} ARC=${r.arc.score.toFixed(2)} type=${r.passage_type}`);
    proseCount++;
  }

  if (proseCount === 0) {
    console.log('\n[ROSETTA] No prose files found. Run rosetta-orchestrator.ts first to generate Phase 2 prose.');
    console.log('[ROSETTA] Skipping to Phase 4 (classical profiles).\n');
  } else {
    // Save Phase 3
    const phase3 = { features: featuresLlm, scores: scoresLlm, feature_count: Object.keys(featuresLlm[STYLES.find(s => featuresLlm[s]) ?? ''] ?? {}).length };
    fs.writeFileSync(path.join(ROSETTA_DIR, '03_features_llm.json'), JSON.stringify(phase3, null, 2));
    console.log(`\n[Phase 3] Saved 03_features_llm.json (${proseCount} styles, ${phase3.feature_count} features)\n`);
  }

  // ── Phase 4: Load classical profiles from R2 ─────────────────────

  console.log('Loading R2 classical profiles...');
  const r2Raw = JSON.parse(fs.readFileSync(R2_PATH, 'utf-8')) as {
    type_profiles: Record<string, { count: number; pct: number; mean_features: Record<string, number> }>;
  };

  const profilesClassiques: Record<string, Record<string, number>> = {};
  for (const [typeName, typeData] of Object.entries(r2Raw.type_profiles)) {
    profilesClassiques[typeName] = typeData.mean_features;
    console.log(`  ${typeName}: ${typeData.count} windows (${typeData.pct}%), ${Object.keys(typeData.mean_features).length} features`);
  }

  fs.writeFileSync(
    path.join(ROSETTA_DIR, '04_profiles_classiques.json'),
    JSON.stringify(profilesClassiques, null, 2),
  );
  console.log(`\n[Phase 4] Saved 04_profiles_classiques.json\n`);

  // ── Phase 5: Rosette table (LLM vs Classiques) ───────────────────

  if (proseCount > 0) {
    console.log('Computing Rosette table...');
    const rosette: Record<string, Record<string, { llm: number; classique: number; ratio: number; status: string }>> = {};

    for (const style of STYLES) {
      if (!featuresLlm[style]) continue;
      const r2Type = STYLE_TO_R2[style];
      const classicProfile = profilesClassiques[r2Type];
      if (!classicProfile) continue;

      rosette[style] = {};
      for (const feat of KEY_FEATURES) {
        const llmVal = featuresLlm[style][feat];
        const classVal = classicProfile[feat];
        if (llmVal === undefined || classVal === undefined || classVal === 0) continue;

        const ratio = round(llmVal / classVal, 4);
        let status: string;
        if (ratio >= 0.80 && ratio <= 1.20) status = 'ALIGNED';
        else if ((ratio >= 0.50 && ratio < 0.80) || (ratio > 1.20 && ratio <= 2.00)) status = 'DECALE';
        else status = 'DIVERGENT';

        rosette[style][feat] = { llm: round(llmVal, 4), classique: round(classVal, 4), ratio, status };
      }
    }

    fs.writeFileSync(path.join(ROSETTA_DIR, '05_table_rosette.json'), JSON.stringify(rosette, null, 2));
    console.log(`[Phase 5] Saved 05_table_rosette.json\n`);

    // ── Phase 7: Confusion matrix ────────────────────────────────────

    console.log('Computing confusion matrix...');
    const confusion: Record<string, {
      plus_proche_classique: string;
      distances: Record<string, number>;
      verdict: string;
    }> = {};

    for (const style of STYLES) {
      if (!featuresLlm[style]) continue;
      const distances: Record<string, number> = {};

      for (const r2Type of R2_TYPES) {
        const classic = profilesClassiques[r2Type];
        if (!classic) continue;

        // Euclidean distance on KEY_FEATURES (normalized by classic value)
        let sumSq = 0;
        let count = 0;
        for (const feat of KEY_FEATURES) {
          const llmVal = featuresLlm[style][feat];
          const classVal = classic[feat];
          if (llmVal === undefined || classVal === undefined) continue;
          const norm = Math.max(Math.abs(classVal), 0.001);
          const diff = (llmVal - classVal) / norm;
          sumSq += diff * diff;
          count++;
        }
        distances[r2Type] = count > 0 ? round(Math.sqrt(sumSq / count), 4) : 999;
      }

      const closest = Object.entries(distances).sort((a, b) => a[1] - b[1])[0];
      const verdict = closest[0] === STYLE_TO_R2[style]
        ? `MATCH — le LLM produit du ${closest[0]} quand on demande ${style}`
        : `SUBSTITUTION — le LLM produit du ${closest[0]} quand on demande ${style}`;

      confusion[`${style}_demande`] = {
        plus_proche_classique: closest[0],
        distances,
        verdict,
      };

      console.log(`  ${style} → closest: ${closest[0]} (d=${closest[1]})`);
    }

    fs.writeFileSync(path.join(ROSETTA_DIR, '07_confusion_matrix.json'), JSON.stringify(confusion, null, 2));
    console.log(`\n[Phase 7] Saved 07_confusion_matrix.json\n`);
  }

  console.log('[ROSETTA] Measurement phases complete.');
}

main().catch(err => { console.error('[FATAL]', err); process.exit(1); });
