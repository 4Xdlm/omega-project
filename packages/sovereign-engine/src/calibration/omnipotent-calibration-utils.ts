/**
 * OMEGA Sovereign — OMNIPOTENT Calibration Utilities
 *
 * Pure TS implementations of:
 * - Spearman rank correlation (with tie handling)
 * - Pearson product-moment correlation
 * - Decision logic A/B/C/GREY_ZONE/FAIL-CLOSED
 * - Run JSON validation
 *
 * ZERO external dependencies. Deterministic.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// ═══════════════════════════════════════════════════════════════════════════════
// SSOT LOADER
// ═══════════════════════════════════════════════════════════════════════════════

export interface OmnipotentThresholds {
  readonly physics_corr_strong_min: number;
  readonly physics_corr_weak_max: number;
  readonly calibration_runs_required: number;
  readonly correlation_method_primary: string;
  readonly correlation_method_secondary: string;
}

export function loadOmnipotentThresholds(): OmnipotentThresholds | undefined {
  const candidates = [
    resolve(process.cwd(), 'docs/GENIUS-00-SPEC/GENIUS_SSOT.json'),
    resolve(process.cwd(), '../../docs/GENIUS-00-SPEC/GENIUS_SSOT.json'),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const raw = readFileSync(candidate, 'utf-8');
      const ssot = JSON.parse(raw);
      if (!ssot.omnipotent) return undefined;
      return {
        physics_corr_strong_min: ssot.omnipotent.physics_corr_strong_min,
        physics_corr_weak_max: ssot.omnipotent.physics_corr_weak_max,
        calibration_runs_required: ssot.omnipotent.calibration_runs_required,
        correlation_method_primary: ssot.omnipotent.correlation_method_primary,
        correlation_method_secondary: ssot.omnipotent.correlation_method_secondary,
      };
    }
  }
  return undefined;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORRELATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assign ranks to values with average-rank tie handling.
 * Tied values receive the mean of their ordinal positions.
 */
export function assignRanks(values: readonly number[]): number[] {
  const n = values.length;
  if (n === 0) return [];

  // Create (value, originalIndex) pairs and sort by value
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array<number>(n);
  let i = 0;
  while (i < n) {
    // Find the group of tied values
    let j = i;
    while (j < n && indexed[j].value === indexed[i].value) {
      j++;
    }
    // Average rank for this tie group (1-based)
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j;
  }

  return ranks;
}

/**
 * Pearson product-moment correlation coefficient.
 * Returns r in [-1, 1]. Returns 0 if variance is 0.
 */
export function pearsonCorrelation(x: readonly number[], y: readonly number[]): number {
  const n = x.length;
  if (n !== y.length || n < 2) return 0;

  const meanX = x.reduce((a, b) => a + b, 0) / n;
  const meanY = y.reduce((a, b) => a + b, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return 0;

  return sumXY / denom;
}

/**
 * Spearman rank correlation coefficient.
 * Ranks values (average-rank ties), then computes Pearson on ranks.
 */
export function spearmanCorrelation(x: readonly number[], y: readonly number[]): number {
  if (x.length !== y.length || x.length < 2) return 0;

  const ranksX = assignRanks(x);
  const ranksY = assignRanks(y);

  return pearsonCorrelation(ranksX, ranksY);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DECISION LOGIC
// ═══════════════════════════════════════════════════════════════════════════════

export type CalibrationDecision = 'A' | 'B' | 'C' | 'B_GREY_ZONE' | 'FAIL-CLOSED';

export function decideScenario(
  rho_S: number,
  rho_Q: number,
  thresholds?: { strong_min: number; weak_max: number },
): CalibrationDecision {
  if (!thresholds) return 'FAIL-CLOSED';

  // C: at least one strong negative correlation
  if (rho_S <= -thresholds.strong_min || rho_Q <= -thresholds.strong_min) return 'C';

  // A: both strongly positive
  if (
    rho_S >= thresholds.strong_min &&
    rho_Q >= thresholds.strong_min &&
    rho_S > 0 &&
    rho_Q > 0
  ) return 'A';

  // B: both weak
  if (
    Math.abs(rho_S) <= thresholds.weak_max &&
    Math.abs(rho_Q) <= thresholds.weak_max
  ) return 'B';

  // Grey zone → B with justification
  return 'B_GREY_ZONE';
}

// ═══════════════════════════════════════════════════════════════════════════════
// RUN JSON VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export interface CalibrationRunScores {
  readonly physics_score: number;
  readonly S_score: number;
  readonly Q_text: number;
  readonly M: number;
  readonly G: number;
  readonly delta_as: number;
  readonly AS: number;
  readonly ECC: number;
  readonly RCI: number;
  readonly SII: number;
  readonly IFI: number;
  readonly AAI: number;
}

export interface CalibrationRunJSON {
  readonly schema: string;
  readonly seed: number;
  readonly provider: string;
  readonly model: string;
  readonly timestamp: string;
  readonly prompt_hash: string;
  readonly output_hash: string;
  readonly scores: CalibrationRunScores;
  readonly verdict: string;
  readonly physics_audit: {
    readonly forced_transitions: number;
    readonly dead_zones: number;
    readonly feasibility_failures: number;
    readonly trajectory_compliance: number;
  };
  readonly run_hash: string;
}

const REQUIRED_SCORE_FIELDS: (keyof CalibrationRunScores)[] = [
  'physics_score', 'S_score', 'Q_text', 'M', 'G',
  'delta_as', 'AS', 'ECC', 'RCI', 'SII', 'IFI', 'AAI',
];

/**
 * Validate a calibration run JSON.
 * Returns list of errors. Empty = valid.
 */
export function validateRunJSON(run: unknown): string[] {
  const errors: string[] = [];

  if (!run || typeof run !== 'object') {
    errors.push('Run is not an object');
    return errors;
  }

  const r = run as Record<string, unknown>;

  if (!r.scores || typeof r.scores !== 'object') {
    errors.push('Missing scores object');
    return errors;
  }

  const scores = r.scores as Record<string, unknown>;

  for (const field of REQUIRED_SCORE_FIELDS) {
    if (scores[field] === undefined || scores[field] === null) {
      errors.push(`Missing scores.${field}`);
    } else if (typeof scores[field] !== 'number') {
      errors.push(`scores.${field} is not a number`);
    }
  }

  return errors;
}

/**
 * Validate that we have enough runs for a decision.
 * Returns error string or null if valid.
 */
export function validateRunCount(
  runCount: number,
  requiredRuns: number,
): string | null {
  if (runCount < requiredRuns) {
    return `Insufficient runs: ${runCount} < ${requiredRuns} required`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICS
// ═══════════════════════════════════════════════════════════════════════════════

export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((acc, v) => acc + (v - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
