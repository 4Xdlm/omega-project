/**
 * run-isolation-bench.ts — Isolation bench V5.0 (3 features) vs V5.1 (5 features)
 *
 * But : trancher si l'alerte ECC (-2.2 sur BR02) est du bruit LLM ou un effet
 * systématique de f29d/f35c. Ne teste que les 2 scènes perdantes (menace, passion).
 * N=2 par scène par version → 8 runs total.
 *
 * Toggle : OMEGA_BRIDGE_PHASE=1 → V5.0 (3 features)
 *          OMEGA_BRIDGE_PHASE=2 → V5.1 (5 features)
 *
 * Usage (PowerShell) :
 *   npx tsx scripts/run-isolation-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04
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
const RUNS_PER_SCENE = 2;

// ── 14D emotion helper ────────────────────────────────────────────────────

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

// ── 2 scènes perdantes seulement ─────────────────────────────────────────

const SCENES = [
  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur',
    dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Accelere',sensory:['touch']},{id:'b4',action:'Lisiere',sensory:['sight']}],
    sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },

  { id: 'passion', conflict: 'internal', goal: 'Pianiste joue son dernier concert', story: 'Art et sacrifice',
    dq1: 'anticipation', dq3: 'joy', dq4: 'awe',
    beats: [{id:'b1',action:'Entre en scene',sensory:['sight','sound']},{id:'b2',action:'Premieres notes',sensory:['sound','touch']},{id:'b3',action:'La salle disparait',sensory:['sound']},{id:'b4',action:'Derniere note silence',sensory:['sound','sight']}],
    sig: ['touche','bois','salle','silence'], motifs: ['piano','scene'] },
];

// ── Build ForgePacket ─────────────────────────────────────────────────────

function buildPacket(scene: typeof SCENES[0], runIdx: number, phase: '1' | '2'): ForgePacket {
  return {
    packet_id: `ISO_${scene.id}_P${phase}_run${runIdx}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `iso_${scene.id}`,
    run_id: `iso_${scene.id}_P${phase}_run${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `iso_${scene.id}_P${phase}_run${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.1.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ── Scoring ─────────────────────────────────────────────────────────────

interface RunResult {
  scene_id: string;
  phase: string;
  run_idx: number;
  composite: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  word_count: number;
  tension_14d: number;
  loop_passes: number;
}

function extractResult(result: SovereignForgeResult, sceneId: string, phase: string, runIdx: number): RunResult {
  const ms = result.macro_score;
  const prose = result.final_prose ?? '';

  // Extract tension_14d from sub-scores if available
  const eccAxis = (ms as any)?.macro_axes?.ecc;
  const tension14d = eccAxis?.sub_scores?.tension_14d?.score
    ?? eccAxis?.sub_scores?.find?.((s: any) => s.name === 'tension_14d')?.score
    ?? 0;

  return {
    scene_id: sceneId,
    phase,
    run_idx: runIdx,
    composite: ms?.composite ?? 0,
    ecc: ms?.ecc_score ?? (ms?.macro_axes?.ecc as any)?.score ?? 0,
    rci: ms?.macro_axes?.rci?.score ?? 0,
    sii: ms?.macro_axes?.sii?.score ?? 0,
    ifi: ms?.macro_axes?.ifi?.score ?? 0,
    aai: ms?.macro_axes?.aai?.score ?? 0,
    word_count: prose.split(/\s+/).filter((w: string) => w.length > 0).length,
    tension_14d: tension14d,
    loop_passes: (result as any).loop_count ?? 0,
  };
}

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function fmtDelta(d: number): string { return ((d >= 0 ? '+' : '') + d.toFixed(1)).padStart(7); }
function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function stddev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1));
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

  const allResults: RunResult[] = [];
  const allProse: Array<{ scene_id: string; phase: string; run_idx: number; prose: string }> = [];
  const errors: Array<{ scene: string; phase: string; run: number; error: string }> = [];

  console.log(`\n[ISO-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[ISO-BENCH]  ISOLATION BENCH: V5.0 (Phase 1, 3 feat) vs V5.1 (Phase 2, 5 feat)`);
  console.log(`[ISO-BENCH]  Scenes: ${SCENES.map(s => s.id).join(', ')}`);
  console.log(`[ISO-BENCH]  N=${RUNS_PER_SCENE} per scene per phase → ${SCENES.length * RUNS_PER_SCENE * 2} runs total`);
  console.log(`[ISO-BENCH]  Model: ${MODEL} | Temp: draft=${DRAFT_TEMPERATURE} judge=${JUDGE_TEMPERATURE}`);
  console.log(`[ISO-BENCH] ═══════════════════════════════════════════════════════\n`);

  for (const scene of SCENES) {
    for (const phase of ['1', '2'] as const) {
      for (let run = 0; run < RUNS_PER_SCENE; run++) {
        const label = `${scene.id} Phase${phase} run${run + 1}/${RUNS_PER_SCENE}`;
        console.log(`\n[ISO-BENCH] ─── ${label} ───`);

        // Set bridge phase
        process.env.OMEGA_PROMPT_V5 = '1';
        process.env.OMEGA_BRIDGE_PHASE = phase;
        delete process.env.OMEGA_PROMPT_V4;

        const packet = buildPacket(scene, run, phase);
        try {
          const result = await runSovereignForgeWithPacket(packet, provider);
          const scores = extractResult(result, scene.id, `Phase${phase}`, run);
          allResults.push(scores);
          allProse.push({ scene_id: scene.id, phase: `Phase${phase}`, run_idx: run, prose: result.final_prose ?? '' });

          console.log(`[ISO-BENCH] ${label}: comp=${scores.composite.toFixed(1)} ecc=${scores.ecc.toFixed(1)} rci=${scores.rci.toFixed(1)} words=${scores.word_count}`);
        } catch (err: any) {
          const msg = err.message?.slice(0, 200) ?? String(err);
          console.error(`[ISO-BENCH] ${label} FAILED: ${msg}`);
          errors.push({ scene: scene.id, phase: `Phase${phase}`, run, error: msg });
        }

        // Pause for rate limiting
        console.log(`[ISO-BENCH] Pause 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }
  }

  // ── ANALYSIS ──────────────────────────────────────────────────────────────

  console.log(`\n[ISO-BENCH] ═══ RÉSULTATS PAR SCÈNE ET PHASE ═══\n`);

  for (const scene of SCENES) {
    const p1 = allResults.filter(r => r.scene_id === scene.id && r.phase === 'Phase1');
    const p2 = allResults.filter(r => r.scene_id === scene.id && r.phase === 'Phase2');

    console.log(`\n── ${scene.id.toUpperCase()} ──`);
    console.log(`  Phase1 (3 feat): comp=${p1.map(r => r.composite.toFixed(1)).join(', ')} mean=${mean(p1.map(r => r.composite)).toFixed(1)} ±${stddev(p1.map(r => r.composite)).toFixed(1)}`);
    console.log(`  Phase2 (5 feat): comp=${p2.map(r => r.composite.toFixed(1)).join(', ')} mean=${mean(p2.map(r => r.composite)).toFixed(1)} ±${stddev(p2.map(r => r.composite)).toFixed(1)}`);
    console.log(`  Delta composite: ${fmtDelta(mean(p2.map(r => r.composite)) - mean(p1.map(r => r.composite))).trim()}`);
    console.log(`  Phase1 ECC:      mean=${mean(p1.map(r => r.ecc)).toFixed(1)} ±${stddev(p1.map(r => r.ecc)).toFixed(1)}`);
    console.log(`  Phase2 ECC:      mean=${mean(p2.map(r => r.ecc)).toFixed(1)} ±${stddev(p2.map(r => r.ecc)).toFixed(1)}`);
    console.log(`  Delta ECC:       ${fmtDelta(mean(p2.map(r => r.ecc)) - mean(p1.map(r => r.ecc))).trim()}`);
    console.log(`  Phase1 words:    ${p1.map(r => r.word_count).join(', ')} mean=${Math.round(mean(p1.map(r => r.word_count)))}`);
    console.log(`  Phase2 words:    ${p2.map(r => r.word_count).join(', ')} mean=${Math.round(mean(p2.map(r => r.word_count)))}`);
  }

  // ── GLOBAL ────────────────────────────────────────────────────────────────

  const allP1 = allResults.filter(r => r.phase === 'Phase1');
  const allP2 = allResults.filter(r => r.phase === 'Phase2');

  console.log(`\n[ISO-BENCH] ═══ GLOBAL ═══`);
  console.log(`  Phase1 mean composite: ${mean(allP1.map(r => r.composite)).toFixed(1)} ±${stddev(allP1.map(r => r.composite)).toFixed(1)}`);
  console.log(`  Phase2 mean composite: ${mean(allP2.map(r => r.composite)).toFixed(1)} ±${stddev(allP2.map(r => r.composite)).toFixed(1)}`);
  console.log(`  Delta composite:       ${fmtDelta(mean(allP2.map(r => r.composite)) - mean(allP1.map(r => r.composite))).trim()}`);
  console.log(`  Phase1 mean ECC:       ${mean(allP1.map(r => r.ecc)).toFixed(1)} ±${stddev(allP1.map(r => r.ecc)).toFixed(1)}`);
  console.log(`  Phase2 mean ECC:       ${mean(allP2.map(r => r.ecc)).toFixed(1)} ±${stddev(allP2.map(r => r.ecc)).toFixed(1)}`);
  console.log(`  Delta ECC:             ${fmtDelta(mean(allP2.map(r => r.ecc)) - mean(allP1.map(r => r.ecc))).trim()}`);

  // ── VERDICT ────────────────────────────────────────────────────────────────

  const eccDelta = mean(allP2.map(r => r.ecc)) - mean(allP1.map(r => r.ecc));
  const compDelta = mean(allP2.map(r => r.composite)) - mean(allP1.map(r => r.composite));
  const eccStd = Math.max(stddev(allP1.map(r => r.ecc)), stddev(allP2.map(r => r.ecc)));

  let verdict: string;
  let reason: string;

  if (allP1.length < 2 || allP2.length < 2) {
    verdict = 'INCONCLUSIVE';
    reason = `Données insuffisantes: Phase1=${allP1.length} Phase2=${allP2.length} runs valides`;
  } else if (Math.abs(eccDelta) <= eccStd * 1.5) {
    // Delta ECC within noise band (1.5 × max stddev)
    verdict = 'NOISE_CONFIRMED';
    reason = `|ΔECC|=${Math.abs(eccDelta).toFixed(1)} ≤ 1.5×σ=${(eccStd * 1.5).toFixed(1)} — la variation ECC est dans la bande de bruit LLM`;
  } else if (eccDelta < -2.0) {
    verdict = 'SIGNAL_CONFIRMED';
    reason = `ΔECC=${eccDelta.toFixed(1)} hors bande de bruit (σ=${eccStd.toFixed(1)}). f29d/f35c dégrade systématiquement l'ECC`;
  } else {
    verdict = 'NEUTRAL';
    reason = `ΔECC=${eccDelta.toFixed(1)}, composite Δ=${compDelta.toFixed(1)}. Pas de signal fort dans aucune direction`;
  }

  console.log(`\n[ISO-BENCH] ═══ VERDICT ═══`);
  console.log(`[ISO-BENCH] ${verdict}`);
  console.log(`[ISO-BENCH] ${reason}`);

  if (verdict === 'NOISE_CONFIRMED') {
    console.log(`[ISO-BENCH] ACTION: Bridge-02 validé. Tagger et passer à P2-03.`);
  } else if (verdict === 'SIGNAL_CONFIRMED') {
    console.log(`[ISO-BENCH] ACTION: Isoler f29d vs f35c séparément. Possible: adoucir instruction f29d.`);
  }

  if (errors.length > 0) {
    console.log(`\n[ISO-BENCH] ERRORS (${errors.length}):`);
    for (const e of errors) console.log(`  ${e.phase} ${e.scene} run${e.run}: ${e.error}`);
  }

  // ── SAVE ────────────────────────────────────────────────────────────────

  const sessionsDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessionsDir, { recursive: true });
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');

  const benchData = {
    bench_id: `ISO_BENCH_${timestamp.replace(/[-T]/g, '')}`,
    protocol: 'Isolation: V5.0 (Phase1, 3 features) vs V5.1 (Phase2, 5 features) — N=2 per scene',
    scenes: SCENES.map(s => s.id),
    runs_per_scene: RUNS_PER_SCENE,
    model: MODEL,
    temperature: { draft: DRAFT_TEMPERATURE, judge: JUDGE_TEMPERATURE },
    results: allResults,
    global: {
      phase1: { composite_mean: mean(allP1.map(r => r.composite)), ecc_mean: mean(allP1.map(r => r.ecc)), ecc_std: stddev(allP1.map(r => r.ecc)) },
      phase2: { composite_mean: mean(allP2.map(r => r.composite)), ecc_mean: mean(allP2.map(r => r.ecc)), ecc_std: stddev(allP2.map(r => r.ecc)) },
      delta_composite: compDelta,
      delta_ecc: eccDelta,
    },
    errors,
    verdict,
    verdict_reason: reason,
    created_at: new Date().toISOString(),
  };

  const outPath = resolve(sessionsDir, `iso-bench-${timestamp}.json`);
  writeFileSync(outPath, JSON.stringify(benchData, null, 2), 'utf-8');
  console.log(`\n[ISO-BENCH] Résultats: ${outPath}`);

  const prosePath = resolve(sessionsDir, `iso-bench-prose-${timestamp}.json`);
  writeFileSync(prosePath, JSON.stringify(allProse, null, 2), 'utf-8');
  console.log(`[ISO-BENCH] Prose: ${prosePath}`);

  // Cleanup
  delete process.env.OMEGA_PROMPT_V4;
  delete process.env.OMEGA_PROMPT_V5;
  delete process.env.OMEGA_BRIDGE_PHASE;
}

main().catch(err => {
  console.error('[ISO-BENCH] FATAL:', err);
  process.exit(1);
});
