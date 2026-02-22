/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA GENIUS ENGINE — GENIUS METRICS ORCHESTRATOR
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: genius/genius-metrics.ts
 * Sprint: GENIUS-02 → GENIUS-SOVEREIGN-INTEGRATION
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Pipeline: AS gate → D,S,I,R,V → G = (D×S×I×R×V)^(1/5) → Q_text = √(M×G) × δ_AS
 *
 * DUAL MODE (A+ integration):
 *   - legacy:  G computed from SE scorers only (geometric mean)
 *   - dual:    G_old (SE) + G_new (omega-p0) computed side-by-side, verdict uses G_old
 *   - omegaP0: G computed from omega-p0 only (calibrated weighted sum)
 *
 * Invariants:
 * - GENIUS-01: AS < 85 → REJECT, skip M and G
 * - GENIUS-02: M=85, G=100 → Q_text=92.2 < 93
 * - GENIUS-03: M=95, G=95 → Q_text=95.0
 * - GENIUS-04: V=65 original → SEAL refused
 * - GENIUS-06: Q_system returned but never influences seal_granted
 * - GENIUS-15: Output JSON conforms to canonical schema
 * - ART-GENIUS-DUAL: Dual mode computes both G values without altering legacy verdict
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
import {
  computeOmegaP0Scores,
  buildDualProof,
  type GeniusScorerMode,
  type OmegaP0Result,
  type DualProofRecord,
} from './omega-p0-adapter.js';

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
  /** Scorer mode: legacy (default), dual, or omegaP0 */
  readonly scorerMode?: GeniusScorerMode;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES — OUTPUT (canonical schema GENIUS-15 + dual extension)
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
  /** Dual comparison data — present only when scorerMode is 'dual' or 'omegaP0' */
  readonly layer2_dual?: {
    readonly G_new: number;
    readonly axes_new: {
      readonly D: number;
      readonly S: number;
      readonly I: number;
      readonly R: number;
      readonly V: number;
    };
    readonly delta_G: number;
    readonly proof: DualProofRecord;
  };
  readonly layer3_verdict: {
    readonly Q_text: number;
    readonly seal_run: boolean;
    readonly seal_reason: string;
    readonly verdict: 'SEAL' | 'PITCH' | 'REJECT';
  };
  readonly embedding_model_version: string;
  readonly scorer_mode: GeniusScorerMode;
  readonly warnings: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

const Q_TEXT_SEAL_THRESHOLD = 93;
const M_SEAL_FLOOR = 88;
const G_SEAL_FLOOR = 92;

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
 *
 * Scorer modes:
 *   - legacy:  G = (D×S×I×R×V)^(1/5) from SE scorers
 *   - dual:    G_old (SE) + G_new (omega-p0), verdict uses G_old
 *   - omegaP0: G = 0.35R+0.25D+0.20V+0.15S+0.05I from omega-p0
 *
 * DETERMINISM: Same input → same output (GENIUS-25).
 */
export function computeGeniusMetrics(input: GeniusMetricsInput): GeniusMetricsOutput {
  const warnings: string[] = [];
  const embeddingInfo = getEmbeddingModelInfo();
  const scorerMode: GeniusScorerMode = input.scorerMode ?? 'legacy';

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
      scorer_mode: scorerMode,
      warnings: ['REJECT: AS gate failed'],
    };
  }

  // ── STEP 2: Compute D, S, I, R, V (legacy SE scorers — always run in legacy/dual) ──
  let D: number, S: number, I: number, R: number, V: number;
  let S_shift_balance = 0;
  let shift_moyen = 0;

  if (scorerMode === 'legacy' || scorerMode === 'dual') {
    const dResult = computeDensity(input.text);
    const sResult = computeSurprise(input.text);
    const iResult = computeInevitability(input.text, input.extractedEvents);
    const rResult = computeResonance(input.text, input.symbolMapOutputs);
    const vResult = computeVoice(input.text, input.mode, input.voiceGenome, input.authorFingerprint);

    D = dResult.D;
    S = sResult.S;
    I = iResult.I;
    R = rResult.R;
    V = vResult.V;
    S_shift_balance = sResult.diagnostics.S_shift_balance;
    shift_moyen = sResult.diagnostics.shift_moyen;
    warnings.push(...sResult.warnings);
  } else {
    // omegaP0 mode: use omega-p0 axes directly
    const p0 = computeOmegaP0Scores(input.text);
    D = p0.axes.D;
    S = p0.axes.S;
    I = p0.axes.I;
    R = p0.axes.R;
    V = p0.axes.V;
  }

  // ── STEP 3: G computation ──
  let G: number;

  if (scorerMode === 'omegaP0') {
    // Calibrated weighted sum
    G = 0.25 * D + 0.15 * S + 0.05 * I + 0.35 * R + 0.20 * V;
  } else {
    // Legacy geometric mean (legacy + dual)
    G = geometricMean5(D, S, I, R, V);
  }

  // ── STEP 3b: Dual comparison (only in dual mode) ──
  let layer2_dual: GeniusMetricsOutput['layer2_dual'] | undefined;

  if (scorerMode === 'dual') {
    const p0Result = computeOmegaP0Scores(input.text);
    const proof = buildDualProof(
      input.text,
      G,
      { D, S, I, R, V },
      '', // verdict_old filled below after verdict computation
      p0Result,
      scorerMode,
    );

    layer2_dual = {
      G_new: p0Result.G_new,
      axes_new: { ...p0Result.axes },
      delta_G: p0Result.G_new - G,
      proof,
    };
  }

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

  // ── STEP 7: SEAL verdict (GENIUS-04: M ≥ 88, G ≥ 92 added) ──
  const M_pass = M >= M_SEAL_FLOOR;
  const G_pass = G >= G_SEAL_FLOOR;

  if (M > 0 && !M_pass) {
    warnings.push(`M_FLOOR_FAIL: M=${M.toFixed(1)} < ${M_SEAL_FLOOR}`);
  }
  if (G > 0 && !G_pass) {
    warnings.push(`G_FLOOR_FAIL: G=${G.toFixed(1)} < ${G_SEAL_FLOOR}`);
  }

  let verdict: 'SEAL' | 'PITCH' | 'REJECT';
  let seal_run = false;
  let seal_reason: string;

  if (Q_text >= Q_TEXT_SEAL_THRESHOLD && floorCheck.pass && M_pass && G_pass) {
    verdict = 'SEAL';
    seal_run = true;
    seal_reason = 'ALL_PASS';
  } else if (Q_text >= Q_TEXT_SEAL_THRESHOLD && (!floorCheck.pass || !M_pass || !G_pass)) {
    verdict = 'PITCH';
    seal_run = false;
    const allFailures: string[] = [];
    if (!floorCheck.pass) allFailures.push(...floorCheck.failures);
    if (!M_pass) allFailures.push(`M=${M.toFixed(1)} < ${M_SEAL_FLOOR}`);
    if (!G_pass) allFailures.push(`G=${G.toFixed(1)} < ${G_SEAL_FLOOR}`);
    seal_reason = `FLOOR_VIOLATIONS: ${allFailures.join(', ')}`;
  } else if (Q_text > 0) {
    verdict = 'PITCH';
    seal_run = false;
    seal_reason = `Q_text=${Q_text.toFixed(1)} < ${Q_TEXT_SEAL_THRESHOLD}`;
  } else {
    verdict = 'REJECT';
    seal_run = false;
    seal_reason = M > 0 ? 'G_ZERO' : 'M_MISSING';
  }

  // ── STEP 7b: Patch dual proof with verdict_old (now known) ──
  if (layer2_dual) {
    const patchedProof: DualProofRecord = {
      ...layer2_dual.proof,
      verdict_old: verdict,
    };
    layer2_dual = {
      ...layer2_dual,
      proof: patchedProof,
    };
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
        S_shift_balance,
        shift_moyen,
      },
    },
    ...(layer2_dual ? { layer2_dual } : {}),
    layer3_verdict: {
      Q_text,
      seal_run,
      seal_reason,
      verdict,
    },
    embedding_model_version: embeddingInfo.version,
    scorer_mode: scorerMode,
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

// ═══════════════════════════════════════════════════════════════════════════════
// SEAL CONDITIONS — GENIUS-04
// ═══════════════════════════════════════════════════════════════════════════════

export interface SealConditionsResult {
  readonly seal_run: boolean;
  readonly verdict: 'SEAL' | 'PITCH' | 'REJECT';
  readonly seal_reason: string;
  readonly failures: readonly string[];
}

/**
 * Check SEAL conditions independently.
 * GENIUS-04: Q_text ≥ 93, M ≥ 88, G ≥ 92, all DSIRV floors pass.
 */
export function checkSealConditions(input: {
  readonly Q_text: number;
  readonly M: number;
  readonly G: number;
  readonly floorPass: boolean;
  readonly floorFailures?: readonly string[];
}): SealConditionsResult {
  const failures: string[] = [];

  if (input.Q_text < Q_TEXT_SEAL_THRESHOLD) {
    failures.push(`Q_text=${input.Q_text.toFixed(1)} < ${Q_TEXT_SEAL_THRESHOLD}`);
  }
  if (input.M < M_SEAL_FLOOR) {
    failures.push(`M=${input.M.toFixed(1)} < ${M_SEAL_FLOOR}`);
  }
  if (input.G < G_SEAL_FLOOR) {
    failures.push(`G=${input.G.toFixed(1)} < ${G_SEAL_FLOOR}`);
  }
  if (!input.floorPass) {
    failures.push(...(input.floorFailures ?? ['FLOOR_FAIL']));
  }

  if (failures.length === 0) {
    return { seal_run: true, verdict: 'SEAL', seal_reason: 'ALL_PASS', failures };
  }

  if (input.Q_text > 0) {
    return { seal_run: false, verdict: 'PITCH', seal_reason: failures.join('; '), failures };
  }

  return { seal_run: false, verdict: 'REJECT', seal_reason: failures.join('; '), failures };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STABILITY ASSESSMENT — GENIUS-04
// ═══════════════════════════════════════════════════════════════════════════════

export interface StabilityAssessment {
  readonly seal_stable: boolean;
  readonly gate_finale: boolean;
  readonly seal_count: number;
  readonly total_runs: number;
  readonly q_text_values: readonly number[];
  readonly q_text_sigma: number;
  readonly q_text_min: number;
  readonly q_text_max: number;
}

const SEAL_STABLE_MIN_SEALS = 4;
const Q_TEXT_SIGMA_MAX = 3.0;
const Q_TEXT_MIN_FLOOR = 80;

/**
 * Assess stability across N pipeline runs.
 *
 * SEAL_STABLE: ≥ 4/5 seal_run + σ(Q_text) ≤ 3.0 + min(Q_text) ≥ 80
 * GATE_FINALE: ≥ 1 seal_run across all runs
 *
 * DETERMINISM: Same runs → same assessment.
 */
export function assessStability(runs: readonly GeniusMetricsOutput[]): StabilityAssessment {
  const n = runs.length;
  if (n === 0) {
    return {
      seal_stable: false,
      gate_finale: false,
      seal_count: 0,
      total_runs: 0,
      q_text_values: [],
      q_text_sigma: 0,
      q_text_min: 0,
      q_text_max: 0,
    };
  }

  const sealCount = runs.filter(r => r.layer3_verdict.seal_run).length;
  const qTextValues = runs.map(r => r.layer3_verdict.Q_text);
  const mean = qTextValues.reduce((a, b) => a + b, 0) / n;
  const variance = qTextValues.reduce((sum, q) => sum + (q - mean) ** 2, 0) / n;
  const sigma = Math.sqrt(variance);
  const qMin = Math.min(...qTextValues);
  const qMax = Math.max(...qTextValues);

  const gate_finale = sealCount >= 1;
  const seal_stable =
    sealCount >= SEAL_STABLE_MIN_SEALS &&
    sigma <= Q_TEXT_SIGMA_MAX &&
    qMin >= Q_TEXT_MIN_FLOOR;

  return {
    seal_stable,
    gate_finale,
    seal_count: sealCount,
    total_runs: n,
    q_text_values: qTextValues,
    q_text_sigma: sigma,
    q_text_min: qMin,
    q_text_max: qMax,
  };
}
