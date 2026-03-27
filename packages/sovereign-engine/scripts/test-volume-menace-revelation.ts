/**
 * OMEGA — TEST VOLUME : MENACE + REVELATION
 * 2 scenes x 3 volumes (500, 750, 1000) x best-of-1
 * Mode : sensoriel_dense uniquement (le mode des 3 SAGA_READY)
 * Budget : ~30 API calls
 * Standard : NASA-Grade L4 / DO-178C Level A
 *
 * Hypothese : le VOLUME est le levier pour passer Menace/Revelation en SAGA_READY
 * (archéologie montre +28% de mots entre gagnantes et perdantes)
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ 14D DISTRIBUTION HELPER ═══

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

// ═══ SCENE CONFIGS (Menace + Revelation only) ═══

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

const TARGET_VOLUMES = [500, 750, 1000];

// ═══ PACKET BUILDER ═══

function buildPacketForScene(scene: SceneConfig, targetWords: number): ForgePacket {
  return {
    packet_id: `FORGE_volume_${scene.id}_${targetWords}w`,
    packet_hash: 'a'.repeat(64),
    scene_id: `volume_${scene.id}_${targetWords}`,
    run_id: `volume_${scene.id}_${targetWords}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: scene.story_goal,
      scene_goal: scene.scene_goal,
      conflict_type: scene.conflict_type,
      pov: 'third_limited',
      tense: 'past',
      target_word_count: targetWords,
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
    seeds: { llm_seed: `volume_${scene.id}_${targetWords}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — TEST VOLUME : MENACE + REVELATION');
  console.log('  2 scenes x 3 volumes (500, 750, 1000) x best-of-1');
  console.log('  Mode : pipeline complet (sensoriel_dense dans le duel)');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `VOLUME_TEST_${new Date().toISOString().slice(0,10)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  interface RunResult {
    scene: string;
    target_words: number;
    actual_words: number;
    composite: number;
    min_axis: number;
    axes: { ECC: number; RCI: number; SII: number; IFI: number; AAI: number };
    saga_ready: boolean;
    prose_hash: string;
  }

  const results: RunResult[] = [];

  for (const scene of SCENES) {
    for (const targetWords of TARGET_VOLUMES) {
      console.log(`\n═══ ${scene.id.toUpperCase()} @ ${targetWords}w ═══`);

      const packet = buildPacketForScene(scene, targetWords);
      let forgeResult: SovereignForgeResult;

      try {
        forgeResult = await runSovereignForgeWithPacket(packet, provider);
      } catch (err) {
        console.error(`  ERROR: ${err}`);
        results.push({
          scene: scene.id, target_words: targetWords, actual_words: 0,
          composite: 0, min_axis: 0,
          axes: { ECC: 0, RCI: 0, SII: 0, IFI: 0, AAI: 0 },
          saga_ready: false, prose_hash: 'ERROR',
        });
        continue;
      }

      const prose = forgeResult.final_prose;
      const words = prose.split(/\s+/).filter(w => w.length > 0).length;
      const ms = forgeResult.macro_score;
      const composite = ms?.composite ?? 0;
      const min_axis = ms?.min_axis ?? 0;
      const axes = {
        ECC: ms?.ecc_score ?? 0,
        RCI: ms?.macro_axes?.rci.score ?? 0,
        SII: ms?.macro_axes?.sii.score ?? 0,
        IFI: ms?.macro_axes?.ifi.score ?? 0,
        AAI: ms?.macro_axes?.aai.score ?? 0,
      };
      const saga = composite >= 92.0 && min_axis >= 85.0;

      const run: RunResult = {
        scene: scene.id,
        target_words: targetWords,
        actual_words: words,
        composite,
        min_axis,
        axes,
        saga_ready: saga,
        prose_hash: Buffer.from(prose.slice(0, 100)).toString('base64').slice(0, 16),
      };
      results.push(run);

      console.log(`  Words: ${words} | Comp: ${composite.toFixed(1)} | min: ${min_axis.toFixed(1)}`);
      console.log(`  ECC=${axes.ECC.toFixed(1)} RCI=${axes.RCI.toFixed(1)} SII=${axes.SII.toFixed(1)} IFI=${axes.IFI.toFixed(1)} AAI=${axes.AAI.toFixed(1)}`);
      console.log(`  SAGA_READY: ${saga ? 'YES' : 'NO'}`);

      // Save individual run
      fs.writeFileSync(
        path.join(sessionDir, `${scene.id}_${targetWords}w.json`),
        JSON.stringify({ ...run, prose }, null, 2),
      );
      fs.writeFileSync(
        path.join(sessionDir, `${scene.id}_${targetWords}w.txt`),
        prose,
      );

      // Pause between runs
      console.log('  Pause 3s...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ═══ SUMMARY TABLE ═══
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log();
  console.log('| Brique      | Target | Words | Comp  | min   | ECC  | RCI  | SII  | IFI  | AAI  | SAGA |');
  console.log('|-------------|--------|-------|-------|-------|------|------|------|------|------|------|');

  for (const r of results) {
    const saga = r.saga_ready ? ' YES' : '  NO';
    console.log(`| ${r.scene.padEnd(11)} | ${String(r.target_words).padStart(6)} | ${String(r.actual_words).padStart(5)} | ${r.composite.toFixed(1).padStart(5)} | ${r.min_axis.toFixed(1).padStart(5)} | ${r.axes.ECC.toFixed(1).padStart(4)} | ${r.axes.RCI.toFixed(1).padStart(4)} | ${r.axes.SII.toFixed(1).padStart(4)} | ${r.axes.IFI.toFixed(1).padStart(4)} | ${r.axes.AAI.toFixed(1).padStart(4)} | ${saga} |`);
  }

  // Trend analysis
  console.log('\n  TREND ANALYSIS:');
  for (const scene of SCENES) {
    const sceneResults = results.filter(r => r.scene === scene.id);
    if (sceneResults.length >= 2) {
      const first = sceneResults[0];
      const last = sceneResults[sceneResults.length - 1];
      const delta = last.composite - first.composite;
      const trend = delta > 1 ? 'POSITIVE' : delta < -1 ? 'NEGATIVE' : 'FLAT';
      console.log(`  ${scene.id}: ${first.composite.toFixed(1)} -> ${last.composite.toFixed(1)} (delta=${delta > 0 ? '+' : ''}${delta.toFixed(1)}) — ${trend}`);
    }
  }

  const sagaCount = results.filter(r => r.saga_ready).length;
  console.log(`\n  SAGA_READY: ${sagaCount}/${results.length}`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  // Save summary
  fs.writeFileSync(path.join(sessionDir, 'VOLUME_RESULTS.json'), JSON.stringify(results, null, 2));

  const summaryMd = `# VOLUME TEST — Menace + Revelation
**Date** : ${new Date().toISOString().slice(0,10)}
**Mode** : Pipeline complet, best-of-1, 3 volumes

## Resultats

| Brique | Target | Words | Composite | min_axis | SAGA |
|--------|--------|-------|-----------|----------|------|
${results.map(r => `| ${r.scene} | ${r.target_words} | ${r.actual_words} | ${r.composite.toFixed(1)} | ${r.min_axis.toFixed(1)} | ${r.saga_ready ? 'YES' : 'NO'} |`).join('\n')}

## Verdict
SAGA_READY : ${sagaCount}/${results.length}
`;
  fs.writeFileSync(path.join(sessionDir, 'SUMMARY.md'), summaryMd);
  console.log(`\nSaved: ${sessionDir}/`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
