/**
 * OMEGA — PLAN FACTORIEL 2x2 : GLOSSAIRE x VOICE WEIGHT
 * Isolation des suspects : V5 (0/5 SAGA_READY) vs V4 (3/5)
 *
 * 3 variables ont change entre v4 et v5 :
 *   A. AAI reel (BUG-01 fixe) -> ATTENDU, on garde
 *   B. Glossaire injecte (+153 tokens) -> SUSPECT
 *   C. Voice Genome weight=0.3 (score fixe 70) -> SUSPECT
 *
 * 4 conditions x 2 briques = 8 runs
 * Budget : ~128 API max
 *
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import type { AnthropicProviderConfig } from '../src/runtime/live-types.js';
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

// ═══ 2 SCENES (Contemplation + Menace) ═══

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
    label: 'Contemplation',
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
    id: 'menace',
    label: 'Menace',
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
];

// ═══ 4 CONDITIONS ═══

interface Condition {
  id: string;
  label: string;
  glossary: boolean;
  voice_weight: number;
}

const CONDITIONS: Condition[] = [
  { id: 'GOFF_V0',  label: 'GOFF_V0 (baseline)', glossary: false, voice_weight: 0 },
  { id: 'GOFF_V03', label: 'GOFF_V03',           glossary: false, voice_weight: 0.3 },
  { id: 'GON_V0',   label: 'GON_V0',             glossary: true,  voice_weight: 0 },
  { id: 'GON_V03',  label: 'GON_V03 (v5 actuel)',glossary: true,  voice_weight: 0.3 },
];

// ═══ PACKET BUILDER ═══

function buildPacketForScene(scene: SceneConfig): ForgePacket {
  return {
    packet_id: `FORGE_factorial_${scene.id}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `factorial_${scene.id}`,
    run_id: `factorial_${scene.id}_${Date.now()}`,
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
    seeds: { llm_seed: `factorial_${scene.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ RESULT TYPE ═══

interface RunResult {
  condition: string;
  scene: string;
  words: number;
  prompt_tokens: number;
  composite: number;
  min_axis: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  saga_ready: boolean;
  error?: string;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — PLAN FACTORIEL 2x2 : GLOSSAIRE x VOICE WEIGHT');
  console.log('  2 briques x 4 conditions = 8 runs');
  console.log('  AAI reel active dans toutes les conditions');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `FACTORIAL_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const allResults: RunResult[] = [];

  for (const cond of CONDITIONS) {
    console.log(`\n═══ CONDITION: ${cond.label} (glossaire=${cond.glossary ? 'ON' : 'OFF'}, voice=${cond.voice_weight}) ═══`);

    // Set env flags BEFORE each condition
    process.env.OMEGA_GLOSSARY_ENABLED = cond.glossary ? 'true' : 'false';
    process.env.OMEGA_VOICE_WEIGHT = String(cond.voice_weight);

    for (const scene of SCENES) {
      console.log(`\n  --- ${scene.label} ---`);

      const packet = buildPacketForScene(scene);
      let result: SovereignForgeResult;

      try {
        result = await runSovereignForgeWithPacket(packet, provider);
      } catch (e: any) {
        console.error(`  FAIL: ${e.message}`);
        allResults.push({
          condition: cond.id, scene: scene.id,
          words: 0, prompt_tokens: 0, composite: 0, min_axis: 0,
          ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0,
          saga_ready: false, error: e.message,
        });
        continue;
      }

      const prose = result.final_prose;
      const words = prose.split(/\s+/).length;
      const ms = result.macro_score;
      const isSaga = ms ? (ms.composite >= 92 && ms.min_axis >= 85) : false;

      const run: RunResult = {
        condition: cond.id,
        scene: scene.id,
        words,
        prompt_tokens: Math.ceil(prose.length / 4), // estimate
        composite: ms?.composite ?? 0,
        min_axis: ms?.min_axis ?? 0,
        ecc: ms?.ecc_score ?? 0,
        rci: ms?.macro_axes?.rci.score ?? 0,
        sii: ms?.macro_axes?.sii.score ?? 0,
        ifi: ms?.macro_axes?.ifi.score ?? 0,
        aai: ms?.macro_axes?.aai.score ?? 0,
        saga_ready: isSaga,
      };

      console.log(`  Words=${words} | Comp=${run.composite.toFixed(1)} | min=${run.min_axis.toFixed(1)} | ECC=${run.ecc.toFixed(1)} | RCI=${run.rci.toFixed(1)} | SII=${run.sii.toFixed(1)} | IFI=${run.ifi.toFixed(1)} | AAI=${run.aai.toFixed(1)} | ${isSaga ? 'SAGA' : 'NO'}`);

      allResults.push(run);

      // Save brick
      fs.writeFileSync(path.join(sessionDir, `brick_${cond.id}_${scene.id}.txt`), prose);
    }

    // Pause between conditions
    if (cond !== CONDITIONS[CONDITIONS.length - 1]) {
      console.log('\n  Pause 5s...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ═══ TABLEAU COMPARATIF ═══

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  RESULTATS COMPLETS');
  console.log('═══════════════════════════════════════════════════════════════════════');

  for (const scene of SCENES) {
    console.log(`\n  ${scene.label.toUpperCase()}`);
    console.log('  ─────────────────────────────────────────────────────────────────────');
    console.log('  Condition            Words  Comp   min    ECC    RCI    SII    IFI    AAI    SAGA');
    console.log('  ─────────────────────────────────────────────────────────────────────');

    for (const cond of CONDITIONS) {
      const r = allResults.find(x => x.condition === cond.id && x.scene === scene.id);
      if (!r || r.error) {
        console.log(`  ${cond.label.padEnd(20)} ERROR: ${r?.error ?? 'unknown'}`);
      } else {
        console.log(
          `  ${cond.label.padEnd(20)} ${String(r.words).padStart(5)}  ` +
          `${r.composite.toFixed(1).padStart(5)}  ${r.min_axis.toFixed(1).padStart(5)}  ` +
          `${r.ecc.toFixed(1).padStart(5)}  ${r.rci.toFixed(1).padStart(5)}  ` +
          `${r.sii.toFixed(1).padStart(5)}  ${r.ifi.toFixed(1).padStart(5)}  ` +
          `${r.aai.toFixed(1).padStart(5)}  ${r.saga_ready ? 'YES' : ' NO'}`
        );
      }
    }
  }

  // ═══ ANALYSE D'EFFET ═══

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  ANALYSE D\'EFFET');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const valid = allResults.filter(r => !r.error);

  // Effet GLOSSAIRE : GON vs GOFF, moyenne sur voice
  const goff = valid.filter(r => r.condition.startsWith('GOFF'));
  const gon  = valid.filter(r => r.condition.startsWith('GON'));

  const avgComp = (arr: RunResult[]) => arr.reduce((s, r) => s + r.composite, 0) / arr.length;
  const avgRCI  = (arr: RunResult[]) => arr.reduce((s, r) => s + r.rci, 0) / arr.length;
  const avgAAI  = (arr: RunResult[]) => arr.reduce((s, r) => s + r.aai, 0) / arr.length;
  const avgSII  = (arr: RunResult[]) => arr.reduce((s, r) => s + r.sii, 0) / arr.length;

  if (goff.length > 0 && gon.length > 0) {
    const dComp = avgComp(gon) - avgComp(goff);
    const dRCI  = avgRCI(gon) - avgRCI(goff);
    const dAAI  = avgAAI(gon) - avgAAI(goff);
    const dSII  = avgSII(gon) - avgSII(goff);

    console.log(`\n  Effet GLOSSAIRE (GON vs GOFF, moyenne sur voice) :`);
    console.log(`    dComposite = ${dComp >= 0 ? '+' : ''}${dComp.toFixed(1)}`);
    console.log(`    dRCI       = ${dRCI >= 0 ? '+' : ''}${dRCI.toFixed(1)}`);
    console.log(`    dAAI       = ${dAAI >= 0 ? '+' : ''}${dAAI.toFixed(1)}`);
    console.log(`    dSII       = ${dSII >= 0 ? '+' : ''}${dSII.toFixed(1)}`);
  }

  // Effet VOICE : V03 vs V0, moyenne sur glossaire
  const v0  = valid.filter(r => r.condition.endsWith('V0'));
  const v03 = valid.filter(r => r.condition.endsWith('V03'));

  if (v0.length > 0 && v03.length > 0) {
    const dComp = avgComp(v03) - avgComp(v0);
    const dRCI  = avgRCI(v03) - avgRCI(v0);
    const dAAI  = avgAAI(v03) - avgAAI(v0);

    console.log(`\n  Effet VOICE (V03 vs V0, moyenne sur glossaire) :`);
    console.log(`    dComposite = ${dComp >= 0 ? '+' : ''}${dComp.toFixed(1)}`);
    console.log(`    dRCI       = ${dRCI >= 0 ? '+' : ''}${dRCI.toFixed(1)}`);
    console.log(`    dAAI       = ${dAAI >= 0 ? '+' : ''}${dAAI.toFixed(1)}`);
  }

  // Interaction
  if (valid.length === 8) {
    const goff_v0  = valid.filter(r => r.condition === 'GOFF_V0');
    const goff_v03 = valid.filter(r => r.condition === 'GOFF_V03');
    const gon_v0   = valid.filter(r => r.condition === 'GON_V0');
    const gon_v03  = valid.filter(r => r.condition === 'GON_V03');

    const interaction =
      (avgComp(gon_v03) - avgComp(gon_v0)) -
      (avgComp(goff_v03) - avgComp(goff_v0));

    console.log(`\n  Interaction (si effets non-additifs) :`);
    console.log(`    dInteraction = ${interaction >= 0 ? '+' : ''}${interaction.toFixed(1)}`);
  }

  // VERDICT
  const glossaireDelta = goff.length > 0 && gon.length > 0 ? Math.abs(avgComp(gon) - avgComp(goff)) : 0;
  const voiceDelta = v0.length > 0 && v03.length > 0 ? Math.abs(avgRCI(v03) - avgRCI(v0)) : 0;

  console.log(`\n  VERDICT :`);
  console.log(`    Glossaire coupable : ${glossaireDelta > 10 ? 'OUI' : 'NON'} (|dComposite|=${glossaireDelta.toFixed(1)}, seuil=10)`);
  console.log(`    Voice coupable     : ${voiceDelta > 3 ? 'OUI' : 'NON'} (|dRCI|=${voiceDelta.toFixed(1)}, seuil=3)`);

  if (glossaireDelta > 10 && voiceDelta > 3) {
    console.log(`    Recommandation     : retirer glossaire + retirer voice`);
  } else if (glossaireDelta > 10) {
    console.log(`    Recommandation     : retirer glossaire, garder voice`);
  } else if (voiceDelta > 3) {
    console.log(`    Recommandation     : garder glossaire, retirer voice`);
  } else {
    console.log(`    Recommandation     : garder les deux — la chute v5 vient probablement d'AAI reel`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // Save results
  fs.writeFileSync(path.join(sessionDir, 'FACTORIAL_RESULTS.json'), JSON.stringify(allResults, null, 2));
  console.log(`\nSaved: ${sessionDir}/FACTORIAL_RESULTS.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
