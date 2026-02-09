/**
 * OMEGA Governance — Configuration
 * Phase D.2 — ALL thresholds centralized, NEVER hardcoded elsewhere
 */

/**
 * All governance thresholds. Every threshold has a documented meaning.
 * No magic numbers — everything is configurable and traceable.
 */
export interface GovConfig {
  /** Ecart ForgeScore for SOFT_DRIFT (default: 0.05 = 5%) */
  readonly DRIFT_SOFT_THRESHOLD: number;
  /** Ecart ForgeScore for HARD_DRIFT (default: 0.15 = 15%) */
  readonly DRIFT_HARD_THRESHOLD: number;
  /** Ecart ForgeScore for CRITICAL_DRIFT (default: 0.30 = 30%) */
  readonly DRIFT_CRITICAL_THRESHOLD: number;

  /** Minimum score for PASS certification (default: 0.70) */
  readonly CERT_MIN_SCORE: number;
  /** Minimum score for PASS_WITH_WARNINGS certification (default: 0.50) */
  readonly CERT_WARN_SCORE: number;

  /** Maximum acceptable variance between benchmark runs (default: 0.02 = 2%) */
  readonly BENCH_MAX_VARIANCE: number;
  /** Maximum acceptable duration in ms (default: 60000) */
  readonly BENCH_MAX_DURATION_MS: number;

  /** Maximum events returned by history query (default: 1000) */
  readonly HISTORY_MAX_RESULTS: number;
}

/** Default configuration — all thresholds documented */
export const DEFAULT_GOV_CONFIG: GovConfig = {
  DRIFT_SOFT_THRESHOLD: 0.05,
  DRIFT_HARD_THRESHOLD: 0.15,
  DRIFT_CRITICAL_THRESHOLD: 0.30,
  CERT_MIN_SCORE: 0.70,
  CERT_WARN_SCORE: 0.50,
  BENCH_MAX_VARIANCE: 0.02,
  BENCH_MAX_DURATION_MS: 60000,
  HISTORY_MAX_RESULTS: 1000,
};

/** Validate that a config has consistent thresholds */
export function validateConfig(config: GovConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (config.DRIFT_SOFT_THRESHOLD <= 0) {
    errors.push('DRIFT_SOFT_THRESHOLD must be > 0');
  }
  if (config.DRIFT_HARD_THRESHOLD <= config.DRIFT_SOFT_THRESHOLD) {
    errors.push('DRIFT_HARD_THRESHOLD must be > DRIFT_SOFT_THRESHOLD');
  }
  if (config.DRIFT_CRITICAL_THRESHOLD <= config.DRIFT_HARD_THRESHOLD) {
    errors.push('DRIFT_CRITICAL_THRESHOLD must be > DRIFT_HARD_THRESHOLD');
  }
  if (config.CERT_MIN_SCORE <= config.CERT_WARN_SCORE) {
    errors.push('CERT_MIN_SCORE must be > CERT_WARN_SCORE');
  }
  if (config.CERT_MIN_SCORE > 1 || config.CERT_MIN_SCORE < 0) {
    errors.push('CERT_MIN_SCORE must be in [0, 1]');
  }
  if (config.CERT_WARN_SCORE > 1 || config.CERT_WARN_SCORE < 0) {
    errors.push('CERT_WARN_SCORE must be in [0, 1]');
  }
  if (config.BENCH_MAX_VARIANCE <= 0 || config.BENCH_MAX_VARIANCE > 1) {
    errors.push('BENCH_MAX_VARIANCE must be in (0, 1]');
  }
  if (config.BENCH_MAX_DURATION_MS <= 0) {
    errors.push('BENCH_MAX_DURATION_MS must be > 0');
  }
  if (config.HISTORY_MAX_RESULTS <= 0 || !Number.isInteger(config.HISTORY_MAX_RESULTS)) {
    errors.push('HISTORY_MAX_RESULTS must be a positive integer');
  }

  return { valid: errors.length === 0, errors };
}

/** Create config from partial overrides */
export function createConfig(overrides?: Partial<GovConfig>): GovConfig {
  const config: GovConfig = { ...DEFAULT_GOV_CONFIG, ...overrides };
  const validation = validateConfig(config);
  if (!validation.valid) {
    throw new Error(`Invalid GovConfig: ${validation.errors.join('; ')}`);
  }
  return config;
}
