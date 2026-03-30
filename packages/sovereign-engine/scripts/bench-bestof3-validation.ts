/**
 * OMEGA — BEST-OF-3 VALIDATION BENCH
 * Valide que best-of-3 filtre les crashes et capture les pics.
 * 
 * 24 runs best-of-3 (6 par scène × 4 scènes) = ~72 API calls.
 * Compare vs best-of-1 (bench V5 : comp=88.9, cliff=0.404).
 * 
 * Critères PASS : comp_moyen ≥ 89.6, min_axis ≥ 80, SAGA ≥ 20%
 * 
 * Usage : cd packages/sovereign-engine && npx tsx scripts/bench-bestof3-validation.ts
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { generateBestOfN, DEFAULT_CONFIG } from '../src/assembly/best-of-n.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    packet_id: `BESTOF3_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `bestof3_${scene.id}`, run_id: `bestof3_${scene.id}_${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `bestof3_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }
  const provider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });
  const RUNS_PER_SCENE = 6;
  const sessionDir = path.join(__dirname, '../sessions/BESTOF3_VALIDATION');
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  console.log('═══════════════════════════════════════════════════');
  console.log('OMEGA — BEST-OF-3 VALIDATION (24 runs × 3 candidates)');
  console.log('═══════════════════════════════════════════════════\n');

  const results: any[] = [];

  for (const scene of SCENES) {
    console.log(`\n── ${scene.id.toUpperCase()} (${RUNS_PER_SCENE} runs best-of-3) ──`);
    for (let run = 1; run <= RUNS_PER_SCENE; run++) {
      console.log(`  Run ${run}/${RUNS_PER_SCENE}...`);
      try {
        const packet = buildPacket(scene, run);
        const bon = await generateBestOfN(packet, provider, DEFAULT_CONFIG);
        const w = bon.winner;
        const cliff = computeCliff(w.prose);

        const entry = {
          scene: scene.id, run,
          composite: w.composite, min_axis: w.min_axis,
          cliff_score: cliff, words: w.words,
          saga_ready: w.saga_ready,
          attempts: bon.attempts, early_exit: bon.early_exit,
          selection_reason: bon.selection_reason,
          all_composites: bon.all_candidates.map(c => c.composite),
          all_min_axes: bon.all_candidates.map(c => c.min_axis),
          ECC: w.axes.ECC, RCI: w.axes.RCI, SII: w.axes.SII, IFI: w.axes.IFI, AAI: w.axes.AAI,
        };
        results.push(entry);
        console.log(`    WINNER: comp=${w.composite.toFixed(1)} min=${w.min_axis.toFixed(1)} cliff=${cliff.toFixed(4)} [${bon.selection_reason}] attempts=${bon.attempts} all=[${bon.all_candidates.map(c => c.composite.toFixed(1)).join(',')}]`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 100)}`);
        results.push({ scene: scene.id, run, error: e.message?.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ═══ ANALYSIS ═══
  const BASELINE_V5 = { comp: 88.9, cliff: 0.404, min_axis: 75.4 };
  const valid = results.filter(r => !r.error);

  console.log('\n\n═══════════════════════════════════════════════════');
  console.log('RÉSULTATS BEST-OF-3 vs BEST-OF-1 (V5)');
  console.log('═══════════════════════════════════════════════════\n');

  console.log('| Scene         | Runs | Comp BO3 | Comp V5 | Delta | Cliff | min_axis | SAGA |');
  console.log('|---------------|------|----------|---------|-------|-------|----------|------|');

  for (const scene of SCENES) {
    const runs = valid.filter(r => r.scene === scene.id);
    if (runs.length === 0) continue;
    const comp = runs.reduce((s: number, r: any) => s + r.composite, 0) / runs.length;
    const cliff = runs.reduce((s: number, r: any) => s + r.cliff_score, 0) / runs.length;
    const minAx = runs.reduce((s: number, r: any) => s + r.min_axis, 0) / runs.length;
    const saga = runs.filter((r: any) => r.saga_ready).length;
    const delta = comp - BASELINE_V5.comp;
    console.log(`| ${scene.id.padEnd(13)} | ${runs.length}    | ${comp.toFixed(1).padStart(8)} | ${BASELINE_V5.comp.toFixed(1).padStart(7)} | ${(delta > 0 ? '+' : '') + delta.toFixed(1).padStart(5)} | ${cliff.toFixed(3)} | ${minAx.toFixed(1).padStart(8)} | ${saga}/${runs.length}  |`);
  }

  const avgComp = valid.reduce((s: number, r: any) => s + r.composite, 0) / valid.length;
  const avgCliff = valid.reduce((s: number, r: any) => s + r.cliff_score, 0) / valid.length;
  const avgMin = valid.reduce((s: number, r: any) => s + r.min_axis, 0) / valid.length;
  const totalSaga = valid.filter((r: any) => r.saga_ready).length;
  const deltaGlobal = avgComp - BASELINE_V5.comp;

  console.log(`| GLOBAL        | ${valid.length}   | ${avgComp.toFixed(1).padStart(8)} | ${BASELINE_V5.comp.toFixed(1).padStart(7)} | ${(deltaGlobal > 0 ? '+' : '') + deltaGlobal.toFixed(1).padStart(5)} | ${avgCliff.toFixed(3)} | ${avgMin.toFixed(1).padStart(8)} | ${totalSaga}/${valid.length} |`);

  const crashCount = valid.filter((r: any) => r.min_axis < 70).length;
  const sagaPct = Math.round((totalSaga / valid.length) * 100);

  console.log(`\nCritères PASS :`);
  console.log(`  comp_moyen ≥ 89.6 (baseline) : ${avgComp.toFixed(1)} → ${avgComp >= 89.6 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  min_axis ≥ 80 moyen           : ${avgMin.toFixed(1)} → ${avgMin >= 80 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  SAGA_READY ≥ 20%              : ${sagaPct}% → ${sagaPct >= 20 ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  crashes min_axis < 70          : ${crashCount}/${valid.length}`);

  const allPass = avgComp >= 89.6 && avgMin >= 80 && sagaPct >= 20;
  console.log(`\nVERDICT BEST-OF-3 : ${allPass ? '✅ PASS' : '❌ FAIL'}`);

  // ═══ SAVE ═══
  fs.writeFileSync(path.join(sessionDir, 'bestof3_results.json'), JSON.stringify(results, null, 2));
  console.log(`\nSaved: ${sessionDir}/bestof3_results.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
