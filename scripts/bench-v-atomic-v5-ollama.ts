/**
 * OMEGA — Benchmark V-ATOMIC v5 — VARIANTE OLLAMA qwen3:32b
 *
 * Sprint S7.2 RÉDUIT — pivot post-Sonnet (Architect 2026-04-28)
 *
 * Dérivé de packages/sovereign-engine/scripts/bench-v-atomic-v5.ts.
 * Localisation : scripts/ racine (HORS packages/) → doctrine S7.2 "AUCUNE modif src/" respectée.
 *
 * Modifications vs original :
 *   1. Provider : createOllamaProvider (qwen3:32b) au lieu de createAnthropicProvider (Sonnet 4)
 *   2. Pas de check ANTHROPIC_API_KEY (Ollama local, pas d'API key)
 *   3. Imports relatifs à scripts/ root (../packages/sovereign-engine/src/...)
 *   4. SCENES, RUNS_PER_SCENE=6, DUEL_RUNS, K2 chunked V4, multi-shot scoring INCHANGÉS
 *   5. Sortie : sessions/BENCH_V_ATOMIC_V5_OLLAMA_<date>/
 *
 * Estimation : 72-144h GPU (qwen3:32b local Q4_K_M, 24 runs × ~3-6h/run)
 *
 * Usage :
 *   cd packages/sovereign-engine  (cwd pour résolution dist/sessions)
 *   $env:OMEGA_DUEL_RUNS=2
 *   npx tsx ../../scripts/bench-v-atomic-v5-ollama.ts 2>&1 | Tee-Object bench-v-atomic-v5-OLLAMA-MAX-S7.log
 *
 * Pré-requis Ollama :
 *   - ollama serve (running)
 *   - ollama list → qwen3:32b présent (20.2 GB Q4_K_M)
 *   - OLLAMA_BASE_URL=http://localhost:11434 (default)
 *
 * Invariants S7.2 :
 *   - Engine.ts pipeline TRAVERSÉ (runSovereignForgeWithPacket)
 *   - DUEL_RUNS=2 → N=7 candidates (1 K2 + 3 modes × 2 runs)
 *   - Multi-shot Interiority/Impact 3-shot, Necessity 5-shot
 *   - Cliff Gate SHADOW R7-B (engine.ts:505-537)
 *   - Scoring CALC V3.4 inchangé
 *   - SYSTEM_PROMPT, baseline directives, V2B2_CONFIG inchangés
 *
 * Critère pass S7.2 OLLAMA MAX :
 *   - Cohérence interne pipeline runtime (pas comparaison ±5% Sonnet)
 *   - 24 runs OK (0 timeout, 0 error)
 *   - Pipeline V1_SEAL + R7 + Cliff confirmé EMPIRIQUEMENT sur stack Ollama
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../packages/sovereign-engine/src/engine.js';
import { createOllamaProvider } from '../packages/sovereign-engine/src/runtime/ollama-provider.js';
import type { ForgePacket } from '../packages/sovereign-engine/src/types.js';
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
    packet_id: `BENCH_V5_OLLAMA_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `bench_v5_ollama_${scene.id}`, run_id: `bench_v5_ollama_${scene.id}_${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `bench_v5_ollama_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

function computeCliff(prose: string): number {
  const words = prose.split(/\s+/);
  const cliffText = words.slice(-100).join(' ');
  const sents = cliffText.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
  if (sents.length === 0) return 0;
  const lastSent = sents[sents.length - 1].trim();
  const endsEllipsis = lastSent.endsWith('...') || lastSent.endsWith('…');
  const lastChar = lastSent[lastSent.length - 1] || '';
  const endsIncomplete = !['.', '!', '?', '…'].includes(lastChar);
  const meanLen = sents.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sents.length;
  const tension = Math.min(1.0, 20.0 / Math.max(meanLen, 1));
  return Math.round((tension * 0.5 + (endsEllipsis ? 0.3 : 0) + (endsIncomplete ? 0.2 : 0)) * 10000) / 10000;
}

async function main() {
  console.log('=== OMEGA — BENCHMARK V-ATOMIC v5 — OLLAMA qwen3:32b ===');
  console.log(`Started: ${new Date().toISOString()}`);

  // Provider Ollama qwen3:32b — keep_alive=24h hardcoded dans ollama-provider.ts
  // Defaults : repeatPenalty=1.4, frequencyPenalty=0.6, repeatLastN=256 (P8-FIX appliqué)
  const provider = createOllamaProvider({
    baseUrl: process.env.OMEGA_OLLAMA_URL ?? 'http://localhost:11434',
    model: process.env.OMEGA_OLLAMA_MODEL ?? 'qwen3:32b',
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeMaxTokens: 2000,
  });

  const RUNS_PER_SCENE = 6;
  const sessionDir = path.join('sessions', `BENCH_V_ATOMIC_V5_OLLAMA_${new Date().toISOString().slice(0,10)}`);
  fs.mkdirSync(sessionDir, { recursive: true });
  console.log(`Session dir: ${sessionDir}`);
  console.log(`Provider: Ollama qwen3:32b (keep_alive=24h, draftT=0.75, judgeT=0.0)`);
  console.log(`DUEL_RUNS: ${process.env.OMEGA_DUEL_RUNS ?? '1'}`);
  console.log(`Total runs planned: ${SCENES.length} scenes × ${RUNS_PER_SCENE} runs = ${SCENES.length * RUNS_PER_SCENE}`);
  console.log('');

  const results: any[] = [];
  const tStart = Date.now();
  for (const scene of SCENES) {
    for (let run = 0; run < RUNS_PER_SCENE; run++) {
      const runStart = Date.now();
      console.log(`\n  [${scene.id}] run ${run+1}/${RUNS_PER_SCENE}... (t+${((Date.now()-tStart)/60000).toFixed(1)}min)`);
      try {
        const packet = buildPacket(scene, run);
        const result = await runSovereignForgeWithPacket(packet, provider);
        const prose = result.final_prose;
        const ms = result.macro_score;
        const cliff = computeCliff(prose);
        const words = prose.split(/\s+/).filter(w => w.length > 0).length;
        const durationMs = Date.now() - runStart;
        const entry = {
          scene: scene.id, conflict: scene.conflict, run, words,
          composite: ms?.composite ?? 0, min_axis: ms?.min_axis ?? 0,
          ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
          SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
          AAI: ms?.macro_axes?.aai.score ?? 0, cliff_score: cliff,
          duration_ms: durationMs,
        };
        results.push(entry);
        console.log(`    comp=${entry.composite.toFixed(1)} min=${entry.min_axis.toFixed(1)} cliff=${cliff.toFixed(4)} words=${words} duration=${(durationMs/60000).toFixed(1)}min`);

        // Persist incremental après chaque run (sécurité crash)
        fs.writeFileSync(path.join(sessionDir, 'BENCH_V_ATOMIC_V5_OLLAMA.json'), JSON.stringify(results, null, 2));
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 200)}`);
        results.push({ scene: scene.id, run, error: e.message?.slice(0, 500), duration_ms: Date.now() - runStart });
        fs.writeFileSync(path.join(sessionDir, 'BENCH_V_ATOMIC_V5_OLLAMA.json'), JSON.stringify(results, null, 2));
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Summary
  const BASELINE_COMP = 89.6;
  console.log('\n=== RESULTS OLLAMA qwen3:32b ===');
  console.log(`| Scene         | Runs | Comp  | Min   | Cliff | Words avg |`);
  console.log(`|---------------|------|-------|-------|-------|-----------|`);
  for (const scene of SCENES) {
    const runs = results.filter(r => r.scene === scene.id && !r.error);
    if (runs.length === 0) {
      console.log(`| ${scene.id.padEnd(13)} | 0/${RUNS_PER_SCENE} | ERROR | ERROR | ERROR | ERROR     |`);
      continue;
    }
    const comp = runs.reduce((s: number, r: any) => s + r.composite, 0) / runs.length;
    const cliff = runs.reduce((s: number, r: any) => s + r.cliff_score, 0) / runs.length;
    const min = runs.reduce((s: number, r: any) => s + r.min_axis, 0) / runs.length;
    const avgWords = Math.round(runs.reduce((s: number, r: any) => s + r.words, 0) / runs.length);
    console.log(`| ${scene.id.padEnd(13)} | ${runs.length}/${RUNS_PER_SCENE} | ${comp.toFixed(1)} | ${min.toFixed(1)} | ${cliff.toFixed(3)} | ${avgWords.toString().padStart(9)} |`);
  }

  const allOk = results.filter(r => !r.error);
  const errors = results.filter(r => r.error);
  if (allOk.length > 0) {
    const avgComp = allOk.reduce((s: number, r: any) => s + r.composite, 0) / allOk.length;
    const avgCliff = allOk.reduce((s: number, r: any) => s + r.cliff_score, 0) / allOk.length;
    console.log(`\nGlobal: comp=${avgComp.toFixed(1)} (delta=${(avgComp - BASELINE_COMP) > 0 ? '+' : ''}${(avgComp - BASELINE_COMP).toFixed(1)} vs baseline=${BASELINE_COMP}) cliff=${avgCliff.toFixed(3)}`);
  }
  console.log(`Runs OK: ${allOk.length}/${results.length}, Errors: ${errors.length}`);
  console.log(`Total duration: ${((Date.now()-tStart)/3600000).toFixed(2)}h`);

  fs.writeFileSync(path.join(sessionDir, 'BENCH_V_ATOMIC_V5_OLLAMA.json'), JSON.stringify(results, null, 2));
  console.log(`\nFinal saved: ${sessionDir}/BENCH_V_ATOMIC_V5_OLLAMA.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
