/**
 * OMEGA — BLOC 6 : Validation architecture hybride
 * 4 runs contemplation via hybrid provider (Ollama draft + Claude judge)
 * Critère : 4/4 OK, composite moyen >= 87
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket } from '../src/engine.js';
import { createHybridProvider, getHybridStats } from '../src/runtime/hybrid-provider.js';
import { resetArcBuffer } from '../src/scoring/dual-scale.js';
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

function buildPacket(runIdx: number): ForgePacket {
  const scene = {
    id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer',
    story: 'Solitude', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
    beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
    sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'],
  };
  return {
    packet_id: `HYBRID_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `hybrid_${scene.id}`, run_id: `hybrid_${scene.id}_${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `hybrid_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

async function main() {
  console.log('=== OMEGA BLOC 6 — HYBRID VALIDATION (4 runs) ===');
  console.log('Draft: Ollama qwen3.5:35b-a3b (0€) | Judge: Claude Sonnet\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createHybridProvider({
    claudeApiKey: apiKey,
    ollamaModel: 'qwen3.5:35b-a3b',
  });

  const sessionDir = path.join('sessions', 'BLOC6_HYBRID_VALIDATION');
  fs.mkdirSync(sessionDir, { recursive: true });

  resetArcBuffer();
  const RUNS = 4;
  const results: any[] = [];

  for (let run = 0; run < RUNS; run++) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`[HYBRID] run ${run + 1}/${RUNS}`);
    console.log('─'.repeat(60));
    const startMs = Date.now();

    try {
      const packet = buildPacket(run);
      const result = await runSovereignForgeWithPacket(packet, provider);
      const durationMs = Date.now() - startMs;
      const composite = result.macro_score?.composite ?? 0;
      const minAxis = result.macro_score?.min_axis ?? 0;
      const verdict = result.macro_score?.verdict ?? 'UNKNOWN';
      const words = result.final_prose.split(/\s+/).filter(w => w.length > 0).length;

      const stats = getHybridStats();
      results.push({
        run, composite, min_axis: minAxis, verdict, words,
        duration_s: Math.round(durationMs / 1000),
        ollama_calls: stats.ollamaDrafts,
        claude_calls: stats.claudeJudges,
      });

      console.log(`\n[HYBRID] RESULT: comp=${composite.toFixed(1)} min=${minAxis.toFixed(1)} verdict=${verdict} ${words}w ${(durationMs/1000).toFixed(0)}s`);
      console.log(`[HYBRID] Stats: ollama_drafts=${stats.ollamaDrafts} claude_judges=${stats.claudeJudges}`);
    } catch (e: any) {
      console.error(`[HYBRID] ERROR: ${e.message?.slice(0, 200)}`);
      results.push({ run, error: e.message?.slice(0, 200) });
    }
  }

  // Save results
  fs.writeFileSync(path.join(sessionDir, 'hybrid_results.json'), JSON.stringify(results, null, 2));

  // Analysis
  const ok = results.filter(r => !r.error);
  const n = ok.length;
  const composites = ok.map(r => r.composite);
  const meanComp = composites.length ? composites.reduce((a: number, b: number) => a + b, 0) / n : 0;

  const stats = getHybridStats();

  console.log(`\n${'='.repeat(60)}`);
  console.log('BLOC 6 — VALIDATION REPORT');
  console.log('='.repeat(60));
  console.log(`\nRuns: ${n}/${RUNS} OK`);
  console.log(`Composite mean: ${meanComp.toFixed(2)}`);
  console.log(`Composite range: [${Math.min(...composites).toFixed(1)}, ${Math.max(...composites).toFixed(1)}]`);
  console.log(`\nAPI calls:`);
  console.log(`  Ollama drafts: ${stats.ollamaDrafts} (0€)`);
  console.log(`  Claude judges: ${stats.claudeJudges} (~$${(stats.claudeJudges * 0.003).toFixed(3)})`);
  console.log(`  Total cost: ~$${(stats.claudeJudges * 0.003).toFixed(3)} for ${n} runs`);
  console.log(`  Cost per run: ~$${(stats.claudeJudges * 0.003 / Math.max(n, 1)).toFixed(4)}`);

  const pass = n >= 4 && meanComp >= 87;
  console.log(`\nVALIDATION: ${pass ? 'PASS' : 'FAIL'}`);
  console.log(`  Criterion 1: ${n}/4 runs complete → ${n >= 4 ? 'OK' : 'FAIL'}`);
  console.log(`  Criterion 2: composite mean ${meanComp.toFixed(2)} >= 87 → ${meanComp >= 87 ? 'OK' : 'FAIL'}`);
  console.log(`\n${'='.repeat(60)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
