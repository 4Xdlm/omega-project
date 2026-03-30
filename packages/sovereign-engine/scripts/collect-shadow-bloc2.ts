/**
 * OMEGA — BLOC 2 SHADOW COLLECT : 32 runs (8 x 4 scenes)
 * Collecte CI_L37 + profils FR/EN + dual-scale + cliff + features
 * SHADOW MODE (D1) : informatif uniquement, 0 changement verdict
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { runSovereignForgeWithPacket, type SovereignForgeResult } from '../src/engine.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import type { ForgePacket } from '../src/types.js';
import { computeCIL37 } from '../src/scoring/ci-l37.js';
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

function rmse(x: number[], y: number[]): number {
  const n = x.length;
  if (n === 0) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += (x[i] - y[i]) ** 2;
  return Math.round(Math.sqrt(sum / n) * 100) / 100;
}

function pct(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return Math.round(sorted[lo] * 100) / 100;
  return Math.round((sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo])) * 100) / 100;
}

// ═══ SCENES (same as bench-v-atomic-v5) ═══

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
    packet_id: `SHADOW_${scene.id}_${runIdx}`, packet_hash: 'a'.repeat(64),
    scene_id: `shadow_${scene.id}`, run_id: `shadow_${scene.id}_${runIdx}_${Date.now()}`,
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
    seeds: { llm_seed: `shadow_${scene.id}_${runIdx}_${Date.now()}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '5.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ MAIN ═══

async function main() {
  console.log('=== OMEGA BLOC 2 — SHADOW COLLECT (32 runs) ===\n');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({ apiKey, model: 'claude-sonnet-4-20250514', judgeStable: false, draftTemperature: 0.75, judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000 });

  const sessionDir = path.join('sessions', 'SHADOW_BLOC2_COLLECT');
  fs.mkdirSync(sessionDir, { recursive: true });

  const RUNS_PER_SCENE = 8;
  const allData: any[] = [];

  for (const scene of SCENES) {
    // Reset ARC buffer between scene types (D1 protocol)
    resetArcBuffer();
    console.log(`\n=== SCENE: ${scene.id} (${RUNS_PER_SCENE} runs) ===`);

    for (let run = 0; run < RUNS_PER_SCENE; run++) {
      console.log(`  [${scene.id}] run ${run + 1}/${RUNS_PER_SCENE}...`);
      try {
        const packet = buildPacket(scene, run);
        const result = await runSovereignForgeWithPacket(packet, provider);
        const prose = result.final_prose;
        const ms = result.macro_score;

        // Shadow computations
        const ciL37 = computeCIL37(prose);
        const profileFr = computeLanguageProfile(prose, 'fr');
        const profileEnMin = computeLanguageProfile(prose, 'en', 'min');
        const profileEnMax = computeLanguageProfile(prose, 'en', 'max');
        const composite = ms?.composite ?? 0;
        const dual = computeDualScale(composite);
        const cliff = computeCliff(prose);
        const words = prose.split(/\s+/).filter(w => w.length > 0).length;

        // Key features
        const feats = computeTextFeatures(prose) as Record<string, number>;

        const entry = {
          scene: scene.id, run, composite, min_axis: ms?.min_axis ?? 0,
          verdict: ms?.verdict ?? 'UNKNOWN', cliff_score: cliff, word_count: words,
          ci_l37_corpus: ciL37.ci_l37_corpus, ci_l37_omega: ciL37.ci_l37_omega,
          sub_per_sentence: ciL37.sub_per_sentence, f26b_long_sent_rate: ciL37.f26b_long_sent_rate,
          profile_fr: profileFr.profile_score,
          profile_en_min: profileEnMin.profile_score, profile_en_max: profileEnMax.profile_score,
          dual_local: dual.local_score, dual_arc: dual.arc_score, dual_combined: dual.dual_score,
          f1a_rhythm_variance: feats.f1a_rhythm_variance ?? 0,
          f17_knife_count: feats.f17_knife_count ?? 0,
          f29d_ttr_score: feats.f29d_ttr_score ?? 0,
          f35c_hook_score: feats.f35c_hook_score ?? 0,
          f36c_cliff_score: feats.f36c_cliff_score ?? 0,
          f24c_contrast_delta: feats.f24c_contrast_delta ?? 0,
          ECC: ms?.ecc_score ?? 0, RCI: ms?.macro_axes?.rci.score ?? 0,
          SII: ms?.macro_axes?.sii.score ?? 0, IFI: ms?.macro_axes?.ifi.score ?? 0,
          AAI: ms?.macro_axes?.aai.score ?? 0,
        };
        allData.push(entry);
        console.log(`    comp=${composite.toFixed(1)} CI_c=${ciL37.ci_l37_corpus.toFixed(1)} CI_o=${ciL37.ci_l37_omega.toFixed(1)} cliff=${cliff.toFixed(3)} sub=${ciL37.sub_per_sentence.toFixed(3)}`);
      } catch (e: any) {
        console.error(`    ERROR: ${e.message?.slice(0, 120)}`);
        allData.push({ scene: scene.id, run, error: e.message?.slice(0, 200) });
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Save raw data
  fs.writeFileSync(path.join(sessionDir, 'shadow_data.json'), JSON.stringify(allData, null, 2));
  console.log(`\nSaved: ${sessionDir}/shadow_data.json`);

  // ═══ ANALYSIS ═══
  const ok = allData.filter(d => !d.error);
  const n = ok.length;
  console.log(`\n${'='.repeat(65)}`);
  console.log('OMEGA BLOC 2 — RAPPORT SHADOW (D1)');
  console.log('='.repeat(65));
  console.log(`\nRUNS : ${n}/${allData.length} (${RUNS_PER_SCENE} x ${SCENES.length} scenes)\n`);

  const composites = ok.map((d: any) => d.composite);

  // Analyze each shadow component
  const components = [
    { name: 'CI_L37 (corpus)', key: 'ci_l37_corpus' },
    { name: 'CI_L37 (omega)', key: 'ci_l37_omega' },
    { name: 'PROFILE_FR', key: 'profile_fr' },
    { name: 'PROFILE_EN_MIN', key: 'profile_en_min' },
    { name: 'PROFILE_EN_MAX', key: 'profile_en_max' },
    { name: 'DUAL_COMBINED', key: 'dual_combined' },
  ];

  for (const comp of components) {
    const vals = ok.map((d: any) => d[comp.key]);
    const r = pearsonR(vals, composites);
    const mean = vals.reduce((a: number, b: number) => a + b, 0) / vals.length;
    const rmsVal = rmse(vals, composites);
    const verdict = r >= 0.60 && rmsVal < 15 ? 'INTEGRER' : (r >= 0.40 ? 'RECALIBRER' : 'REJETER');

    console.log(`COMPOSANT : ${comp.name}`);
    console.log(`  Moyenne : ${mean.toFixed(1)} | Mediane : ${pct(vals, 50)} | P10 : ${pct(vals, 10)} | P90 : ${pct(vals, 90)}`);
    console.log(`  r(${comp.name}, composite) = ${r}`);
    console.log(`  RMSE = ${rmsVal}`);
    console.log(`  Verdict : ${verdict}\n`);
  }

  // Cross-correlations
  console.log('CORRELATIONS CROISEES :');
  const ciO = ok.map((d: any) => d.ci_l37_omega);
  const subs = ok.map((d: any) => d.sub_per_sentence);
  const f26bs = ok.map((d: any) => d.f26b_long_sent_rate);
  console.log(`  r(CI_L37_omega, sub_per_sentence) = ${pearsonR(ciO, subs)}`);
  console.log(`  r(CI_L37_omega, f26b) = ${pearsonR(ciO, f26bs)}`);
  console.log(`  r(sub_per_sentence, composite) = ${pearsonR(subs, composites)}`);
  console.log(`  r(f26b, composite) = ${pearsonR(f26bs, composites)}`);

  // Cliff
  const cliffs = ok.map((d: any) => d.cliff_score);
  const cliffBelow = cliffs.filter(c => c < 0.30).length;
  console.log(`\nCLIFF GATE (validation fix) :`);
  console.log(`  cliff_score moyen : ${(cliffs.reduce((a: number, b: number) => a + b, 0) / cliffs.length).toFixed(3)}`);
  console.log(`  cliff_score < 0.30 : ${cliffBelow}/${n} (${Math.round(cliffBelow / n * 100)}%)`);

  // Summary
  console.log(`\nRESUME DECISIONNEL :`);
  for (const comp of components) {
    const vals = ok.map((d: any) => d[comp.key]);
    const r = pearsonR(vals, composites);
    const rmsVal = rmse(vals, composites);
    const verdict = r >= 0.60 && rmsVal < 15 ? 'INTEGRER' : (r >= 0.40 ? 'RECALIBRER' : 'REJETER');
    console.log(`  ${comp.name.padEnd(20)} : ${verdict} (r=${r})`);
  }
  console.log(`  ${'CLIFF FIX'.padEnd(20)} : ${cliffBelow > n * 0.30 ? 'FONCTIONNE' : 'INSUFFISANT'} (${cliffBelow}/${n} < 0.30)`);

  // Save analysis
  fs.writeFileSync(path.join(sessionDir, 'shadow_analysis.txt'), `Runs: ${n}/${allData.length}\nSee shadow_data.json for details.\n`);
  console.log(`\n${'='.repeat(65)}`);
}

main().catch(err => { console.error('FATAL:', err); process.exit(1); });
