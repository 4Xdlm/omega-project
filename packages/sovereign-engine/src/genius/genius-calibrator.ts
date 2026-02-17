/**
 * OMEGA GENIUS ENGINE — C_LLM CALIBRATOR
 * Sprint: GENIUS-03 | NASA-Grade L4 / DO-178C Level A
 *
 * C_llm = (Conformity × Stability × Creativity × Honesty) ^ (1/4)
 * C_llm ∈ [0, 1]
 *
 * RÈGLE CARDINALE : C_llm ne MODIFIE jamais Q_text, seal_granted, ou verdict.
 * C_llm peut OBSERVER Q_text (pour mesurer la stabilité du provider).
 * C_llm est un outil de PILOTAGE PROCESS uniquement.
 */

import { createHash } from 'node:crypto';
import type { NoncomplianceResult } from './noncompliance-parser.js';
import { loadSSOTCalibrator } from './genius-ssot-loader.js';

const SSOT = loadSSOTCalibrator();

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

export interface CalibrationResult {
  readonly C_llm: number;
  readonly components: {
    readonly conformity: number;
    readonly stability: number;
    readonly creativity: number;
    readonly honesty: number;
  };
  readonly strategy: 'mono-pass' | 'multi-pass' | 'max-assist';
  readonly passes_recommended: number;
  readonly budget_tokens: number;
  readonly benchmark_version: string;
  readonly provider_id: string;
}

export interface BenchmarkRun {
  readonly prompt_id: string;
  readonly prompt_type: 'core' | 'rotating';
  readonly hard_constraints_total: number;
  readonly hard_constraints_passed: number;
  readonly q_text_score: number;
  readonly S_score: number;
  readonly I_diagnostics: {
    readonly contradictions_found: number;
    readonly false_causals: number;
  };
  readonly D_diagnostics: {
    readonly stopword_ratio: number;
  };
  readonly R_diagnostics: {
    readonly motif_recurrence: number;
  };
  readonly symbols_declared: number;
  readonly symbols_detected: number;
  readonly noncompliance: NoncomplianceResult;
}

export interface CalibrationInput {
  readonly runs: readonly BenchmarkRun[];
  readonly provider_id: string;
  readonly T_base?: number;
  readonly P_base?: number;
  readonly sigma_max?: number;
  readonly S_cible?: number;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT FUNCTIONS — PURE, DETERMINISTIC
// ═══════════════════════════════════════════════════════════════════════

/**
 * Conformity = total_hard_constraints_passed / total_hard_constraints
 * Calculated on 7 "core" runs only. If 0 core runs → 0.
 */
export function computeConformity(runs: readonly BenchmarkRun[]): number {
  const coreRuns = runs.filter(r => r.prompt_type === 'core');
  if (coreRuns.length === 0) return 0;
  const total = coreRuns.reduce((sum, r) => sum + r.hard_constraints_total, 0);
  if (total === 0) return 0;
  const passed = coreRuns.reduce((sum, r) => sum + r.hard_constraints_passed, 0);
  return passed / total;
}

/**
 * Stability = 1 - clamp(σ(Q_text) / σ_max, 0, 1)
 * Population standard deviation on core runs. If < 2 runs → 0.
 */
export function computeStability(runs: readonly BenchmarkRun[], sigma_max: number): number {
  const coreRuns = runs.filter(r => r.prompt_type === 'core');
  if (coreRuns.length < 2) return 0;
  const scores = coreRuns.map(r => r.q_text_score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / scores.length;
  const sigma = Math.sqrt(variance);
  return 1 - Math.min(Math.max(sigma / sigma_max, 0), 1);
}

/**
 * Creativity = clamp(S_moyen / S_cible, 0, 1) × (1 - incoh_penalty)
 * Calculated on "rotating" runs only. If 0 rotating runs → 0.
 * incoh_penalty = (contradictions + false_causals) × factor, clamped [0, max]
 */
export function computeCreativity(runs: readonly BenchmarkRun[], S_cible: number): number {
  const rotatingRuns = runs.filter(r => r.prompt_type === 'rotating');
  if (rotatingRuns.length === 0) return 0;
  const S_moyen = rotatingRuns.reduce((sum, r) => sum + r.S_score, 0) / rotatingRuns.length;
  const totalIssues = rotatingRuns.reduce(
    (sum, r) => sum + r.I_diagnostics.contradictions_found + r.I_diagnostics.false_causals,
    0,
  );
  const rawPenalty = totalIssues * SSOT.incoh_penalty_factor;
  const incoh = Math.min(Math.max(rawPenalty, 0), SSOT.incoh_penalty_max);
  return Math.min(Math.max(S_moyen / S_cible, 0), 1) * (1 - incoh);
}

/**
 * Honesty = 1 - clamp(Σ(H1..H5), 0, 1)
 * Calculated on ALL runs. If 0 runs → 0.
 */
export function computeHonesty(runs: readonly BenchmarkRun[]): number {
  if (runs.length === 0) return 0;
  const n = runs.length;
  const d = SSOT.h_denominator;
  const w = SSOT.honesty_weights;
  const thresh = SSOT.stopword_showTell_threshold;

  const sumContradictions = runs.reduce((s, r) => s + r.I_diagnostics.contradictions_found, 0);
  const sumFalseCausals = runs.reduce((s, r) => s + r.I_diagnostics.false_causals, 0);

  const H1 = sumContradictions / (n * d);
  const H2 = sumFalseCausals / (n * d);

  const showTellCount = runs.filter(r => r.D_diagnostics.stopword_ratio > thresh).length;
  const H3 = (showTellCount * w.H3) / n;

  const symbolBsCount = runs.filter(r => r.symbols_declared > 0 && r.symbols_detected === 0).length;
  const H4 = (symbolBsCount * w.H4) / n;

  const ncAbuseCount = runs.filter(r => r.noncompliance.h5_penalty).length;
  const H5 = (ncAbuseCount * w.H5) / n;

  const total = H1 + H2 + H3 + H4 + H5;
  return 1 - Math.min(Math.max(total, 0), 1);
}

/**
 * C_llm = (conformity × stability × creativity × honesty) ^ (1/4)
 * Geometric mean. If any component = 0 → C_llm = 0.
 */
export function computeC_llm(components: CalibrationResult['components']): number {
  const { conformity, stability, creativity, honesty } = components;
  const product = conformity * stability * creativity * honesty;
  if (product <= 0) return 0;
  return Math.pow(product, 1 / 4);
}

/**
 * Pilotage strategy based on C_llm thresholds from SSOT.
 */
export function determineStrategy(C_llm: number): CalibrationResult['strategy'] {
  if (C_llm > SSOT.piloting.mono_min) return 'mono-pass';
  if (C_llm >= SSOT.piloting.multi_min) return 'multi-pass';
  return 'max-assist';
}

/**
 * passes_recommended = ceil(P_base / C_llm), clamped [1, 10].
 */
export function computePasses(C_llm: number, P_base: number): number {
  if (C_llm <= 0) return 10;
  const raw = Math.ceil(P_base / C_llm);
  return Math.min(Math.max(raw, 1), 10);
}

/**
 * budget_tokens = T_base × (1 + (1 - C_llm)), clamped [T_base, T_base × 2].
 */
export function computeBudget(C_llm: number, T_base: number): number {
  const multiplier = 1 + (1 - C_llm);
  const raw = T_base * multiplier;
  return Math.min(Math.max(raw, T_base), T_base * 2);
}

// ═══════════════════════════════════════════════════════════════════════
// ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════

/**
 * Calibrate a LLM provider from 10 BenchmarkRuns (7 core + 3 rotating).
 * INVARIANT GENIUS-06: C_llm never touches seal_granted.
 */
export function calibrate(input: CalibrationInput): CalibrationResult {
  const T_base = input.T_base ?? SSOT.T_base;
  const P_base = input.P_base ?? SSOT.P_base;
  const sigmaMax = input.sigma_max ?? SSOT.sigma_max;
  const sCible = input.S_cible ?? SSOT.S_cible;

  const conformity = computeConformity(input.runs);
  const stability = computeStability(input.runs, sigmaMax);
  const creativity = computeCreativity(input.runs, sCible);
  const honesty = computeHonesty(input.runs);

  const components = { conformity, stability, creativity, honesty };
  const C_llm = computeC_llm(components);

  return {
    C_llm,
    components,
    strategy: determineStrategy(C_llm),
    passes_recommended: computePasses(C_llm, P_base),
    budget_tokens: computeBudget(C_llm, T_base),
    benchmark_version: SSOT.benchmark_version,
    provider_id: input.provider_id,
  };
}

// ═══════════════════════════════════════════════════════════════════════
// ROTATING PROMPT SELECTION
// ═══════════════════════════════════════════════════════════════════════

/**
 * Select 3 prompts from the rotating pool based on weekly hash.
 * weekHash = SHA-256(weekISO), indices = bytes[0..N] mod pool.length (deduplicated).
 * INVARIANT GENIUS-14: deterministic — same week → same prompts.
 */
export function selectRotatingPrompts(pool: readonly string[], weekISO: string): string[] {
  const hash = createHash('sha256').update(weekISO).digest();
  const selected: string[] = [];
  let byteIdx = 0;

  while (selected.length < 3 && byteIdx < hash.length) {
    const idx = hash[byteIdx] % pool.length;
    if (!selected.includes(pool[idx])) {
      selected.push(pool[idx]);
    }
    byteIdx++;
  }

  return selected;
}
