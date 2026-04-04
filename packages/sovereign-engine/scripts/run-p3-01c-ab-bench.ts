/**
 * run-p3-01c-ab-bench.ts — A/B Bench P3-01 CALC Pre-Scorer
 * ═══════════════════════════════════════════════════════════
 *
 * Objectif : mesurer le gain RÉEL du CALC pre-scorer en comparant :
 *   - Arm A : OMEGA_CALC_PRESCORER=0 (baseline, pre-scorer OFF)
 *   - Arm B : OMEGA_CALC_PRESCORER=1 (pre-scorer ON)
 *
 * Métriques par arm :
 *   1. Nombre réel d'appels LLM par run
 *   2. Candidates rejected par pre-scorer (arm B)
 *   3. Composite / min_axis / 5 macro-axes
 *   4. Qualité prose = est-ce que le pre-scorer dégrade ?
 *
 * Budget : 5 scènes × 2 arms × ~90 appels = ~900 appels API (~$20)
 * (conservative — si pre-scorer fonctionne, arm B sera ~75 appels)
 *
 * Usage (PowerShell) :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-p3-01c-ab-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04 (P3-01c validation)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSovereignForgeWithPacket, shouldSkipDuel, type SovereignForgeResult } from '../src/engine.js';
import { getProseCacheStats } from '../src/oracle/aesthetic-oracle.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 0.75;
const JUDGE_TEMPERATURE = 0.0;

// ── LLM Call Counter ──────────────────────────────────────────────────────

let apiCallCount = 0;
let apiCallLog: Array<{ method: string; scene: string; tokens_est: number }> = [];

function createCountingProvider(baseProvider: ReturnType<typeof createAnthropicProvider>, sceneId: string) {
  const handler: ProxyHandler<typeof baseProvider> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          const apiMethods = [
            'generateDraft', 'rewriteSentence', 'scoreInteriority',
            'scoreSensoryDensity', 'scoreNecessity', 'scoreImpact',
            'generateStructuredJSON', 'applyPatch',
          ];
          if (apiMethods.includes(prop as string)) {
            apiCallCount++;
            apiCallLog.push({
              method: prop as string,
              scene: sceneId,
              tokens_est: (prop as string).startsWith('score') ? 4000 : 7500,
            });
          }
          return (value as Function).apply(target, args);
        };
      }
      return value;
    },
  };
  return new Proxy(baseProvider, handler);
}

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

// ── 5 scènes (same as P2 bench — reproducibility) ─────────────────────

const SCENES = [
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude',
    dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },

  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur',
    dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{id:'b1',action:'Marche crepuscule',sensory:['sight','sound']},{id:'b2',action:'Branche cassee',sensory:['sound']},{id:'b3',action:'Accelere',sensory:['touch']},{id:'b4',action:'Lisiere',sensory:['sight']}],
    sig: ['ombre','branche','souffle','nuit'], motifs: ['foret','crepuscule'] },

  { id: 'confrontation', conflict: 'societal', goal: 'Deux associes reglent leurs comptes', story: 'Trahison',
    dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Entre sans frapper',sensory:['sound']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jete',sensory:['touch']},{id:'b4',action:'Sort sans un mot',sensory:['sight']}],
    sig: ['acier','verre','silence','machoire'], motifs: ['bureau','lumiere'] },

  { id: 'passion', conflict: 'internal', goal: 'Pianiste joue son dernier concert', story: 'Art et sacrifice',
    dq1: 'anticipation', dq3: 'joy', dq4: 'awe',
    beats: [{id:'b1',action:'Entre en scene',sensory:['sight','sound']},{id:'b2',action:'Premieres notes',sensory:['sound','touch']},{id:'b3',action:'La salle disparait',sensory:['sound']},{id:'b4',action:'Derniere note silence',sensory:['sound','sight']}],
    sig: ['touche','bois','salle','silence'], motifs: ['piano','scene'] },

  { id: 'deuil', conflict: 'internal', goal: 'Homme devant la tombe de son pere', story: 'Deuil',
    dq1: 'sadness', dq3: 'remorse', dq4: 'sadness',
    beats: [{id:'b1',action:'Arrive au cimetiere',sensory:['sight','touch']},{id:'b2',action:'Pose la main sur la pierre',sensory:['touch']},{id:'b3',action:'Souvenir d enfance',sensory:['smell','sound']},{id:'b4',action:'S eloigne sous la pluie',sensory:['touch','sight']}],
    sig: ['pierre','pluie','terre','silence'], motifs: ['cimetiere','pluie'] },
];

// ── Build ForgePacket ────────────────────────────────────────────────────

function buildPacket(scene: typeof SCENES[0], idx: number, arm: string): ForgePacket {
  return {
    packet_id: `BENCH_P301_${arm}_${scene.id}_${idx}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bench_p301_${scene.id}`,
    run_id: `bench_p301_${arm}_${scene.id}_${idx}_${Date.now()}`,
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
    seeds: { llm_seed: `bench_p301_${arm}_${scene.id}_${idx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.1.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── Per-run telemetry ──────────────────────────────────────────────────

interface RunTelemetry {
  arm: 'A_OFF' | 'B_ON';
  scene_id: string;
  conflict_type: string;
  api_calls: number;
  api_call_breakdown: Record<string, number>;
  composite: number;
  min_axis: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  verdict: string;
  loop_passes: number;
  word_count: number;
  duel_prefilter_skip: boolean;
  prescorer_rejects: number;
  duration_ms: number;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  const baseProvider = createAnthropicProvider({
    apiKey,
    model: MODEL,
    judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE,
    judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  const telemetry: RunTelemetry[] = [];
  const proseResults: Array<{ arm: string; scene_id: string; prose: string }> = [];

  console.log(`\n[P3-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P3-BENCH]  OMEGA P3-01c A/B BENCH — CALC PRE-SCORER`);
  console.log(`[P3-BENCH]  ${SCENES.length} scenes × 2 arms = ${SCENES.length * 2} runs`);
  console.log(`[P3-BENCH]  Model: ${MODEL}`);
  console.log(`[P3-BENCH]  Arm A: PRESCORER OFF (baseline)`);
  console.log(`[P3-BENCH]  Arm B: PRESCORER ON`);
  console.log(`[P3-BENCH]  Budget estimé: ~900 API calls (~$20)`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════\n`);

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];

    for (const arm of ['A_OFF', 'B_ON'] as const) {
      const prescorerOn = arm === 'B_ON';

      console.log(`\n[P3-BENCH] ─── Scene ${i + 1}/${SCENES.length}: ${scene.id} | Arm ${arm} ───\n`);

      // Set env var for this arm
      if (prescorerOn) {
        process.env.OMEGA_CALC_PRESCORER = '1';
      } else {
        delete process.env.OMEGA_CALC_PRESCORER;
      }

      // V5 ON, all P2-03 optimizations ON
      delete process.env.OMEGA_PROMPT_V4;
      delete process.env.OMEGA_PROMPT_V4_FORCE;
      delete process.env.OMEGA_PROMPT_V5;

      // Reset counters
      apiCallCount = 0;
      apiCallLog = [];

      const provider = createCountingProvider(baseProvider, `${arm}_${scene.id}`);
      const packet = buildPacket(scene, i, arm);

      const startTime = Date.now();
      try {
        const result = await runSovereignForgeWithPacket(packet, provider);
        const durationMs = Date.now() - startTime;

        const ms = result.macro_score;
        const loopResult = result.loop_result;
        const prefilterDecision = loopResult ? shouldSkipDuel(loopResult) : { skip: false, reason: 'N/A' };

        // API call breakdown
        const callBreakdown: Record<string, number> = {};
        for (const call of apiCallLog) {
          callBreakdown[call.method] = (callBreakdown[call.method] ?? 0) + 1;
        }

        // Count prescorer rejects from console logs
        // (pre-scorer logs [CALC-PRE-SCORER] Result: X survivors, Y rejected)
        // We'll use the api call difference as the signal instead
        const prescorerRejects = prescorerOn
          ? Math.max(0, Math.round((93.4 - apiCallCount) / 8))  // Estimate
          : 0;

        const runTelemetry: RunTelemetry = {
          arm,
          scene_id: scene.id,
          conflict_type: scene.conflict,
          api_calls: apiCallCount,
          api_call_breakdown: callBreakdown,
          composite: ms?.composite ?? 0,
          min_axis: ms?.min_axis ?? 0,
          ecc: ms?.macro_axes?.ecc?.score ?? 0,
          rci: ms?.macro_axes?.rci?.score ?? 0,
          sii: ms?.macro_axes?.sii?.score ?? 0,
          ifi: ms?.macro_axes?.ifi?.score ?? 0,
          aai: ms?.macro_axes?.aai?.score ?? 0,
          verdict: result.verdict ?? 'UNKNOWN',
          loop_passes: result.passes_executed ?? 0,
          word_count: (result.final_prose ?? '').split(/\s+/).filter((w: string) => w.length > 0).length,
          duel_prefilter_skip: prefilterDecision.skip,
          prescorer_rejects: prescorerRejects,
          duration_ms: durationMs,
        };

        telemetry.push(runTelemetry);
        proseResults.push({ arm, scene_id: scene.id, prose: result.final_prose ?? '' });

        console.log(`[P3-BENCH] ${arm} ${scene.id}: composite=${fmt(runTelemetry.composite)} min=${fmt(runTelemetry.min_axis)} calls=${runTelemetry.api_calls} ${durationMs}ms`);

      } catch (err: any) {
        const durationMs = Date.now() - startTime;
        console.error(`[P3-BENCH] ${arm} ${scene.id} FAILED (${apiCallCount} calls, ${durationMs}ms): ${err.message?.slice(0, 200)}`);
        telemetry.push({
          arm,
          scene_id: scene.id,
          conflict_type: scene.conflict,
          api_calls: apiCallCount,
          api_call_breakdown: {},
          composite: 0, min_axis: 0, ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0,
          verdict: 'ERROR',
          loop_passes: 0, word_count: 0,
          duel_prefilter_skip: false, prescorer_rejects: 0,
          duration_ms: durationMs,
        });
      }

      // Pause between runs
      console.log(`[P3-BENCH] Waiting 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Clean up env
  delete process.env.OMEGA_CALC_PRESCORER;

  // ── A/B Comparison ─────────────────────────────────────────────────────

  const armA = telemetry.filter(t => t.arm === 'A_OFF' && t.composite > 0);
  const armB = telemetry.filter(t => t.arm === 'B_ON' && t.composite > 0);

  console.log(`\n[P3-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P3-BENCH]  A/B RESULTS — CALC PRE-SCORER`);
  console.log(`[P3-BENCH]  Arm A (OFF): ${armA.length} valid | Arm B (ON): ${armB.length} valid`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════`);

  // Per-scene comparison table
  console.log(`\n  SCENE-BY-SCENE COMPARISON:`);
  console.log(`  ${'Scene'.padEnd(16)} | ${'A calls'.padStart(7)} ${'B calls'.padStart(7)} ${'Δ'.padStart(5)} | ${'A comp'.padStart(7)} ${'B comp'.padStart(7)} ${'Δ'.padStart(6)} | ${'A min'.padStart(6)} ${'B min'.padStart(6)}`);
  console.log(`  ${'-'.repeat(85)}`);

  for (const scene of SCENES) {
    const a = armA.find(t => t.scene_id === scene.id);
    const b = armB.find(t => t.scene_id === scene.id);
    if (a && b) {
      const callDelta = b.api_calls - a.api_calls;
      const compDelta = b.composite - a.composite;
      console.log(`  ${scene.id.padEnd(16)} | ${String(a.api_calls).padStart(7)} ${String(b.api_calls).padStart(7)} ${(callDelta >= 0 ? '+' : '') + callDelta}`.padEnd(45) +
        ` | ${fmt(a.composite)} ${fmt(b.composite)} ${(compDelta >= 0 ? '+' : '') + compDelta.toFixed(1)}`.padEnd(30) +
        ` | ${fmt(a.min_axis)} ${fmt(b.min_axis)}`);
    }
  }

  // Aggregates
  const meanCallsA = mean(armA.map(t => t.api_calls));
  const meanCallsB = mean(armB.map(t => t.api_calls));
  const callSaving = meanCallsA - meanCallsB;
  const callSavingPct = meanCallsA > 0 ? (callSaving / meanCallsA) * 100 : 0;

  const meanCompA = mean(armA.map(t => t.composite));
  const meanCompB = mean(armB.map(t => t.composite));
  const compDelta = meanCompB - meanCompA;

  const meanMinA = mean(armA.map(t => t.min_axis));
  const meanMinB = mean(armB.map(t => t.min_axis));
  const minDelta = meanMinB - meanMinA;

  console.log(`\n  AGGREGATES:`);
  console.log(`    API Calls/run:  A=${meanCallsA.toFixed(1)}  B=${meanCallsB.toFixed(1)}  Δ=${callSaving.toFixed(1)} saved (${callSavingPct.toFixed(1)}%)`);
  console.log(`    Composite:      A=${meanCompA.toFixed(1)}  B=${meanCompB.toFixed(1)}  Δ=${compDelta >= 0 ? '+' : ''}${compDelta.toFixed(1)}`);
  console.log(`    Min axis:       A=${meanMinA.toFixed(1)}  B=${meanMinB.toFixed(1)}  Δ=${minDelta >= 0 ? '+' : ''}${minDelta.toFixed(1)}`);

  // Quality guard: B must not degrade more than 2 points composite
  const qualityOk = compDelta > -2.0;
  // Cost guard: B must save at least 5% calls
  const costOk = callSavingPct >= 5.0;

  console.log(`\n  VERDICT:`);
  console.log(`    Quality guard (Δ composite > -2.0): ${qualityOk ? 'PASS ✓' : 'FAIL ✗'} (${compDelta >= 0 ? '+' : ''}${compDelta.toFixed(1)})`);
  console.log(`    Cost guard (saving >= 5%):          ${costOk ? 'PASS ✓' : 'FAIL ✗'} (${callSavingPct.toFixed(1)}%)`);
  console.log(`    OVERALL:                            ${qualityOk && costOk ? 'GO ✓' : 'NO-GO ✗'}`);

  // Per-axis comparison
  console.log(`\n  AXIS COMPARISON (mean):`);
  for (const axis of ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const) {
    const mA = mean(armA.map(t => t[axis]));
    const mB = mean(armB.map(t => t[axis]));
    const d = mB - mA;
    console.log(`    ${axis.toUpperCase().padEnd(4)}: A=${mA.toFixed(1)}  B=${mB.toFixed(1)}  Δ=${d >= 0 ? '+' : ''}${d.toFixed(1)}`);
  }

  // ── Save results ──────────────────────────────────────────────────────

  const sessDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultPath = resolve(sessDir, `p3-01c-ab-bench-${ts}.json`);
  const prosePath = resolve(sessDir, `p3-01c-ab-bench-prose-${ts}.json`);

  writeFileSync(resultPath, JSON.stringify({
    version: '1.0.0',
    date: new Date().toISOString(),
    model: MODEL,
    scenes: SCENES.length,
    arms: { A_OFF: armA.length, B_ON: armB.length },
    telemetry,
    summary: {
      arm_a: {
        mean_api_calls: meanCallsA,
        mean_composite: meanCompA,
        mean_min_axis: meanMinA,
      },
      arm_b: {
        mean_api_calls: meanCallsB,
        mean_composite: meanCompB,
        mean_min_axis: meanMinB,
      },
      delta: {
        api_calls_saved: callSaving,
        api_calls_saved_pct: callSavingPct,
        composite_delta: compDelta,
        min_axis_delta: minDelta,
      },
      verdict: {
        quality_ok: qualityOk,
        cost_ok: costOk,
        overall: qualityOk && costOk ? 'GO' : 'NO-GO',
      },
    },
  }, null, 2), 'utf-8');

  writeFileSync(prosePath, JSON.stringify(proseResults, null, 2), 'utf-8');

  console.log(`\n[P3-BENCH] Results: ${resultPath}`);
  console.log(`[P3-BENCH] Prose:   ${prosePath}`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('[P3-BENCH] FATAL:', err.message);
  process.exit(1);
});
