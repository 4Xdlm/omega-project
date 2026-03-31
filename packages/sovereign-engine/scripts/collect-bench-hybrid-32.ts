/**
 * OMEGA — BLOC 7 : Pipeline hybride complet (32 runs)
 * 4 scènes × 8 runs via hybrid-provider (Ollama draft + Claude judge)
 * Comparaison directe avec données Claude BLOC 2
 *
 * Critère PASS :
 *   composite_hybride_moyen >= 86.95 (Claude 88.95 - 2.0)
 *   std_hybride <= std_claude × 2.0
 *   0 erreurs sur 32 runs
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket } from '../src/engine.js';
import { createHybridProvider, getHybridStats } from '../src/runtime/hybrid-provider.js';
import { computeLanguageProfile } from '../src/scoring/language-profiles.js';
import { computeCIL37 } from '../src/scoring/ci-l37.js';
import { resetArcBuffer } from '../src/scoring/dual-scale.js';
import type { ForgePacket } from '../src/types.js';
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

function mean(arr: number[]): number { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }
function std(arr: number[]): number {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1));
}

// ═══ SCENES ═══

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
    packet_id: `BLOC7_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `bloc7_${scene.id}`, run_id: `bloc7_${scene.id}_${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `bloc7_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('=== OMEGA BLOC 7 — HYBRID PIPELINE 32 RUNS ===');
  console.log('Draft: Ollama qwen3.5:35b-a3b (0€) | Judge: Claude Sonnet\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createHybridProvider({
    claudeApiKey: apiKey,
    ollamaModel: 'qwen3.5:35b-a3b',
  });

  // Load Claude reference data
  const claudeDataPath = path.join('sessions', 'SHADOW_BLOC2_COLLECT', 'shadow_data.json');
  const claudeRaw = JSON.parse(fs.readFileSync(claudeDataPath, 'utf8'));
  const claudeData = claudeRaw.filter((d: any) => !d.error);
  const claudeComposites = claudeData.map((d: any) => d.composite);
  const CLAUDE_MEAN = mean(claudeComposites);
  const CLAUDE_STD = std(claudeComposites);
  console.log(`Claude reference: mean=${CLAUDE_MEAN.toFixed(2)} std=${CLAUDE_STD.toFixed(2)} (${claudeData.length} runs)\n`);

  const sessionDir = path.join('sessions', 'BLOC7_HYBRID_32');
  fs.mkdirSync(sessionDir, { recursive: true });

  const RUNS_PER_SCENE = 8;
  const allData: any[] = [];

  for (const scene of SCENES) {
    resetArcBuffer();
    console.log(`\n=== SCENE: ${scene.id} (${RUNS_PER_SCENE} runs) ===`);

    for (let run = 0; run < RUNS_PER_SCENE; run++) {
      console.log(`  [${scene.id}] run ${run + 1}/${RUNS_PER_SCENE}...`);
      const startMs = Date.now();

      try {
        const packet = buildPacket(scene, run);
        const result = await runSovereignForgeWithPacket(packet, provider);
        const durationMs = Date.now() - startMs;
        const prose = result.final_prose;
        const ms = result.macro_score;
        const composite = ms?.composite ?? 0;
        const words = prose.split(/\s+/).filter(w => w.length > 0).length;

        // Shadow metrics
        const cliff = computeCliff(prose);
        const profileFr = computeLanguageProfile(prose, 'fr');
        const profileEnMax = computeLanguageProfile(prose, 'en', 'max');
        const branchingSignal = Math.round((profileEnMax.profile_score - profileFr.profile_score) * 100) / 100;
        const ciL37 = computeCIL37(prose);

        const entry = {
          scene: scene.id, run, composite, min_axis: ms?.min_axis ?? 0,
          verdict: ms?.verdict ?? 'UNKNOWN', word_count: words,
          duration_s: Math.round(durationMs / 1000),
          cliff_score: cliff, cliff_quality: cliff >= 0.50,
          profile_fr: profileFr.profile_score,
          branching_signal: branchingSignal,
          ci_l37_corpus: ciL37.ci_l37_corpus,
          ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
          SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
          AAI: ms?.macro_axes?.aai.score ?? 0,
        };
        allData.push(entry);

        console.log(`    comp=${composite.toFixed(1)} min=${(ms?.min_axis ?? 0).toFixed(1)} verdict=${ms?.verdict} ${words}w ${(durationMs/1000).toFixed(0)}s`);

      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 150)}`);
        allData.push({ scene: scene.id, run, error: e.message?.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Save data
  fs.writeFileSync(path.join(sessionDir, 'hybrid_data.json'), JSON.stringify(allData, null, 2));

  // ═══ ANALYSIS ═══
  const ok = allData.filter(d => !d.error);
  const n = ok.length;
  const errors = allData.length - n;
  const composites = ok.map((d: any) => d.composite);
  const hybridMean = mean(composites);
  const hybridStd = std(composites);
  const stats = getHybridStats();

  console.log(`\n${'='.repeat(70)}`);
  console.log('OMEGA BLOC 7 — HYBRID PIPELINE RAPPORT');
  console.log('='.repeat(70));
  console.log(`\nRuns: ${n}/32 OK | Errors: ${errors}`);

  // Global comparison
  console.log(`\nCOMPOSITE COMPARISON:`);
  console.log(`  Claude (BLOC 2): mean=${CLAUDE_MEAN.toFixed(2)} std=${CLAUDE_STD.toFixed(2)}`);
  console.log(`  Hybrid (BLOC 7): mean=${hybridMean.toFixed(2)} std=${hybridStd.toFixed(2)}`);
  console.log(`  Delta: ${(hybridMean - CLAUDE_MEAN >= 0 ? '+' : '')}${(hybridMean - CLAUDE_MEAN).toFixed(2)}`);

  // Per-scene
  console.log(`\nPER-SCENE:`);
  for (const scene of SCENES) {
    const sceneData = ok.filter((d: any) => d.scene === scene.id);
    const cScene = claudeData.filter((d: any) => d.scene === scene.id);
    if (sceneData.length === 0) continue;
    const sComps = sceneData.map((d: any) => d.composite);
    const cComps = cScene.map((d: any) => d.composite);
    console.log(`  ${scene.id.padEnd(18)} hybrid=${mean(sComps).toFixed(2)} claude=${mean(cComps).toFixed(2)} delta=${(mean(sComps) - mean(cComps)).toFixed(2)}`);
  }

  // Cliff & branching
  const cliffs = ok.map((d: any) => d.cliff_score);
  const cliffQ = ok.filter((d: any) => d.cliff_quality).length;
  const branches = ok.map((d: any) => d.branching_signal);
  const cis = ok.map((d: any) => d.ci_l37_corpus);
  console.log(`\nSHADOW METRICS:`);
  console.log(`  cliff_score mean: ${mean(cliffs).toFixed(3)} | quality>=0.50: ${cliffQ}/${n} (${Math.round(cliffQ/n*100)}%)`);
  console.log(`  branching_signal mean: ${mean(branches).toFixed(1)}`);
  console.log(`  CI_L37 mean: ${mean(cis).toFixed(1)}`);

  // Cost
  console.log(`\nCOST:`);
  console.log(`  Ollama drafts: ${stats.ollamaDrafts} (0€)`);
  console.log(`  Claude judges: ${stats.claudeJudges} (~$${(stats.claudeJudges * 0.003).toFixed(2)})`);
  console.log(`  Cost per run: ~$${(stats.claudeJudges * 0.003 / Math.max(n, 1)).toFixed(4)}`);

  // PASS/FAIL
  const thresholdMean = CLAUDE_MEAN - 2.0;
  const thresholdStd = CLAUDE_STD * 2.0;
  const passMean = hybridMean >= thresholdMean;
  const passStd = hybridStd <= thresholdStd;
  const passErrors = errors === 0;

  console.log(`\n${'='.repeat(70)}`);
  console.log('VERDICT D-BLOC7');
  console.log('='.repeat(70));
  console.log(`  Composite mean: ${hybridMean.toFixed(2)} >= ${thresholdMean.toFixed(2)} → ${passMean ? 'PASS' : 'FAIL'}`);
  console.log(`  Composite std:  ${hybridStd.toFixed(2)} <= ${thresholdStd.toFixed(2)} → ${passStd ? 'PASS' : 'FAIL'}`);
  console.log(`  Errors:         ${errors}/32 → ${passErrors ? 'PASS' : 'FAIL'}`);
  const overall = passMean && passStd && passErrors;
  console.log(`\n  BLOC 7: ${overall ? '*** PASS ***' : '*** FAIL ***'}`);
  console.log('='.repeat(70));

  // Save summary
  const summary = {
    date: new Date().toISOString(),
    hybrid_runs: n, hybrid_errors: errors,
    hybrid_composite_mean: Math.round(hybridMean * 100) / 100,
    hybrid_composite_std: Math.round(hybridStd * 100) / 100,
    claude_composite_mean: Math.round(CLAUDE_MEAN * 100) / 100,
    claude_composite_std: Math.round(CLAUDE_STD * 100) / 100,
    delta_mean: Math.round((hybridMean - CLAUDE_MEAN) * 100) / 100,
    threshold_mean: Math.round(thresholdMean * 100) / 100,
    threshold_std: Math.round(thresholdStd * 100) / 100,
    pass_mean: passMean, pass_std: passStd, pass_errors: passErrors,
    overall: overall ? 'PASS' : 'FAIL',
    ollama_drafts: stats.ollamaDrafts,
    claude_judges: stats.claudeJudges,
    cost_claude_judges: Math.round(stats.claudeJudges * 0.003 * 100) / 100,
    cliff_mean: Math.round(mean(cliffs) * 1000) / 1000,
    cliff_quality_pct: Math.round(cliffQ / n * 100),
    branching_mean: Math.round(mean(branches) * 10) / 10,
    ci_l37_mean: Math.round(mean(cis) * 10) / 10,
  };
  fs.writeFileSync(path.join(sessionDir, 'SUMMARY.json'), JSON.stringify(summary, null, 2));
  console.log(`\nSaved: ${sessionDir}/SUMMARY.json`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
