/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — GENIUS METRICS ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/genius-metrics.ts
 * Sprint: GENIUS-02
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Pipeline: AS gate → D,S,I,R,V → G = (D×S×I×R×V)^(1/5) → Q_text = √(M×G) × δ_AS
 *
 * Invariants:
 * - GENIUS-01: AS < 85 → REJECT, skip M and G
 * - GENIUS-02: M=85, G=100 → Q_text=92.2 < 93
 * - GENIUS-03: M=95, G=95 → Q_text=95.0
 * - GENIUS-04: V=65 original → SEAL refused
 * - GENIUS-06: Q_system returned but never influences seal_granted
 * - GENIUS-15: Output JSON conforms to canonical schema
 *
 * FAIL-FAST: AS evaluated FIRST. If AS < 85 → no G computation.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { computeAS } from './as-gatekeeper.js';
import { computeDensity } from './scorers/density-scorer.js';
import { computeSurprise } from './scorers/surprise-scorer.js';
import { computeInevitability, type NarrativeEvent } from './scorers/inevitability-scorer.js';
import { computeResonance, type SymbolMapOutput } from './scorers/resonance-scorer.js';
import { computeVoice, type GeniusMode, type VoiceGenome, type AuthorFingerprint } from './scorers/voice-scorer.js';
import { getEmbeddingModelInfo } from './embeddings/local-embedding-model.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — INPUT
// ═══════════════════════════════════════════════════════════════════════════════

export interface EmotionLayerResult {
  readonly M: number;
  readonly axes: {
    readonly ECC: number;
    readonly RCI: number;
    readonly SII: number;
    readonly IFI: number;
    readonly AAI: number;
  };
}

export interface GeniusMetricsInput {
  readonly text: string;
  readonly mode: GeniusMode;
  readonly voiceGenome?: VoiceGenome;
  readonly authorFingerprint?: AuthorFingerprint;
  readonly symbolMapOutputs?: readonly SymbolMapOutput[];
  readonly extractedEvents?: readonly NarrativeEvent[];
  readonly emotionScores?: EmotionLayerResult;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — OUTPUT (canonical schema GENIUS-15)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GeniusMetricsOutput {
  readonly layer0_gate: {
    readonly AS_score: number;
    readonly AS_GATE_PASS: boolean;
    readonly reject_reason: string | null;
  };
  readonly layer2_genius: {
    readonly G: number;
    readonly axes: {
      readonly D: number;
      readonly S: number;
      readonly I: number;
      readonly R: number;
      readonly V: number;
    };
    readonly diagnostics: {
      readonly SI_tension: number;
      readonly S_shift_balance: number;
      readonly shift_moyen: number;
    };
  };
  readonly layer3_verdict: {
    readonly Q_text: number;
    readonly seal_run: boolean;
    readonly seal_reason: string;
    readonly verdict: 'SEAL' | 'PITCH' | 'REJECT';
  };
  readonly embedding_model_version: string;
  readonly warnings: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const Q_TEXT_SEAL_THRESHOLD = 93;

// Floors v1 (GENIUS_ENGINE_SPEC §9)
const FLOORS = {
  D: 80,
  S: 80,
  I: 75,
  R: 75,
  V_original: 70,
  V_continuation: 85,
  V_enhancement: 75,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// GEOMETRIC MEAN
// ═══════════════════════════════════════════════════════════════════════════════

function geometricMean5(a: number, b: number, c: number, d: number, e: number): number {
  return Math.pow(a * b * c * d * e, 1 / 5);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FLOOR CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function checkFloors(
  D: number, S: number, I: number, R: number, V: number,
  mode: GeniusMode,
): { pass: boolean; failures: string[] } {
  const failures: string[] = [];

  if (D < FLOORS.D) failures.push(`D=${D.toFixed(1)} < floor ${FLOORS.D}`);
  if (S < FLOORS.S) failures.push(`S=${S.toFixed(1)} < floor ${FLOORS.S}`);
  if (I < FLOORS.I) failures.push(`I=${I.toFixed(1)} < floor ${FLOORS.I}`);
  if (R < FLOORS.R) failures.push(`R=${R.toFixed(1)} < floor ${FLOORS.R}`);

  const vFloor = mode === 'continuation' ? FLOORS.V_continuation
               : mode === 'enhancement' ? FLOORS.V_enhancement
               : FLOORS.V_original;

  if (V < vFloor) failures.push(`V=${V.toFixed(1)} < floor ${vFloor} (${mode})`);

  return { pass: failures.length === 0, failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Compute GENIUS metrics: AS → D,S,I,R,V → G → Q_text.
 *
 * FAIL-FAST: If AS < 85, returns REJECT immediately.
 * G = (D×S×I×R×V)^(1/5)
 * Q_text = √(M×G) × δ_AS (δ_AS = 1 if AS ≥ 85, else 0)
 *
 * DETERMINISM: Same input → same output (GENIUS-25).
 */
export function computeGeniusMetrics(input: GeniusMetricsInput): GeniusMetricsOutput {
  const warnings: string[] = [];
  const embeddingInfo = getEmbeddingModelInfo();

  // ── STEP 1: Layer 0 — AS kill switch (GENIUS-01) ──
  const asResult = computeAS(input.text);

  if (!asResult.AS_GATE_PASS) {
    // REJECT: do NOT compute M nor G (GENIUS-01)
    return {
      layer0_gate: {
        AS_score: asResult.AS_score,
        AS_GATE_PASS: false,
        reject_reason: asResult.reject_reason,
      },
      layer2_genius: {
        G: 0,
        axes: { D: 0, S: 0, I: 0, R: 0, V: 0 },
        diagnostics: { SI_tension: 0, S_shift_balance: 0, shift_moyen: 0 },
      },
      layer3_verdict: {
        Q_text: 0,
        seal_run: false,
        seal_reason: 'AS_GATE',
        verdict: 'REJECT',
      },
      embedding_model_version: embeddingInfo.version,
      warnings: ['REJECT: AS gate failed'],
    };
  }

  // ── STEP 2: Compute D, S, I, R, V ──
  const dResult = computeDensity(input.text);
  const sResult = computeSurprise(input.text);
  const iResult = computeInevitability(input.text, input.extractedEvents);
  const rResult = computeResonance(input.text, input.symbolMapOutputs);
  const vResult = computeVoice(input.text, input.mode, input.voiceGenome, input.authorFingerprint);

  const D = dResult.D;
  const S = sResult.S;
  const I = iResult.I;
  const R = rResult.R;
  const V = vResult.V;

  // Collect warnings from scorers
  warnings.push(...sResult.warnings);

  // ── STEP 3: G = geometric mean ──
  const G = geometricMean5(D, S, I, R, V);

  // ── STEP 4: SI_tension diagnostic ──
  const SI_tension = Math.max(S, I) > 0 ? Math.min(S, I) / Math.max(S, I) : 0;

  // ── STEP 5: Q_text ──
  const M = input.emotionScores?.M ?? 0;
  // δ_AS = 1 here (we passed the gate)
  const Q_text = M > 0 ? Math.sqrt(M * G) : 0;

  if (!input.emotionScores) {
    warnings.push('NO_EMOTION_SCORES: M=0, Q_text will be 0');
  }

  // ── STEP 6: Floor check ──
  const floorCheck = checkFloors(D, S, I, R, V, input.mode);
  if (!floorCheck.pass) {
    for (const f of floorCheck.failures) {
      warnings.push(`FLOOR_FAIL: ${f}`);
    }
  }

  // ── STEP 7: SEAL verdict ──
  let verdict: 'SEAL' | 'PITCH' | 'REJECT';
  let seal_run = false;
  let seal_reason: string;

  if (Q_text >= Q_TEXT_SEAL_THRESHOLD && floorCheck.pass) {
    verdict = 'SEAL';
    seal_run = true;
    seal_reason = 'ALL_PASS';
  } else if (Q_text >= Q_TEXT_SEAL_THRESHOLD && !floorCheck.pass) {
    verdict = 'PITCH';
    seal_run = false;
    seal_reason = `FLOOR_VIOLATIONS: ${floorCheck.failures.join(', ')}`;
  } else if (Q_text > 0) {
    verdict = 'PITCH';
    seal_run = false;
    seal_reason = `Q_text=${Q_text.toFixed(1)} < ${Q_TEXT_SEAL_THRESHOLD}`;
  } else {
    verdict = 'REJECT';
    seal_run = false;
    seal_reason = M > 0 ? 'G_ZERO' : 'M_MISSING';
  }

  return {
    layer0_gate: {
      AS_score: asResult.AS_score,
      AS_GATE_PASS: true,
      reject_reason: null,
    },
    layer2_genius: {
      G,
      axes: { D, S, I, R, V },
      diagnostics: {
        SI_tension,
        S_shift_balance: sResult.diagnostics.S_shift_balance,
        shift_moyen: sResult.diagnostics.shift_moyen,
      },
    },
    layer3_verdict: {
      Q_text,
      seal_run,
      seal_reason,
      verdict,
    },
    embedding_model_version: embeddingInfo.version,
    warnings,
  };
}

/**
 * Convenience: compute Q_text from pre-computed M and G with AS gate.
 * Used for integration tests (GENIUS-02, GENIUS-03).
 */
export function computeQText(M: number, G: number, AS_pass: boolean): number {
  if (!AS_pass) return 0;
  return Math.sqrt(M * G);
}
