/**
 * OMEGA — BLOC 3 SHADOW COLLECT : 8 runs contemplation
 * Valide cliff_quality (>=0.50) + branching_signal (EN_MAX - FR)
 * SHADOW MODE (D1) : informatif uniquement, 0 changement verdict
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import { computeLanguageProfile } from '../src/scoring/language-profiles.js';
import { computeDualScale, resetArcBuffer } from '../src/scoring/dual-scale.js';
import { computeTextFeatures } from '../src/scoring/text-features.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ HELPERS ═══

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of ['joy','trust','fear','surprise','sadness','disgust','anger',
    'anticipation','love','submission','awe','disapproval','remorse','contempt']) {
    d[k] = k === emotion ? weight : r;
  }
  return d;
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

function pearsonR(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 3) return 0;
  const mx = x.reduce((a, b) => a + b, 0) / n;
  const my = y.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
  }
  const denom = Math.sqrt(dx2 * dy2);
  return denom === 0 ? 0 : Math.round((num / denom) * 1000) / 1000;
}

// ═══ SCENE ═══

const SCENE = {
  id: 'contemplation', conflict: 'internal', goal: 'Femme seule au bord de la mer', story: 'Solitude', dq1: 'anticipation', dq3: 'sadness', dq4: 'sadness',
  beats: [{id:'b1',action:'The dans la cuisine',sensory:['touch','sound']},{id:'b2',action:'Regarde la mer',sensory:['sight']},{id:'b3',action:'Souvenir',sensory:['smell']},{id:'b4',action:'Nuit tombe',sensory:['sight']}],
  sig: ['silence','ombre','vent','sel'], motifs: ['mer','vent'],
};

function buildPacket(runIdx: number): ForgePacket {
  return {
    packet_id: `BLOC3_${SCENE.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `bloc3_${SCENE.id}`, run_id: `bloc3_${SCENE.id}_${runIdx}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: SCENE.story, scene_goal: SCENE.goal, conflict_type: SCENE.conflict, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(SCENE.dq1), valence: -0.1, arousal: 0.3, dominant: SCENE.dq1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(SCENE.dq3, 0.35), valence: -0.2, arousal: 0.4, dominant: SCENE.dq3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(SCENE.dq3), valence: -0.4, arousal: 0.6, dominant: SCENE.dq3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(SCENE.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: SCENE.dq4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(SCENE.dq4, 0.40), valence: -0.2, arousal: 0.3, dominant: SCENE.dq4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: SCENE.dq3, after_dominant: SCENE.dq4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: SCENE.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' : 'progression', emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: { density_target: 3, categories: [{ category: 'sight', min_count: 2, signature_words: [] },{ category: 'sound', min_count: 2, signature_words: [] },{ category: 'touch', min_count: 1, signature_words: [] },{ category: 'smell', min_count: 1, signature_words: [] },{ category: 'taste', min_count: 0, signature_words: [] },{ category: 'proprioception', min_count: 0, signature_words: [] },{ category: 'interoception', min_count: 1, signature_words: [] }], recurrent_motifs: SCENE.motifs, banned_metaphors: [] },
    style_genome: { version: '1.0.0', universe: 'literary_fiction', lexicon: { signature_words: SCENE.sig, forbidden_words: ['soudainement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 }, rhythm: { avg_sentence_length_target: 35, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 }, tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] as readonly [number, number] }, imagery: { recurrent_motifs: SCENE.motifs, density_target_per_100_words: 3, banned_metaphors: [] } },
    kill_lists: { banned_words: ['soudain'], banned_cliches: ['coeur de pierre'], banned_ai_patterns: ['il ne pouvait s\'empecher'], banned_filter_words: ['effectivement'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `bloc3_${SCENE.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('=== OMEGA BLOC 3 — SHADOW COLLECT (8 runs contemplation) ===\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });

  const sessionDir = path.join('sessions', 'SHADOW_BLOC3_COLLECT');
  fs.mkdirSync(sessionDir, { recursive: true });

  resetArcBuffer();
  const RUNS = 8;
  const allData: any[] = [];

  for (let run = 0; run < RUNS; run++) {
    console.log(`  [contemplation] run ${run + 1}/${RUNS}...`);
    try {
      const packet = buildPacket(run);
      const result = await runSovereignForgeWithPacket(packet, provider);
      const prose = result.final_prose;
      const ms = result.macro_score;
      const composite = ms?.composite ?? 0;

      // Cliff analysis (post-gate — measures final prose)
      const cliff = computeCliff(prose);
      const CLIFF_QUALITY_TARGET = 0.50;
      const cliffQuality = cliff >= CLIFF_QUALITY_TARGET;

      // Branching signal
      const profileFr = computeLanguageProfile(prose, 'fr');
      const profileEnMax = computeLanguageProfile(prose, 'en', 'max');
      const branchingSignal = Math.round((profileEnMax.profile_score - profileFr.profile_score) * 100) / 100;
      const branchingFlag = branchingSignal > 10 ? 'BRANCH_CANDIDATE' : (branchingSignal < 5 ? 'FR_STABLE' : 'NEUTRAL');

      // Dual-scale
      const dual = computeDualScale(composite);

      // Features
      const feats = computeTextFeatures(prose) as Record<string, number>;

      const entry = {
        scene: SCENE.id, run, composite, min_axis: ms?.min_axis ?? 0,
        verdict: ms?.verdict ?? 'UNKNOWN',
        cliff_score: cliff, cliff_quality: cliffQuality,
        profile_fr: profileFr.profile_score,
        profile_en_max: profileEnMax.profile_score,
        branching_signal: branchingSignal, branching_flag: branchingFlag,
        dual_combined: dual.dual_score,
        word_count: prose.split(/\s+/).filter(w => w.length > 0).length,
        ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
        SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
        AAI: ms?.macro_axes?.aai.score ?? 0,
      };
      allData.push(entry);

      console.log(`    comp=${composite.toFixed(1)} cliff=${cliff.toFixed(3)} cliff_quality=${cliffQuality} branching=${branchingSignal.toFixed(1)} (${branchingFlag})`);
    } catch (e: any) {
      console.error(`    ERROR: ${e.message?.slice(0, 120)}`);
      allData.push({ scene: SCENE.id, run, error: e.message?.slice(0, 200) });
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  // Save raw data
  fs.writeFileSync(path.join(sessionDir, 'shadow_data_bloc3.json'), JSON.stringify(allData, null, 2));
  console.log(`\nSaved: ${sessionDir}/shadow_data_bloc3.json`);

  // ═══ ANALYSIS ═══
  const ok = allData.filter(d => !d.error);
  const n = ok.length;

  console.log(`\n${'='.repeat(65)}`);
  console.log('OMEGA BLOC 3 — RAPPORT SHADOW (D1)');
  console.log('='.repeat(65));
  console.log(`\nRUNS : ${n}/${RUNS}\n`);

  const composites = ok.map((d: any) => d.composite);
  const cliffs = ok.map((d: any) => d.cliff_score);
  const cliffQ = ok.filter((d: any) => d.cliff_quality).length;
  const brSignals = ok.map((d: any) => d.branching_signal);

  console.log(`CLIFF QUALITY (D-B3-4) :`);
  console.log(`  cliff_score moyen: ${(cliffs.reduce((a: number, b: number) => a + b, 0) / n).toFixed(3)}`);
  console.log(`  cliff_quality=true: ${cliffQ}/${n} (${Math.round(cliffQ / n * 100)}%)`);
  console.log(`  r(cliff, composite): ${pearsonR(cliffs, composites)}`);

  console.log(`\nBRANCHING SIGNAL (D-B3-2) :`);
  console.log(`  branching_signal moyen: ${(brSignals.reduce((a: number, b: number) => a + b, 0) / n).toFixed(1)}`);
  console.log(`  r(branching, composite): ${pearsonR(brSignals, composites)}`);
  const brCandidates = ok.filter((d: any) => d.branching_flag === 'BRANCH_CANDIDATE').length;
  const frStable = ok.filter((d: any) => d.branching_flag === 'FR_STABLE').length;
  console.log(`  BRANCH_CANDIDATE: ${brCandidates}/${n} | FR_STABLE: ${frStable}/${n}`);

  console.log(`\nCOMPOSITE :`);
  const mean = composites.reduce((a: number, b: number) => a + b, 0) / n;
  const std = Math.sqrt(composites.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  console.log(`  mean=${mean.toFixed(2)} std=${std.toFixed(2)} min=${Math.min(...composites).toFixed(2)} max=${Math.max(...composites).toFixed(2)}`);

  console.log(`\n${'='.repeat(65)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
