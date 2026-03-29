/**
 * OMEGA — Benchmark V-ATOMIC v5
 * Valide l'impact de L37 + conflits orthogonaux + anti-fermeture
 *
 * Usage : export $(cat .env | xargs) && OMEGA_PROMPT_V4=1 OMEGA_CHUNKED_V4=1 npx tsx scripts/bench-v-atomic-v5.ts
 *
 * Attendu : delta composite >= +1.5 vs baseline (89.6), cliff_score < 0.30
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

const SCENES = [
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },
  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur', dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Accelere',sensory:['touch']},{id:'b4',action:'Lisiere',sensory:['sight']}],
    sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },
  { id: 'revelation', conflict: 'internal', goal: 'Enfant trouve une lettre', story: 'Innocence brisee', dq1: 'trust', dq3: 'surprise', dq4: 'sadness',
    beats: [{id:'b1',action:'Grenier',sensory:['touch','smell']},{id:'b2',action:'Boite de lettres',sensory:['touch','sight']},{id:'b3',action:'Lit la lettre',sensory:['sight']},{id:'b4',action:'Descend escalier',sensory:['touch']}],
    sig: ['poussiere','papier','encre','secret'], motifs: ['grenier','lettres'] },
  { id: 'confrontation', conflict: 'societal', goal: 'Deux associes reglent leurs comptes', story: 'Trahison', dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Entre sans frapper',sensory:['sound']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jete',sensory:['touch']},{id:'b4',action:'Sort sans un mot',sensory:['sight']}],
    sig: ['acier','verre','silence','machoire'], motifs: ['bureau','lumiere'] },
];

function buildPacket(scene: typeof SCENES[0], runIdx: number): ForgePacket {
  return {
    packet_id: `BENCH_V5_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `bench_v5_${scene.id}`, run_id: `bench_v5_${scene.id}_${runIdx}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: scene.story, scene_goal: scene.goal, conflict_type: scene.conflict, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dq1), valence: -0.1, arousal: 0.3, dominant: scene.dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dq3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dq3), valence: -0.4, arousal: 0.6, dominant: scene.dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: scene.dq3, after_dominant: scene.dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: scene.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' : 'progression', emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [{ category: 'sight', min_count: 2, signature_words: [] },{ category: 'sound', min_count: 2, signature_words: [] },{ category: 'touch', min_count: 1, signature_words: [] },{ category: 'smell', min_count: 1, signature_words: [] },{ category: 'taste', min_count: 0, signature_words: [] },{ category: 'proprioception', min_count: 0, signature_words: [] },{ category: 'interoception', min_count: 1, signature_words: [] }], recurrent_motifs: scene.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: scene.sig, forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 35, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] }, imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] } },
    kill_lists: { banned_words: ['soudain'], banned_cliches: ['coeur de pierre'], banned_ai_patterns: ['il ne pouvait s\'empecher'], banned_filter_words: ['effectivement'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bench_v5_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

function computeCliff(prose: string): number {
  const words = prose.split(/\s+/);
  const cliffText = words.slice(-100).join(' ');
  const sents = cliffText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sents.length === 0) return 0;
  const lastSent = sents[sents.length - 1].trim();
  const endsEllipsis = lastSent.endsWith('...') || lastSent.endsWith('\u2026');
  const lastChar = lastSent[lastSent.length - 1] || '';
  const endsIncomplete = !['.', '!', '?', '\u2026'].includes(lastChar);
  const meanLen = sents.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sents.length;
  const tension = Math.min(1.0, 20.0 / Math.max(meanLen, 1));
  return Math.round((tension * 0.5 + (endsEllipsis ? 0.3 : 0) + (endsIncomplete ? 0.2 : 0)) * 10000) / 10000;
}

async function main() {
  console.log('=== OMEGA — BENCHMARK V-ATOMIC v5 ===');
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });

  const RUNS_PER_SCENE = 6;
  const sessionDir = path.join('sessions', `BENCH_V_ATOMIC_V5_${new Date().toISOString().slice(0,10)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const results: any[] = [];
  for (const scene of SCENES) {
    for (let run = 0; run < RUNS_PER_SCENE; run++) {
      console.log(`\n  [${scene.id}] run ${run+1}/${RUNS_PER_SCENE}...`);
      try {
        const packet = buildPacket(scene, run);
        const result = await runSovereignForgeWithPacket(packet, provider);
        const prose = result.final_prose;
        const ms = result.macro_score;
        const cliff = computeCliff(prose);
        const words = prose.split(/\s+/).filter(w => w.length > 0).length;
        const entry = {
          scene: scene.id, conflict: scene.conflict, run, words,
          composite: ms?.composite ?? 0, min_axis: ms?.min_axis ?? 0,
          ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
          SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
          AAI: ms?.macro_axes?.aai.score ?? 0, cliff_score: cliff,
        };
        results.push(entry);
        console.log(`    comp=${entry.composite.toFixed(1)} min=${entry.min_axis.toFixed(1)} cliff=${cliff.toFixed(4)} words=${words}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        results.push({ scene: scene.id, run, error: e.message?.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  const BASELINE_COMP = 89.6;
  console.log('\n=== RESULTS ===');
  console.log(`| Scene | Runs | Comp | Delta | Cliff | min_axis |`);
  console.log(`|-------|------|------|-------|-------|----------|`);
  for (const scene of SCENES) {
    const runs = results.filter(r => r.scene === scene.id && !r.error);
    if (runs.length === 0) continue;
    const comp = runs.reduce((s: number, r: any) => s + r.composite, 0) / runs.length;
    const cliff = runs.reduce((s: number, r: any) => s + r.cliff_score, 0) / runs.length;
    const min = runs.reduce((s: number, r: any) => s + r.min_axis, 0) / runs.length;
    const delta = comp - BASELINE_COMP;
    console.log(`| ${scene.id.padEnd(13)} | ${runs.length} | ${comp.toFixed(1)} | ${delta > 0 ? '+' : ''}${delta.toFixed(1)} | ${cliff.toFixed(3)} | ${min.toFixed(1)} |`);
  }

  const allOk = results.filter(r => !r.error);
  const avgComp = allOk.reduce((s: number, r: any) => s + r.composite, 0) / allOk.length;
  const avgCliff = allOk.reduce((s: number, r: any) => s + r.cliff_score, 0) / allOk.length;
  console.log(`\nGlobal: comp=${avgComp.toFixed(1)} (delta=${(avgComp - BASELINE_COMP) > 0 ? '+' : ''}${(avgComp - BASELINE_COMP).toFixed(1)}) cliff=${avgCliff.toFixed(3)}`);
  console.log(`Runs OK: ${allOk.length}/${results.length}`);

  fs.writeFileSync(path.join(sessionDir, 'BENCH_V_ATOMIC_V5.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved: ${sessionDir}/BENCH_V_ATOMIC_V5.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
