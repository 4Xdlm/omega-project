/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — GENIUS COMPOSITE SCORER (P8)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: phonetic/genius-scorer.ts
 * Phase: P8 (orchestrator — depends on P2, P3, P4, P5, P6, P7)
 * Invariant: ART-GENIUS-P8
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Orchestrates the 5 GENIUS axes into a composite literary quality score:
 *
 *   1. DENSITY    (P5) — lexical compression, vocabulary richness
 *   2. SURPRISE   (P6) — unpredictability, lexical freshness
 *   3. INEVITABILITY (P7) — retrospective coherence, thematic threading
 *   4. RESONANCE  (P2) — rhythmic quality, prosodic variation
 *   5. VOICE      (P3+P4) — euphonic quality, anti-calque purity
 *
 * Architecture:
 *   - Calls each sub-analyzer independently
 *   - Normalizes each axis to 0-100
 *   - Applies weighted combination (weights = SYMBOLS, uncalibrated)
 *   - Computes anti-correlation penalties (axes shouldn't collapse into same signal)
 *   - Produces per-axis breakdown + composite GENIUS score
 *
 * CRITICAL NON-GOAL:
 *   The GENIUS score is NOT a quality gate. It is DIAGNOSTIC ONLY.
 *   No certification decision shall be based on this score until
 *   corpus calibration validates the weights and thresholds.
 *
 * VALIDITY CLAIM:
 *   metric: "genius_composite_fr"
 *   originalDomain: "multi-dimensional text analysis"
 *   appliedDomain: "French prose quality diagnostic"
 *   assumption: "5 independent axes capture orthogonal quality dimensions"
 *   validationStatus: "UNVALIDATED"
 *   confidenceWeight: 0.4
 *   nonGoal: "DIAGNOSTIC ONLY — not a certification gate"
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { analyzeDensity, type DensityAnalysis } from './semantic-density.js';
import { analyzeSurprise, type SurpriseAnalysis } from './surprise-analyzer.js';
import { analyzeInevitability, type InevitabilityAnalysis } from './inevitability-analyzer.js';
import { analyzeRhythm, type RhythmV2Analysis } from './npvi-calculator.js';
import { analyzeEuphony, type EuphonyAnalysis } from './euphony-detector.js';
import { analyzeCalques, type CalqueAnalysis } from './calque-detector.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AxisScore {
  /** Axis name */
  readonly name: string;
  /** Normalized score (0-100) */
  readonly score: number;
  /** Weight in composite (0-1) — SYMBOL, uncalibrated */
  readonly weight: number;
  /** Weighted contribution to composite */
  readonly contribution: number;
  /** Confidence level of this axis (0-1) */
  readonly confidence: number;
}

export interface GeniusAnalysis {
  /** Composite GENIUS score (0-100) — DIAGNOSTIC ONLY */
  readonly geniusScore: number;

  /** Per-axis breakdown */
  readonly axes: {
    readonly density: AxisScore;
    readonly surprise: AxisScore;
    readonly inevitability: AxisScore;
    readonly resonance: AxisScore;
    readonly voice: AxisScore;
  };

  /** Anti-correlation penalty (0-100): penalizes if axes are too correlated */
  readonly antiCorrelationPenalty: number;

  /** Floor score: minimum of all axes (weakest link) */
  readonly floorScore: number;

  /** Ceiling score: maximum of all axes (strongest dimension) */
  readonly ceilingScore: number;

  /** Spread: ceiling - floor (0 = uniform, high = imbalanced) */
  readonly spread: number;

  /** Raw sub-analyses (for deep inspection) */
  readonly raw: {
    readonly density: DensityAnalysis;
    readonly surprise: SurpriseAnalysis;
    readonly inevitability: InevitabilityAnalysis;
    readonly rhythm: RhythmV2Analysis;
    readonly euphony: EuphonyAnalysis;
    readonly calques: CalqueAnalysis;
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS WEIGHTS (SYMBOLS — uncalibrated)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Axis weights — CALIBRATED v1 based on benchmark 2026-02-21.
 *
 * Discrimination power (Human vs AI, 10+10 corpus):
 *   resonance:     Δ = +32.4  → highest weight
 *   density:       Δ = +10.5  → second
 *   voice:         Δ = +6.0   → moderate
 *   surprise:      Δ = +5.6   → moderate
 *   inevitability: Δ = -4.3   → broken for short texts, minimal weight
 *
 * Sum = 1.0
 */
const DEFAULT_WEIGHTS = {
  density: 0.25,
  surprise: 0.15,
  inevitability: 0.05,
  resonance: 0.35,
  voice: 0.20,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// AXIS NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Normalize Density axis to 0-100.
 * Uses P5 densityScore directly (already 0-100).
 */
function normalizeDensity(d: DensityAnalysis): number {
  return Math.max(0, Math.min(100, d.densityScore));
}

/**
 * Normalize Surprise axis to 0-100.
 * Uses P6 surpriseScore directly (already 0-100).
 */
function normalizeSurprise(s: SurpriseAnalysis): number {
  return Math.max(0, Math.min(100, s.surpriseScore));
}

/**
 * Normalize Inevitability axis to 0-100.
 * Uses P7 inevitabilityScore directly (already 0-100).
 */
function normalizeInevitability(i: InevitabilityAnalysis): number {
  return Math.max(0, Math.min(100, i.inevitabilityScore));
}

/**
 * Normalize Resonance axis to 0-100.
 * Based on P2 nPVI (normalized Pairwise Variability Index).
 *
 * nPVI for French literary prose: ~40-65 is the target range.
 * 0 = monotone, 33 = machine-like, 50 = ideal, 80+ = erratic.
 * Map via inverted U-curve: peak at 50, drops at extremes.
 */
function normalizeResonance(r: RhythmV2Analysis): number {
  const npvi = r.npvi_weighted;
  // French is syllable-timed: literary nPVI typically 20-40
  // Peak at 30, with wide plateau 15-50
  const ideal = 30;
  const sigma = 25;
  const score = 100 * Math.exp(-((npvi - ideal) ** 2) / (2 * sigma ** 2));
  return Math.round(Math.max(0, Math.min(100, score)));
}

/**
 * Normalize Voice axis to 0-100.
 * Combines P3 euphony (positive) and P4 calque penalty (negative).
 *
 * voice = euphonyScore × (1 - calquePenalty)
 */
function normalizeVoice(e: EuphonyAnalysis, c: CalqueAnalysis): number {
  const euphony = Math.max(0, Math.min(100, e.euphonyScore));
  const calquePenalty = Math.max(0, Math.min(1, c.penalty));
  const voice = euphony * (1 - calquePenalty);
  return Math.round(Math.max(0, Math.min(100, voice)));
}

// ═══════════════════════════════════════════════════════════════════════════════
// ANTI-CORRELATION CHECK
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute anti-correlation penalty.
 *
 * If two axes produce very similar scores (Pearson correlation > 0.95),
 * they may be measuring the same underlying signal.
 * Penalty = number of highly correlated pairs × 5.
 *
 * With only 5 values per text, this is a coarse diagnostic.
 * The real anti-correlation analysis requires a corpus of texts.
 *
 * For now: simple check — if spread < 5, all axes collapsed → penalty.
 */
function computeAntiCorrelationPenalty(scores: readonly number[]): number {
  if (scores.length < 2) return 0;

  // Check if all scores are too similar (collapsed)
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const spread = max - min;

  // If spread < 5 points, axes are essentially measuring the same thing
  if (spread < 5) return 10;
  if (spread < 10) return 5;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCORER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute GENIUS composite score for French prose.
 *
 * @param text - French prose to analyze
 * @returns GeniusAnalysis — DIAGNOSTIC ONLY
 */
export function scoreGenius(text: string): GeniusAnalysis {
  // ─── Early return for empty/non-textual input ───
  const emptyAxis = (name: string, weight: number): AxisScore => ({
    name, score: 0, weight, contribution: 0, confidence: 0,
  });

  if (!text || text.trim().length === 0 || !/[a-zA-ZàâäéèêëïîôùûüÿœæçñÀÂÄÉÈÊËÏÎÔÙÛÜŸŒÆÇÑ]/.test(text)) {
    const emptyAxes = {
      density: emptyAxis('Density', DEFAULT_WEIGHTS.density),
      surprise: emptyAxis('Surprise', DEFAULT_WEIGHTS.surprise),
      inevitability: emptyAxis('Inevitability', DEFAULT_WEIGHTS.inevitability),
      resonance: emptyAxis('Resonance', DEFAULT_WEIGHTS.resonance),
      voice: emptyAxis('Voice', DEFAULT_WEIGHTS.voice),
    };
    return {
      geniusScore: 0,
      axes: emptyAxes,
      antiCorrelationPenalty: 0,
      floorScore: 0,
      ceilingScore: 0,
      spread: 0,
      raw: {
        density: analyzeDensity(text),
        surprise: analyzeSurprise(text),
        inevitability: analyzeInevitability(text),
        rhythm: analyzeRhythm(text),
        euphony: analyzeEuphony(text),
        calques: analyzeCalques(text),
      },
    };
  }

  // ─── Run all sub-analyzers ───
  const densityRaw = analyzeDensity(text);
  const surpriseRaw = analyzeSurprise(text);
  const inevitabilityRaw = analyzeInevitability(text);

  // P2 needs text (segments internally via P1)
  const rhythmRaw = analyzeRhythm(text);

  const euphonyRaw = analyzeEuphony(text);
  const calquesRaw = analyzeCalques(text);

  // ─── Normalize axes ───
  const densityScore = normalizeDensity(densityRaw);
  const surpriseScore = normalizeSurprise(surpriseRaw);
  const inevitabilityScore = normalizeInevitability(inevitabilityRaw);
  const resonanceScore = normalizeResonance(rhythmRaw);
  const voiceScore = normalizeVoice(euphonyRaw, calquesRaw);

  const scores = [densityScore, surpriseScore, inevitabilityScore, resonanceScore, voiceScore];

  // ─── Build axis details ───
  const axes = {
    density: {
      name: 'Density',
      score: densityScore,
      weight: DEFAULT_WEIGHTS.density,
      contribution: Math.round(densityScore * DEFAULT_WEIGHTS.density * 100) / 100,
      confidence: 0.7,
    },
    surprise: {
      name: 'Surprise',
      score: surpriseScore,
      weight: DEFAULT_WEIGHTS.surprise,
      contribution: Math.round(surpriseScore * DEFAULT_WEIGHTS.surprise * 100) / 100,
      confidence: 0.6,
    },
    inevitability: {
      name: 'Inevitability',
      score: inevitabilityScore,
      weight: DEFAULT_WEIGHTS.inevitability,
      contribution: Math.round(inevitabilityScore * DEFAULT_WEIGHTS.inevitability * 100) / 100,
      confidence: 0.5,
    },
    resonance: {
      name: 'Resonance',
      score: resonanceScore,
      weight: DEFAULT_WEIGHTS.resonance,
      contribution: Math.round(resonanceScore * DEFAULT_WEIGHTS.resonance * 100) / 100,
      confidence: 0.7,
    },
    voice: {
      name: 'Voice',
      score: voiceScore,
      weight: DEFAULT_WEIGHTS.voice,
      contribution: Math.round(voiceScore * DEFAULT_WEIGHTS.voice * 100) / 100,
      confidence: 0.6,
    },
  };

  // ─── Composite score ───
  const antiCorrelationPenalty = computeAntiCorrelationPenalty(scores);

  const rawComposite =
    axes.density.contribution +
    axes.surprise.contribution +
    axes.inevitability.contribution +
    axes.resonance.contribution +
    axes.voice.contribution;

  const geniusScore = Math.round(
    Math.max(0, Math.min(100, rawComposite - antiCorrelationPenalty))
  );

  const floorScore = Math.min(...scores);
  const ceilingScore = Math.max(...scores);

  return {
    geniusScore,
    axes,
    antiCorrelationPenalty,
    floorScore,
    ceilingScore,
    spread: ceilingScore - floorScore,
    raw: {
      density: densityRaw,
      surprise: surpriseRaw,
      inevitability: inevitabilityRaw,
      rhythm: rhythmRaw,
      euphony: euphonyRaw,
      calques: calquesRaw,
    },
  };
}
