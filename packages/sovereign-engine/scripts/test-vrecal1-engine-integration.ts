/**
 * OMEGA — V-RECAL-1 : TEST D'INTÉGRATION ENGINE.TS COMPLET
 * Appelle runSovereignForge() avec OMEGA_CHUNKED_V4=1
 * → Le moteur v4 chunké traverse les 19 étages du pipeline canonique
 * Budget : ~12 API (4 gen + ~8 scoring/loop/duel)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

// Force les flags AVANT tout import
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import type { AnthropicProviderConfig } from '../src/runtime/live-types.js';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ FORGE PACKET INPUT ═══

const U14D: Record<string, number> = {
  joy: 1/14, trust: 1/14, fear: 1/14, surprise: 1/14,
  sadness: 1/14, disgust: 1/14, anger: 1/14, anticipation: 1/14,
  love: 1/14, submission: 1/14, awe: 1/14, disapproval: 1/14,
  remorse: 1/14, contempt: 1/14,
};

const SAD14D: Record<string, number> = (() => {
  const r = 0.50 / 13;
  return {
    joy: r, trust: r, fear: r, surprise: r, sadness: 0.50, disgust: r,
    anger: r, anticipation: r, love: r, submission: r, awe: r,
    disapproval: r, remorse: r, contempt: r,
  };
})();

const forgePacket: ForgePacket = {
  packet_id: 'FORGE_vrecal1_contemplation',
  packet_hash: 'a'.repeat(64),
  scene_id: 'vrecal1_contemplation',
  run_id: `vrecal1_${Date.now()}`,
  quality_tier: 'sovereign',
  language: 'fr',

  intent: {
    story_goal: 'Explorer la solitude et la mémoire dans un lieu abandonné',
    scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas — mélancolie contemplative',
    conflict_type: 'internal',
    pov: 'third_limited',
    tense: 'past',
    target_word_count: 2500,
  },

  emotion_contract: {
    curve_quartiles: [
      { quartile: 'Q1', target_14d: U14D, valence: -0.1, arousal: 0.2, dominant: 'anticipation', narrative_instruction: 'Attente silencieuse — le lieu est décrit' },
      { quartile: 'Q2', target_14d: SAD14D, valence: -0.3, arousal: 0.3, dominant: 'sadness', narrative_instruction: 'La mémoire monte — un été ancien' },
      { quartile: 'Q3', target_14d: SAD14D, valence: -0.4, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Le souvenir est vif — presque physique' },
      { quartile: 'Q4', target_14d: U14D, valence: -0.2, arousal: 0.2, dominant: 'sadness', narrative_instruction: 'Résignation — elle accepte l\'absence' },
    ],
    intensity_range: { min: 0.2, max: 0.5 },
    tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
    terminal_state: { target_14d: U14D, valence: -0.2, arousal: 0.2, dominant: 'sadness', reader_state: 'Mélancolie douce' },
    rupture: { exists: false, position_pct: 0, before_dominant: 'sadness', after_dominant: 'sadness', delta_valence: 0 },
    valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
  },

  beats: [
    { beat_id: 'b1', beat_order: 0, action: 'Elle prépare du thé dans la cuisine froide', dialogue: '', subtext_type: 'progression', emotion_instruction: 'Gestes mécaniques, esprit ailleurs', sensory_tags: ['touch', 'sound'], canon_refs: [] },
    { beat_id: 'b2', beat_order: 1, action: 'Elle regarde la mer par la fenêtre', dialogue: '', subtext_type: 'progression', emotion_instruction: 'Le paysage reflète son état intérieur', sensory_tags: ['sight'], canon_refs: [] },
    { beat_id: 'b3', beat_order: 2, action: 'Un souvenir d\'été remonte — une voix, un rire', dialogue: '', subtext_type: 'pivot', emotion_instruction: 'Le passé envahit le présent', sensory_tags: ['sound', 'smell'], canon_refs: [] },
    { beat_id: 'b4', beat_order: 3, action: 'La nuit tombe, elle ne bouge pas', dialogue: '', subtext_type: 'progression', emotion_instruction: 'Immobilité acceptée', sensory_tags: ['sight', 'touch'], canon_refs: [] },
  ],

  subtext: {
    layers: [
      { layer_id: 'l1', type: 'absence', statement: 'Quelqu\'un manque — on ne saura pas qui', visibility: 'buried' },
    ],
    tension_type: 'absence',
    tension_intensity: 0.4,
  },

  sensory: {
    density_target: 3,
    categories: [
      { category: 'sight', min_count: 3, signature_words: ['lumière', 'gris', 'horizon'] },
      { category: 'sound', min_count: 2, signature_words: ['vent', 'volets', 'silence'] },
      { category: 'touch', min_count: 2, signature_words: ['froid', 'tasse', 'bois'] },
      { category: 'smell', min_count: 1, signature_words: ['sel', 'thé'] },
      { category: 'taste', min_count: 0, signature_words: [] },
      { category: 'proprioception', min_count: 1, signature_words: [] },
      { category: 'interoception', min_count: 1, signature_words: [] },
    ],
    recurrent_motifs: ['mer', 'vent', 'lumière déclinante'],
    banned_metaphors: [],
  },

  style_genome: {
    version: '1.0.0',
    universe: 'literary_contemplation',
    lexicon: {
      signature_words: ['silence', 'ombre', 'souffle', 'lumière', 'eau', 'pierre', 'froid', 'vent', 'sel', 'vide'],
      forbidden_words: ['soudainement', 'mystérieusement', 'bizarrement'],
      abstraction_max_ratio: 0.20,
      concrete_min_ratio: 0.60,
    },
    rhythm: {
      avg_sentence_length_target: 18,
      gini_target: 0.45,
      max_consecutive_similar: 2,
      min_syncopes_per_scene: 2,
      min_compressions_per_scene: 1,
    },
    tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.5] },
    imagery: {
      recurrent_motifs: ['mer', 'vent', 'lumière'],
      density_target_per_100_words: 3,
      banned_metaphors: [],
    },
  },

  kill_lists: {
    banned_words: ['soudain', 'soudainement', 'mystérieusement'],
    banned_cliches: ['cœur de pierre', 'mer d\'émotions', 'silence assourdissant'],
    banned_ai_patterns: ['il ne pouvait s\'empêcher de', 'une vague de', 'un frisson parcourut'],
    banned_filter_words: ['effectivement', 'néanmoins', 'toutefois'],
  },

  canon: [],

  continuity: {
    previous_scene_summary: '',
    character_states: [
      {
        character_id: 'char_elle',
        character_name: 'Elle',
        emotional_state: 'attente résignée',
        physical_state: 'debout, immobile',
        location: 'maison au bord de la mer',
      },
    ],
    open_threads: [],
  },

  seeds: { llm_seed: 'vrecal1_pilot', determinism_level: 'absolute' },

  generation: {
    timestamp: new Date().toISOString(),
    generator_version: '4.0.0',
    constraints_hash: 'b'.repeat(64),
  },
} as ForgePacket;

// ═══ HELPERS ═══

function measureWindows(text: string, numWindows: number) {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(s => s.length > 5);
  if (sentences.length < 2) return [{ mean_len: 0 }];
  const windowSize = Math.floor(sentences.length / numWindows);
  const windows = [];
  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSize;
    const end = w === numWindows - 1 ? sentences.length : start + windowSize;
    const slice = sentences.slice(start, end);
    const lengths = slice.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    windows.push({ mean_len: mean });
  }
  return windows;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — V-RECAL-1 : INTÉGRATION ENGINE.TS COMPLÈTE');
  console.log('  OMEGA_CHUNKED_V4=1 — Pipeline 19 étages actif');
  console.log('  1 run contemplation — moteur v4 dans engine.ts');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY not set. Set it with:\n  $env:ANTHROPIC_API_KEY = "sk-ant-..."');
    return;
  }

  const providerConfig: AnthropicProviderConfig = {
    apiKey,
    model: 'claude-sonnet-4-20250514',
    judgeStable: false,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  };

  const provider = createAnthropicProvider(providerConfig);

  console.log('\n═══ LANCEMENT runSovereignForge() ═══');
  console.log('  Le pipeline complet va exécuter :');
  console.log('  1. ForgePacket assembly + validation');
  console.log('  2. SymbolMap generation (LLM)');
  console.log('  3. EmotionBrief construction');
  console.log('  4. Chunked draft generation (4 x LLM)');
  console.log('  5. SemanticSlicer');
  console.log('  6. PhysicsAudit');
  console.log('  7. SovereignLoop (pitch-patch)');
  console.log('  8. Duel (si <92)');
  console.log('  9. MicroSurgery');
  console.log('  10. judgeAestheticV3 (5 macro-axes)');
  console.log('  11. TargetedPatch P5');

  let result: SovereignForgeResult;
  try {
    result = await runSovereignForgeWithPacket(forgePacket, provider);
  } catch (e: any) {
    console.error(`\n❌ ENGINE FAIL: ${e.message}`);
    console.error(e.stack);
    return;
  }

  const prose = result.final_prose;
  const totalWords = prose.split(/\s+/).length;

  // ── Pipeline A metrics (monitoring) ──
  console.log('\n═══ MONITORING PIPELINE A (GB V1 + MS V2) ═══');
  const gbResult = scoreText(prose);
  const features = computeAllGBFeatures(prose);
  const msV2 = new MultiStageScorerV2();
  const v2Result = msV2.score(features, { wordCount: totalWords });

  const windows = measureWindows(prose, 4);
  const drift = windows.length >= 2 ? windows[windows.length - 1].mean_len - windows[0].mean_len : 0;
  const f26b = features['f26b_long_sent_rate'] ?? 0;
  const cv = features['f1a_rhythm_variance'] ?? 0;

  console.log(`  GB V1     = ${gbResult.score.toFixed(3)} (tier ${gbResult.tier})`);
  console.log(`  MS V2     = ${v2Result.final.toFixed(1)}`);
  console.log(`  f26b      = ${f26b.toFixed(3)}`);
  console.log(`  CV (f1a)  = ${cv.toFixed(3)}`);
  console.log(`  Drift     = ${drift.toFixed(1)}`);

  // ── Pipeline B (MacroSScore canonique) ──
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  V-RECAL-1 — RÉSULTATS COMPLETS (ENGINE.TS 19 ÉTAGES)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Words        = ${totalWords}`);
  console.log(`  Passes       = ${result.passes_executed}`);
  console.log(`  GB V1        = ${gbResult.score.toFixed(3)} (tier ${gbResult.tier})`);
  console.log(`  MS V2        = ${v2Result.final.toFixed(1)}`);
  console.log(`  f26b         = ${f26b.toFixed(3)}`);
  console.log(`  Drift        = ${drift.toFixed(1)}`);

  if (result.macro_score) {
    const ms = result.macro_score;
    console.log('  ─────────────────────────────────────────');
    console.log(`  ECC          = ${ms.ecc_score.toFixed(1)}`);
    console.log(`  COMPOSITE    = ${ms.composite.toFixed(1)}`);
    console.log(`  MIN_AXIS     = ${ms.min_axis.toFixed(1)}`);
    console.log(`  VERDICT      = ${ms.verdict}`);
    console.log(`  SAGA_READY   = ${ms.composite >= 92 && ms.min_axis >= 85 ? '✅ OUI' : '❌ NON'}`);

    if (ms.macro_axes) {
      const ma = ms.macro_axes;
      console.log('  ─────────────────────────────────────────');
      console.log(`  ECC detail   = ${ma.ecc.score.toFixed(1)} (w=${ma.ecc.weight})`);
      console.log(`  RCI detail   = ${ma.rci.score.toFixed(1)} (w=${ma.rci.weight})`);
      console.log(`  SII detail   = ${ma.sii.score.toFixed(1)} (w=${ma.sii.weight})`);
      console.log(`  IFI detail   = ${ma.ifi.score.toFixed(1)} (w=${ma.ifi.weight})`);
      console.log(`  AAI detail   = ${ma.aai.score.toFixed(1)} (w=${ma.aai.weight})`);
    }
  } else {
    console.log('  ─────────────────────────────────────────');
    console.log(`  S-Score      = ${result.s_score.composite.toFixed(1)}`);
    console.log(`  VERDICT      = ${result.verdict}`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════');

  // ── Save ──
  const sessionDir = path.join('sessions', `VRECAL1_ENGINE_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(path.join(sessionDir, 'prose.txt'), prose);

  const output = {
    timestamp: new Date().toISOString(),
    moteur: 'PF_base_Duras_correcteur_K2_v4_IN_ENGINE',
    pipeline: 'engine.ts — 19 étages — OMEGA_CHUNKED_V4=1',
    scene: 'contemplation',
    words: totalWords,
    passes: result.passes_executed,
    verdict: result.verdict,
    monitoring: { gb_v1: gbResult.score, gb_tier: gbResult.tier, ms_v2: v2Result.final, f26b, cv, drift },
    macro_score: result.macro_score ? {
      composite: result.macro_score.composite,
      min_axis: result.macro_score.min_axis,
      ecc: result.macro_score.ecc_score,
      verdict: result.macro_score.verdict,
      macro_axes: result.macro_score.macro_axes ? {
        ecc: result.macro_score.macro_axes.ecc.score,
        rci: result.macro_score.macro_axes.rci.score,
        sii: result.macro_score.macro_axes.sii.score,
        ifi: result.macro_score.macro_axes.ifi.score,
        aai: result.macro_score.macro_axes.aai.score,
      } : null,
    } : { s_score: result.s_score.composite, verdict: result.verdict },
    saga_ready: result.macro_score ? (result.macro_score.composite >= 92 && result.macro_score.min_axis >= 85) : false,
  };

  fs.writeFileSync(path.join(sessionDir, 'results.json'), JSON.stringify(output, null, 2));
  fs.writeFileSync('src/scoring/data/VRECAL1_ENGINE_RESULTS.json', JSON.stringify(output, null, 2));
  console.log(`\nSaved: ${sessionDir}/ + src/scoring/data/VRECAL1_ENGINE_RESULTS.json`);
}

main().catch(console.error);
