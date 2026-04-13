/**
 * OMEGA — Bench P5 Quick (2 scènes)
 * Validation: necessity multi-shot + rhythm recalibration
 *
 * Scènes: contemplation (worst-case P4) + confrontation (best-case P4)
 * Capture: necessity telemetry (shots, median, stdev, spread)
 */

process.env.OMEGA_CHUNKED_V4 ??= '1';
process.env.OMEGA_PROMPT_V4 ??= '1';
process.env.OMEGA_PROMPT_V5 ??= '1';
process.env.OMEGA_DISPATCHER_LANG_V33 ??= '1';
process.env.OMEGA_R6_GATE ??= 'shadow';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { getLastNecessityTelemetry, type NecessityTelemetry } from '../src/oracle/axes/necessity.js';
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
  { id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude',
    dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'Thé dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'] },
  { id: 'confrontation', conflict: 'societal', goal: 'Deux associés règlent leurs comptes', story: 'Trahison',
    dq1: 'anticipation', dq3: 'anger', dq4: 'disgust',
    beats: [{id:'b1',action:'Entre sans frapper',sensory:['sound']},{id:'b2',action:'Mots tranchants',sensory:['sound']},{id:'b3',action:'Dossier jeté',sensory:['touch']},{id:'b4',action:'Sort sans un mot',sensory:['sight']}],
    sig: ['acier','verre','silence','mâchoire'], motifs: ['bureau','lumière'] },
];

function buildPacket(scene: typeof SCENES[0]): ForgePacket {
  const ts = Date.now();
  return {
    packet_id: `BENCH_P5_${scene.id}`, packet_hash: 'a'.repeat(64),
    scene_id: `bench_p5_${scene.id}`, run_id: `bench_p5_${scene.id}_${ts}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: scene.story, scene_goal: scene.goal, conflict_type: scene.conflict, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dq1), valence: -0.1, arousal: 0.3, dominant: scene.dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dq3, narrative_instruction: 'Montée' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dq3), valence: -0.4, arousal: 0.6, dominant: scene.dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, narrative_instruction: 'Résolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dq4, reader_state: 'Résolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: scene.dq3, after_dominant: scene.dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: scene.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' : 'progression', emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [{ category: 'sight', min_count: 2, signature_words: [] },{ category: 'sound', min_count: 2, signature_words: [] },{ category: 'touch', min_count: 1, signature_words: [] },{ category: 'smell', min_count: 1, signature_words: [] },{ category: 'taste', min_count: 0, signature_words: [] },{ category: 'proprioception', min_count: 0, signature_words: [] },{ category: 'interoception', min_count: 1, signature_words: [] }], recurrent_motifs: scene.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: scene.sig, forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 35, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] }, imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] } },
    kill_lists: { banned_words: ['soudain'], banned_cliches: ['coeur de pierre'], banned_ai_patterns: ['il ne pouvait s\'empêcher'], banned_filter_words: ['effectivement'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bench_p5_${scene.id}_${ts}`, determinism_level: 'absolute' },
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
  console.log('=== OMEGA — BENCH P5 QUICK (2 scènes) ===');
  console.log(`Flags: V4=${process.env.OMEGA_PROMPT_V4} V5=${process.env.OMEGA_PROMPT_V5} CHUNKED=${process.env.OMEGA_CHUNKED_V4} DISP=${process.env.OMEGA_DISPATCHER_LANG_V33} R6=${process.env.OMEGA_R6_GATE}`);
  console.log(`Changes: P5A=necessity-multishot(3), P5C=rhythm-recal(CV0.60,range12,breath10)`);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey,
    model: 'claude-sonnet-4-20250514',
    judgeStable: false,
    draftTemperature: 0.75,
    judgeTemperature: 0.0,
    judgeTopP: 1.0,
    judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `BENCH_P5_${new Date().toISOString().slice(0,10)}_${Date.now()}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const results: Array<Record<string, unknown>> = [];
  const necessityTelemetry: Array<{ scene: string; duel_candidate: number; telemetry: NecessityTelemetry | null }> = [];

  for (const scene of SCENES) {
    console.log(`\n━━━ [${scene.id}] generating... ━━━`);
    const t0 = Date.now();
    try {
      const packet = buildPacket(scene);
      const result: SovereignForgeResult = await runSovereignForgeWithPacket(packet, provider);
      const prose = result.final_prose;
      const ms = result.macro_score;
      const cliff = computeCliff(prose);
      const words = prose.split(/\s+/).filter((w: string) => w.length > 0).length;
      const duration = Date.now() - t0;

      // Capture necessity telemetry from last call
      const necTelemetry = getLastNecessityTelemetry();
      necessityTelemetry.push({ scene: scene.id, duel_candidate: -1, telemetry: necTelemetry });

      // Extract all V3 axes for detailed analysis
      const v3axes: Record<string, number> = {};
      if (ms && typeof ms === 'object' && 'macro_axes' in ms) {
        const ma = (ms as any).macro_axes;
        for (const [key, val] of Object.entries(ma ?? {})) {
          if (val && typeof val === 'object' && 'score' in (val as any)) {
            v3axes[key] = (val as any).score;
          }
        }
      }

      const entry = {
        scene: scene.id,
        conflict: scene.conflict,
        words,
        composite: ms?.composite ?? 0,
        min_axis: ms?.min_axis ?? 0,
        verdict: result.verdict,
        duration_ms: duration,
        v3_axes: v3axes,
        necessity_telemetry: necTelemetry,
        cliff_score: cliff,
      };
      results.push(entry);

      console.log(`\n  ✓ RESULT: comp=${entry.composite} min=${entry.min_axis} cliff=${cliff.toFixed(4)} words=${words} verdict=${result.verdict} (${(duration/1000).toFixed(1)}s)`);
      console.log(`  V3 axes: ${JSON.stringify(v3axes)}`);
      if (necTelemetry) {
        console.log(`  Necessity telemetry: shots=[${necTelemetry.shots.join(', ')}] median=${necTelemetry.median} stdev=${necTelemetry.stdev.toFixed(1)} spread=${necTelemetry.spread}`);
      }

      // Save prose
      fs.writeFileSync(path.join(sessionDir, `${scene.id}.txt`), prose);

      // Save duel matrix
      if (result.duel_matrix && result.duel_matrix.length > 0) {
        const matrixEntry = { scene: scene.id, candidates: result.duel_matrix };
        const matrixPath = path.join(sessionDir, 'DUEL_MATRIX.json');
        let existingMatrix: Array<Record<string, unknown>> = [];
        try { existingMatrix = JSON.parse(fs.readFileSync(matrixPath, 'utf-8')); } catch { /* first */ }
        existingMatrix.push(matrixEntry);
        fs.writeFileSync(matrixPath, JSON.stringify(existingMatrix, null, 2));
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`  ✗ ERROR: ${msg.slice(0, 300)}`);
      results.push({ scene: scene.id, error: msg.slice(0, 500), duration_ms: Date.now() - t0 });
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  // Summary
  console.log('\n\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               BENCH P5 QUICK — RESULTS SUMMARY                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('| Scene         | Comp  | Min   | Cliff | Words | Verdict | Time  |');
  console.log('|---------------|-------|-------|-------|-------|---------|-------|');
  for (const r of results) {
    if (r.error) {
      console.log(`| ${String(r.scene).padEnd(13)} | ERROR |       |       |       |         |       |`);
      continue;
    }
    console.log(
      `| ${String(r.scene).padEnd(13)} ` +
      `| ${Number(r.composite).toFixed(1).padStart(5)} ` +
      `| ${Number(r.min_axis).toFixed(1).padStart(5)} ` +
      `| ${Number(r.cliff_score).toFixed(3).padStart(5)} ` +
      `| ${String(r.words).padStart(5)} ` +
      `| ${String(r.verdict).padStart(7)} ` +
      `| ${(Number(r.duration_ms)/1000).toFixed(0).padStart(4)}s |`
    );
  }

  const ok = results.filter(r => !r.error);
  if (ok.length > 0) {
    const avgComp = ok.reduce((s, r) => s + Number(r.composite), 0) / ok.length;
    const avgMin = ok.reduce((s, r) => s + Number(r.min_axis), 0) / ok.length;
    console.log(`\nMoyenne: comp=${avgComp.toFixed(1)} min_axis=${avgMin.toFixed(1)} (${ok.length}/${results.length} OK)`);
  }

  // Necessity telemetry summary
  console.log('\n── NECESSITY TELEMETRY ──');
  for (const nt of necessityTelemetry) {
    if (nt.telemetry) {
      console.log(`  ${nt.scene}: shots=[${nt.telemetry.shots.join(', ')}] median=${nt.telemetry.median} mean=${nt.telemetry.mean.toFixed(1)} stdev=${nt.telemetry.stdev.toFixed(1)} spread=${nt.telemetry.spread}`);
    }
  }

  // Save all results
  const fullResults = { bench: 'P5_QUICK', timestamp: new Date().toISOString(), scenes: results, necessity_telemetry: necessityTelemetry };
  fs.writeFileSync(path.join(sessionDir, 'BENCH_P5_RESULTS.json'), JSON.stringify(fullResults, null, 2));
  console.log(`\nSaved: ${sessionDir}/BENCH_P5_RESULTS.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
