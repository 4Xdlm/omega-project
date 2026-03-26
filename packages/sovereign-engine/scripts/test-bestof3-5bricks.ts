/**
 * OMEGA — BEST-OF-3 : FORGE DE 5 BRIQUES
 * 5 scenes x max 3 tentatives x pipeline 19 etages
 * Budget : ~225-300 API max (5 briques x 3 tentatives x 15-20 API)
 * Standard : NASA-Grade L4 / DO-178C Level A
 *
 * NE PAS LANCER sans autorisation — budget API significatif.
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { generateBestOfN, type BestOfNResult } from '../src/assembly/best-of-n.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

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

// ═══ 5 SCENES ═══

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
    scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas — melancolie contemplative',
    story_goal: 'Explorer la solitude et la memoire',
    conflict_type: 'internal',
    dominant_q1: 'anticipation', dominant_q3: 'sadness', dominant_q4: 'sadness',
    beats: [
      { id: 'b1', action: 'Elle prepare du the dans la cuisine froide', sensory: ['touch', 'sound'] },
      { id: 'b2', action: 'Elle regarde la mer par la fenetre', sensory: ['sight'] },
      { id: 'b3', action: 'Un souvenir d\'ete remonte', sensory: ['sound', 'smell'] },
      { id: 'b4', action: 'La nuit tombe, elle ne bouge pas', sensory: ['sight', 'touch'] },
    ],
    signature_words: ['silence', 'ombre', 'souffle', 'lumiere', 'eau', 'pierre', 'froid', 'vent', 'sel', 'vide'],
    motifs: ['mer', 'vent', 'lumiere declinante'],
  },
  {
    id: 'confrontation',
    label: 'Confrontation — dispute dans un bureau',
    scene_goal: 'Deux anciens associes se retrouvent pour regler leurs comptes',
    story_goal: 'La trahison et la colere retenue',
    conflict_type: 'external',
    dominant_q1: 'anticipation', dominant_q3: 'anger', dominant_q4: 'disgust',
    beats: [
      { id: 'b1', action: 'Il entre dans le bureau sans frapper', sensory: ['sound', 'sight'] },
      { id: 'b2', action: 'Les mots echanges sont precis et tranchants', sensory: ['sound'] },
      { id: 'b3', action: 'Un dossier est jete sur la table', sensory: ['touch', 'sound'] },
      { id: 'b4', action: 'L\'un des deux sort sans un mot', sensory: ['sight'] },
    ],
    signature_words: ['acier', 'verre', 'ombre', 'silence', 'machoire', 'souffle', 'table', 'porte', 'pas', 'mur'],
    motifs: ['bureau', 'lumiere artificielle', 'distance'],
  },
  {
    id: 'souvenir',
    label: 'Souvenir — un vieil homme dans un jardin',
    scene_goal: 'Un homme age se souvient de sa femme disparue en taillant ses rosiers',
    story_goal: 'Le deuil et la beaute de ce qui reste',
    conflict_type: 'internal',
    dominant_q1: 'trust', dominant_q3: 'sadness', dominant_q4: 'love',
    beats: [
      { id: 'b1', action: 'Il taille les rosiers au secateur', sensory: ['touch', 'smell'] },
      { id: 'b2', action: 'Une rose lui rappelle un parfum', sensory: ['smell', 'sight'] },
      { id: 'b3', action: 'Il parle a voix haute comme si elle etait la', sensory: ['sound'] },
      { id: 'b4', action: 'Il rentre, pose le secateur, regarde la chaise vide', sensory: ['sight', 'touch'] },
    ],
    signature_words: ['terre', 'epine', 'parfum', 'main', 'souffle', 'ombre', 'rosier', 'silence', 'chaleur', 'absence'],
    motifs: ['jardin', 'roses', 'mains'],
  },
  {
    id: 'menace',
    label: 'Menace — une femme sent un danger dans la foret',
    scene_goal: 'Elle comprend progressivement qu\'elle n\'est pas seule dans les bois',
    story_goal: 'La peur primitive et l\'instinct de survie',
    conflict_type: 'external',
    dominant_q1: 'anticipation', dominant_q3: 'fear', dominant_q4: 'fear',
    beats: [
      { id: 'b1', action: 'Elle marche sur le sentier au crepuscule', sensory: ['sight', 'sound'] },
      { id: 'b2', action: 'Un bruit de branche cassee derriere elle', sensory: ['sound'] },
      { id: 'b3', action: 'Elle accelere, son coeur bat plus fort', sensory: ['touch', 'sound'] },
      { id: 'b4', action: 'Elle atteint la lisiere — la menace reste dans l\'ombre', sensory: ['sight'] },
    ],
    signature_words: ['ombre', 'branche', 'souffle', 'silence', 'froid', 'terre', 'pas', 'nuit', 'peau', 'sang'],
    motifs: ['foret', 'crepuscule', 'ombre'],
  },
  {
    id: 'revelation',
    label: 'Revelation — un enfant decouvre un secret de famille',
    scene_goal: 'L\'enfant trouve une lettre cachee qui change tout ce qu\'il croyait savoir',
    story_goal: 'L\'innocence brisee par la verite',
    conflict_type: 'internal',
    dominant_q1: 'trust', dominant_q3: 'surprise', dominant_q4: 'sadness',
    beats: [
      { id: 'b1', action: 'Il fouille le grenier pendant que les adultes parlent en bas', sensory: ['touch', 'smell'] },
      { id: 'b2', action: 'Il trouve une boite a chaussures pleine de lettres', sensory: ['touch', 'sight'] },
      { id: 'b3', action: 'Il lit la lettre — le monde bascule', sensory: ['sight'] },
      { id: 'b4', action: 'Il repose la lettre, descend l\'escalier, ne dit rien', sensory: ['touch', 'sound'] },
    ],
    signature_words: ['poussiere', 'papier', 'encre', 'silence', 'main', 'souffle', 'ombre', 'escalier', 'lumiere', 'secret'],
    motifs: ['grenier', 'poussiere', 'lettres'],
  },
];

// ═══ PACKET BUILDER ═══

function buildPacketForScene(scene: SceneConfig): ForgePacket {
  return {
    packet_id: `FORGE_bestof3_${scene.id}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bestof3_${scene.id}`,
    run_id: `bestof3_${scene.id}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: scene.story_goal,
      scene_goal: scene.scene_goal,
      conflict_type: scene.conflict_type,
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dominant_q1), valence: -0.1, arousal: 0.3, dominant: scene.dominant_q1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dominant_q3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dominant_q3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dominant_q3), valence: -0.4, arousal: 0.6, dominant: scene.dominant_q3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, reader_state: 'Resolution' },
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
        forbidden_words: ['soudainement', 'mysterieusement', 'bizarrement'],
        abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60,
      },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: {
      banned_words: ['soudain', 'soudainement', 'mysterieusement'],
      banned_cliches: ['coeur de pierre', 'mer d\'emotions', 'silence assourdissant'],
      banned_ai_patterns: ['il ne pouvait s\'empecher de', 'une vague de', 'un frisson parcourut'],
      banned_filter_words: ['effectivement', 'neanmoins', 'toutefois'],
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bestof3_${scene.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — BEST-OF-3 : FORGE DE 5 BRIQUES');
  console.log('  5 scenes x max 3 tentatives x pipeline 19 etages');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `BESTOF3_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const allResults: { scene: string; result: BestOfNResult }[] = [];
  let sagaCount = 0;
  let earlyExitCount = 0;
  let totalAttempts = 0;

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    console.log(`\n═══ BRIQUE ${i+1}/5 : ${scene.label} ═══`);

    const packet = buildPacketForScene(scene);
    const result = await generateBestOfN(packet, provider);

    // Display each candidate
    for (let j = 0; j < result.all_candidates.length; j++) {
      const c = result.all_candidates[j];
      const status = c.saga_ready ? 'SAGA_READY — EARLY EXIT' : '';
      console.log(`  Tentative ${j+1} : Comp=${c.composite.toFixed(1)} min=${c.min_axis.toFixed(1)} ECC=${c.axes.ECC.toFixed(1)} RCI=${c.axes.RCI.toFixed(1)} SII=${c.axes.SII.toFixed(1)} IFI=${c.axes.IFI.toFixed(1)} AAI=${c.axes.AAI.toFixed(1)} ${status}`);
    }

    console.log(`  Winner: Tentative ${result.all_candidates.indexOf(result.winner) + 1} (${result.selection_reason}, attempts=${result.attempts})`);

    if (result.winner.saga_ready) sagaCount++;
    if (result.early_exit) earlyExitCount++;
    totalAttempts += result.attempts;

    allResults.push({ scene: scene.id, result });

    // Save winner brick
    fs.writeFileSync(path.join(sessionDir, `brick_${scene.id}_winner.txt`), result.winner.prose);
    fs.writeFileSync(path.join(sessionDir, `brick_${scene.id}_meta.json`), JSON.stringify({
      scene: scene.id,
      attempts: result.attempts,
      early_exit: result.early_exit,
      selection_reason: result.selection_reason,
      winner_composite: result.winner.composite,
      winner_min_axis: result.winner.min_axis,
      winner_axes: result.winner.axes,
      winner_words: result.winner.words,
      winner_hash: result.winner.hash,
      all_candidates: result.all_candidates.map(c => ({
        composite: c.composite, min_axis: c.min_axis, axes: c.axes,
        words: c.words, hash: c.hash, saga_ready: c.saga_ready,
      })),
    }, null, 2));

    // Pause between bricks
    if (i < SCENES.length - 1) {
      console.log('  Pause 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ═══ RESUME FINAL ═══
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  RESUME BEST-OF-3');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`  SAGA_READY     : ${sagaCount}/5`);
  console.log(`  Early exits    : ${earlyExitCount}/5`);
  console.log(`  Total attempts : ${totalAttempts}/15 (max)`);
  console.log();
  console.log('  Par brique :');

  for (const { scene, result } of allResults) {
    const w = result.winner;
    const status = w.saga_ready ? 'YES' : ' NO';
    console.log(`  ${scene.padEnd(16)} Comp=${w.composite.toFixed(1)} min=${w.min_axis.toFixed(1)} attempts=${result.attempts} → ${status}`);
  }

  console.log('═══════════════════════════════════════════════════════════════════════');

  // Save all results
  fs.writeFileSync(path.join(sessionDir, 'BESTOF3_RESULTS.json'), JSON.stringify(allResults.map(r => ({
    scene: r.scene,
    attempts: r.result.attempts,
    early_exit: r.result.early_exit,
    selection_reason: r.result.selection_reason,
    winner: {
      composite: r.result.winner.composite,
      min_axis: r.result.winner.min_axis,
      axes: r.result.winner.axes,
      words: r.result.winner.words,
      saga_ready: r.result.winner.saga_ready,
    },
    all_candidates: r.result.all_candidates.map(c => ({
      composite: c.composite, min_axis: c.min_axis, words: c.words, saga_ready: c.saga_ready,
    })),
  })), null, 2));
  console.log(`\nSaved: ${sessionDir}/`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
