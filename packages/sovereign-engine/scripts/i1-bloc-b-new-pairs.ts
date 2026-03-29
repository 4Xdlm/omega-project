/**
 * OMEGA — I1 BLOC B : 10 nouvelles paires contradictoires
 * 10 paires x 3 runs = 30 API calls
 * Scene neutre : contemplation
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SESSION_DIR = path.join('sessions', 'CLAUDE_BLACKBOX_I1');
fs.mkdirSync(SESSION_DIR, { recursive: true });

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

function buildPacket(id: string, constraint: string): ForgePacket {
  return {
    packet_id: `I1_${id}_${Date.now()}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `i1_${id}`,
    run_id: `i1_${id}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: 'Explorer la solitude et la memoire',
      scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas — melancolie contemplative',
      conflict_type: 'internal',
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D('anticipation'), valence: -0.1, arousal: 0.3, dominant: 'anticipation', narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D('sadness', 0.35), valence: -0.2, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D('sadness'), valence: -0.4, arousal: 0.6, dominant: 'sadness', narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: 'sadness', after_dominant: 'sadness', delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: [
      { beat_id: 'b1', beat_order: 0, action: 'Elle prepare du the dans la cuisine froide', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['touch', 'sound'], canon_refs: [] },
      { beat_id: 'b2', beat_order: 1, action: 'Elle regarde la mer par la fenetre', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
      { beat_id: 'b3', beat_order: 2, action: 'Un souvenir d ete remonte', dialogue: '', subtext_type: 'pivot', emotion_instruction: '', sensory_tags: ['sound', 'smell'], canon_refs: [] },
      { beat_id: 'b4', beat_order: 3, action: 'La nuit tombe, elle ne bouge pas', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight', 'touch'], canon_refs: [] },
    ],
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: ['mer', 'vent', 'lumiere'], banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: { signature_words: ['silence','ombre','vent','sel'], forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] },
      imagery: { recurrent_motifs: ['mer', 'vent'], density_target_per_100_words: 3, banned_metaphors: [] },
      extra_constraints: constraint,
    } as any,
    kill_lists: { banned_words: ['soudain'], banned_cliches: ['coeur de pierre'], banned_ai_patterns: ['il ne pouvait s\'empecher'], banned_filter_words: ['effectivement'] },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `i1_${id}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

function extractFeatures(prose: string) {
  const words = prose.split(/\s+/).filter(w => w.length > 0);
  const nw = words.length;
  const sents = prose.split(/(?<=[.!?\u2026\u00bb])\s+/).map(s => s.trim()).filter(s => s.length > 5);
  const ns = Math.max(sents.length, 1);
  const lens = sents.map(s => s.split(/\s+/).filter(w => w.length > 0).length);
  const mean = lens.reduce((a, b) => a + b, 0) / ns;
  const std = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(ns - 1, 1));
  const cv = mean > 0 ? std / mean : 0;
  const f26b = lens.filter(l => l > 40).length / ns;
  const f17 = lens.filter(l => l <= 5).length;
  let tLC = 0, tCL = 0;
  for (let i = 0; i < lens.length - 1; i++) {
    if (lens[i] > 30 && lens[i + 1] < 10) tLC++;
    if (lens[i] < 10 && lens[i + 1] > 30) tCL++;
  }
  return {
    words: nw, sentence_count: ns, mean_sent_len: +mean.toFixed(2), cv_sent: +cv.toFixed(4),
    f26b_long_sent_rate: +f26b.toFixed(4), f17_knife_count: f17, ratio_alt: +((tLC + tCL) / ns).toFixed(4),
    semicolon_count: (prose.match(/;/g) || []).length,
    dash_count: (prose.match(/[\u2014\u2013]/g) || []).length,
    longest_sent: Math.max(...lens, 0), shortest_sent: Math.min(...lens, 999),
  };
}

const PAIRS = [
  { id: 'P06_souffle_violence', a: 'souffle_ample', b: 'violence_nue',
    constraint: 'CONFLIT : deploie un souffle ample proustien (phrases de 50+ mots, subordonnees en cascade, progression sinueuse) MAIS le fond doit etre d une violence nue, crue, sans fard — mort, blessure, cruaute physique.' },
  { id: 'P07_intro_urgence', a: 'introspection', b: 'urgence_temporelle',
    constraint: 'CONFLIT : le personnage est plonge dans une introspection profonde (monologue interieur, sensations, memoire) MAIS le temps presse — chaque phrase doit porter l urgence chronometrique d un compte a rebours.' },
  { id: 'P08_lyrisme_secheresse', a: 'lyrisme', b: 'secheresse_syntaxique',
    constraint: 'CONFLIT : le contenu est lyrique (beaute, lumiere, nature magnifiee) MAIS la syntaxe est seche, coupee, telegraphique — aucune subordination, phrases minimales de 5-10 mots.' },
  { id: 'P09_dialogue_sensoriel', a: 'dialogue_pur', b: 'densite_sensorielle',
    constraint: 'CONFLIT : 50% du texte est du dialogue pur (repliques brutes, pas de didascalies) ET les 50% restants sont de la pure description sensorielle (odeurs, textures, sons, gouts). Aucune narration, aucune introspection.' },
  { id: 'P10_sub_martele', a: 'subordination_forte', b: 'phrases_martelees',
    constraint: 'CONFLIT : alterne strictement entre une phrase-fleuve de 60+ mots avec 3+ subordonnees ET une phrase-marteau de 3-5 mots. Aucune phrase de longueur intermediaire.' },
  { id: 'P11_contemp_explosion', a: 'contemplation', b: 'action_explosive',
    constraint: 'CONFLIT : la scene commence par une contemplation immobile et lente (3 paragraphes) puis EXPLOSE en action pure (course, chute, cri) dans le dernier paragraphe. La transition doit etre brutale, sans preparation.' },
  { id: 'P12_oral_metaphore', a: 'oralite', b: 'metaphore_rare',
    constraint: 'CONFLIT : le registre est tres oral (contractions, tournures parlees, syntaxe relachee, argot doux) MAIS chaque paragraphe doit contenir au moins une metaphore rare, precieuse, jamais vue — comme un bijou dans la boue.' },
  { id: 'P13_clinique_emotion', a: 'description_clinique', b: 'emotion_brute',
    constraint: 'CONFLIT : la forme est clinique et froide (style rapport medical, distances, mesures, constat factuel) MAIS le contenu emotionnel est brut et devastating — deuil, perte, effondrement interieur.' },
  { id: 'P14_temps_verbe', a: 'temps_suspendu', b: 'verbe_action_pur',
    constraint: 'CONFLIT : le temps narratif est suspendu (imparfait, descriptions statiques, temps qui ne passe pas) MAIS chaque phrase contient un verbe d action physique concret (courir, frapper, saisir, tomber).' },
  { id: 'P15_cloture_resolution', a: 'cloture_interdite', b: 'resolution_emotionnelle',
    constraint: 'CONFLIT : le texte doit se terminer sur une ouverture totale (pas de resolution, pas de conclusion, la derniere phrase doit etre une question ou une suspension) MAIS le personnage doit avoir trouve une forme de paix emotionnelle avant la fin.' },
];

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  OMEGA — I1 BLOC B : 10 NOUVELLES PAIRES (30 runs)');
  console.log('═══════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const pause = (ms: number) => new Promise(r => setTimeout(r, ms));
  const results: any[] = [];

  for (const pair of PAIRS) {
    for (let run = 0; run < 3; run++) {
      console.log(`\n  [${pair.id}] run ${run + 1}/3...`);
      try {
        const packet = buildPacket(`${pair.id}_r${run}`, pair.constraint);
        const forgeResult = await runSovereignForgeWithPacket(packet, provider);
        const prose = forgeResult.final_prose;
        const ms = forgeResult.macro_score;
        const feats = extractFeatures(prose);
        const entry = {
          pair_id: pair.id, dimension_A: pair.a, dimension_B: pair.b, run,
          composite: ms?.composite ?? 0, min_axis: ms?.min_axis ?? 0,
          axes: { ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
                  SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
                  AAI: ms?.macro_axes?.aai.score ?? 0 },
          features: feats,
        };
        results.push(entry);
        console.log(`    comp=${entry.composite.toFixed(1)} min=${entry.min_axis.toFixed(1)} words=${feats.words} mean=${feats.mean_sent_len} f17=${feats.f17_knife_count} alt=${feats.ratio_alt}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        results.push({ pair_id: pair.id, dimension_A: pair.a, dimension_B: pair.b, run, error: e.message?.slice(0, 200) });
      }
      await pause(2000);
    }
  }

  fs.writeFileSync(path.join(SESSION_DIR, 'B_NEW_PAIRS_RAW.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved: ${SESSION_DIR}/B_NEW_PAIRS_RAW.json`);

  // Summary
  console.log('\n═══ SUMMARY ═══');
  const baseline_comp = 89.6;
  for (const pair of PAIRS) {
    const runs = results.filter(r => r.pair_id === pair.id && !r.error);
    if (runs.length === 0) continue;
    const comps = runs.map((r: any) => r.composite);
    const mean = comps.reduce((a: number, b: number) => a + b, 0) / comps.length;
    const delta = mean - baseline_comp;
    const verdict = delta > 1.0 ? 'FECOND' : (delta < 0 ? 'PARASITE' : 'NEUTRE');
    console.log(`  ${pair.id}: comp=${mean.toFixed(1)} delta=${delta > 0 ? '+' : ''}${delta.toFixed(1)} → ${verdict}`);
  }

  console.log(`\n  Total: ${results.filter(r => !r.error).length}/30 OK`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
