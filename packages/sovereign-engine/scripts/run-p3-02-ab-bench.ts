/**
 * run-p3-02-ab-bench.ts — A/B Bench P3-02 Shared Emotion Analysis
 * ═══════════════════════════════════════════════════════════════════════
 *
 * PROTOCOL (corrected from P3-01c):
 *
 *   1. PAIRED SCORING — Same prose scored both ways. Zero generation variance.
 *      Uses 10 prose samples from P3-01c bench (5 scenes × 2 arms).
 *
 *   2. REAL TELEMETRY — No estimation, no back-calculation.
 *      The counting proxy records every actual API method call.
 *      generateStructuredJSON delta IS the signal.
 *
 *   3. ISOLATION — Only OMEGA_SHARED_EMOTION toggles between arms.
 *      P3-01 (CALC pre-scorer) OFF in both arms.
 *      P3-04 (parallel axes) ON in both arms.
 *      Prose cache DISABLED (would mask second scoring).
 *
 *   4. N=10 — 10 different prose samples, each scored twice.
 *
 * Arms:
 *   Arm A: OMEGA_SHARED_EMOTION=0 (disabled — original per-axis LLM calls)
 *   Arm B: OMEGA_SHARED_EMOTION=1 (enabled — single-pass paragraph analysis)
 *
 * Expected gain (structural):
 *   P3-02 eliminates 4 generateStructuredJSON calls per V3 scoring
 *   (the 4 quartile-level analyzeEmotionSemantic calls in tension_14d).
 *   On N=10 prose: delta should be exactly -4 per prose (±0).
 *
 * Budget: 10 proses × 2 arms × ~30 calls = ~600 API calls (~$12)
 *
 * Usage (PowerShell):
 *   $env:ANTHROPIC_API_KEY = "sk-ant-..."
 *   npx tsx scripts/run-p3-02-ab-bench.ts
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Date: 2026-04-04 (P3-02 validation)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { judgeAestheticV3, resetProseCache } from '../src/oracle/aesthetic-oracle.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Configuration ─────────────────────────────────────────────────────────

const MODEL = 'claude-sonnet-4-20250514';
const JUDGE_TEMPERATURE = 0.0;

// Path to P3-01c prose results (10 proses from previous bench)
const PROSE_SOURCE = resolve(__dirname, '..', 'sessions', 'p3-01c-ab-bench-prose-2026-04-04T17-00-11.json');

// ── LLM Call Counter (real, not estimated) ────────────────────────────────

interface CallRecord {
  method: string;
  timestamp: number;
}

let callLog: CallRecord[] = [];

function resetCallCounter(): void {
  callLog = [];
}

function getCallCount(): number {
  return callLog.length;
}

function getCallBreakdown(): Record<string, number> {
  const breakdown: Record<string, number> = {};
  for (const call of callLog) {
    breakdown[call.method] = (breakdown[call.method] ?? 0) + 1;
  }
  return breakdown;
}

function createCountingProvider(baseProvider: ReturnType<typeof createAnthropicProvider>) {
  const apiMethods = new Set([
    'generateDraft', 'rewriteSentence', 'scoreInteriority',
    'scoreSensoryDensity', 'scoreNecessity', 'scoreImpact',
    'generateStructuredJSON', 'applyPatch',
  ]);

  const handler: ProxyHandler<typeof baseProvider> = {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value === 'function') {
        return function (this: unknown, ...args: unknown[]) {
          if (apiMethods.has(prop as string)) {
            callLog.push({
              method: prop as string,
              timestamp: Date.now(),
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

// ── 14D emotion helper (same as P3-01c bench) ────────────────────────────

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy', 'trust', 'fear', 'surprise', 'sadness', 'disgust', 'anger',
    'anticipation', 'love', 'submission', 'awe', 'disapproval', 'remorse', 'contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
}

// ── Scene definitions (same as P3-01c — needed for ForgePacket) ───────────

const SCENE_DEFS = [
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude',
    dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{ id: 'b1', action: 'The dans la cuisine', sensory: ['touch', 'sound'] }, { id: 'b2', action: 'Regarde la mer', sensory: ['sight'] }, { id: 'b3', action: 'Souvenir', sensory: ['smell'] }, { id: 'b4', action: 'Nuit tombe', sensory: ['sight'] }],
    sig: ['silence', 'ombre', 'vent', 'sel'], motifs: ['mer', 'vent'] },

  { id: 'menace', conflict: 'external', goal: 'Femme en foret, danger', story: 'Peur',
    dq1: 'anticipation', dq3: 'fear', dq4: 'fear',
    beats: [{ id: 'b1', action: 'Marche crepuscule', sensory: ['sight', 'sound'] }, { id: 'b2', action: 'Branche cassee', sensory: ['sound'] }, { id: 'b3', action: 'Accelere', sensory: ['touch'] }, { id: 'b4', action: 'Lisiere', sensory: ['sight'] }],
    sig: ['ombre', 'branche', 'souffle', 'nuit'], motifs: ['foret', 'crepuscule'] },

  { id: 'confrontation', conflict: 'societal', goal: 'Deux associes reglent leurs comptes', story: 'Trahison',
    dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{ id: 'b1', action: 'Entre sans frapper', sensory: ['sound'] }, { id: 'b2', action: 'Mots tranchants', sensory: ['sound'] }, { id: 'b3', action: 'Dossier jete', sensory: ['touch'] }, { id: 'b4', action: 'Sort sans un mot', sensory: ['sight'] }],
    sig: ['acier', 'verre', 'silence', 'machoire'], motifs: ['bureau', 'lumiere'] },

  { id: 'passion', conflict: 'internal', goal: 'Pianiste joue son dernier concert', story: 'Art et sacrifice',
    dq1: 'anticipation', dq3: 'joy', dq4: 'awe',
    beats: [{ id: 'b1', action: 'Entre en scene', sensory: ['sight', 'sound'] }, { id: 'b2', action: 'Premieres notes', sensory: ['sound', 'touch'] }, { id: 'b3', action: 'La salle disparait', sensory: ['sound'] }, { id: 'b4', action: 'Derniere note silence', sensory: ['sound', 'sight'] }],
    sig: ['touche', 'bois', 'salle', 'silence'], motifs: ['piano', 'scene'] },

  { id: 'deuil', conflict: 'internal', goal: 'Homme devant la tombe de son pere', story: 'Deuil',
    dq1: 'sadness', dq3: 'remorse', dq4: 'sadness',
    beats: [{ id: 'b1', action: 'Arrive au cimetiere', sensory: ['sight', 'touch'] }, { id: 'b2', action: 'Pose la main sur la pierre', sensory: ['touch'] }, { id: 'b3', action: 'Souvenir d enfance', sensory: ['smell', 'sound'] }, { id: 'b4', action: 'S eloigne sous la pluie', sensory: ['touch', 'sight'] }],
    sig: ['pierre', 'pluie', 'terre', 'silence'], motifs: ['cimetiere', 'pluie'] },
];

// ── Build ForgePacket for scoring (no generation) ────────────────────────

function buildPacket(sceneId: string): ForgePacket {
  const scene = SCENE_DEFS.find(s => s.id === sceneId);
  if (!scene) throw new Error(`Unknown scene: ${sceneId}`);

  return {
    packet_id: `BENCH_P302_${sceneId}`,
    packet_hash: 'a'.repeat(64),
    scene_id: `bench_p302_${sceneId}`,
    run_id: `bench_p302_${sceneId}_${Date.now()}`,
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
      subtext_type: i === 2 ? 'pivot' as const : 'progression' as const,
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
    seeds: { llm_seed: `bench_p302_${sceneId}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.1.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function fmt(n: number): string { return n.toFixed(1).padStart(6); }

// ── Per-scoring telemetry ────────────────────────────────────────────────

interface ScoringTelemetry {
  arm: 'A_OFF' | 'B_ON';
  prose_index: number;
  scene_id: string;
  original_arm: string;
  paragraph_count: number;
  word_count: number;
  api_calls: number;
  api_call_breakdown: Record<string, number>;
  generateStructuredJSON_count: number;
  composite: number;
  min_axis: number;
  ecc: number;
  rci: number;
  sii: number;
  ifi: number;
  aai: number;
  duration_ms: number;
}

// ── Main ────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ANTHROPIC_API_KEY not set'); process.exit(1); }

  // ── Load prose samples ──────────────────────────────────────────────────
  let proseData: Array<{ arm: string; scene_id: string; prose: string }>;
  try {
    proseData = JSON.parse(readFileSync(PROSE_SOURCE, 'utf-8'));
  } catch (err: any) {
    console.error(`[P3-BENCH] Cannot read prose source: ${PROSE_SOURCE}`);
    console.error(`[P3-BENCH] Error: ${err.message}`);
    console.error(`[P3-BENCH] Run P3-01c bench first to generate prose samples.`);
    process.exit(1);
  }

  if (proseData.length < 10) {
    console.error(`[P3-BENCH] Expected 10 prose samples, got ${proseData.length}`);
    process.exit(1);
  }

  // ── Create provider ─────────────────────────────────────────────────────
  const baseProvider = createAnthropicProvider({
    apiKey,
    model: MODEL,
    judgeStable: false,
    draftTemperature: 0.0, // Not used (no generation), but required
    judgeTemperature: JUDGE_TEMPERATURE,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  const provider = createCountingProvider(baseProvider);

  // ── Fixed toggles ─────────────────────────────────────────────────────
  // P3-01 pre-scorer: OFF (not relevant, no duel)
  delete process.env.OMEGA_CALC_PRESCORER;
  // P3-04 parallel: ON (latency, no call change)
  delete process.env.OMEGA_PARALLEL_AXES;
  // Prose cache: DISABLED (same scene_id would cause cache hit on 2nd scoring)
  process.env.OMEGA_PROSE_CACHE = '0';

  const telemetry: ScoringTelemetry[] = [];

  console.log(`\n[P3-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P3-BENCH]  OMEGA P3-02 A/B BENCH — SHARED EMOTION ANALYSIS`);
  console.log(`[P3-BENCH]  ${proseData.length} proses × 2 arms = ${proseData.length * 2} scorings`);
  console.log(`[P3-BENCH]  Model: ${MODEL}`);
  console.log(`[P3-BENCH]  Arm A: SHARED_EMOTION OFF (original per-axis calls)`);
  console.log(`[P3-BENCH]  Arm B: SHARED_EMOTION ON  (single-pass paragraph analysis)`);
  console.log(`[P3-BENCH]  P3-01 (pre-scorer): OFF`);
  console.log(`[P3-BENCH]  Prose cache: DISABLED`);
  console.log(`[P3-BENCH]  Protocol: PAIRED (same prose scored both ways)`);
  console.log(`[P3-BENCH]  Budget estimé: ~600 API calls (~$12)`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════\n`);

  for (let i = 0; i < proseData.length; i++) {
    const sample = proseData[i];
    const packet = buildPacket(sample.scene_id);
    const paragraphs = sample.prose.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
    const wordCount = sample.prose.split(/\s+/).filter((w: string) => w.length > 0).length;

    console.log(`\n[P3-BENCH] ─── Prose ${i + 1}/${proseData.length}: ${sample.scene_id} (orig ${sample.arm}) | ${paragraphs.length} paragraphs, ${wordCount} words ───`);

    // ── ARM A: Shared-emotion OFF ──────────────────────────────────────
    process.env.OMEGA_SHARED_EMOTION = '0';
    resetCallCounter();
    resetProseCache();

    const startA = Date.now();
    const resultA = await judgeAestheticV3(packet, sample.prose, provider, null);
    const durationA = Date.now() - startA;
    const breakdownA = getCallBreakdown();
    const callsA = getCallCount();

    telemetry.push({
      arm: 'A_OFF',
      prose_index: i,
      scene_id: sample.scene_id,
      original_arm: sample.arm,
      paragraph_count: paragraphs.length,
      word_count: wordCount,
      api_calls: callsA,
      api_call_breakdown: breakdownA,
      generateStructuredJSON_count: breakdownA['generateStructuredJSON'] ?? 0,
      composite: resultA.composite,
      min_axis: resultA.min_axis,
      ecc: resultA.macro_axes.ecc.score,
      rci: resultA.macro_axes.rci.score,
      sii: resultA.macro_axes.sii.score,
      ifi: resultA.macro_axes.ifi.score,
      aai: resultA.macro_axes.aai.score,
      duration_ms: durationA,
    });

    console.log(`[P3-BENCH]   A_OFF: calls=${callsA} genJSON=${breakdownA['generateStructuredJSON'] ?? 0} composite=${resultA.composite.toFixed(1)} ECC=${resultA.macro_axes.ecc.score.toFixed(1)} (${durationA}ms)`);

    // Pause between arms (same prose, different toggle)
    await new Promise(r => setTimeout(r, 1000));

    // ── ARM B: Shared-emotion ON ───────────────────────────────────────
    delete process.env.OMEGA_SHARED_EMOTION; // defaults to enabled
    resetCallCounter();
    resetProseCache();

    const startB = Date.now();
    const resultB = await judgeAestheticV3(packet, sample.prose, provider, null);
    const durationB = Date.now() - startB;
    const breakdownB = getCallBreakdown();
    const callsB = getCallCount();

    telemetry.push({
      arm: 'B_ON',
      prose_index: i,
      scene_id: sample.scene_id,
      original_arm: sample.arm,
      paragraph_count: paragraphs.length,
      word_count: wordCount,
      api_calls: callsB,
      api_call_breakdown: breakdownB,
      generateStructuredJSON_count: breakdownB['generateStructuredJSON'] ?? 0,
      composite: resultB.composite,
      min_axis: resultB.min_axis,
      ecc: resultB.macro_axes.ecc.score,
      rci: resultB.macro_axes.rci.score,
      sii: resultB.macro_axes.sii.score,
      ifi: resultB.macro_axes.ifi.score,
      aai: resultB.macro_axes.aai.score,
      duration_ms: durationB,
    });

    const callDelta = callsB - callsA;
    const genJSONDelta = (breakdownB['generateStructuredJSON'] ?? 0) - (breakdownA['generateStructuredJSON'] ?? 0);
    const compDelta = resultB.composite - resultA.composite;
    const eccDelta = resultB.macro_axes.ecc.score - resultA.macro_axes.ecc.score;

    console.log(`[P3-BENCH]   B_ON:  calls=${callsB} genJSON=${breakdownB['generateStructuredJSON'] ?? 0} composite=${resultB.composite.toFixed(1)} ECC=${resultB.macro_axes.ecc.score.toFixed(1)} (${durationB}ms)`);
    console.log(`[P3-BENCH]   Δ:     calls=${callDelta >= 0 ? '+' : ''}${callDelta} genJSON=${genJSONDelta >= 0 ? '+' : ''}${genJSONDelta} composite=${compDelta >= 0 ? '+' : ''}${compDelta.toFixed(1)} ECC=${eccDelta >= 0 ? '+' : ''}${eccDelta.toFixed(1)}`);

    // Pause between proses
    await new Promise(r => setTimeout(r, 2000));
  }

  // ── Restore env ─────────────────────────────────────────────────────────
  delete process.env.OMEGA_PROSE_CACHE;
  delete process.env.OMEGA_SHARED_EMOTION;

  // ═══ A/B Comparison ═══════════════════════════════════════════════════

  const armA = telemetry.filter(t => t.arm === 'A_OFF');
  const armB = telemetry.filter(t => t.arm === 'B_ON');

  console.log(`\n[P3-BENCH] ═══════════════════════════════════════════════════════`);
  console.log(`[P3-BENCH]  A/B RESULTS — SHARED EMOTION ANALYSIS`);
  console.log(`[P3-BENCH]  Arm A (OFF): ${armA.length} scored | Arm B (ON): ${armB.length} scored`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════`);

  // Per-prose comparison table
  console.log(`\n  PAIRED COMPARISON (same prose, different scoring path):`);
  console.log(`  ${'#'.padStart(2)} ${'Scene'.padEnd(16)} ${'Paras'.padStart(5)} | ${'A calls'.padStart(7)} ${'B calls'.padStart(7)} ${'Δ'.padStart(4)} | ${'A genJSON'.padStart(9)} ${'B genJSON'.padStart(9)} ${'Δ'.padStart(4)} | ${'A comp'.padStart(7)} ${'B comp'.padStart(7)} ${'Δ'.padStart(6)} | ${'A ECC'.padStart(6)} ${'B ECC'.padStart(6)} ${'Δ'.padStart(6)}`);
  console.log(`  ${'-'.repeat(120)}`);

  const callDeltas: number[] = [];
  const genJSONDeltas: number[] = [];
  const compDeltas: number[] = [];
  const eccDeltas: number[] = [];

  for (let i = 0; i < proseData.length; i++) {
    const a = armA.find(t => t.prose_index === i);
    const b = armB.find(t => t.prose_index === i);
    if (!a || !b) continue;

    const callD = b.api_calls - a.api_calls;
    const genD = b.generateStructuredJSON_count - a.generateStructuredJSON_count;
    const compD = b.composite - a.composite;
    const eccD = b.ecc - a.ecc;

    callDeltas.push(callD);
    genJSONDeltas.push(genD);
    compDeltas.push(compD);
    eccDeltas.push(eccD);

    console.log(
      `  ${String(i + 1).padStart(2)} ${a.scene_id.padEnd(16)} ${String(a.paragraph_count).padStart(5)}` +
      ` | ${String(a.api_calls).padStart(7)} ${String(b.api_calls).padStart(7)} ${(callD >= 0 ? '+' : '') + callD}`.padEnd(24) +
      ` | ${String(a.generateStructuredJSON_count).padStart(9)} ${String(b.generateStructuredJSON_count).padStart(9)} ${(genD >= 0 ? '+' : '') + genD}`.padEnd(26) +
      ` | ${fmt(a.composite)} ${fmt(b.composite)} ${(compD >= 0 ? '+' : '') + compD.toFixed(1)}`.padEnd(24) +
      ` | ${fmt(a.ecc)} ${fmt(b.ecc)} ${(eccD >= 0 ? '+' : '') + eccD.toFixed(1)}`
    );
  }

  // Aggregates
  const mean = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const std = (arr: number[]) => {
    if (arr.length < 2) return 0;
    const m = mean(arr);
    return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
  };

  const meanCallDelta = mean(callDeltas);
  const stdCallDelta = std(callDeltas);
  const meanGenJSONDelta = mean(genJSONDeltas);
  const stdGenJSONDelta = std(genJSONDeltas);
  const meanCompDelta = mean(compDeltas);
  const meanECCDelta = mean(eccDeltas);

  const meanCallsA = mean(armA.map(t => t.api_calls));
  const meanCallsB = mean(armB.map(t => t.api_calls));
  const callSavingPct = meanCallsA > 0 ? ((meanCallsA - meanCallsB) / meanCallsA) * 100 : 0;

  console.log(`\n  AGGREGATES (N=${proseData.length}, paired):`);
  console.log(`    API Calls/scoring:  A=${meanCallsA.toFixed(1)}  B=${meanCallsB.toFixed(1)}  Δ=${meanCallDelta.toFixed(1)} ± ${stdCallDelta.toFixed(1)} (${callSavingPct.toFixed(1)}% saving)`);
  console.log(`    genStructJSON/scoring: Δ=${meanGenJSONDelta.toFixed(1)} ± ${stdGenJSONDelta.toFixed(1)} (expected: -4.0 ± 0.0)`);
  console.log(`    Composite:          Δ=${meanCompDelta >= 0 ? '+' : ''}${meanCompDelta.toFixed(2)} (paired — should be ~0)`);
  console.log(`    ECC:                Δ=${meanECCDelta >= 0 ? '+' : ''}${meanECCDelta.toFixed(2)} (paired — should be ~0)`);

  // Per-axis comparison
  console.log(`\n  AXIS COMPARISON (mean):`);
  for (const axis of ['ecc', 'rci', 'sii', 'ifi', 'aai'] as const) {
    const mA = mean(armA.map(t => t[axis]));
    const mB = mean(armB.map(t => t[axis]));
    const d = mB - mA;
    console.log(`    ${axis.toUpperCase().padEnd(4)}: A=${mA.toFixed(1)}  B=${mB.toFixed(1)}  Δ=${d >= 0 ? '+' : ''}${d.toFixed(2)}`);
  }

  // ── Consistency check ─────────────────────────────────────────────────
  // If shared-emotion is purely an optimization (no quality change),
  // RCI, SII, IFI, AAI should be IDENTICAL between arms (same prose, same path).
  // Only ECC can differ (different aggregation: per-quartile LLM vs averaged paragraphs).

  console.log(`\n  CONSISTENCY CHECK:`);
  const nonECCAxes = ['rci', 'sii', 'ifi', 'aai'] as const;
  let allConsistent = true;
  for (const axis of nonECCAxes) {
    const maxDelta = Math.max(...armA.map((a, i) => Math.abs(armB[i][axis] - a[axis])));
    const consistent = maxDelta < 0.01;
    if (!consistent) allConsistent = false;
    console.log(`    ${axis.toUpperCase().padEnd(4)}: max Δ=${maxDelta.toFixed(4)} ${consistent ? '✓ IDENTICAL' : '✗ DIVERGENT (UNEXPECTED)'}`);
  }

  // ECC should differ slightly (quartile aggregation vs per-quartile LLM)
  const eccMaxDelta = Math.max(...armA.map((a, i) => Math.abs(armB[i].ecc - a.ecc)));
  console.log(`    ECC:  max Δ=${eccMaxDelta.toFixed(2)} (expected: small difference from aggregation method)`);

  // ── Verdict ─────────────────────────────────────────────────────────────

  // Quality guard: ECC delta should be within ±3.0 (aggregation tolerance)
  const qualityOk = Math.abs(meanECCDelta) < 3.0;
  // Cost guard: genStructJSON should decrease by ~4 per scoring
  const costOk = meanGenJSONDelta <= -3.0; // Allow some tolerance
  // Structural guard: the delta should be consistent (low std)
  const structuralOk = stdGenJSONDelta < 1.0;
  // Consistency guard: non-ECC axes unchanged
  const consistencyOk = allConsistent;

  console.log(`\n  VERDICT:`);
  console.log(`    Quality guard (|ECC Δ| < 3.0):      ${qualityOk ? 'PASS ✓' : 'FAIL ✗'} (${meanECCDelta >= 0 ? '+' : ''}${meanECCDelta.toFixed(2)})`);
  console.log(`    Cost guard (genJSON Δ ≤ -3):         ${costOk ? 'PASS ✓' : 'FAIL ✗'} (${meanGenJSONDelta.toFixed(1)})`);
  console.log(`    Structural guard (σ genJSON < 1):    ${structuralOk ? 'PASS ✓' : 'FAIL ✗'} (σ=${stdGenJSONDelta.toFixed(2)})`);
  console.log(`    Consistency guard (non-ECC stable):  ${consistencyOk ? 'PASS ✓' : 'FAIL ✗'}`);
  console.log(`    OVERALL:                             ${qualityOk && costOk && structuralOk && consistencyOk ? 'GO ✓' : 'NO-GO ✗'}`);

  // ── Extrapolation to full pipeline ────────────────────────────────────
  const callsSavedPerScoring = -meanCallDelta;
  const estimatedV3Candidates = 4; // Typical: loop_refined + 3 modes
  const estimatedSavingPerRun = callsSavedPerScoring * estimatedV3Candidates;
  const baselineCalls = 91.8; // From P3-01c bench
  const estimatedPctSaving = (estimatedSavingPerRun / baselineCalls) * 100;

  console.log(`\n  EXTRAPOLATION TO FULL PIPELINE:`);
  console.log(`    Calls saved per V3 scoring:  ${callsSavedPerScoring.toFixed(1)}`);
  console.log(`    V3 candidates per run:       ~${estimatedV3Candidates}`);
  console.log(`    Estimated saving per run:    ~${estimatedSavingPerRun.toFixed(0)} calls`);
  console.log(`    On baseline ${baselineCalls}:          ~${estimatedPctSaving.toFixed(1)}% reduction`);
  console.log(`    ⚠ This is an ESTIMATE. Full-pipeline bench needed for confirmation.`);

  // ── Save results ──────────────────────────────────────────────────────

  const sessDir = resolve(__dirname, '..', 'sessions');
  mkdirSync(sessDir, { recursive: true });

  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const resultPath = resolve(sessDir, `p3-02-ab-bench-${ts}.json`);

  writeFileSync(resultPath, JSON.stringify({
    version: '1.0.0',
    date: new Date().toISOString(),
    model: MODEL,
    protocol: 'paired_scoring',
    prose_source: 'p3-01c-ab-bench-prose-2026-04-04T17-00-11.json',
    proses: proseData.length,
    arms: { A_OFF: armA.length, B_ON: armB.length },
    telemetry,
    summary: {
      arm_a: {
        mean_api_calls: meanCallsA,
        mean_genStructJSON: mean(armA.map(t => t.generateStructuredJSON_count)),
        mean_composite: mean(armA.map(t => t.composite)),
        mean_ecc: mean(armA.map(t => t.ecc)),
      },
      arm_b: {
        mean_api_calls: meanCallsB,
        mean_genStructJSON: mean(armB.map(t => t.generateStructuredJSON_count)),
        mean_composite: mean(armB.map(t => t.composite)),
        mean_ecc: mean(armB.map(t => t.ecc)),
      },
      delta: {
        api_calls: { mean: meanCallDelta, std: stdCallDelta },
        genStructJSON: { mean: meanGenJSONDelta, std: stdGenJSONDelta, expected: -4.0 },
        composite: { mean: meanCompDelta },
        ecc: { mean: meanECCDelta },
        call_saving_pct: callSavingPct,
      },
      extrapolation: {
        calls_saved_per_scoring: callsSavedPerScoring,
        v3_candidates_per_run: estimatedV3Candidates,
        estimated_saving_per_run: estimatedSavingPerRun,
        baseline_calls: baselineCalls,
        estimated_pct_saving: estimatedPctSaving,
      },
      verdict: {
        quality_ok: qualityOk,
        cost_ok: costOk,
        structural_ok: structuralOk,
        consistency_ok: consistencyOk,
        overall: qualityOk && costOk && structuralOk && consistencyOk ? 'GO' : 'NO-GO',
      },
    },
  }, null, 2), 'utf-8');

  console.log(`\n[P3-BENCH] Results: ${resultPath}`);
  console.log(`[P3-BENCH] ═══════════════════════════════════════════════════════\n`);
}

main().catch(err => {
  console.error('[P3-BENCH] FATAL:', err.message);
  process.exit(1);
});
