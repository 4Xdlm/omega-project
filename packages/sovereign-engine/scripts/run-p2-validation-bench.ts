/**
 * run-p2-validation-bench.ts — Bench validation finale P2-03
 * ═══════════════════════════════════════════════════════════
 *
 * Objectif : mesurer les gains RÉELS de P2-03 sur pipeline V5 actif.
 * PAS un A/B V4 vs V5 (déjà fait dans br02-bench — PASS CONDITIONNEL).
 *
 * Métriques ciblées :
 *   1. Nombre réel d'appels LLM par run
 *   2. Taux d'activation pre-filter (duel skippé ?)
 *   3. Cache hit rate (prose-hash cache)
 *   4. V1 skip dans duel (si duel actif)
 *   5. Compliance tracker snapshot
 *   6. Composite / min_axis / 5 macro-axes
 *
 * Budget : 5 scènes × ~8 appels = ~40 appels API (~$0.90)
 *
 * Usage (PowerShell) :
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-p2-validation-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04 (P2 validation finale)
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runSovereignForgeWithPacket, shouldSkipDuel, type SovereignForgeResult } from '../src/engine.js';
import { getProseCacheStats } from '../src/oracle/aesthetic-oracle.js';
import { getDowngradeSignals } from '../src/coupling/compliance-tracker.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const DRAFT_TEMPERATURE = 0.75;
const JUDGE_TEMPERATURE = 0.0;

// ── LLM Call Counter ──────────────────────────────────────────────────────
// Wraps the provider to count actual API calls

let apiCallCount = 0;
let apiCallLog: Array<{ method: string; scene: string; tokens_est: number }> = [];

function createCountingProvider(baseProvider: ReturnType<typeof createAnthropicProvider>, sceneId: string) {
  const handler: ProxyHandler<typeof baseProvider> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          // Count API calls (methods that actually call the LLM)
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

// ── 5 scènes variées (3 conflict types) ────────────────────────────────

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

function buildPacket(scene: typeof SCENES[0], idx: number): ForgePacket {
  return {
    packet_id: `BENCH_P2VAL_${scene.id}_${idx}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bench_p2val_${scene.id}`,
    run_id: `bench_p2val_${scene.id}_${idx}_${Date.now()}`,
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
    seeds: { llm_seed: `bench_p2val_${scene.id}_${idx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.1.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(1).padStart(6); }
function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

// ── Per-scene telemetry ─────────────────────────────────────────────────

interface SceneTelemetry {
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
  duel_prefilter_reason: string;
  prose_cache_v1_hits: number;
  prose_cache_v3_hits: number;
  compliance_downgrade_signals: number;
  duration_ms: number;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  // V5 default ON (Bridge-03), all P2-03 optimizations ON
  // Ensure we're in V5 mode with all optimizations
  delete process.env.OMEGA_PROMPT_V4;
  delete process.env.OMEGA_PROMPT_V4_FORCE;
  delete process.env.OMEGA_PROMPT_V5; // V5 default ON
  // P2-03 defaults: all ON (no env vars needed)

  const baseProvider = createAnthropicProvider({
    apiKey,
    model: MODEL,
    judgeStable: false,
    draftTemperature: DRAFT_TEMPERATURE,
    judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  const telemetry: SceneTelemetry[] = [];
  const proseResults: Array<{ scene_id: string; prose: string }> = [];

  console.log(`\n[P2-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P2-BENCH]  OMEGA P2 VALIDATION BENCH — ${SCENES.length} scenes V5`);
  console.log(`[P2-BENCH]  Model: ${MODEL} | P2-03: ALL ON | Bridge-03: V5 default`);
  console.log(`[P2-BENCH]  Budget estimé: ~40 API calls (~$0.90)`);
  console.log(`[P2-BENCH] ═══════════════════════════════════════════════════════\n`);

  for (let i = 0; i < SCENES.length; i++) {
    const scene = SCENES[i];
    console.log(`\n[P2-BENCH] ─── Scene ${i + 1}/${SCENES.length}: ${scene.id} (${scene.conflict}) ───\n`);

    // Reset counters for this scene
    apiCallCount = 0;
    apiCallLog = [];

    const provider = createCountingProvider(baseProvider, scene.id);
    const packet = buildPacket(scene, i);

    const startTime = Date.now();
    try {
      const result = await runSovereignForgeWithPacket(packet, provider);
      const durationMs = Date.now() - startTime;

      // Extract telemetry
      const ms = result.macro_score;
      const loopResult = result.loop_result;
      const cacheStats = getProseCacheStats();
      const downgradeSignals = getDowngradeSignals();

      // Pre-filter decision (re-compute from loop result for telemetry)
      const prefilterDecision = loopResult ? shouldSkipDuel(loopResult) : { skip: false, reason: 'N/A' };

      // API call breakdown
      const callBreakdown: Record<string, number> = {};
      for (const call of apiCallLog) {
        callBreakdown[call.method] = (callBreakdown[call.method] ?? 0) + 1;
      }

      const sceneTelemetry: SceneTelemetry = {
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
        duel_prefilter_reason: prefilterDecision.reason,
        prose_cache_v1_hits: cacheStats.v1_hits,
        prose_cache_v3_hits: cacheStats.v3_hits,
        compliance_downgrade_signals: downgradeSignals.length,
        duration_ms: durationMs,
      };

      telemetry.push(sceneTelemetry);
      proseResults.push({ scene_id: scene.id, prose: result.final_prose ?? '' });

      console.log(`[P2-BENCH] ${scene.id}: composite=${fmt(sceneTelemetry.composite)} min=${fmt(sceneTelemetry.min_axis)} calls=${sceneTelemetry.api_calls} duel_skip=${sceneTelemetry.duel_prefilter_skip} cache_hits=${cacheStats.v1_hits + cacheStats.v3_hits} ${durationMs}ms`);

    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      console.error(`[P2-BENCH] ${scene.id} FAILED (${apiCallCount} calls, ${durationMs}ms): ${err.message?.slice(0, 200)}`);
      telemetry.push({
        scene_id: scene.id,
        conflict_type: scene.conflict,
        api_calls: apiCallCount,
        api_call_breakdown: {},
        composite: 0, min_axis: 0, ecc: 0, rci: 0, sii: 0, ifi: 0, aai: 0,
        verdict: 'ERROR',
        loop_passes: 0, word_count: 0,
        duel_prefilter_skip: false, duel_prefilter_reason: 'ERROR',
        prose_cache_v1_hits: 0, prose_cache_v3_hits: 0,
        compliance_downgrade_signals: 0,
        duration_ms: durationMs,
      });
    }

    // Pause between scenes (API rate limit courtesy)
    if (i < SCENES.length - 1) {
      console.log(`[P2-BENCH] Waiting 3s...`);
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────────

  const valid = telemetry.filter(t => t.composite > 0);

  console.log(`\n[P2-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P2-BENCH]  RESULTS SUMMARY (${valid.length}/${SCENES.length} valid)`);
  console.log(`[P2-BENCH] ═══════════════════════════════════════════════════════`);

  console.log(`\n  API CALLS:`);
  console.log(`    Total:     ${telemetry.reduce((s, t) => s + t.api_calls, 0)}`);
  console.log(`    Mean/run:  ${mean(valid.map(t => t.api_calls)).toFixed(1)}`);
  console.log(`    Min/Max:   ${Math.min(...valid.map(t => t.api_calls))} / ${Math.max(...valid.map(t => t.api_calls))}`);

  console.log(`\n  DUEL PRE-FILTER (P2-03a):`);
  const skipCount = valid.filter(t => t.duel_prefilter_skip).length;
  console.log(`    Skips:     ${skipCount}/${valid.length} (${((skipCount / valid.length) * 100).toFixed(0)}%)`);

  console.log(`\n  PROSE CACHE (P2-03c):`);
  const totalCacheHits = valid.reduce((s, t) => s + t.prose_cache_v1_hits + t.prose_cache_v3_hits, 0);
  console.log(`    Total hits: ${totalCacheHits}`);

  console.log(`\n  SCORES:`);
  console.log(`    Composite: mean=${mean(valid.map(t => t.composite)).toFixed(1)} [${valid.map(t => t.composite.toFixed(1)).join(', ')}]`);
  console.log(`    Min axis:  mean=${mean(valid.map(t => t.min_axis)).toFixed(1)}`);
  console.log(`    ECC:       mean=${mean(valid.map(t => t.ecc)).toFixed(1)}`);
  console.log(`    RCI:       mean=${mean(valid.map(t => t.rci)).toFixed(1)}`);
  console.log(`    SII:       mean=${mean(valid.map(t => t.sii)).toFixed(1)}`);
  console.log(`    IFI:       mean=${mean(valid.map(t => t.ifi)).toFixed(1)}`);
  console.log(`    AAI:       mean=${mean(valid.map(t => t.aai)).toFixed(1)}`);

  console.log(`\n  COST MODEL VALIDATION:`);
  const meanCalls = mean(valid.map(t => t.api_calls));
  const costModelTarget = 8; // From COST_MODEL_P2.json weighted estimate
  const costModelOk = meanCalls <= costModelTarget * 1.5; // 50% tolerance
  console.log(`    Target:    ≤ ${costModelTarget} calls/run (COST_MODEL weighted)`);
  console.log(`    Actual:    ${meanCalls.toFixed(1)} calls/run`);
  console.log(`    Verdict:   ${costModelOk ? 'PASS ✓' : 'FAIL ✗'}`);

  console.log(`\n  COMPLIANCE (Bridge-04):`);
  const downgrades = valid.filter(t => t.compliance_downgrade_signals > 0).length;
  console.log(`    Downgrade signals: ${downgrades}/${valid.length} scenes`);

  // ── Save results ──────────────────────────────────────────────────────

  const sessDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultPath = resolve(sessDir, `p2-validation-bench-${ts}.json`);
  const prosePath = resolve(sessDir, `p2-validation-bench-prose-${ts}.json`);

  writeFileSync(resultPath, JSON.stringify({
    version: '1.0.0',
    date: new Date().toISOString(),
    model: MODEL,
    scenes: SCENES.length,
    valid: valid.length,
    config: {
      v5_default: true,
      p2_03_prefilter: true,
      p2_03_v1_skip: true,
      p2_03_cache: true,
      bridge_04_compliance: true,
    },
    telemetry,
    summary: {
      total_api_calls: telemetry.reduce((s, t) => s + t.api_calls, 0),
      mean_api_calls: meanCalls,
      duel_skip_rate: skipCount / valid.length,
      total_cache_hits: totalCacheHits,
      mean_composite: mean(valid.map(t => t.composite)),
      mean_min_axis: mean(valid.map(t => t.min_axis)),
      cost_model_target: costModelTarget,
      cost_model_verdict: costModelOk ? 'PASS' : 'FAIL',
    },
  }, null, 2), 'utf-8');

  writeFileSync(prosePath, JSON.stringify(proseResults, null, 2), 'utf-8');

  console.log(`\n[P2-BENCH] Results: ${resultPath}`);
  console.log(`[P2-BENCH] Prose:   ${prosePath}`);
  console.log(`[P2-BENCH] ═══════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('[P2-BENCH] FATAL:', err.message);
  process.exit(1);
});
