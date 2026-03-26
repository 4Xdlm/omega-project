/**
 * OMEGA — TELEMETRIE : 1 brique (Contemplation)
 * Pipeline complet avec telemetrie activee — 7 snapshots
 * Budget : ~16 API calls
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { telemetry } from '../src/telemetry/pipeline-telemetry.js';
import { runSovereignForgeWithPacket } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

// ═══ 14D ═══

function dominant14D(emotion: string, weight = 0.50): Record<string, number> {
  const keys = ['joy','trust','fear','surprise','sadness','disgust','anger','anticipation','love','submission','awe','disapproval','remorse','contempt'];
  const r = (1 - weight) / 13;
  const d: Record<string, number> = {};
  for (const k of keys) d[k] = k === emotion ? weight : r;
  return d;
}

// ═══ CONTEMPLATION PACKET ═══

function buildContemplationPacket(): ForgePacket {
  return {
    packet_id: 'FORGE_telemetry_contemplation',
    packet_hash: 'a'.repeat(64),
    scene_id: 'telemetry_contemplation',
    run_id: `telemetry_contemplation_${Date.now()}`,
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: 'Explorer la solitude et la memoire',
      scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas — melancolie contemplative',
      conflict_type: 'internal',
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D('anticipation'), valence: -0.1, arousal: 0.3, dominant: 'anticipation', narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D('sadness', 0.35), valence: -0.2, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D('sadness'), valence: -0.4, arousal: 0.6, dominant: 'sadness', narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D('sadness', 0.40), valence: -0.2, arousal: 0.3, dominant: 'sadness', reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: 'sadness', after_dominant: 'sadness', delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: [
      { beat_id: 'b1', beat_order: 0, action: 'Elle prepare du the dans la cuisine froide', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['touch', 'sound'], canon_refs: [] },
      { beat_id: 'b2', beat_order: 1, action: 'Elle regarde la mer par la fenetre', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
      { beat_id: 'b3', beat_order: 2, action: 'Un souvenir d\'ete remonte', dialogue: '', subtext_type: 'pivot', emotion_instruction: '', sensory_tags: ['sound', 'smell'], canon_refs: [] },
      { beat_id: 'b4', beat_order: 3, action: 'La nuit tombe, elle ne bouge pas', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight', 'touch'], canon_refs: [] },
    ],
    subtext: {
      layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }],
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
      recurrent_motifs: ['mer', 'vent', 'lumiere declinante'], banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: {
        signature_words: ['silence', 'ombre', 'souffle', 'lumiere', 'eau', 'pierre', 'froid', 'vent', 'sel', 'vide'],
        forbidden_words: ['soudainement', 'mysterieusement', 'bizarrement'],
        abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60,
      },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: ['mer', 'vent', 'lumiere declinante'], density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: {
      banned_words: ['soudain', 'soudainement', 'mysterieusement'],
      banned_cliches: ['coeur de pierre', 'mer d\'emotions', 'silence assourdissant'],
      banned_ai_patterns: ['il ne pouvait s\'empecher de', 'une vague de', 'un frisson parcourut'],
      banned_filter_words: ['effectivement', 'neanmoins', 'toutefois'],
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: 'telemetry_contemplation', determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ DISPLAY ═══

function getDominant(vec: Record<string, number>): { emotion: string; weight: number } {
  let max = 0;
  let emotion = '';
  for (const [k, v] of Object.entries(vec)) {
    if (v > max) { max = v; emotion = k; }
  }
  return { emotion, weight: max };
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — TELEMETRIE : Contemplation (1 run)');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  // Enable telemetry
  telemetry.enable();
  telemetry.start('contemplation', 1);

  const packet = buildContemplationPacket();
  await runSovereignForgeWithPacket(packet, provider);

  // Export report
  const report = telemetry.export();

  // ═══ DISPLAY TABLE ═══
  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  TELEMETRIE — SNAPSHOTS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log('  ETAPE                Words   Mean    CV_s   f26b   Para   Comp    min');
  console.log('  ─────────────────────────────────────────────────────────────────────');

  for (const snap of report.snapshots) {
    if (snap.stage === 'EMOTION_14D') continue; // handled separately
    const f = snap.features;
    const s = snap.scores;
    const compStr = s ? s.composite.toFixed(1).padStart(5) : '    —';
    const minStr = s ? s.min_axis.toFixed(1).padStart(5) : '    —';
    console.log(
      `  ${snap.stage.padEnd(22)} ${String(snap.words).padStart(5)}  ` +
      `${f.f1_mean_sent_len.toFixed(1).padStart(5)}  ` +
      `${f.cv_sent.toFixed(3).padStart(6)}  ` +
      `${f.f26b_long_sent_rate.toFixed(3).padStart(5)}  ` +
      `${String(f.paragraph_count).padStart(4)}  ` +
      `${compStr}  ${minStr}` +
      (snap.details?.winner_mode ? `  <- ${snap.details.winner_mode}` : '')
    );
  }

  // ═══ DELTA SUMMARY ═══
  const ds = report.summary.delta_draft_to_winner;
  const draftSnap = report.snapshots.find(s => s.stage === 'CHUNKED_DRAFT');
  const finalSnap = report.snapshots.find(s => s.stage === 'FINAL');

  console.log('\n  DELTA DRAFT -> FINAL:');
  if (draftSnap && finalSnap) {
    console.log(`    dwords = ${ds.words > 0 ? '+' : ''}${ds.words} (draft ${draftSnap.words}w -> final ${finalSnap.words}w)`);
    console.log(`    dmean  = ${ds.delta_mean_sent > 0 ? '+' : ''}${ds.delta_mean_sent.toFixed(1)} (${draftSnap.features.f1_mean_sent_len.toFixed(1)} -> ${finalSnap.features.f1_mean_sent_len.toFixed(1)})`);
    console.log(`    dcv    = ${ds.delta_cv > 0 ? '+' : ''}${ds.delta_cv.toFixed(3)} (${draftSnap.features.cv_sent.toFixed(3)} -> ${finalSnap.features.cv_sent.toFixed(3)})`);
    console.log(`    df26b  = ${(finalSnap.features.f26b_long_sent_rate - draftSnap.features.f26b_long_sent_rate).toFixed(3)}`);
  }

  // ═══ EMOTION 14D ═══
  const emotionSnap = report.snapshots.find(s => s.stage === 'EMOTION_14D');
  if (emotionSnap?.emotion_14d && emotionSnap.emotion_14d.length > 0) {
    console.log('\n  EMOTION 14D PAR QUARTILE:');
    for (const e of emotionSnap.emotion_14d) {
      const tgt = getDominant(e.target);
      const act = getDominant(e.actual);
      console.log(`    Q${e.quartile}: target=${tgt.emotion}(${tgt.weight.toFixed(2)}) actual=${act.emotion}(${act.weight.toFixed(2)}) sim=${(e.cosine_similarity * 100).toFixed(1)}%`);
    }
  }

  // ═══ MICROSURGERY ═══
  const preMs = report.snapshots.find(s => s.stage === 'PRE_MICROSURGERY');
  const postMs = report.snapshots.find(s => s.stage === 'POST_MICROSURGERY');
  if (preMs?.details) {
    console.log('\n  MICROSURGERY:');
    console.log(`    Interventions planifiees: ${preMs.details.interventions_planned}`);
    const applied = (postMs?.details?.interventions_applied ?? 0) as number;
    const rejected = (postMs?.details?.interventions_rejected ?? 0) as number;
    console.log(`    Appliquees: ${applied} | Rejetees: ${rejected}`);
  }

  // ═══ DUEL CANDIDATES ═══
  const winnerSnap = report.snapshots.find(s => s.stage === 'DUEL_WINNER');
  if (winnerSnap?.details?.all_candidates) {
    console.log('\n  DUEL CANDIDATES:');
    const candidates = winnerSnap.details.all_candidates as Array<{ mode: string; words: number; composite: number }>;
    for (const c of candidates) {
      const isWinner = c.mode === winnerSnap.details.winner_mode ? ' <- WINNER' : '';
      console.log(`    ${c.mode.padEnd(25)} ${String(c.words).padStart(5)}w  comp=${c.composite.toFixed(1)}${isWinner}`);
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log(`  Duration: ${report.summary.duration_ms}ms | Stages: ${report.summary.total_stages}`);
  console.log('═══════════════════════════════════════════════════════════════════════');

  // Save JSON
  const sessionDir = path.join('sessions', `TELEMETRY_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(path.join(sessionDir, 'telemetry_contemplation.json'), JSON.stringify(report, null, 2));
  console.log(`\nSaved: ${sessionDir}/telemetry_contemplation.json`);

  telemetry.disable();
  telemetry.reset();
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
