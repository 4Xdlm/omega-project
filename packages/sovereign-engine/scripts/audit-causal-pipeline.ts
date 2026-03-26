/**
 * OMEGA — AUDIT CAUSAL PIPELINE — 6 BLOCS
 * Mesurer AVANT de corriger — Zero modification de code de prod
 *
 * Bloc A: Score du draft K2 complet (2300w)
 * Bloc B: Fenetres isometriques 500w
 * Bloc C: A/B token budget applyPatch 2000 vs 8000
 * Bloc D: Ablation SovereignLoop — draft complet dans le Duel
 * Bloc E: Fidelite du patch — le LLM resume-t-il ?
 * Bloc F: Biais de longueur du scorer — correlation words vs score
 *
 * Budget : ~60-80 API calls
 * Standard : NASA-Grade L4 / DO-178C Level A
 */

process.env.OMEGA_CHUNKED_V4 = '1';
process.env.OMEGA_PROMPT_V4 = '1';

import { generateChunkedDraft } from '../src/generation/chunked-generator.js';
import { judgeAestheticV3 } from '../src/oracle/aesthetic-oracle.js';
import { runDuel } from '../src/duel/duel-engine.js';
import { generateSymbolMap } from '../src/symbol/symbol-mapper.js';
import { bridgeSignatureFromSymbolMap } from '../src/input/signature-bridge.js';
import { buildSovereignPrompt_V4 } from '../src/input/prompt-assembler-v4.js';
import { forgePacketToSceneBrief } from '../src/generation/forge-to-brief.js';
import { createAnthropicProvider } from '../src/runtime/anthropic-provider.js';
import { computeQuickFeatures } from '../src/telemetry/pipeline-telemetry.js';
import type { ForgePacket, SovereignProvider } from '../src/types.js';
import type { SymbolMap } from '../src/symbol/symbol-map-types.js';
import type { MacroSScore } from '../src/oracle/s-score.js';
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

// ═══ 2 SCENES ═══

interface SceneConfig {
  id: string; label: string; scene_goal: string; story_goal: string;
  conflict_type: string; dominant_q1: string; dominant_q3: string; dominant_q4: string;
  beats: Array<{ id: string; action: string; sensory: string[] }>;
  signature_words: string[]; motifs: string[];
}

const SCENES: SceneConfig[] = [
  {
    id: 'contemplation', label: 'Contemplation',
    scene_goal: 'Une femme attend quelqu\'un qui ne viendra pas',
    story_goal: 'Explorer la solitude et la memoire',
    conflict_type: 'internal',
    dominant_q1: 'anticipation', dominant_q3: 'sadness', dominant_q4: 'sadness',
    beats: [
      { id: 'b1', action: 'Elle prepare du the dans la cuisine froide', sensory: ['touch', 'sound'] },
      { id: 'b2', action: 'Elle regarde la mer par la fenetre', sensory: ['sight'] },
      { id: 'b3', action: 'Un souvenir d\'ete remonte', sensory: ['sound', 'smell'] },
      { id: 'b4', action: 'La nuit tombe, elle ne bouge pas', sensory: ['sight', 'touch'] },
    ],
    signature_words: ['silence','ombre','souffle','lumiere','eau','pierre','froid','vent','sel','vide'],
    motifs: ['mer','vent','lumiere declinante'],
  },
  {
    id: 'menace', label: 'Menace',
    scene_goal: 'Elle comprend qu\'elle n\'est pas seule dans les bois',
    story_goal: 'La peur primitive et l\'instinct de survie',
    conflict_type: 'external',
    dominant_q1: 'anticipation', dominant_q3: 'fear', dominant_q4: 'fear',
    beats: [
      { id: 'b1', action: 'Elle marche sur le sentier au crepuscule', sensory: ['sight', 'sound'] },
      { id: 'b2', action: 'Un bruit de branche cassee derriere elle', sensory: ['sound'] },
      { id: 'b3', action: 'Elle accelere, son coeur bat plus fort', sensory: ['touch', 'sound'] },
      { id: 'b4', action: 'Elle atteint la lisiere', sensory: ['sight'] },
    ],
    signature_words: ['ombre','branche','souffle','silence','froid','terre','pas','nuit','peau','sang'],
    motifs: ['foret','crepuscule','ombre'],
  },
];

function buildPacket(scene: SceneConfig): ForgePacket {
  return {
    packet_id: `FORGE_audit_${scene.id}`, packet_hash: 'a'.repeat(64),
    scene_id: `audit_${scene.id}`, run_id: `audit_${scene.id}_${Date.now()}`,
    quality_tier: 'sovereign', language: 'fr',
    intent: { story_goal: scene.story_goal, scene_goal: scene.scene_goal, conflict_type: scene.conflict_type, pov: 'third_limited', tense: 'past', target_word_count: 2500 },
    emotion_contract: {
      curve_quartiles: [
        { quartile: 'Q1', target_14d: dominant14D(scene.dominant_q1), valence: -0.1, arousal: 0.3, dominant: scene.dominant_q1, narrative_instruction: 'Installation' },
        { quartile: 'Q2', target_14d: dominant14D(scene.dominant_q3, 0.35), valence: -0.2, arousal: 0.4, dominant: scene.dominant_q3, narrative_instruction: 'Montee' },
        { quartile: 'Q3', target_14d: dominant14D(scene.dominant_q3), valence: -0.4, arousal: 0.6, dominant: scene.dominant_q3, narrative_instruction: 'Climax' },
        { quartile: 'Q4', target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, narrative_instruction: 'Resolution' },
      ],
      intensity_range: { min: 0.2, max: 0.6 },
      tension: { slope_target: 'arc', pic_position_pct: 0.65, faille_position_pct: 0.80, silence_zones: [] },
      terminal_state: { target_14d: dominant14D(scene.dominant_q4, 0.40), valence: -0.2, arousal: 0.3, dominant: scene.dominant_q4, reader_state: 'Resolution' },
      rupture: { exists: false, position_pct: 0, before_dominant: scene.dominant_q3, after_dominant: scene.dominant_q4, delta_valence: 0 },
      valence_arc: { start: -0.1, end: -0.2, direction: 'darkening' },
    },
    beats: scene.beats.map((b, i) => ({ beat_id: b.id, beat_order: i, action: b.action, dialogue: '', subtext_type: i === 2 ? 'pivot' as const : 'progression' as const, emotion_instruction: '', sensory_tags: b.sensory, canon_refs: [] })),
    subtext: { layers: [{ layer_id: 'l1', type: 'absence', statement: 'Quelque chose manque', visibility: 'buried' }], tension_type: 'absence', tension_intensity: 0.4 },
    sensory: {
      density_target: 3,
      categories: [
        { category: 'sight', min_count: 2, signature_words: [] }, { category: 'sound', min_count: 2, signature_words: [] },
        { category: 'touch', min_count: 1, signature_words: [] }, { category: 'smell', min_count: 1, signature_words: [] },
        { category: 'taste', min_count: 0, signature_words: [] }, { category: 'proprioception', min_count: 0, signature_words: [] },
        { category: 'interoception', min_count: 1, signature_words: [] },
      ],
      recurrent_motifs: scene.motifs, banned_metaphors: [],
    },
    style_genome: {
      version: '1.0.0', universe: 'literary_fiction',
      lexicon: { signature_words: scene.signature_words, forbidden_words: ['soudainement','mysterieusement','bizarrement'], abstraction_max_ratio: 0.20, concrete_min_ratio: 0.60 },
      rhythm: { avg_sentence_length_target: 18, gini_target: 0.45, max_consecutive_similar: 2, min_syncopes_per_scene: 2, min_compressions_per_scene: 1 },
      tone: { dominant_register: 'soutenu', intensity_range: [0.2, 0.6] },
      imagery: { recurrent_motifs: scene.motifs, density_target_per_100_words: 3, banned_metaphors: [] },
    },
    kill_lists: { banned_words: ['soudain','soudainement','mysterieusement'], banned_cliches: ['coeur de pierre','mer d\'emotions','silence assourdissant'], banned_ai_patterns: ['il ne pouvait s\'empecher de','une vague de','un frisson parcourut'], banned_filter_words: ['effectivement','neanmoins','toutefois'] },
    canon: [], continuity: { previous_scene_summary: '', character_states: [], open_threads: [] },
    seeds: { llm_seed: `audit_${scene.id}`, determinism_level: 'absolute' },
    generation: { timestamp: new Date().toISOString(), generator_version: '4.0.0', constraints_hash: 'b'.repeat(64) },
  } as ForgePacket;
}

// ═══ HELPERS ═══

function countWords(t: string): number { return t.split(/\s+/).filter(w => w.length > 0).length; }

function extractScores(ms: MacroSScore) {
  return {
    composite: ms.composite, min_axis: ms.min_axis,
    ECC: ms.ecc_score, RCI: ms.macro_axes.rci.score,
    SII: ms.macro_axes.sii.score, IFI: ms.macro_axes.ifi.score,
    AAI: ms.macro_axes.aai.score,
  };
}

function fmtRow(label: string, words: number, mean: number, cv: number, f26b: number, comp?: number, min?: number, ecc?: number, rci?: number, sii?: number, ifi?: number, aai?: number): string {
  const c = comp !== undefined ? comp.toFixed(1).padStart(5) : '    —';
  const m = min !== undefined ? min.toFixed(1).padStart(5) : '    —';
  const e = ecc !== undefined ? ecc.toFixed(1).padStart(5) : '    —';
  const r = rci !== undefined ? rci.toFixed(1).padStart(5) : '    —';
  const si = sii !== undefined ? sii.toFixed(1).padStart(5) : '    —';
  const ii = ifi !== undefined ? ifi.toFixed(1).padStart(5) : '    —';
  const a = aai !== undefined ? aai.toFixed(1).padStart(5) : '    —';
  return `  ${label.padEnd(20)} ${String(words).padStart(5)} ${mean.toFixed(1).padStart(5)} ${cv.toFixed(3).padStart(6)} ${f26b.toFixed(3).padStart(6)} ${c} ${m} ${e} ${r} ${si} ${ii} ${a}`;
}

function splitIntoWindows(prose: string, windowCount: number): string[] {
  const paragraphs = prose.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  const perWindow = Math.ceil(paragraphs.length / windowCount);
  const windows: string[] = [];
  for (let i = 0; i < windowCount; i++) {
    const slice = paragraphs.slice(i * perWindow, (i + 1) * perWindow);
    if (slice.length > 0) windows.push(slice.join('\n\n'));
  }
  return windows;
}

function correlation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

// ═══ MAIN ═══

async function main() {
  console.log('═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — AUDIT CAUSAL PIPELINE — 6 BLOCS');
  console.log('  Mesurer AVANT de corriger — Zero modification de code');
  console.log('═══════════════════════════════════════════════════════════════════════');

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1); }

  const provider = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 2000,
  });

  const sessionDir = path.join('sessions', `AUDIT_CAUSAL_${new Date().toISOString().replace(/[:.]/g, '-').slice(0,19)}`);
  fs.mkdirSync(sessionDir, { recursive: true });

  const allData: Record<string, any> = {};

  // ═══════════════════════════════════════════════════════════════════════
  // PRE-WORK: generate drafts + symbol maps for both scenes
  // ═══════════════════════════════════════════════════════════════════════

  interface SceneData {
    packet: ForgePacket;
    enrichedPacket: ForgePacket;
    symbolMap: SymbolMap;
    prompt: string;
    draft: string;
    draftWords: number;
  }

  const sceneData: Record<string, SceneData> = {};

  for (const scene of SCENES) {
    console.log(`\n  Generating draft + symbolMap for ${scene.id}...`);
    const packet = buildPacket(scene);
    const symbolMap = await generateSymbolMap(packet, provider);
    const enrichedPacket = bridgeSignatureFromSymbolMap(packet, symbolMap);
    const promptObj = buildSovereignPrompt_V4(enrichedPacket, symbolMap);
    const promptText = promptObj.sections.map(s => s.content).join('\n\n');

    const sceneBrief = forgePacketToSceneBrief(enrichedPacket);
    const chunked = await generateChunkedDraft({
      sceneBrief,
      signatureWords: enrichedPacket.style_genome.lexicon.signature_words,
      language: enrichedPacket.language as 'fr' | 'en',
      seed: enrichedPacket.seeds.llm_seed,
    }, provider);

    sceneData[scene.id] = {
      packet, enrichedPacket, symbolMap,
      prompt: promptText,
      draft: chunked.prose,
      draftWords: chunked.total_words,
    };
    console.log(`  ${scene.id}: draft ${chunked.total_words}w, chunks [${chunked.words_per_chunk.join(', ')}]`);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC A — SCORER LE DRAFT K2 COMPLET
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC A — SCORE DU DRAFT K2 COMPLET ═══\n');
  console.log('  Brique              Words  Mean    CV     f26b   Comp   min   ECC   RCI   SII   IFI   AAI');
  console.log('  ─────────────────────────────────────────────────────────────────────────────────────────');

  const blocA: Record<string, any> = {};

  for (const scene of SCENES) {
    const sd = sceneData[scene.id];
    const ms = await judgeAestheticV3(sd.enrichedPacket, sd.draft, provider, sd.symbolMap);
    const s = extractScores(ms);
    const f = computeQuickFeatures(sd.draft);
    console.log(fmtRow(scene.id, sd.draftWords, f.f1_mean_sent_len, f.cv_sent, f.f26b_long_sent_rate, s.composite, s.min_axis, s.ECC, s.RCI, s.SII, s.IFI, s.AAI));
    blocA[scene.id] = { words: sd.draftWords, features: f, scores: s };
  }

  const avgCompA = Object.values(blocA).reduce((s: number, d: any) => s + d.scores.composite, 0) / SCENES.length;
  const verdictA = avgCompA > 90 ? 'BON' : avgCompA >= 85 ? 'MOYEN' : 'MAUVAIS';
  console.log(`\n  VERDICT A : Draft K2 complet = ${verdictA} (composite moyen=${avgCompA.toFixed(1)})`);
  allData.blocA = { data: blocA, verdict: verdictA, avg_composite: avgCompA };

  await new Promise(r => setTimeout(r, 3000));

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC B — FENETRES ISOMETRIQUES (500w extraites du draft)
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC B — FENETRES ISOMETRIQUES ═══\n');

  const blocB: Record<string, any> = {};

  for (const scene of SCENES) {
    console.log(`  ${scene.label.toUpperCase()}`);
    console.log('  Source              Words  Mean    CV     f26b   Comp   min   ECC   RCI   SII   IFI   AAI');
    console.log('  ─────────────────────────────────────────────────────────────────────────────────────────');

    const sd = sceneData[scene.id];
    const sA = blocA[scene.id].scores;
    const fA = blocA[scene.id].features;
    console.log(fmtRow('draft_complet', sd.draftWords, fA.f1_mean_sent_len, fA.cv_sent, fA.f26b_long_sent_rate, sA.composite, sA.min_axis, sA.ECC, sA.RCI, sA.SII, sA.IFI, sA.AAI));

    const windows = splitIntoWindows(sd.draft, 4);
    const windowResults: any[] = [];

    for (let i = 0; i < windows.length; i++) {
      const w = windows[i];
      const words = countWords(w);
      const ms = await judgeAestheticV3(sd.enrichedPacket, w, provider, sd.symbolMap);
      const s = extractScores(ms);
      const f = computeQuickFeatures(w);
      console.log(fmtRow(`fenetre_${i+1}`, words, f.f1_mean_sent_len, f.cv_sent, f.f26b_long_sent_rate, s.composite, s.min_axis, s.ECC, s.RCI, s.SII, s.IFI, s.AAI));
      windowResults.push({ words, features: f, scores: s });
    }

    blocB[scene.id] = { windows: windowResults };
    console.log();
  }

  const avgWindowComp = Object.values(blocB).flatMap((d: any) => d.windows.map((w: any) => w.scores.composite)).reduce((a: number, b: number) => a + b, 0) / (SCENES.length * 4);
  const verdictB = avgWindowComp > avgCompA + 2 ? 'MEILLEURES' : avgWindowComp < avgCompA - 2 ? 'PIRES' : 'EGALES';
  console.log(`  VERDICT B : Fenetres du draft ${verdictB} que le draft complet (fenetre avg=${avgWindowComp.toFixed(1)} vs draft=${avgCompA.toFixed(1)})`);
  allData.blocB = { data: blocB, verdict: verdictB, avg_window_composite: avgWindowComp };

  await new Promise(r => setTimeout(r, 3000));

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC C — A/B TOKEN BUDGET applyPatch
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC C — A/B TOKEN BUDGET applyPatch ═══\n');

  const blocC: Record<string, any> = {};

  const providerHigh = createAnthropicProvider({
    apiKey, model: 'claude-sonnet-4-20250514',
    judgeStable: false, draftTemperature: 0.75,
    judgeTemperature: 0.0, judgeTopP: 1.0, judgeMaxTokens: 8000,
  });

  const minimalPitch = {
    pitch_id: 'PATCH_audit_minimal',
    strategy: 'compression_musicality' as const,
    items: [{
      id: 'p1', zone: 'global', op: 'tighten_sentence_rhythm' as const,
      reason: 'Ameliorer legerement la musicalite',
      instruction: 'Ameliore legerement le rythme des 3 premieres phrases. NE CHANGE RIEN D\'AUTRE. Retourne le texte INTEGRALEMENT.',
      expected_gain: { axe: 'RCI', delta: 1.0 },
    }],
    total_expected_gain: 1.0,
  };

  for (const scene of SCENES) {
    const sd = sceneData[scene.id];
    const constraints = { canon: [] as string[], beats: sd.packet.beats.map(b => b.action) };

    console.log(`  ${scene.label.toUpperCase()}`);
    console.log('  Condition    MaxTok  Input_w  Output_w  Ratio   Mean    CV     f26b  Fin_propre');
    console.log('  ─────────────────────────────────────────────────────────────────────────────');

    const conditions: { label: string; prov: SovereignProvider; tokens: number }[] = [
      { label: 'A (2000t)', prov: provider, tokens: 2000 },
      { label: 'B (8000t)', prov: providerHigh, tokens: 8000 },
    ];

    const results: any[] = [];

    for (const cond of conditions) {
      try {
        const patched = await cond.prov.applyPatch(sd.draft, minimalPitch as any, constraints);
        const outWords = countWords(patched);
        const ratio = (outWords / sd.draftWords * 100);
        const f = computeQuickFeatures(patched);
        const lastChar = patched.trim().slice(-1);
        const finPropre = ['.', '!', '?', '…'].includes(lastChar) ? 'OUI' : 'NON';
        console.log(`  ${cond.label.padEnd(12)} ${String(cond.tokens).padStart(6)} ${String(sd.draftWords).padStart(7)} ${String(outWords).padStart(8)} ${ratio.toFixed(1).padStart(5)}%  ${f.f1_mean_sent_len.toFixed(1).padStart(5)} ${f.cv_sent.toFixed(3).padStart(6)} ${f.f26b_long_sent_rate.toFixed(3).padStart(6)}  ${finPropre}`);
        results.push({ condition: cond.label, tokens: cond.tokens, input_w: sd.draftWords, output_w: outWords, ratio, features: f, fin_propre: finPropre });
      } catch (err: any) {
        console.log(`  ${cond.label.padEnd(12)} ERROR: ${err.message?.slice(0, 60)}`);
        results.push({ condition: cond.label, error: err.message });
      }
    }

    blocC[scene.id] = results;
    console.log();
  }

  const ratioA = Object.values(blocC).flatMap((rs: any[]) => rs.filter((r: any) => r.condition === 'A (2000t)' && r.ratio).map((r: any) => r.ratio));
  const ratioB = Object.values(blocC).flatMap((rs: any[]) => rs.filter((r: any) => r.condition === 'B (8000t)' && r.ratio).map((r: any) => r.ratio));
  const avgRatioB = ratioB.length > 0 ? ratioB.reduce((a, b) => a + b, 0) / ratioB.length : 0;
  const verdictC = avgRatioB > 80 ? 'CONFIRME' : avgRatioB > 50 ? 'PARTIEL' : 'NON CONFIRME';
  console.log(`  VERDICT C : Bug token budget = ${verdictC} (ratio B moyen=${avgRatioB.toFixed(1)}%)`);
  allData.blocC = { data: blocC, verdict: verdictC, avg_ratio_B: avgRatioB };

  await new Promise(r => setTimeout(r, 3000));

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC D — ABLATION DU SOVEREIGN LOOP
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC D — ABLATION DU SOVEREIGN LOOP ═══\n');

  const blocD: Record<string, any> = {};

  for (const scene of SCENES) {
    const sd = sceneData[scene.id];
    console.log(`  ${scene.label.toUpperCase()} (sans loop, draft K2 complet en candidat [0])`);

    // runDuel with existingProse = draft K2 complet (skipping loop)
    const duelResult = await runDuel(sd.enrichedPacket, sd.prompt, provider, sd.draft, sd.symbolMap);

    console.log('  Candidate              Words  Comp   min    sel_score');
    console.log('  ─────────────────────────────────────────────────────');

    const candidates: any[] = [];
    for (const d of duelResult.drafts) {
      const words = countWords(d.prose);
      const comp = d.score.composite;
      // Approximate min_axis from draft score (not available in SScore v1)
      const selScore = comp; // simplified — real sel_score from v3 scoring in duel
      const isWinner = d.draft_id === duelResult.winner_id;
      console.log(`  ${isWinner ? '→' : ' '} ${d.mode.padEnd(22)} ${String(words).padStart(5)} ${comp.toFixed(1).padStart(5)}   —      —${isWinner ? '  ← WINNER' : ''}`);
      candidates.push({ mode: d.mode, words, composite: comp, winner: isWinner });
    }

    const winner = candidates.find(c => c.winner);
    const draftWins = winner?.mode === 'loop_refined';
    console.log(`\n  Winner: ${winner?.mode} (${draftWins ? 'DRAFT COMPLET GAGNE' : 'SINGLE-SHOT GAGNE'})\n`);

    blocD[scene.id] = { candidates, winner: winner?.mode, draft_wins: draftWins };
  }

  const draftWinsCount = Object.values(blocD).filter((d: any) => d.draft_wins).length;
  const verdictD = draftWinsCount >= SCENES.length ? 'GAGNE' : draftWinsCount === 0 ? 'PERD' : 'MIXTE';
  console.log(`  VERDICT D : Sans Loop, draft complet ${verdictD} (${draftWinsCount}/${SCENES.length})`);
  allData.blocD = { data: blocD, verdict: verdictD, draft_wins_count: draftWinsCount };

  await new Promise(r => setTimeout(r, 3000));

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC E — FIDELITE DU PATCH
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC E — FIDELITE DU PATCH ═══\n');

  const sd0 = sceneData['contemplation'];
  const constraints = { canon: [] as string[], beats: sd0.packet.beats.map(b => b.action) };

  let blocE: any = {};
  try {
    const patched = await providerHigh.applyPatch(sd0.draft, minimalPitch as any, constraints);

    const inWords = countWords(sd0.draft);
    const outWords = countWords(patched);
    const inSentences = sd0.draft.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const outSentences = patched.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const inParas = sd0.draft.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
    const outParas = patched.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

    console.log(`  Input:  ${inWords} mots, ${inSentences} phrases, ${inParas} paragraphes`);
    console.log(`  Output: ${outWords} mots, ${outSentences} phrases, ${outParas} paragraphes`);
    console.log(`  Conservation mots:    ${(outWords / inWords * 100).toFixed(1)}%`);
    console.log(`  Conservation phrases: ${(outSentences / inSentences * 100).toFixed(1)}%`);
    console.log(`  Conservation paras:   ${(outParas / inParas * 100).toFixed(1)}%`);

    const ratioMots = outWords / inWords;
    const verdictE = ratioMots > 0.85 ? 'FIDELE' : ratioMots > 0.50 ? 'COMPRESSE PARTIELLEMENT' : 'RESUME';
    console.log(`\n  VERDICT E : applyPatch = ${verdictE}`);
    blocE = { in_words: inWords, out_words: outWords, in_sentences: inSentences, out_sentences: outSentences, in_paras: inParas, out_paras: outParas, ratio: ratioMots, verdict: verdictE };
  } catch (err: any) {
    console.log(`  ERROR: ${err.message}`);
    blocE = { error: err.message, verdict: 'ERROR' };
  }
  allData.blocE = blocE;

  // ═══════════════════════════════════════════════════════════════════════
  // BLOC F — BIAIS DE LONGUEUR DU SCORER
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══ BLOC F — BIAIS DE LONGUEUR DU SCORER ═══\n');

  // Collect all (words, score) pairs from Bloc A + Bloc B
  const dataPoints: { words: number; ECC: number; RCI: number; SII: number; IFI: number; AAI: number; composite: number }[] = [];

  for (const scene of SCENES) {
    const a = blocA[scene.id];
    dataPoints.push({ words: a.words, ...a.scores });
    for (const w of blocB[scene.id].windows) {
      dataPoints.push({ words: w.words, ...w.scores });
    }
  }

  const ws = dataPoints.map(d => d.words);
  const axes = ['ECC', 'RCI', 'SII', 'IFI', 'AAI', 'composite'] as const;

  console.log('  Axe       r(words,score)  Biais');
  console.log('  ──────────────────────────────────');

  const blocF: Record<string, { r: number; biais: string }> = {};

  for (const axe of axes) {
    const scores = dataPoints.map(d => d[axe]);
    const r = correlation(ws, scores);
    const biais = r < -0.5 ? 'anti-long' : r > 0.5 ? 'anti-court' : 'neutre';
    console.log(`  ${axe.padEnd(10)} ${r.toFixed(3).padStart(6)}          ${biais}`);
    blocF[axe] = { r: Math.round(r * 1000) / 1000, biais };
  }

  const anyBias = Object.values(blocF).some(v => v.biais !== 'neutre');
  const verdictF = anyBias ? 'OUI' : 'NON';
  console.log(`\n  VERDICT F : Le scorer ${anyBias ? 'EST' : 'N\'EST PAS'} biaise par la longueur`);
  allData.blocF = { data: blocF, verdict: verdictF };

  // ═══════════════════════════════════════════════════════════════════════
  // RAPPORT FINAL — ARBRE DE DECISION
  // ═══════════════════════════════════════════════════════════════════════

  console.log('\n═══════════════════════════════════════════════════════════════════════');
  console.log('  OMEGA — AUDIT CAUSAL PIPELINE — VERDICTS');
  console.log('═══════════════════════════════════════════════════════════════════════\n');

  console.log(`  BLOC A : Draft K2 complet = ${verdictA} (composite=${avgCompA.toFixed(1)})`);
  console.log(`  BLOC B : Fenetres vs draft = ${verdictB} (fenetre=${avgWindowComp.toFixed(1)} vs draft=${avgCompA.toFixed(1)})`);
  console.log(`  BLOC C : Bug token budget = ${verdictC} (ratio B=${avgRatioB.toFixed(1)}%)`);
  console.log(`  BLOC D : Sans Loop, draft = ${verdictD} (${draftWinsCount}/${SCENES.length})`);
  console.log(`  BLOC E : applyPatch = ${blocE.verdict}`);
  console.log(`  BLOC F : Biais longueur scorer = ${verdictF}`);

  console.log('\n  ═══ ARBRE DE DECISION ═══\n');

  if (verdictA === 'BON' && verdictC === 'CONFIRME' && verdictD === 'GAGNE') {
    console.log('  → Le pipeline long est viable. Le bug token detruisait la qualite.');
    console.log('  → FIX : augmenter le budget applyPatch.');
  } else if (verdictA === 'BON' && verdictD === 'PERD' && verdictF === 'OUI') {
    console.log('  → Le draft est bon mais le scorer le penalise.');
    console.log('  → FIX : recalibrer le scorer pour les textes longs.');
  } else if ((verdictA === 'MOYEN' || verdictA === 'MAUVAIS') && verdictB === 'PIRES') {
    console.log('  → Les single-shots sont meilleurs par design.');
    console.log('  → DECISION : architecture brique courte + Linker.');
  } else if (verdictA === 'BON' && verdictD === 'PERD' && verdictF === 'NON') {
    console.log('  → Le draft est bon localement mais pas globalement.');
    console.log('  → INVESTIGATION : pourquoi la coherence globale chute ?');
  } else if (verdictC === 'NON CONFIRME' && blocE.verdict === 'RESUME') {
    console.log('  → Le LLM compresse volontairement, pas par manque de tokens.');
    console.log('  → FIX : modifier le prompt de patch.');
  } else {
    console.log('  → Situation mixte — analyse manuelle requise.');
    console.log(`    A=${verdictA} B=${verdictB} C=${verdictC} D=${verdictD} E=${blocE.verdict} F=${verdictF}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════════════');

  // Save JSON
  fs.writeFileSync(path.join(sessionDir, 'audit_results.json'), JSON.stringify(allData, null, 2));
  console.log(`\nSaved: ${sessionDir}/audit_results.json`);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
