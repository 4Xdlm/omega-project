/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — TRIPLE PITCH ENGINE (OFFLINE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: pitch/triple-pitch-engine.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Generates 3 deterministic pitch strategies from a DeltaReport.
 * OFFLINE — 0 LLM tokens. 100% deterministic.
 *
 * Closed catalog: 12 ops [INV-S-CATALOG-01].
 * Strategy 1 = emotion, Strategy 2 = tension, Strategy 3 = balanced.
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { DeltaReport } from '../types.js';
import { sha256, canonicalize } from '@omega/canon-kernel';

// ═══════════════════════════════════════════════════════════════════════════════
// CLOSED CATALOG — 12 operations [INV-S-CATALOG-01]
// ═══════════════════════════════════════════════════════════════════════════════

export const PITCH_CATALOG = [
  'INTENSIFY_EMOTION',
  'ADD_SENSORY',
  'SHARPEN_TENSION',
  'TRIM_CLICHE',
  'VARY_RHYTHM',
  'DEEPEN_INTERIORITY',
  'ANCHOR_BEAT',
  'STRENGTHEN_OPENING',
  'STRENGTHEN_CLOSING',
  'ADD_METAPHOR_FRESH',
  'ENFORCE_SIGNATURE',
  'COMPRESS_VERBOSE',
] as const;

export type PitchOp = typeof PITCH_CATALOG[number];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface PitchStrategy {
  readonly id: string;
  readonly op_sequence: readonly PitchOp[];
  readonly rationale: string;
  readonly pitch_hash: string;
}

export interface TriplePitchOutput {
  readonly strategies: readonly [PitchStrategy, PitchStrategy, PitchStrategy];
  readonly generated_at: string;
  readonly run_id: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export class CatalogViolationError extends Error {
  constructor(op: string) {
    super(`CatalogViolationError: unknown op "${op}" — not in PITCH_CATALOG [INV-S-CATALOG-01]`);
    this.name = 'CatalogViolationError';
  }
}

const CATALOG_SET = new Set<string>(PITCH_CATALOG);

export function validatePitchStrategy(strategy: PitchStrategy): void {
  for (const op of strategy.op_sequence) {
    if (!CATALOG_SET.has(op)) {
      throw new CatalogViolationError(op);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// OP CLASSIFICATION — emotion vs craft
// ═══════════════════════════════════════════════════════════════════════════════

const EMOTION_OPS: ReadonlySet<PitchOp> = new Set([
  'INTENSIFY_EMOTION',
  'DEEPEN_INTERIORITY',
  'ANCHOR_BEAT',
]);

const TENSION_OPS: ReadonlySet<PitchOp> = new Set([
  'SHARPEN_TENSION',
  'STRENGTHEN_OPENING',
  'STRENGTHEN_CLOSING',
]);

export function isEmotionOp(op: PitchOp): boolean {
  return EMOTION_OPS.has(op);
}

export function isCraftOp(op: PitchOp): boolean {
  return !EMOTION_OPS.has(op);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STRATEGY GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function buildEmotionStrategy(delta: DeltaReport): PitchOp[] {
  const ops: PitchOp[] = [];

  // Always lead with INTENSIFY_EMOTION for emotion strategy
  ops.push('INTENSIFY_EMOTION');

  // If low curve correlation → deepen interiority
  if (delta.emotion_delta.curve_correlation < 0.7) {
    ops.push('DEEPEN_INTERIORITY');
  }

  // Anchor to emotional beats
  ops.push('ANCHOR_BEAT');

  // If clichés detected → trim them
  if (delta.cliche_delta.total_matches > 0) {
    ops.push('TRIM_CLICHE');
  }

  // Strengthen closing for emotional resonance
  ops.push('STRENGTHEN_CLOSING');

  return ops;
}

function buildTensionStrategy(delta: DeltaReport): PitchOp[] {
  const ops: PitchOp[] = [];

  // Lead with tension sharpening
  ops.push('SHARPEN_TENSION');

  // If poor opening → strengthen
  if (delta.style_delta.opening_repetition_rate > 0.1) {
    ops.push('STRENGTHEN_OPENING');
  }

  // Always strengthen closing for tension arc
  ops.push('STRENGTHEN_CLOSING');

  // If monotony → vary rhythm
  if (delta.style_delta.monotony_sequences > 0) {
    ops.push('VARY_RHYTHM');
  }

  // Add sensory grounding
  ops.push('ADD_SENSORY');

  return ops;
}

function buildBalancedStrategy(delta: DeltaReport): PitchOp[] {
  const ops: PitchOp[] = [];

  // Mix emotion and craft
  ops.push('INTENSIFY_EMOTION');
  ops.push('VARY_RHYTHM');

  // Trim clichés if present
  if (delta.cliche_delta.total_matches > 0) {
    ops.push('TRIM_CLICHE');
  }

  // Add sensory detail
  ops.push('ADD_SENSORY');

  // Enforce signature style
  if (delta.style_delta.signature_hit_rate < 0.5) {
    ops.push('ENFORCE_SIGNATURE');
  }

  // Compress verbose passages
  ops.push('COMPRESS_VERBOSE');

  return ops;
}

function hashStrategy(id: string, ops: readonly PitchOp[], run_id: string): string {
  return sha256(canonicalize({ id, ops, run_id }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

export function generateTriplePitch(
  delta: DeltaReport,
  run_id: string,
): TriplePitchOutput {
  const emotionOps = buildEmotionStrategy(delta);
  const tensionOps = buildTensionStrategy(delta);
  const balancedOps = buildBalancedStrategy(delta);

  const s1: PitchStrategy = {
    id: 'emotion',
    op_sequence: emotionOps,
    rationale: `Emotion-first: curve_correlation=${delta.emotion_delta.curve_correlation.toFixed(2)}, clichés=${delta.cliche_delta.total_matches}`,
    pitch_hash: hashStrategy('emotion', emotionOps, run_id),
  };

  const s2: PitchStrategy = {
    id: 'tension',
    op_sequence: tensionOps,
    rationale: `Tension-first: slope_match=${delta.tension_delta.slope_match.toFixed(2)}, monotony=${delta.style_delta.monotony_sequences}`,
    pitch_hash: hashStrategy('tension', tensionOps, run_id),
  };

  const s3: PitchStrategy = {
    id: 'balanced',
    op_sequence: balancedOps,
    rationale: `Balanced: global_distance=${delta.global_distance.toFixed(4)}, signature_hit=${delta.style_delta.signature_hit_rate.toFixed(2)}`,
    pitch_hash: hashStrategy('balanced', balancedOps, run_id),
  };

  return {
    strategies: [s1, s2, s3],
    generated_at: new Date().toISOString(),
    run_id,
  };
}
