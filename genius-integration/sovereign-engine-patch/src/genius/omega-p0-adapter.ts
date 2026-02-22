/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — omega-p0 ADAPTER
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/omega-p0-adapter.ts
 * Purpose: Bridge between @omega/phonetic-stack (omega-p0) and Sovereign Engine
 *
 * Responsibilities:
 *   1. Import scoreGenius() from compiled @omega/phonetic-stack
 *   2. Map GeniusAnalysis → individual axis scores (D, S, I, R, V)
 *   3. Compute G_new using calibrated weighted sum
 *   4. Produce dual comparison proof record
 *
 * Contract:
 *   - Input: raw text (string)
 *   - Output: OmegaP0Result with axis scores + G_new + proof metadata
 *   - Determinism: same text → same output (inherited from omega-p0)
 *
 * Invariant: ART-GENIUS-ADAPTER
 * Standard: NASA-Grade L4 / DO-178C Level A
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  scoreGenius,
  VERSION as P0_VERSION,
  SCORER_SCHEMA_VERSION as P0_SCHEMA,
  type GeniusAnalysis,
} from '@omega/phonetic-stack';
import { createHash } from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Scoring mode for the GENIUS pipeline */
export type GeniusScorerMode = 'legacy' | 'dual' | 'omegaP0';

/** omega-p0 axis result mapped to SE-compatible format */
export interface OmegaP0AxisScores {
  readonly D: number;
  readonly S: number;
  readonly I: number;
  readonly R: number;
  readonly V: number;
}

/** Complete omega-p0 result with proof metadata */
export interface OmegaP0Result {
  /** omega-p0 calibrated G score (weighted sum) */
  readonly G_new: number;

  /** Per-axis scores from omega-p0 */
  readonly axes: OmegaP0AxisScores;

  /** Calibrated weights used */
  readonly weights: {
    readonly D: number;
    readonly S: number;
    readonly I: number;
    readonly R: number;
    readonly V: number;
  };

  /** Full GeniusAnalysis from omega-p0 (for deep inspection) */
  readonly raw: GeniusAnalysis;

  /** Proof metadata */
  readonly proof: {
    readonly schema_version: string;
    readonly stack_version: string;
    readonly axis_def_hash: string;
  };
}

/** Dual comparison proof record (written to nexus/proof/) */
export interface DualProofRecord {
  readonly text_hash: string;
  readonly segments_hash: string;
  readonly G_old: number;
  readonly G_new: number;
  readonly delta: number;
  readonly axes_old: { D: number; S: number; I: number; R: number; V: number };
  readonly axes_new: { D: number; S: number; I: number; R: number; V: number };
  readonly verdict_old: string;
  readonly verdict_new: string;
  readonly schema_version_old: string;
  readonly schema_version_new: string;
  readonly axis_def_hash_old: string;
  readonly axis_def_hash_new: string;
  readonly delta_explain: readonly string[];
  readonly decision_mode: GeniusScorerMode;
  readonly timestamp: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Calibrated weights from benchmark 2026-02-21 (10H + 10AI corpus) */
const CALIBRATED_WEIGHTS = {
  D: 0.25,
  S: 0.15,
  I: 0.05,
  R: 0.35,
  V: 0.20,
} as const;

/** Legacy SE schema identifier */
const LEGACY_SCHEMA = 'GENIUS_SE_V1' as const;

/** Hash of the legacy axis definitions (geometric mean, equal weights) */
const LEGACY_AXIS_DEF_HASH = computeStaticHash(
  'geometric_mean_equal_weights:D=1/5,S=1/5,I=1/5,R=1/5,V=1/5'
);

/** Hash of the omega-p0 axis definitions (weighted sum, calibrated) */
const P0_AXIS_DEF_HASH = computeStaticHash(
  `weighted_sum:D=${CALIBRATED_WEIGHTS.D},S=${CALIBRATED_WEIGHTS.S},I=${CALIBRATED_WEIGHTS.I},R=${CALIBRATED_WEIGHTS.R},V=${CALIBRATED_WEIGHTS.V}`
);

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function computeStaticHash(input: string): string {
  return createHash('sha256').update(input).digest('hex').slice(0, 16);
}

function computeTextHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Run omega-p0 scoreGenius() and map results to SE-compatible format.
 *
 * Determinism: same text → same OmegaP0Result (no randomness).
 */
export function computeOmegaP0Scores(text: string): OmegaP0Result {
  const analysis = scoreGenius(text);

  // Map omega-p0 axis names → SE axis letters
  const axes: OmegaP0AxisScores = {
    D: analysis.axes.density.score,
    S: analysis.axes.surprise.score,
    I: analysis.axes.inevitability.score,
    R: analysis.axes.resonance.score,
    V: analysis.axes.voice.score,
  };

  // G_new = calibrated weighted sum (NOT geometric mean)
  const G_new =
    CALIBRATED_WEIGHTS.D * axes.D +
    CALIBRATED_WEIGHTS.S * axes.S +
    CALIBRATED_WEIGHTS.I * axes.I +
    CALIBRATED_WEIGHTS.R * axes.R +
    CALIBRATED_WEIGHTS.V * axes.V;

  return {
    G_new,
    axes,
    weights: { ...CALIBRATED_WEIGHTS },
    raw: analysis,
    proof: {
      schema_version: P0_SCHEMA,
      stack_version: P0_VERSION,
      axis_def_hash: P0_AXIS_DEF_HASH,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DUAL PROOF BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build a DualProofRecord comparing legacy G_old vs omega-p0 G_new.
 *
 * This record is designed for nexus/proof/genius-dual-comparison/.
 */
export function buildDualProof(
  text: string,
  G_old: number,
  axes_old: { D: number; S: number; I: number; R: number; V: number },
  verdict_old: string,
  p0Result: OmegaP0Result,
  mode: GeniusScorerMode,
): DualProofRecord {
  const delta = p0Result.G_new - G_old;

  // Compute per-axis deltas, sort by absolute magnitude, take top 3
  const axisDeltas = [
    { axis: 'D', delta: p0Result.axes.D - axes_old.D },
    { axis: 'S', delta: p0Result.axes.S - axes_old.S },
    { axis: 'I', delta: p0Result.axes.I - axes_old.I },
    { axis: 'R', delta: p0Result.axes.R - axes_old.R },
    { axis: 'V', delta: p0Result.axes.V - axes_old.V },
  ].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  const delta_explain = axisDeltas
    .slice(0, 3)
    .map(d => `${d.axis}: ${d.delta >= 0 ? '+' : ''}${d.delta.toFixed(1)}`);

  // Compute verdict_new based on omega-p0 G alone (no M dependency)
  const verdict_new = p0Result.G_new >= 92 ? 'G_SEAL_ELIGIBLE' :
                       p0Result.G_new >= 75 ? 'G_PITCH' : 'G_LOW';

  return {
    text_hash: computeTextHash(text),
    segments_hash: computeTextHash(text.replace(/\s+/g, ' ').trim()),
    G_old,
    G_new: p0Result.G_new,
    delta,
    axes_old: { ...axes_old },
    axes_new: { ...p0Result.axes },
    verdict_old,
    verdict_new,
    schema_version_old: LEGACY_SCHEMA,
    schema_version_new: p0Result.proof.schema_version,
    axis_def_hash_old: LEGACY_AXIS_DEF_HASH,
    axis_def_hash_new: p0Result.proof.axis_def_hash,
    delta_explain,
    decision_mode: mode,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { CALIBRATED_WEIGHTS, LEGACY_SCHEMA, LEGACY_AXIS_DEF_HASH, P0_AXIS_DEF_HASH };
