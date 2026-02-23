/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — S-ORACLE V2 (9 axes, OFFLINE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/s-oracle-v2.ts
 * Version: 2.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * 9 axes, ALL CALC — 0 LLM — fully deterministic.
 * Score composite = Σ(raw × weight) / Σ(weight) × 100
 *
 * INV-S-EMOTION-60: poids émotion ≥ 60%
 * INV-S-ORACLE-01: déterminisme total
 *
 * OFFLINE-HEURISTIC: All axes use text-based heuristics.
 * Axes that were LLM-based in V1 use keyword/regex approximations.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, DeltaReport } from '../types.js';
import type { DeltaComputerOutput } from '../delta/delta-computer.js';
import { sha256, canonicalize } from '@omega/canon-kernel';
import { computeStyleDelta } from '../delta/delta-style.js';
import { computeClicheDelta } from '../delta/delta-cliche.js';
import { SOVEREIGN_CONFIG } from '../config.js';
import {
  analyzeEmotionFromText,
  cosineSimilarity14D,
  euclideanDistance14D,
} from '@omega/omega-forge';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AxisScoreV2 {
  readonly name: string;
  readonly weight: number;
  readonly raw: number;       // [0-1]
  readonly weighted: number;  // raw × weight
}

export interface SScoreV2 {
  readonly axes: readonly AxisScoreV2[];
  readonly composite: number;           // [0-100]
  readonly emotion_weight_ratio: number; // ≥ 0.60
  readonly verdict: 'SEAL' | 'REJECT';
  readonly rejection_reason?: string;
  readonly s_score_hash: string;
  readonly scored_at: string; // hors hash
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS WEIGHTS — 9 axes
// ═══════════════════════════════════════════════════════════════════════════════

interface AxisDef {
  readonly name: string;
  readonly weight: number;
  readonly isEmotion: boolean;
}

const AXES: readonly AxisDef[] = [
  { name: 'tension_14d',              weight: 3.0, isEmotion: true },
  { name: 'coherence_emotionnelle',   weight: 2.5, isEmotion: true },
  { name: 'interiorite',              weight: 2.0, isEmotion: true },
  { name: 'impact_ouverture_cloture', weight: 2.0, isEmotion: true },
  { name: 'densite_sensorielle',      weight: 1.5, isEmotion: false },
  { name: 'necessite_m8',             weight: 1.0, isEmotion: false },
  { name: 'anti_cliche',              weight: 1.0, isEmotion: false },
  { name: 'rythme_musical',           weight: 1.0, isEmotion: false },
  { name: 'signature',                weight: 1.0, isEmotion: false },
];

const TOTAL_WEIGHT = AXES.reduce((s, a) => s + a.weight, 0); // 15.0
const EMOTION_WEIGHT = AXES.filter((a) => a.isEmotion).reduce((s, a) => s + a.weight, 0); // 9.5

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS SCORERS — all CALC, OFFLINE-HEURISTIC
// ═══════════════════════════════════════════════════════════════════════════════

/** AXE 1: tension_14d — OFFLINE-HEURISTIC: keyword-based 14D analysis */
function scoreTension14dOffline(prose: string, packet: ForgePacket): number {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const total = paragraphs.length;
  if (total === 0) return 0;

  const bounds = SOVEREIGN_CONFIG.QUARTILE_BOUNDS;
  const quartiles = ['Q1', 'Q2', 'Q3', 'Q4'] as const;
  const similarities: number[] = [];

  for (let i = 0; i < 4; i++) {
    const [startFrac, endFrac] = bounds[quartiles[i]];
    const startIdx = Math.floor(startFrac * total);
    const endIdx = Math.ceil(endFrac * total);
    const quartileText = paragraphs.slice(startIdx, endIdx).join('\n\n');
    const actual = analyzeEmotionFromText(quartileText, packet.language);
    const target = packet.emotion_contract.curve_quartiles[i].target_14d;
    similarities.push(cosineSimilarity14D(target as any, actual as any));
  }

  const avg = similarities.reduce((a, b) => a + b, 0) / similarities.length;

  // Inverted distance: high similarity → high score
  // Scale to [0, 1]
  return Math.max(0, Math.min(1, avg));
}

/** AXE 2: coherence_emotionnelle — OFFLINE-HEURISTIC: 14D paragraph transitions */
function scoreCoherenceEmotionnelle(prose: string, packet: ForgePacket): number {
  const paragraphs = prose.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  if (paragraphs.length < 2) return 0.5;

  const states = paragraphs.map((p) => analyzeEmotionFromText(p, packet.language));
  let brutalJumps = 0;

  for (let i = 0; i < states.length - 1; i++) {
    const dist = euclideanDistance14D(states[i], states[i + 1]);
    if (dist > SOVEREIGN_CONFIG.MAX_PARAGRAPH_DISTANCE) {
      brutalJumps++;
    }
  }

  if (brutalJumps === 0) return 1.0;
  if (brutalJumps === 1) return 0.70;
  if (brutalJumps === 2) return 0.50;
  return 0;
}

/** AXE 3: interiorite — OFFLINE-HEURISTIC: interior monologue markers */
function scoreInteriorite(prose: string): number {
  const markers = [
    'pensait', 'songeait', 'se demandait', 'se disait', 'réfléchissait',
    'imaginait', 'sentait que', 'savait que', 'comprenait', 'réalisait',
    'thought', 'wondered', 'felt that', 'knew that', 'realized',
    'mémoire', 'souvenir', 'conscience', 'esprit', 'âme',
    'memory', 'consciousness', 'mind', 'soul',
  ];

  const proseLower = prose.toLowerCase();
  const words = prose.split(/\s+/).length;
  let markerCount = 0;

  for (const marker of markers) {
    const regex = new RegExp(marker, 'gi');
    const matches = proseLower.match(regex);
    if (matches) markerCount += matches.length;
  }

  // Density: markers per 100 words
  const density = (markerCount / Math.max(1, words)) * 100;

  // Score: 0 markers → 0.2 (some base), 3+ per 100w → 1.0
  if (density >= 3) return 1.0;
  if (density >= 2) return 0.80;
  if (density >= 1) return 0.60;
  if (density >= 0.5) return 0.40;
  return 0.20;
}

/** AXE 4: impact_ouverture_cloture — OFFLINE-HEURISTIC: opening/closing strength */
function scoreImpact(prose: string): number {
  const sentences = prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  if (sentences.length < 2) return 0.3;

  const opening = sentences[0];
  const closing = sentences[sentences.length - 1];

  let openingScore = 0;
  let closingScore = 0;

  // Opening: short and punchy? Specific? Sensory?
  const openingWords = opening.split(/\s+/).length;
  if (openingWords <= 12) openingScore += 0.3;  // concise
  if (/[!?]/.test(opening)) openingScore += 0.1; // punctuation impact
  if (/\b(ombre|lumière|froid|chaud|silence|bruit|sang|fer|pierre)\b/i.test(opening)) openingScore += 0.2; // sensory
  if (openingWords >= 3) openingScore += 0.2; // not trivially short
  openingScore = Math.min(1, openingScore);

  // Closing: resonant? Not summary?
  const closingWords = closing.split(/\s+/).length;
  if (closingWords <= 15) closingScore += 0.2;
  if (/[.!]$/.test(prose.trim())) closingScore += 0.1;
  if (/\b(silence|attente|ombre|debout|seul|vide|fin|jamais)\b/i.test(closing)) closingScore += 0.3; // resonant
  if (closingWords >= 3) closingScore += 0.2;
  closingScore = Math.min(1, closingScore);

  return (openingScore + closingScore) / 2;
}

/** AXE 5: densite_sensorielle — CALC: sensory marker count */
function scoreDensiteSensorielle(prose: string, packet: ForgePacket): number {
  const styleDelta = computeStyleDelta(packet, prose);
  const density = styleDelta.sensory_density_actual;
  const target = SOVEREIGN_CONFIG.SENSORY_DENSITY_OPTIMAL;

  // Score = density / target, clamped to [0, 1]
  return Math.max(0, Math.min(1, density / target));
}

/** AXE 6: necessite_m8 — OFFLINE-HEURISTIC: essential vs redundant words ratio */
function scoreNecessite(prose: string): number {
  const redundantPatterns = [
    /\b(très|vraiment|absolument|totalement|complètement|extrêmement)\b/gi,
    /\b(very|really|absolutely|totally|completely|extremely)\b/gi,
    /\b(en fait|à vrai dire|il faut dire|force est de)\b/gi,
    /\b(actually|in fact|to be honest|it must be said)\b/gi,
  ];

  const words = prose.split(/\s+/).length;
  let redundantCount = 0;

  for (const pattern of redundantPatterns) {
    const matches = prose.match(pattern);
    if (matches) redundantCount += matches.length;
  }

  const redundantRatio = redundantCount / Math.max(1, words);

  // Low redundancy → high score
  if (redundantRatio === 0) return 1.0;
  if (redundantRatio < 0.02) return 0.85;
  if (redundantRatio < 0.05) return 0.65;
  if (redundantRatio < 0.10) return 0.40;
  return 0.20;
}

/** AXE 7: anti_cliche — CALC: kill list matching */
function scoreAntiCliqueOffline(prose: string, packet: ForgePacket): number {
  const clicheDelta = computeClicheDelta(packet, prose);
  const total = clicheDelta.total_matches;

  // 1 - (nb_matches / nb_phrases)
  const sentences = prose.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const nbPhrases = Math.max(1, sentences.length);

  return Math.max(0, Math.min(1, 1 - (total / nbPhrases)));
}

/** AXE 8: rythme_musical — CALC: sentence length variance */
function scoreRythmeMusical(prose: string): number {
  const sentences = prose.split(/[.!?]+/).map((s) => s.trim()).filter((s) => s.length > 0);
  const wordCounts = sentences.map((s) => s.split(/\s+/).filter((w) => w.length > 0).length);

  if (wordCounts.length < 2) return 0.3;

  const mean = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;
  if (mean === 0) return 0;

  const variance = wordCounts.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / wordCounts.length;
  const cv = Math.sqrt(variance) / mean;

  // Optimal CV around 0.65 for French literary prose
  // Score peaks at CV=0.65, drops toward 0 and 1.5
  const distFromPeak = Math.abs(cv - 0.65);
  const maxDist = 0.65;
  const score = Math.max(0, 1 - distFromPeak / maxDist);

  return score;
}

/** AXE 9: signature — CALC: genome marker overlap */
function scoreSignatureOffline(prose: string, packet: ForgePacket): number {
  const signatureWords = packet.style_genome.lexicon.signature_words;
  if (signatureWords.length === 0) return 0.5;

  const proseLower = prose.toLowerCase();
  let hits = 0;

  for (const word of signatureWords) {
    if (proseLower.includes(word.toLowerCase())) {
      hits++;
    }
  }

  return Math.min(1, hits / signatureWords.length);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function scoreV2(
  prose: string,
  packet: ForgePacket,
  delta?: DeltaComputerOutput,
): SScoreV2 {
  const rawScores: number[] = [
    scoreTension14dOffline(prose, packet),
    scoreCoherenceEmotionnelle(prose, packet),
    scoreInteriorite(prose),
    scoreImpact(prose),
    scoreDensiteSensorielle(prose, packet),
    scoreNecessite(prose),
    scoreAntiCliqueOffline(prose, packet),
    scoreRythmeMusical(prose),
    scoreSignatureOffline(prose, packet),
  ];

  const axes: AxisScoreV2[] = AXES.map((def, i) => ({
    name: def.name,
    weight: def.weight,
    raw: rawScores[i],
    weighted: rawScores[i] * def.weight,
  }));

  const sumWeighted = axes.reduce((s, a) => s + a.weighted, 0);
  const composite = (sumWeighted / TOTAL_WEIGHT) * 100;
  const emotionWeightRatio = EMOTION_WEIGHT / TOTAL_WEIGHT;

  // Verdict logic
  let verdict: 'SEAL' | 'REJECT' = 'SEAL';
  let rejectionReason: string | undefined;

  if (composite < 92) {
    verdict = 'REJECT';
    rejectionReason = 'composite_below_threshold';
  }

  // Axis floor check: any axis raw < 0.50 → REJECT
  for (const axis of axes) {
    if (axis.raw * 100 < 50) {
      verdict = 'REJECT';
      rejectionReason = `axis_floor_violation: ${axis.name}`;
      break;
    }
  }

  const hashable = {
    axes: axes.map((a) => ({ name: a.name, raw: a.raw, weighted: a.weighted })),
    composite,
    emotion_weight_ratio: emotionWeightRatio,
    verdict,
  };

  return {
    axes,
    composite,
    emotion_weight_ratio: emotionWeightRatio,
    verdict,
    rejection_reason: rejectionReason,
    s_score_hash: sha256(canonicalize(hashable)),
    scored_at: new Date().toISOString(),
  };
}
