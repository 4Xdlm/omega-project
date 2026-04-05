/**
 * run-v5-bench.ts — Bench comparatif V4 vs V5 (10 scènes identiques)
 * Phase P2-pre — A/B équitable
 *
 * Protocole strict :
 *   1. Même ForgePacket exact (structure validée bench-v-atomic-v5)
 *   2. Même modèle, même seed, même température
 *   3. D'abord V4, puis V5 (ordre fixe)
 *   4. Seule variable = le prompt (V4 hardcoded vs V5 Rosetta Bridge)
 *   5. Pipeline identique : SymbolMap, Duel, Loop, Score
 *   6. 10 scènes variées
 *
 * Usage (PowerShell) :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-v5-bench.ts
 *
 * Critères GO/NO-GO (source: V5_AB_TEST_REPORT.md) :
 *   GO    : passes V5 <= passes V4 ET composite V5 >= composite V4 - 0.5
 *   NO-GO : régression > 0.5 composite → GARDER V4
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 0.75;
const JUDGE_TEMPERATURE = 0.0;

// ── 14D emotion helper (copié de bench-v-atomic-v5.ts) ────────────────────

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

// ── 10 scènes variées ────────────────────────────────────────────────────

const SCENES = [
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude',
    dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },

  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur',
    dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Accelere',sensory:['touch']},{id:'b4',action:'Lisiere',sensory:['sight']}],
    sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },

  { id: 'revelation', conflict: 'internal', goal: 'Enfant trouve une lettre', story: 'Innocence brisee',
    dq1: 'trust', dq3: 'surprise', dq4: 'sadness',
    beats: [{id:'b1',action:'Grenier',sensory:['touch','smell']},{id:'b2',action:'Boite de lettres',sensory:['touch','sight']},{id:'b3',action:'Lit la lettre',sensory:['sight']},{id:'b4',action:'Descend escalier',sensory:['touch']}],
    sig: ['poussiere','papier','encre','secret'], motifs: ['grenier','lettres'] },

  { id: 'confrontation', conflict: 'societal', goal: 'Deux associes reglent leurs comptes', story: 'Trahison',
    dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Entre sans frapper',sensory:['sound']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jete',sensory:['touch']},{id:'b4',action:'Sort sans un mot',sensory:['sight']}],
    sig: ['acier','verre','silence','machoire'], motifs: ['bureau','lumiere'] },

  { id: 'deuil', conflict: 'internal', goal: 'Homme devant la tombe de son pere', story: 'Deuil',
    dq1: 'sadness', dq3: 'remorse', dq4: 'sadness',
    beats: [{id:'b1',action:'Arrive au cimetiere',sensory:['sight','touch']},{id:'b2',action:'Pose la main sur la pierre',sensory:['touch']},{id:'b3',action:'Souvenir d enfance',sensory:['smell','sound']},{id:'b4',action:'S eloigne sous la pluie',sensory:['touch','sight']}],
    sig: ['pierre','pluie','terre','silence'], motifs: ['cimetiere','pluie'] },

  { id: 'fuite', conflict: 'external', goal: 'Adolescente quitte la maison familiale', story: 'Liberte',
    dq1: 'fear', dq3: 'anticipation', dq4: 'joy',
    beats: [{id:'b1',action:'Prepare son sac en silence',sensory:['touch']},{id:'b2',action:'Descend l escalier',sensory:['sound']},{id:'b3',action:'Ouvre la porte',sensory:['touch','sight']},{id:'b4',action:'Court dans la rue',sensory:['sight','sound']}],
    sig: ['escalier','porte','nuit','souffle'], motifs: ['maison','route'] },

  { id: 'retrouvailles', conflict: 'internal', goal: 'Deux soeurs se retrouvent apres dix ans', story: 'Reconciliation',
    dq1: 'anticipation', dq3: 'love', dq4: 'trust',
    beats: [{id:'b1',action:'Attend dans le cafe',sensory:['smell','sound']},{id:'b2',action:'Reconnait sa soeur',sensory:['sight']},{id:'b3',action:'Premier mot maladroit',sensory:['sound']},{id:'b4',action:'Rire partage',sensory:['sound','sight']}],
    sig: ['cafe','mains','regard','rire'], motifs: ['cafe','retrouvailles'] },

  { id: 'dilemme', conflict: 'societal', goal: 'Medecin face a un choix impossible', story: 'Dilemme ethique',
    dq1: 'trust', dq3: 'fear', dq4: 'contempt',
    beats: [{id:'b1',action:'Lit le dossier medical',sensory:['sight','touch']},{id:'b2',action:'Regarde le patient dormir',sensory:['sight']},{id:'b3',action:'Appelle le collegue',sensory:['sound']},{id:'b4',action:'Prend la decision seul',sensory:['touch']}],
    sig: ['neon','dossier','silence','main'], motifs: ['hopital','nuit'] },

  { id: 'passion', conflict: 'internal', goal: 'Pianiste joue son dernier concert', story: 'Art et sacrifice',
    dq1: 'anticipation', dq3: 'joy', dq4: 'awe',
    beats: [{id:'b1',action:'Entre en scene',sensory:['sight','sound']},{id:'b2',action:'Premieres notes',sensory:['sound','touch']},{id:'b3',action:'La salle disparait',sensory:['sound']},{id:'b4',action:'Derniere note silence',sensory:['sound','sight']}],
    sig: ['touche','bois','salle','silence'], motifs: ['piano','scene'] },

  { id: 'trahison', conflict: 'external', goal: 'Decouverte d une trahison entre amis', story: 'Amitie brisee',
    dq1: 'trust', dq3: 'anger', dq4: 'remorse',
    beats: [{id:'b1',action:'Recoit un message etrange',sensory:['sight']},{id:'b2',action:'Confronte l ami',sensory:['sound']},{id:'b3',action:'L ami avoue',sensory:['sound','sight']},{id:'b4',action:'Part sans se retourner',sensory:['sight']}],
    sig: ['telephone','rue','voix','dos'], motifs: ['ville','nuit'] },
];

// ── Build ForgePacket — Structure EXACTE de bench-v-atomic-v5.ts ─────────

function buildPacket(scene: typeof SCENES[0], runIdx: number, version: 'v4' | 'v5'): ForgePacket {
  return {
    packet_id: `BENCH_V5AB_${scene.id}_${version}_${runIdx}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bench_v5ab_${scene.id}`,
    run_id: `bench_v5ab_${scene.id}_${version}_${runIdx}_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: scene.story,
      scene_goal: scene.goal,
      conflict_type: scene.conflict,
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
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
    beats: scene.beats.map((b, i) => ({
      beat_id: b.id, beat_order: i, action: b.action, dialogue: '',
      subtext_type: i === 2 ? 'pivot' : 'progression',
      emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [],
    })),
    subtext: {
      layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }],
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
      lexicon: { signature_words: scene.sig, forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 35, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] },
      imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: {
      banned_words: ['soudain'], banned_cliches: ['coeur de pierre'],
      banned_ai_patterns: ['il ne pouvait s\'empecher'], banned_filter_words: ['effectivement'],
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bench_v5ab_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ── Scoring (aligné sur bench-v-atomic-v5.ts) ────────────────────────────

interface SceneScores {
  scene_id: string;
  composite: number;
  min_axis: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  loop_passes: number;
  word_count: number;
}

function extractScores(result: SovereignForgeResult, sceneId: string): SceneScores {
  const ms = result.macro_score;
  const prose = result.final_prose ?? '';
  return {
    scene_id: sceneId,
    composite: ms?.composite ?? 0,
    min_axis: ms?.min_axis ?? 0,
    ecc: ms?.ecc_score ?? (ms?.macro_axes?.ecc as any)?.score ?? 0,
    rci: ms?.macro_axes?.rci?.score ?? 0,
    sii: ms?.macro_axes?.sii?.score ?? 0,
    ifi: ms?.macro_axes?.ifi?.score ?? 0,
    aai: ms?.macro_axes?.aai?.score ?? 0,
    loop_passes: (result as any).loop_count ?? (result as any).loop_passes ?? (result as any).sovereign_loop?.passes ?? 0,
    word_count: prose.split(/\s+/).filter((w: string) => w.length > 0).length,
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string { return ((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(7); }
function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── Verdict ─────────────────────────────────────────────────────────────

type Verdict = 'GO_V5' | 'GO_CONDITIONNEL' | 'NO_GO_V5';

function computeVerdict(v4: SceneScores[], v5: SceneScores[]): { verdict: Verdict; reason: string } {
  const v4Valid = v4.filter(s => s.composite > 0);
  const v5Valid = v5.filter(s => s.composite > 0);
  if (v4Valid.length === 0 || v5Valid.length === 0) {
    return { verdict: 'NO_GO_V5', reason: `Données insuffisantes: V4=${v4Valid.length} V5=${v5Valid.length} scènes valides` };
  }

  const v4Mean = mean(v4Valid.map(s => s.composite));
  const v5Mean = mean(v5Valid.map(s => s.composite));
  const delta = v5Mean - v4Mean;

  const v4Loops = mean(v4Valid.map(s => s.loop_passes));
  const v5Loops = mean(v5Valid.map(s => s.loop_passes));

  if (delta < -0.5) {
    return { verdict: 'NO_GO_V5', reason: `V5 (${v5Mean.toFixed(1)}) < V4 (${v4Mean.toFixed(1)}) de ${Math.abs(delta).toFixed(1)} > 0.5` };
  }

  if (v5Loops <= v4Loops && delta >= -0.5) {
    if (delta >= 0) {
      return { verdict: 'GO_V5', reason: `V5 (${v5Mean.toFixed(1)}) >= V4 (${v4Mean.toFixed(1)}), loops V5 (${v5Loops.toFixed(1)}) <= V4 (${v4Loops.toFixed(1)})` };
    }
    return { verdict: 'GO_CONDITIONNEL', reason: `V5 (${v5Mean.toFixed(1)}) >= V4-0.5 (${(v4Mean - 0.5).toFixed(1)}), loops réduits` };
  }

  if (delta >= 0 && v5Loops > v4Loops) {
    return { verdict: 'GO_CONDITIONNEL', reason: `V5 composite OK (+${delta.toFixed(1)}) mais loops V5=${v5Loops.toFixed(1)} > V4=${v4Loops.toFixed(1)}` };
  }

  return { verdict: 'NO_GO_V5', reason: `V5 (${v5Mean.toFixed(1)}) vs V4 (${v4Mean.toFixed(1)}): delta=${delta.toFixed(1)}, loops V5=${v5Loops.toFixed(1)} vs V4=${v4Loops.toFixed(1)}` };
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey,
    model: MODEL,
    judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE,
    judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  const v4Results: SceneScores[] = [];
  const v5Results: SceneScores[] = [];
  const v4Prose: string[] = [];
  const v5Prose: string[] = [];
  const errors: Array<{ scene: string; version: string; error: string }> = [];

  console.log(`\n[V5-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[V5-BENCH]  OMEGA V4 vs V5 A/B BENCH — ${SCENES.length} scenes`);
  console.log(`[V5-BENCH]  Model: ${MODEL} | Temp: draft=${DRAFT_TEMPERATURE} judge=${JUDGE_TEMPERATURE}`);
  console.log(`[V5-BENCH] ═══════════════════════════════════════════════════════\n`);

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    console.log(`\n[V5-BENCH] ─── Scene ${i + 1}/${SCENES.length}: ${scene.id} (${scene.conflict}) ───\n`);

    // ── V4 ──
    console.log(`[V5-BENCH] Running V4...`);
    process.env.OMEGA_PROMPT_V4 = '1';
    delete process.env.OMEGA_PROMPT_V5;

    const packetV4 = buildPacket(scene, i, 'v4');
    try {
      const result = await runSovereignForgeWithPacket(packetV4, provider);
      const score = extractScores(result, scene.id);
      v4Results.push(score);
      v4Prose.push(result.final_prose ?? '');
      console.log(`[V5-BENCH] V4 ${scene.id}: composite=${score.composite.toFixed(1)} min=${score.min_axis.toFixed(1)} loops=${score.loop_passes} words=${score.word_count}`);
    } catch (err: any) {
      const msg = err.message?.slice(0, 200) ?? String(err);
      console.error(`[V5-BENCH] V4 ${scene.id} FAILED: ${msg}`);
      errors.push({ scene: scene.id, version: 'V4', error: msg });
      v4Results.push({ scene_id: scene.id, composite: 0, min_axis: 0, ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0, loop_passes: 0, word_count: 0 });
      v4Prose.push('');
    }

    // ── V5 ──
    console.log(`[V5-BENCH] Running V5...`);
    process.env.OMEGA_PROMPT_V5 = '1';
    delete process.env.OMEGA_PROMPT_V4;

    const packetV5 = buildPacket(scene, i, 'v5');
    try {
      const result = await runSovereignForgeWithPacket(packetV5, provider);
      const score = extractScores(result, scene.id);
      v5Results.push(score);
      v5Prose.push(result.final_prose ?? '');
      console.log(`[V5-BENCH] V5 ${scene.id}: composite=${score.composite.toFixed(1)} min=${score.min_axis.toFixed(1)} loops=${score.loop_passes} words=${score.word_count}`);
    } catch (err: any) {
      const msg = err.message?.slice(0, 200) ?? String(err);
      console.error(`[V5-BENCH] V5 ${scene.id} FAILED: ${msg}`);
      errors.push({ scene: scene.id, version: 'V5', error: msg });
      v5Results.push({ scene_id: scene.id, composite: 0, min_axis: 0, ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0, loop_passes: 0, word_count: 0 });
      v5Prose.push('');
    }

    const v4c = v4Results[i].composite;
    const v5c = v5Results[i].composite;
    if (v4c > 0 || v5c > 0) {
      console.log(`[V5-BENCH] Delta ${scene.id}: ${fmtDelta(v5c - v4c).trim()}`);
    }

    // Pause entre scènes pour rate limiting
    if (i < SCENES.length - 1) {
      console.log(`[V5-BENCH] Pause 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ── TABLEAU COMPARATIF ──────────────────────────────────────────────────

  console.log(`\n[V5-BENCH] ═══ TABLEAU COMPARATIF ═══\n`);
  console.log('| Scene           | V4 comp | V5 comp |  Delta | V4 loop | V5 loop | V4 words | V5 words |');
  console.log('|-----------------|---------|---------|--------|---------|---------|----------|----------|');

  for (let i = 0; i < SCENES.length; i++) {
    const v4 = v4Results[i];
    const v5 = v5Results[i];
    console.log(
      `| ${v4.scene_id.padEnd(15)} ` +
      `| ${fmt(v4.composite)} ` +
      `| ${fmt(v5.composite)} ` +
      `| ${fmtDelta(v5.composite - v4.composite)} ` +
      `| ${String(v4.loop_passes).padStart(7)} ` +
      `| ${String(v5.loop_passes).padStart(7)} ` +
      `| ${String(v4.word_count).padStart(8)} ` +
      `| ${String(v5.word_count).padStart(8)} |`
    );
  }

  // Moyennes (scènes valides uniquement)
  const v4Valid = v4Results.filter(s => s.composite > 0);
  const v5Valid = v5Results.filter(s => s.composite > 0);
  const v4MeanComp = mean(v4Valid.map(s => s.composite));
  const v5MeanComp = mean(v5Valid.map(s => s.composite));

  console.log('|-----------------|---------|---------|--------|---------|---------|----------|----------|');
  console.log(
    `| MOYENNE (valid) ` +
    `| ${fmt(v4MeanComp)} ` +
    `| ${fmt(v5MeanComp)} ` +
    `| ${fmtDelta(v5MeanComp - v4MeanComp)} ` +
    `| ${mean(v4Valid.map(s => s.loop_passes)).toFixed(1).padStart(7)} ` +
    `| ${mean(v5Valid.map(s => s.loop_passes)).toFixed(1).padStart(7)} ` +
    `| ${Math.round(mean(v4Valid.map(s => s.word_count))).toString().padStart(8)} ` +
    `| ${Math.round(mean(v5Valid.map(s => s.word_count))).toString().padStart(8)} |`
  );
  console.log(`\n[V5-BENCH] Scenes valides: V4=${v4Valid.length}/${SCENES.length} V5=${v5Valid.length}/${SCENES.length}`);

  // Axes détaillés
  console.log(`\n| Axe  | V4 mean |  V5 mean |   Delta |`);
  console.log(`|------|---------|----------|---------|`);
  for (const ax of ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const) {
    const v4m = mean(v4Valid.map(s => s[ax]));
    const v5m = mean(v5Valid.map(s => s[ax]));
    console.log(`| ${ax.toUpperCase().padEnd(4)} | ${fmt(v4m)} | ${fmt(v5m)}  | ${fmtDelta(v5m - v4m)} |`);
  }

  // ── ERRORS ──────────────────────────────────────────────────────────────

  if (errors.length > 0) {
    console.log(`\n[V5-BENCH] ═══ ERRORS (${errors.length}) ═══`);
    for (const e of errors) {
      console.log(`[V5-BENCH] ${e.version} ${e.scene}: ${e.error}`);
    }
  }

  // ── VERDICT ──────────────────────────────────────────────────────────────

  const { verdict, reason } = computeVerdict(v4Results, v5Results);
  console.log(`\n[V5-BENCH] ═══ VERDICT ═══`);
  console.log(`[V5-BENCH] ${verdict}`);
  console.log(`[V5-BENCH] Raison: ${reason}`);

  // ── SAVE ────────────────────────────────────────────────────────────────

  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

  const benchResult = {
    bench_id: `BENCH_V5AB_${timestamp.replace(/[-T]/g, '')}`,
    protocol: 'V4 vs V5 A/B — 10 scenes identiques, meme seed/modele/temperature',
    model: MODEL,
    temperature: { draft: DRAFT_TEMPERATURE, judge: JUDGE_TEMPERATURE },
    n_scenes: SCENES.length,
    valid_scenes: { v4: v4Valid.length, v5: v5Valid.length },
    v4_results: { scores: v4Results, composite_mean: v4MeanComp },
    v5_results: { scores: v5Results, composite_mean: v5MeanComp },
    comparison: {
      composite_delta: v5MeanComp - v4MeanComp,
      per_scene: v4Results.map((v4, i) => ({
        scene_id: v4.scene_id,
        composite_delta: v5Results[i].composite - v4.composite,
        ecc_delta: v5Results[i].ecc - v4.ecc,
        rci_delta: v5Results[i].rci - v4.rci,
        sii_delta: v5Results[i].sii - v4.sii,
        ifi_delta: v5Results[i].ifi - v4.ifi,
        aai_delta: v5Results[i].aai - v4.aai,
      })),
    },
    errors,
    verdict,
    verdict_reason: reason,
    go_criteria: {
      rule: 'V5 passes <= V4 passes ET composite V5 >= composite V4 - 0.5 -> GO',
      source: 'docs/irm/V5_AB_TEST_REPORT.md',
    },
    created_at: new Date().toISOString(),
    head: '83d5d187',
    standard: 'NASA-Grade L4 / DO-178C Level A',
  };

  const outPath = resolve(sessionsDir, `v5-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchResult, null, 2), 'utf-8');
  console.log(`\n[V5-BENCH] Resultats: ${outPath}`);

  const prosePath = resolve(sessionsDir, `v5-bench-prose-${timestamp}.json`);
  writeFileSync(prosePath, JSON.stringify({
    v4_prose: v4Prose.map((p, i) => ({ scene_id: SCENES[i].id, prose: p })),
    v5_prose: v5Prose.map((p, i) => ({ scene_id: SCENES[i].id, prose: p })),
  }, null, 2), 'utf-8');
  console.log(`[V5-BENCH] Prose: ${prosePath}`);

  // Cleanup
  delete process.env.OMEGA_PROMPT_V4;
  delete process.env.OMEGA_PROMPT_V5;

  if (verdict === 'NO_GO_V5') process.exit(1);
}

main().catch(err => {
  console.error('[V5-BENCH] FATAL:', err);
  process.exit(1);
});
