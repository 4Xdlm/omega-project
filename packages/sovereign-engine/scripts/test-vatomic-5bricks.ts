/**
 * OMEGA — V-ATOMIC : Forge de 5 briques sur 5 scènes différentes
 * Preuve de robustesse SAGA_READY sur briques de taille libre
 * Budget : ~75-100 API (5 runs × 15-20 API chacun)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

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
import { sha256, canonicalize } from '@omega/canon-kernel';

// ═══ 14D DISTRIBUTIONS ═══

const U14D: Record<string, number> = {
  joy: 1/14, trust: 1/14, fear: 1/14, surprise: 1/14,
  sadness: 1/14, disgust: 1/14, anger: 1/14, anticipation: 1/14,
  love: 1/14, submission: 1/14, awe: 1/14, disapproval: 1/14,
  remorse: 1/14, contempt: 1/14,
};

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of Object.keys(U14D)) d[k] = k === emotion ? weight : r;
  return d;
}

// ═══ 5 SCÈNES DIFFÉRENTES ═══

interface SceneConfig {
  id: string;
  label: string;
  scene_goal: string;
  story_goal: string;
  conflict_type: string;
  dominant_q1: string;
  dominant_q3: string;
  dominant_q4: string;
  beats: Array<{ id: string; action: string; sensory: string[] }>;
  signature_words: string[];
  motifs: string[];
}

const SCENES: SceneConfig[] = [
  {
    id: 'contemplation',
    label: 'Contemplation — femme seule au bord de la mer',
    scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas — mélancolie contemplative',
    story_goal: 'Explorer la solitude et la mémoire',
    conflict_type: 'internal',
    dominant_q1: 'anticipation', dominant_q3: 'sadness', dominant_q4: 'sadness',
    beats: [
      { id: 'b1', action: 'Elle prépare du thé dans la cuisine froide', sensory: ['touch', 'sound'] },
      { id: 'b2', action: 'Elle regarde la mer par la fenêtre', sensory: ['sight'] },
      { id: 'b3', action: 'Un souvenir d\'été remonte', sensory: ['sound', 'smell'] },
      { id: 'b4', action: 'La nuit tombe, elle ne bouge pas', sensory: ['sight', 'touch'] },
    ],
    signature_words: ['silence', 'ombre', 'souffle', 'lumière', 'eau', 'pierre', 'froid', 'vent', 'sel', 'vide'],
    motifs: ['mer', 'vent', 'lumière déclinante'],
  },
  {
    id: 'confrontation',
    label: 'Confrontation — dispute dans un bureau',
    scene_goal: 'Deux anciens associés se retrouvent pour régler leurs comptes',
    story_goal: 'La trahison et la colère retenue',
    conflict_type: 'external',
    dominant_q1: 'anticipation', dominant_q3: 'anger', dominant_q4: 'disgust',
    beats: [
      { id: 'b1', action: 'Il entre dans le bureau sans frapper', sensory: ['sound', 'sight'] },
      { id: 'b2', action: 'Les mots échangés sont précis et tranchants', sensory: ['sound'] },
      { id: 'b3', action: 'Un dossier est jeté sur la table', sensory: ['touch', 'sound'] },
      { id: 'b4', action: 'L\'un des deux sort sans un mot', sensory: ['sight'] },
    ],
    signature_words: ['acier', 'verre', 'ombre', 'silence', 'mâchoire', 'souffle', 'table', 'porte', 'pas', 'mur'],
    motifs: ['bureau', 'lumière artificielle', 'distance'],
  },
  {
    id: 'souvenir',
    label: 'Souvenir — un vieil homme dans un jardin',
    scene_goal: 'Un homme âgé se souvient de sa femme disparue en taillant ses rosiers',
    story_goal: 'Le deuil et la beauté de ce qui reste',
    conflict_type: 'internal',
    dominant_q1: 'trust', dominant_q3: 'sadness', dominant_q4: 'love',
    beats: [
      { id: 'b1', action: 'Il taille les rosiers au sécateur', sensory: ['touch', 'smell'] },
      { id: 'b2', action: 'Une rose lui rappelle un parfum', sensory: ['smell', 'sight'] },
      { id: 'b3', action: 'Il parle à voix haute comme si elle était là', sensory: ['sound'] },
      { id: 'b4', action: 'Il rentre, pose le sécateur, regarde la chaise vide', sensory: ['sight', 'touch'] },
    ],
    signature_words: ['terre', 'épine', 'parfum', 'main', 'souffle', 'ombre', 'rosier', 'silence', 'chaleur', 'absence'],
    motifs: ['jardin', 'roses', 'mains'],
  },
  {
    id: 'menace',
    label: 'Menace — une femme sent un danger dans la forêt',
    scene_goal: 'Elle comprend progressivement qu\'elle n\'est pas seule dans les bois',
    story_goal: 'La peur primitive et l\'instinct de survie',
    conflict_type: 'external',
    dominant_q1: 'anticipation', dominant_q3: 'fear', dominant_q4: 'fear',
    beats: [
      { id: 'b1', action: 'Elle marche sur le sentier au crépuscule', sensory: ['sight', 'sound'] },
      { id: 'b2', action: 'Un bruit de branche cassée derrière elle', sensory: ['sound'] },
      { id: 'b3', action: 'Elle accélère, son cœur bat plus fort', sensory: ['touch', 'sound'] },
      { id: 'b4', action: 'Elle atteint la lisière — la menace reste dans l\'ombre', sensory: ['sight'] },
    ],
    signature_words: ['ombre', 'branche', 'souffle', 'silence', 'froid', 'terre', 'pas', 'nuit', 'peau', 'sang'],
    motifs: ['forêt', 'crépuscule', 'ombre'],
  },
  {
    id: 'revelation',
    label: 'Révélation — un enfant découvre un secret de famille',
    scene_goal: 'L\'enfant trouve une lettre cachée qui change tout ce qu\'il croyait savoir',
    story_goal: 'L\'innocence brisée par la vérité',
    conflict_type: 'internal',
    dominant_q1: 'trust', dominant_q3: 'surprise', dominant_q4: 'sadness',
    beats: [
      { id: 'b1', action: 'Il fouille le grenier pendant que les adultes parlent en bas', sensory: ['touch', 'smell'] },
      { id: 'b2', action: 'Il trouve une boîte à chaussures pleine de lettres', sensory: ['touch', 'sight'] },
      { id: 'b3', action: 'Il lit la lettre — le monde bascule', sensory: ['sight'] },
      { id: 'b4', action: 'Il repose la lettre, descend l\'escalier, ne dit rien', sensory: ['touch', 'sound'] },
    ],
    signature_words: ['poussière', 'papier', 'encre', 'silence', 'main', 'souffle', 'ombre', 'escalier', 'lumière', 'secret'],
    motifs: ['grenier', 'poussière', 'lettres'],
  },
];

// ═══ PACKET BUILDER ═══

function buildPacketForScene(scene: SceneConfig): ForgePacket {
  return {
    packet_id: `FORGE_vatomic_${scene.id}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `vatomic_${scene.id}`,
    run_id: `vatomic_${scene.id}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: scene.story_goal,
      scene_goal: scene.scene_goal,
      conflict_type: scene.conflict_type,
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500, // Le pipeline est libre de produire moins
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dominant_q1), valence: -0.1, arousal: 0.3, dominant: scene.dominant_q1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dominant_q3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dominant_q3, narrative_instruction: 'Montée' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dominant_q3), valence: -0.4, arousal: 0.6, dominant: scene.dominant_q3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, narrative_instruction: 'Résolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, reader_state: 'Résolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: scene.dominant_q3, after_dominant: scene.dominant_q4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: scene.beats.map((b, i) => ({
      beat_id: b.id, beat_order: i, action: b.action, dialogue: '',
      subtext_type: i === 2 ? 'pivot' : 'progression',
      emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [],
    })),
    subtext: {
      layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }],
      tension_type: 'absence', tension_intensity: 0.4,
    },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] },
        { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] },
        { category: 'smell', min_count: 1, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] },
        { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: scene.motifs, banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: {
        signature_words: scene.signature_words,
        forbidden_words: ['soudainement', 'mystérieusement', 'bizarrement'],
        abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60,
      },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: {
      banned_words: ['soudain', 'soudainement', 'mystérieusement'],
      banned_cliches: ['cœur de pierre', 'mer d\'émotions', 'silence assourdissant'],
      banned_ai_patterns: ['il ne pouvait s\'empêcher de', 'une vague de', 'un frisson parcourut'],
      banned_filter_words: ['effectivement', 'néanmoins', 'toutefois'],
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `vatomic_${scene.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — V-ATOMIC : FORGE DE 5 BRIQUES');
  console.log('  5 scènes × pipeline 19 étages = preuve de robustesse');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('❌ ANTHROPIC_API_KEY not set'); return; }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `VATOMIC_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const allResults: any[] = [];
  let sagaCount = 0;

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    console.log(`\n═══ BRIQUE ${i+1}/5 : ${scene.label} ═══`);

    const packet = buildPacketForScene(scene);
    let result: SovereignForgeResult;

    try {
      result = await runSovereignForgeWithPacket(packet, provider);
    } catch (e: any) {
      console.error(`  ❌ FAIL: ${e.message}`);
      allResults.push({ scene: scene.id, error: e.message });
      continue;
    }

    const prose = result.final_prose;
    const words = prose.split(/\s+/).length;
    const gbResult = scoreText(prose);

    const ms = result.macro_score;
    const isSaga = ms ? (ms.composite >= 92 && ms.min_axis >= 85) : false;
    if (isSaga) sagaCount++;

    const brickHash = sha256(prose);

    console.log(`  Words      = ${words}`);
    console.log(`  GB V1      = ${gbResult.score.toFixed(3)} (${gbResult.tier})`);
    if (ms) {
      console.log(`  ECC        = ${ms.ecc_score.toFixed(1)}`);
      if (ms.macro_axes) {
        console.log(`  RCI        = ${ms.macro_axes.rci.score.toFixed(1)}`);
        console.log(`  SII        = ${ms.macro_axes.sii.score.toFixed(1)}`);
        console.log(`  IFI        = ${ms.macro_axes.ifi.score.toFixed(1)}`);
        console.log(`  AAI        = ${ms.macro_axes.aai.score.toFixed(1)}`);
      }
      console.log(`  COMPOSITE  = ${ms.composite.toFixed(1)}`);
      console.log(`  MIN_AXIS   = ${ms.min_axis.toFixed(1)}`);
      console.log(`  SAGA_READY = ${isSaga ? '✅ OUI' : '❌ NON'}`);
    }
    console.log(`  HASH       = ${brickHash.slice(0, 16)}...`);

    // Save brick
    fs.writeFileSync(path.join(sessionDir, `brick_${scene.id}.txt`), prose);

    allResults.push({
      scene: scene.id,
      label: scene.label,
      conflict_type: scene.conflict_type,
      words,
      gb_v1: gbResult.score,
      gb_tier: gbResult.tier,
      passes: result.passes_executed,
      verdict: result.verdict,
      macro: ms ? {
        ecc: ms.ecc_score,
        rci: ms.macro_axes?.rci.score,
        sii: ms.macro_axes?.sii.score,
        ifi: ms.macro_axes?.ifi.score,
        aai: ms.macro_axes?.aai.score,
        composite: ms.composite,
        min_axis: ms.min_axis,
      } : null,
      saga_ready: isSaga,
      brick_hash: brickHash,
    });

    // Pause between runs
    if (i < SCENES.length - 1) {
      console.log('  ⏳ Pause 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ═══ RÉSUMÉ FINAL ═══
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  V-ATOMIC — RÉSUMÉ FINAL');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  Briques tentées    : ${SCENES.length}`);
  console.log(`  SAGA_READY         : ${sagaCount}/${SCENES.length}`);
  console.log('  ─────────────────────────────────────────');

  for (const r of allResults) {
    if (r.error) {
      console.log(`  ${r.scene}: ❌ ERROR — ${r.error}`);
    } else {
      console.log(`  ${r.scene}: ${r.words}w | composite=${r.macro?.composite?.toFixed(1) ?? '?'} | min=${r.macro?.min_axis?.toFixed(1) ?? '?'} | ${r.saga_ready ? '✅' : '❌'}`);
    }
  }

  const composites = allResults.filter(r => r.macro).map(r => r.macro.composite);
  if (composites.length > 0) {
    const mean = composites.reduce((a: number, b: number) => a + b, 0) / composites.length;
    const min = Math.min(...composites);
    const max = Math.max(...composites);
    console.log('  ─────────────────────────────────────────');
    console.log(`  Composite mean     : ${mean.toFixed(1)}`);
    console.log(`  Composite min      : ${min.toFixed(1)}`);
    console.log(`  Composite max      : ${max.toFixed(1)}`);
    console.log(`  Composite range    : ${(max - min).toFixed(1)}`);
  }

  const wordCounts = allResults.filter(r => !r.error).map(r => r.words);
  if (wordCounts.length > 0) {
    console.log(`  Words mean         : ${(wordCounts.reduce((a: number, b: number) => a + b, 0) / wordCounts.length).toFixed(0)}`);
    console.log(`  Words min          : ${Math.min(...wordCounts)}`);
    console.log(`  Words max          : ${Math.max(...wordCounts)}`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════');

  // Save all results
  fs.writeFileSync(path.join(sessionDir, 'VATOMIC_RESULTS.json'), JSON.stringify(allResults, null, 2));
  fs.writeFileSync('src/scoring/data/VATOMIC_RESULTS.json', JSON.stringify(allResults, null, 2));
  console.log(`\nSaved: ${sessionDir}/ + src/scoring/data/VATOMIC_RESULTS.json`);
}

main().catch(console.error);
