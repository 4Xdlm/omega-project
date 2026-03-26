/**
 * OMEGA — TELEMETRIE : 5 briques — Pipeline complet avec snapshots
 * Budget : ~80 API calls (5 × ~16 API)
 */
process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { telemetry } from '../src/telemetry/pipeline-telemetry.js';
import { runSovereignForgeWithPacket } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const keys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of keys) d[k] = k === emotion ? weight : r;
  return d;
}

const SCENES = [
  { id: 'contemplation', label: 'Contemplation', goal: "Une femme attend quelqu'un qui ne viendra pas", story: 'Explorer la solitude', conflict: 'internal', q1: 'anticipation', q3: 'sadness', q4: 'sadness',
    beats: [{id:'b1',a:'Elle prepare du the',s:['touch','sound']},{id:'b2',a:'Elle regarde la mer',s:['sight']},{id:'b3',a:"Un souvenir remonte",s:['sound','smell']},{id:'b4',a:'La nuit tombe',s:['sight','touch']}],
    words: ['silence','ombre','souffle','lumiere','eau','pierre','froid','vent','sel','vide'], motifs: ['mer','vent','lumiere declinante'] },
  { id: 'confrontation', label: 'Confrontation', goal: 'Deux anciens associes reglent leurs comptes', story: 'La trahison', conflict: 'external', q1: 'anticipation', q3: 'anger', q4: 'disgust',
    beats: [{id:'b1',a:'Il entre sans frapper',s:['sound','sight']},{id:'b2',a:'Mots tranchants',s:['sound']},{id:'b3',a:'Dossier jete sur la table',s:['touch','sound']},{id:'b4',a:'Il sort',s:['sight']}],
    words: ['acier','verre','papier','neon','machoire','dossier','porte','silence','cravate','sueur'], motifs: ['lumiere artificielle','verre brise'] },
  { id: 'souvenir', label: 'Souvenir', goal: 'Un homme se souvient de sa femme en taillant des rosiers', story: 'Le deuil silencieux', conflict: 'internal', q1: 'trust', q3: 'sadness', q4: 'love',
    beats: [{id:'b1',a:'Il taille les rosiers',s:['touch','smell']},{id:'b2',a:'Le parfum ramene un souvenir',s:['smell','sight']},{id:'b3',a:'Il parle a voix haute',s:['sound']},{id:'b4',a:'Il rentre dans la maison vide',s:['sight','touch']}],
    words: ['terre','rose','epine','soleil','ombre','chaise','tasse','silence','main','jardin'], motifs: ['rosiers','lumiere du matin','chaise vide'] },
  { id: 'menace', label: 'Menace', goal: 'Une randonneuse est suivie dans une foret', story: 'La peur primitive', conflict: 'external', q1: 'anticipation', q3: 'fear', q4: 'fear',
    beats: [{id:'b1',a:'Elle marche sur le sentier',s:['touch','sight']},{id:'b2',a:'Un bruit derriere elle',s:['sound']},{id:'b3',a:'Elle accelere',s:['touch']},{id:'b4',a:'La lisiere apparait',s:['sight']}],
    words: ['froid','peau','souffle','branche','ombre','silence','pas','feuille','nuit','racine'], motifs: ['ombres','craquements','souffle retenu'] },
  { id: 'revelation', label: 'Revelation', goal: 'Un garcon trouve des lettres cachees', story: "L'effondrement d'une certitude", conflict: 'internal', q1: 'trust', q3: 'surprise', q4: 'sadness',
    beats: [{id:'b1',a:'Il fouille le grenier',s:['touch','smell']},{id:'b2',a:'Il trouve une boite de lettres',s:['touch','sight']},{id:'b3',a:'Il lit et comprend',s:['sight']},{id:'b4',a:'Il remet tout en place',s:['touch','sound']}],
    words: ['papier','encre','poussiere','grenier','boite','lettre','silence','escalier','porte','lumiere'], motifs: ['poussiere','papier jauni','escalier qui craque'] },
];

function buildPacket(s: typeof SCENES[0]): ForgePacket {
  return {
    packet_id: `FORGE_tele_${s.id}`, packet_hash: 'a'.repeat(64), scene_id: `tele_${s.id}`, run_id: `tele_${s.id}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: s.story, scene_goal: s.goal, conflict_type: s.conflict, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(s.q1), valence: -0.1, arousal: 0.3, dominant: s.q1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(s.q1, 0.35), valence: -0.2, arousal: 0.4, dominant: s.q1, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(s.q3), valence: -0.4, arousal: 0.6, dominant: s.q3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(s.q4, 0.40), valence: -0.2, arousal: 0.3, dominant: s.q4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(s.q4, 0.40), valence: -0.2, arousal: 0.3, dominant: s.q4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: s.q3, after_dominant: s.q4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: s.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.a, dialogue: '', subtext_type: i===2?'pivot':'progression', emotion_instruction: '', sensory_tags: b.s, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [
      { category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 2, signature_words: [] },
      { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] },
      { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] },
      { category: 'interoception', min_count: 1, signature_words: [] },
    ], recurrent_motifs: s.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction',
      lexicon: { signature_words: s.words, forbidden_words: ['soudainement','mysterieusement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: s.motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: { banned_words: ['soudain','soudainement'], banned_cliches: [], banned_ai_patterns: [], banned_filter_words: [] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `tele_${s.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — TELEMETRIE : 5 BRIQUES');
  console.log('═══════════════════════════════════════════════════════════════════════');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const provider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });
  const sessionDir = path.join('sessions', `TELEMETRY5_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });
  const rows: string[] = [];
  for (const scene of SCENES) {
    console.log(`\n═══ ${scene.label.toUpperCase()} ═══`);
    telemetry.enable(); telemetry.start(scene.id, 1);
    await runSovereignForgeWithPacket(buildPacket(scene), provider);
    const report = telemetry.export();
    const draft = report.snapshots.find(s => s.stage === 'CHUNKED_DRAFT');
    const final_ = report.snapshots.find(s => s.stage === 'FINAL');
    const winner = report.snapshots.find(s => s.stage === 'DUEL_WINNER');
    const loopRef = report.snapshots.find(s => s.stage === 'DUEL_loop_refined');
    if (draft && final_) {
      const pct = ((final_.words / draft.words) * 100).toFixed(0);
      const saga = final_.scores && final_.scores.composite >= 92 && final_.scores.min_axis >= 85 ? 'SAGA' : 'NO';
      rows.push(`  ${scene.id.padEnd(16)} ${String(draft.words).padStart(5)} ${String(loopRef?.words ?? 0).padStart(5)} ${String(final_.words).padStart(5)}  ${pct.padStart(3)}%  ${draft.features.f1_mean_sent_len.toFixed(1).padStart(5)}->${final_.features.f1_mean_sent_len.toFixed(1).padStart(5)}  ${draft.features.cv_sent.toFixed(2).padStart(5)}->${final_.features.cv_sent.toFixed(2).padStart(5)}  ${draft.features.f26b_long_sent_rate.toFixed(2).padStart(5)}->${final_.features.f26b_long_sent_rate.toFixed(2).padStart(5)}  ${final_.scores?.composite.toFixed(1).padStart(5) ?? '    -'}  ${final_.scores?.min_axis.toFixed(1).padStart(5) ?? '    -'}  ${saga}  ${winner?.details?.winner_mode ?? '?'}`);
      console.log(`  Draft:${draft.words}w Loop:${loopRef?.words ?? '?'}w Final:${final_.words}w (${pct}%) Winner:${winner?.details?.winner_mode} Comp=${final_.scores?.composite.toFixed(1)} min=${final_.scores?.min_axis.toFixed(1)} ${saga}`);
    }
    fs.writeFileSync(path.join(sessionDir, `telemetry_${scene.id}.json`), JSON.stringify(report, null, 2));
    telemetry.disable(); telemetry.reset();
    console.log('  Pause 5s...'); await new Promise(r => setTimeout(r, 5000));
  }
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  RÉSUMÉ — DRAFT → LOOP → FINAL (5 briques)');
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  Brique           Draft  Loop Final  Pct   Mean(d->f)     CV(d->f)     f26b(d->f)     Comp   min  SAGA  Winner');
  console.log('  ──────────────────────────────────────────────────────────────────────────────────────────────────────────────');
  for (const r of rows) console.log(r);
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log(`\nSaved: ${sessionDir}/`);
}
main().catch(e => { console.error('FATAL:', e); process.exit(1); });
