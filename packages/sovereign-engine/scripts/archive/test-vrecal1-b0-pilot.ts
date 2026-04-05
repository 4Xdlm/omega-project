/**
 * OMEGA — V-RECAL-1 : B0 PILOT (1 run moteur v4 + scoring MacroSScore)
 * Budget : 4 API (génération) + 0 API (scoring CALC avec SEMANTIC_CORTEX=false)
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

import Anthropic from '@anthropic-ai/sdk';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { computeAllGBFeatures, scoreText } from '../src/scoring/gb-scorer.js';
import { MultiStageScorerV2 } from '../src/scoring/multi-stage-scorer-v2.js';
import { computeECC, computeRCI, computeSII, computeIFI, computeAAI } from '../src/oracle/macro-axes.js';
import { computeMacroSScore } from '../src/oracle/s-score.js';
import { SOVEREIGN_CONFIG } from '../src/config.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';

(SOVEREIGN_CONFIG as any).SEMANTIC_CORTEX_ENABLED = false;

// ═══ MOTEUR V4 PROMPTS ═══

const PF_PERSONA = `Tu es un duo d'écrivains : Gustave Flaubert et Marcel Proust.

Flaubert : les périodes classiques, les subordonnées en cascade,
le gueuloir — chaque phrase doit pouvoir être lue à voix haute.
La beauté de la structure est une fin en soi.

Proust : la profondeur, le temps dilaté, chaque sensation dépliée sur
toute surface.

Les deux travaillent ensemble. Flaubert construit, Proust creuse.
Les phrases longues sont bienvenues — c'est leur nature commune.`;

const RAPPEL_CHUNKS12 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

SOUFFLE DE FLAUBERT : chaque période se déploie jusqu'à épuiser la sensation
ou l'idée — elle prend le temps d'une respiration complète, ni écourtée
ni interminable. Le rythme naturel d'une phrase lue à voix haute
dans le gueuloir.

MURMURE DE DURAS : de loin en loin, une phrase brève et nue coupe le flux
— un verdict, pas un résumé. Elle apparaît comme un silence entre deux
mouvements d'orchestre.`;

const RAPPEL_CHUNKS34_V4 = `RAPPEL DUO : Flaubert construit les périodes, Proust creuse chaque sensation.

CORRECTEUR DE RYTHME EXTERNE : régulièrement, à intervalles sentis,
brise le flot des longues périodes par une phrase-couteau — sèche,
factuelle, quelques mots à peine. Pas exceptionnellement : souvent.
Flaubert et Proust reprennent aussitôt le contrôle. Duras ponctionne,
disparaît, revient.

ANCRE DE TENUE : la cadence de fin ne s'effondre pas.
Les chunks 3-4 gardent le souffle installé par les chunks 1-2.
Duras frappe par éclairs brefs — elle n'abaisse pas
la nappe phrastique dominante. Même dans le dialogue
ou la confrontation, les répliques s'enchâssent dans
des périodes narratives et descriptives amples.
La lame Duras crée le contraste — elle ne change pas
le registre de fond.

COHÉRENCE DE LONGUEUR : la longueur moyenne des phrases reste dans
la continuité de ce qui précède — ni soudainement plus courte,
ni soudainement plus longue.`;

const SCENE_BRIEF = `Une femme seule dans une maison au bord de la mer, en hiver.
Elle attend quelqu'un qui ne viendra pas. Le vent secoue les volets.
Elle prépare du thé, regarde par la fenêtre. La lumière baisse.
Elle se souvient d'un été ancien. Rien ne se passe, mais tout pèse.`;

// ═══ FORGE PACKET MINIMAL ═══

const U14D: Record<string, number> = {
  joy: 1/14, trust: 1/14, fear: 1/14, surprise: 1/14,
  sadness: 1/14, disgust: 1/14, anger: 1/14, anticipation: 1/14,
  love: 1/14, submission: 1/14, awe: 1/14, disapproval: 1/14,
  remorse: 1/14, contempt: 1/14,
};

const SAD14D: Record<string, number> = (() => {
  const r = 0.50 / 13;
  return {
    joy: r, trust: r, fear: r, surprise: r, sadness: 0.50, disgust: r,
    anger: r, anticipation: r, love: r, submission: r, awe: r,
    disapproval: r, remorse: r, contempt: r,
  };
})();

function buildPacket(): ForgePacket {
  return {
    packet_id: 'FORGE_b0_pilot_001',
    packet_hash: 'a'.repeat(64),
    scene_id: 'b0_contemplation',
    run_id: 'b0_pilot_001',
    quality_tier: 'sovereign',
    language: 'fr',
    intent: {
      story_goal: 'narrative progression',
      scene_goal: 'establish melancholy',
      conflict_type: 'internal',
      pov: 'third_limited',
      tense: 'past',
      target_word_count: 2500,
    },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: U14D, valence: -0.1, arousal: 0.2, dominant: 'sadness', narrative_instruction: 'Attente' },
        { quartile: 'Q2', target_14d: SAD14D, valence: -0.3, arousal: 0.3, dominant: 'sadness', narrative_instruction: 'Mémoire' },
        { quartile: 'Q3', target_14d: SAD14D, valence: -0.4, arousal: 0.4, dominant: 'sadness', narrative_instruction: 'Souvenir' },
        { quartile: 'Q4', target_14d: U14D, valence: -0.2, arousal: 0.2, dominant: 'sadness', narrative_instruction: 'Résignation' },
      ],
      intensity_range: { min: 0.2, max: 0.5 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: U14D, valence: -0.2, arousal: 0.2, dominant: 'sadness', reader_state: 'Mélancolie' },
      rupture: { exists: false, position_pct: 0, before_dominant: 'sadness', after_dominant: 'sadness', delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: [
      { beat_id: 'b1', beat_order: 0, action: 'Elle prépare du thé', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['touch', 'sound'], canon_refs: [] },
      { beat_id: 'b2', beat_order: 1, action: 'Elle regarde la mer', dialogue: '', subtext_type: 'progression', emotion_instruction: '', sensory_tags: ['sight'], canon_refs: [] },
    ],
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: "Quelqu'un manque", visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] },
        { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] },
        { category: 'smell', min_count: 0, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] },
        { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: ['mer', 'vent', 'lumière'],
      banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0',
      universe: 'literary_contemplation',
      lexicon: {
        signature_words: ['silence', 'ombre', 'souffle', 'lumière', 'eau', 'pierre', 'froid', 'vent', 'sel', 'vide'],
        forbidden_words: ['soudainement', 'mystérieusement'],
        abstraction_max_ratio: 0.20,
        concrete_min_ratio: 0.60,
      },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.5] },
      imagery: { recurrent_motifs: ['mer', 'vent', 'lumière'], density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: {
      banned_words: ['soudain', 'soudainement'],
      banned_cliches: Array.from({ length: 10 }, (_, i) => `cliche_${i}`),
      banned_ai_patterns: Array.from({ length: 10 }, (_, i) => `ai_${i}`),
      banned_filter_words: Array.from({ length: 10 }, (_, i) => `filter_${i}`),
    },
    canon: [],
    continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: 'b0_pilot', determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ DUMMY PROVIDER WITH CALC FALLBACKS ═══

const dummyProvider: SovereignProvider = {
  generateDraft: async () => { throw new Error('DUMMY: LLM gen blocked'); },
  judgeQuality: async () => { throw new Error('DUMMY: LLM judge blocked'); },

  // CALC fallback: count interiority markers (same logic as s-oracle-v2 offline)
  scoreInteriority: async (prose: string, _context: any): Promise<number> => {
    const markers = [
      'pensait', 'songeait', 'se demandait', 'se disait', 'réfléchissait',
      'imaginait', 'sentait que', 'savait que', 'comprenait', 'réalisait',
      'thought', 'wondered', 'felt that', 'knew that', 'realized',
      'mémoire', 'souvenir', 'conscience', 'esprit', 'âme',
      'memory', 'consciousness', 'mind', 'soul',
    ];
    const proseLower = prose.toLowerCase();
    const words = prose.split(/\s+/).length;
    let count = 0;
    for (const m of markers) { count += (proseLower.match(new RegExp(m, 'g')) || []).length; }
    const density = count / (words / 100);
    if (density >= 3) return 0.90;
    if (density >= 2) return 0.75;
    if (density >= 1) return 0.60;
    return 0.40;
  },

  // CALC fallback: compression-based necessity estimate
  scoreNecessity: async (prose: string, _beatCount: number, _beatActions: string, _sceneGoal: string, _conflictType: string): Promise<number> => {
    const sentences = prose.split(/(?<=[.!?…])\s+/).filter(s => s.length > 5);
    const words = prose.split(/\s+/).length;
    const avgLen = words / Math.max(1, sentences.length);
    // Long sentences in literary prose = higher necessity (not filler)
    if (avgLen > 30) return 0.80;
    if (avgLen > 20) return 0.70;
    if (avgLen > 15) return 0.60;
    return 0.50;
  },

  // CALC fallback: count sensory words
  scoreSensoryDensity: async (prose: string, _sensoryCounts: any): Promise<number> => {
    const sensoryWords = [
      'lumière', 'ombre', 'couleur', 'regard', 'yeux', 'voir', 'apercevoir',
      'bruit', 'silence', 'voix', 'murmure', 'cri', 'son', 'entendre',
      'main', 'peau', 'froid', 'chaud', 'toucher', 'caresser', 'dur', 'doux',
      'odeur', 'parfum', 'sentir', 'goût', 'saveur',
      'light', 'shadow', 'color', 'eyes', 'see', 'noise', 'silence', 'voice',
      'hand', 'skin', 'cold', 'warm', 'touch', 'smell', 'taste',
    ];
    const proseLower = prose.toLowerCase();
    const words = prose.split(/\s+/).length;
    let hits = 0;
    for (const w of sensoryWords) { if (proseLower.includes(w)) hits++; }
    const density = hits / (words / 100);
    if (density >= 4) return 0.90;
    if (density >= 2.5) return 0.75;
    if (density >= 1.5) return 0.60;
    return 0.40;
  },

  // CALC fallback: opening/closing impact heuristic
  scoreImpact: async (opening: string, closing: string, _context: any): Promise<number> => {
    let score = 0.50;
    // Opening: longer first sentence = more literary impact
    const firstSentWords = opening.split(/\s+/).length;
    if (firstSentWords > 20) score += 0.15;
    else if (firstSentWords > 10) score += 0.10;
    // Closing: presence of ellipsis, question, or open image
    if (closing.includes('…') || closing.includes('?')) score += 0.15;
    if (closing.split(/\s+/).length > 15) score += 0.10;
    return Math.min(1.0, score);
  },

  // CALC fallback: structured JSON generation (metaphor detector)
  generateStructuredJSON: async (_prompt: string): Promise<string> => {
    // Return empty metaphor analysis — fail-closed safe default
    return JSON.stringify({ metaphors: [], novelty_score: 0.5, analysis: 'CALC fallback — no LLM' });
  },
} as any;

// ═══ HELPERS ═══

async function generate(client: Anthropic, prompt: string, maxTokens: number): Promise<string> {
  const resp = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: maxTokens,
    temperature: 0.75,
    messages: [{ role: 'user', content: prompt }],
  });
  const text = resp.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('');
  const match = text.match(/<prose>([\s\S]*?)<\/prose>/);
  return match ? match[1].trim() : text.trim();
}

async function withRetry(fn: () => Promise<string>, label: string, retries = 3): Promise<string> {
  for (let i = 0; i < retries; i++) {
    try { return await fn(); }
    catch (e: any) {
      console.error(`  ⚠️ ${label} attempt ${i+1} failed: ${e.message}`);
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 5000 * (i + 1)));
    }
  }
  throw new Error('unreachable');
}

function measureWindows(text: string, numWindows: number) {
  const sentences = text.split(/(?<=[.!?…])\s+/).filter(s => s.length > 5);
  if (sentences.length < 2) return [{ mean_len: 0 }];
  const windowSize = Math.floor(sentences.length / numWindows);
  const windows = [];
  for (let w = 0; w < numWindows; w++) {
    const start = w * windowSize;
    const end = w === numWindows - 1 ? sentences.length : start + windowSize;
    const slice = sentences.slice(start, end);
    const lengths = slice.map(s => s.split(/\s+/).length);
    const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    windows.push({ mean_len: mean });
  }
  return windows;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — V-RECAL-1 : B0 PILOT');
  console.log('  1 run contemplation — moteur v4 + scoring MacroSScore');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const client = new Anthropic();
  let fullProse = '';

  console.log('\n═══ GÉNÉRATION MOTEUR V4 ═══');
  for (let chunk = 1; chunk <= 4; chunk++) {
    const isFirst = chunk === 1;
    const isLast = chunk === 4;
    const rappel = chunk <= 2 ? RAPPEL_CHUNKS12 : RAPPEL_CHUNKS34_V4;
    const last200 = fullProse.split(/\s+/).slice(-200).join(' ');

    let prompt: string;
    if (isFirst) {
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nTu écris le DÉBUT de cette scène :\n\n${SCENE_BRIEF}\n\nÉcris les 750 premiers mots. Installe l'atmosphère.\nPas de préambule. Encadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    } else if (isLast) {
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nContinue et TERMINE cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 derniers mots. Conclus sans résoudre — laisse une ouverture.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    } else {
      prompt = `${PF_PERSONA}\n\n${rappel}\n\nContinue cette scène.\n\n200 derniers mots :\n"${last200}"\n\nÉcris les 750 mots suivants.\nEncadre EXCLUSIVEMENT ta prose entre <prose> et </prose>.`;
    }

    const chunkProse = await withRetry(() => generate(client, prompt, 2500), `chunk${chunk}`);
    fullProse += (fullProse ? '\n\n' : '') + chunkProse;

    const cw = measureWindows(chunkProse, 1);
    console.log(`  Chunk ${chunk}: ${chunkProse.split(/\s+/).length}w mean=${cw[0].mean_len.toFixed(1)}`);
    await new Promise(r => setTimeout(r, 2000));
  }

  const totalWords = fullProse.split(/\s+/).length;
  console.log(`\n  TOTAL: ${totalWords}w`);

  // ── PIPELINE A ──
  console.log('\n═══ SCORING PIPELINE A (GB V1 + MS V2) ═══');
  const gbResult = scoreText(fullProse);
  const features = computeAllGBFeatures(fullProse);
  const msV2 = new MultiStageScorerV2();
  const v2Result = msV2.score(features, { wordCount: totalWords });

  const windows = measureWindows(fullProse, 4);
  const drift = windows.length >= 2 ? windows[windows.length - 1].mean_len - windows[0].mean_len : 0;
  const f26b = features['f26b_long_sent_rate'] ?? 0;
  const cv = features['f1a_rhythm_variance'] ?? 0;

  console.log(`  GB V1     = ${gbResult.score.toFixed(3)} (tier ${gbResult.tier})`);
  console.log(`  MS V2     = ${v2Result.final.toFixed(1)}`);
  console.log(`  f26b      = ${f26b.toFixed(3)}`);
  console.log(`  CV (f1a)  = ${cv.toFixed(3)}`);
  console.log(`  Drift     = ${drift.toFixed(1)}`);

  // ── PIPELINE B (MacroSScore CALC — ECC-I post-hoc) ──
  console.log('\n═══ SCORING PIPELINE B (MacroSScore CALC — ECC-I MODE POST-HOC) ═══');
  console.log('  ⚠️ ECC-I = cohérence émotionnelle INTERNE (pas conformité prescriptive)');
  console.log('  Building post-hoc ForgePacket from actual prose emotion...');

  // Step 1: Extract real emotion by quartile from the prose
  const { analyzeEmotionFromText } = await import('@omega/omega-forge');
  const paragraphs = fullProse.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0);
  const totalParas = paragraphs.length;
  const qBounds = [[0, 0.25], [0.25, 0.5], [0.5, 0.75], [0.75, 1.0]];
  const qNames = ['Q1', 'Q2', 'Q3', 'Q4'] as const;

  const realQuartiles = qBounds.map(([s, e], i) => {
    const si = Math.floor(s * totalParas);
    const ei = Math.ceil(e * totalParas);
    const qText = paragraphs.slice(si, ei).join('\n\n');
    const emo = analyzeEmotionFromText(qText, 'fr');

    let dominant = 'sadness';
    let maxVal = 0;
    for (const [key, val] of Object.entries(emo)) {
      if (typeof val === 'number' && val > maxVal) { maxVal = val as number; dominant = key; }
    }

    const pos = (emo.joy || 0) + (emo.trust || 0) + (emo.love || 0) + (emo.anticipation || 0);
    const neg = (emo.fear || 0) + (emo.sadness || 0) + (emo.anger || 0) + (emo.disgust || 0);
    const valence = (pos - neg) / (pos + neg + 0.001);
    const hiAct = (emo.fear || 0) + (emo.anger || 0) + (emo.joy || 0) + (emo.surprise || 0);
    const loAct = (emo.sadness || 0) + (emo.trust || 0) + (emo.disgust || 0);
    const arousal = hiAct / (hiAct + loAct + 0.001);

    console.log(`  ${qNames[i]}: dominant=${dominant} valence=${valence.toFixed(2)} arousal=${arousal.toFixed(2)}`);
    return { quartile: qNames[i], target_14d: emo, valence, arousal, dominant, narrative_instruction: `Real Q${i+1}` };
  });

  // Step 2: Build packet with real emotion injected
  const packet = buildPacket();
  (packet as any).emotion_contract.curve_quartiles = realQuartiles;
  (packet as any).emotion_contract.terminal_state.target_14d = realQuartiles[3].target_14d;
  (packet as any).emotion_contract.terminal_state.dominant = realQuartiles[3].dominant;
  (packet as any).emotion_contract.terminal_state.valence = realQuartiles[3].valence;
  (packet as any).emotion_contract.terminal_state.arousal = realQuartiles[3].arousal;
  (packet as any).emotion_contract.valence_arc.start = realQuartiles[0].valence;
  (packet as any).emotion_contract.valence_arc.end = realQuartiles[3].valence;

  console.log('  Post-hoc ForgePacket built from real prose emotion ✅');

  let macroSuccess = true;

  const axes = [
    { name: 'ECC', fn: () => computeECC(packet, fullProse, dummyProvider) },
    { name: 'RCI', fn: () => computeRCI(packet, fullProse, dummyProvider) },
    { name: 'SII', fn: () => computeSII(packet, fullProse, dummyProvider) },
    { name: 'IFI', fn: () => computeIFI(packet, fullProse, dummyProvider) },
    { name: 'AAI', fn: () => computeAAI(packet, fullProse, dummyProvider) },
  ];

  const results: any = {};
  for (const ax of axes) {
    try {
      console.log(`  Computing ${ax.name}...`);
      results[ax.name.toLowerCase()] = await ax.fn();
      console.log(`  ${ax.name} = ${results[ax.name.toLowerCase()].score.toFixed(1)}`);
    } catch (e: any) {
      console.error(`  ❌ ${ax.name} FAIL: ${e.message}`);
      macroSuccess = false;
    }
  }

  if (macroSuccess) {
    const macroAxes = { ecc: results.ecc, rci: results.rci, sii: results.sii, ifi: results.ifi, aai: results.aai };
    const macroSScore = computeMacroSScore(macroAxes, 'b0_contemplation', 'b0_pilot');

    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('  V-RECAL-1 B0 — RÉSULTATS COMPLETS');
    console.log('══════════════════════════════════════════════════════════════════════');
    console.log(`  GB V1        = ${gbResult.score.toFixed(3)} (tier ${gbResult.tier})`);
    console.log(`  MS V2        = ${v2Result.final.toFixed(1)}`);
    console.log(`  f26b         = ${f26b.toFixed(3)}`);
    console.log(`  CV (f1a)     = ${cv.toFixed(3)}`);
    console.log(`  Drift        = ${drift.toFixed(1)}`);
    console.log('  ─────────────────────────────────────────');
    console.log(`  ECC-I        = ${results.ecc.score.toFixed(1)} (weight ${results.ecc.weight}) [INTERNAL cohérence]`);
    console.log(`  RCI          = ${results.rci.score.toFixed(1)} (weight ${results.rci.weight})`);
    console.log(`  SII          = ${results.sii.score.toFixed(1)} (weight ${results.sii.weight})`);
    console.log(`  IFI          = ${results.ifi.score.toFixed(1)} (weight ${results.ifi.weight})`);
    console.log(`  AAI          = ${results.aai.score.toFixed(1)} (weight ${results.aai.weight})`);
    console.log('  ─────────────────────────────────────────');
    console.log(`  COMPOSITE    = ${macroSScore.composite.toFixed(1)} [ECC-I mode]`);
    console.log(`  MIN_AXIS     = ${macroSScore.min_axis.toFixed(1)}`);
    console.log(`  VERDICT      = ${macroSScore.verdict}`);
    console.log(`  SAGA_READY   = ${macroSScore.composite >= 92 && macroSScore.min_axis >= 85 ? '✅ OUI' : '❌ NON'}`);
    console.log('  ─────────────────────────────────────────');
    console.log('  ⚠️ NOTE: ECC-I = cohérence interne post-hoc');
    console.log('     ECC-P (conformité prescriptive) = future intégration engine.ts');
    console.log('══════════════════════════════════════════════════════════════════════');

    const sessionDir = path.join('sessions', `VRECAL1_B0_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'prose.txt'), fullProse);
    const output = {
      timestamp: new Date().toISOString(),
      moteur: 'PF_base_Duras_correcteur_K2_v4',
      scene: 'contemplation',
      words: totalWords,
      pipeline_a: { gb_v1: gbResult.score, gb_tier: gbResult.tier, ms_v2: v2Result.final, f26b, cv, drift },
      pipeline_b: {
        mode: 'ECC-I (post-hoc internal coherence)',
        ecc_i: results.ecc.score, rci: results.rci.score, sii: results.sii.score,
        ifi: results.ifi.score, aai: results.aai.score,
        composite: macroSScore.composite, min_axis: macroSScore.min_axis, verdict: macroSScore.verdict,
      },
      saga_ready: macroSScore.composite >= 92 && macroSScore.min_axis >= 85,
    };
    fs.writeFileSync(path.join(sessionDir, 'results.json'), JSON.stringify(output, null, 2));
    fs.writeFileSync('src/scoring/data/VRECAL1_B0_RESULTS.json', JSON.stringify(output, null, 2));
    console.log(`\nSaved: ${sessionDir}/ + src/scoring/data/VRECAL1_B0_RESULTS.json`);
  } else {
    console.log('\n══════════════════════════════════════════════════════════════════════');
    console.log('  ❌ MacroSScore BRIDGE FAIL — certains axes nécessitent LLM');
    console.log('══════════════════════════════════════════════════════════════════════');
    const sessionDir = path.join('sessions', `VRECAL1_B0_PARTIAL_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, 'prose.txt'), fullProse);
    console.log(`\nProse saved: ${sessionDir}/prose.txt`);
  }
}

main().catch(console.error);
