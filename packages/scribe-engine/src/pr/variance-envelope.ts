/**
 * OMEGA — VARIANCE ENVELOPE ANALYZER
 * Phase: PR-4 | Invariant: INV-ENTROPY-01
 *
 * Analyzes statistical variance across multiple runs to ensure deterministic stability.
 * Loads envelopes from calibration.json (GAP-4A) and supports downgrade flag (GAP-4B).
 */

import { readFileSync, existsSync } from 'node:fs';

// ============================================================================
// TYPES
// ============================================================================

export interface VarianceEnvelopeLimits {
  min: number;
  target: number;
  max: number;
}

export interface VarianceEnvelopeConfig {
  hard_pass_rate: VarianceEnvelopeLimits;
  soft_pass_rate: VarianceEnvelopeLimits;
  mean_hard_score: VarianceEnvelopeLimits;
  std_hard_score: VarianceEnvelopeLimits;
  mean_soft_score: VarianceEnvelopeLimits;
  std_soft_score: VarianceEnvelopeLimits;
}

export interface RunStats {
  hard_pass_rate: number;
  soft_pass_rate: number;
  mean_hard_score: number;
  std_hard_score: number;
  mean_soft_score: number;
  std_soft_score: number;
}

export interface VarianceViolation {
  metric: string;
  value: number;
  envelope: VarianceEnvelopeLimits;
  severity: 'out_of_bounds' | 'below_target';
}

export interface VarianceReport {
  stats: RunStats;
  verdict: 'PASS' | 'FAIL';
  violations: VarianceViolation[];
  downgrade_flag?: string; // GAP-4B
  total_runs: number;
  timestamp: string;
}

// ============================================================================
// CALIBRATION LOADING (GAP-4A)
// ============================================================================

const DEFAULT_VARIANCE_ENVELOPE: VarianceEnvelopeConfig = {
  hard_pass_rate: { min: 0.75, target: 0.85, max: 1.0 },
  soft_pass_rate: { min: 0.85, target: 0.95, max: 1.0 },
  mean_hard_score: { min: 0.70, target: 0.80, max: 0.95 },
  std_hard_score: { min: 0.0, target: 0.05, max: 0.15 },
  mean_soft_score: { min: 0.75, target: 0.85, max: 0.98 },
  std_soft_score: { min: 0.0, target: 0.04, max: 0.12 },
};

export function loadVarianceEnvelope(calibrationPath?: string): VarianceEnvelopeConfig {
  if (!calibrationPath) {
    calibrationPath = 'budgets/calibration.json';
  }

  if (!existsSync(calibrationPath)) {
    console.warn(`[variance-envelope] calibration.json not found, using defaults`);
    return DEFAULT_VARIANCE_ENVELOPE;
  }

  try {
    const raw = readFileSync(calibrationPath, 'utf8');
    const data = JSON.parse(raw);

    if (!data.VARIANCE_ENVELOPES) {
      console.warn(`[variance-envelope] VARIANCE_ENVELOPES not found in calibration, using defaults`);
      return DEFAULT_VARIANCE_ENVELOPE;
    }

    return data.VARIANCE_ENVELOPES as VarianceEnvelopeConfig;
  } catch (err) {
    console.warn(`[variance-envelope] failed to load calibration: ${err}, using defaults`);
    return DEFAULT_VARIANCE_ENVELOPE;
  }
}

// ============================================================================
// STATISTICS
// ============================================================================

export function computeStats(values: number[]): { mean: number; std: number } {
  if (values.length === 0) {
    return { mean: 0, std: 0 };
  }

  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;

  if (values.length === 1) {
    return { mean, std: 0 };
  }

  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;

  return { mean, std: Math.sqrt(variance) };
}

/**
 * Compute pass rate (fraction of values >= threshold).
 */
export function computePassRate(values: number[], threshold: number): number {
  if (values.length === 0) return 0;
  const passing = values.filter((v) => v >= threshold).length;
  return passing / values.length;
}

// ============================================================================
// VARIANCE ANALYSIS (GAP-4B: downgrade flag)
// ============================================================================

export function analyzeVariance(
  stats: RunStats,
  envelope?: VarianceEnvelopeConfig
): VarianceReport {
  const env = envelope ?? DEFAULT_VARIANCE_ENVELOPE;
  const violations: VarianceViolation[] = [];
  let hasOutOfBounds = false;

  // Check each metric against envelope
  const metrics: Array<{ key: keyof RunStats; env: VarianceEnvelopeLimits }> = [
    { key: 'hard_pass_rate', env: env.hard_pass_rate },
    { key: 'soft_pass_rate', env: env.soft_pass_rate },
    { key: 'mean_hard_score', env: env.mean_hard_score },
    { key: 'std_hard_score', env: env.std_hard_score },
    { key: 'mean_soft_score', env: env.mean_soft_score },
    { key: 'std_soft_score', env: env.std_soft_score },
  ];

  for (const { key, env: limits } of metrics) {
    const value = stats[key];

    if (value < limits.min || value > limits.max) {
      violations.push({
        metric: key,
        value,
        envelope: limits,
        severity: 'out_of_bounds',
      });
      hasOutOfBounds = true;
    } else if (value < limits.target) {
      violations.push({
        metric: key,
        value,
        envelope: limits,
        severity: 'below_target',
      });
    }
  }

  // GAP-4B: Downgrade flag if variance out but hard_pass_rate OK
  let downgradeFlag: string | undefined;
  const hardPassOk = stats.hard_pass_rate >= env.hard_pass_rate.min;

  if (hasOutOfBounds && hardPassOk) {
    downgradeFlag = 'DOWNGRADE_VARIANCE';
  }

  const verdict = hasOutOfBounds ? 'FAIL' : 'PASS';

  return {
    stats,
    verdict,
    violations,
    downgrade_flag: downgradeFlag,
    total_runs: 0, // Filled by caller
    timestamp: new Date().toISOString(),
  };
}
