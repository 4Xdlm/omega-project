/**
 * OMEGA Canon Kernel — Calibration Symbols
 *
 * These are SYMBOLS, not values. Values are provided at runtime via CalibrationConfig.
 * This enforces the "zero magic numbers" rule.
 *
 * RULE: No numeric literals in business logic. All thresholds come from calibration.
 */

// Symbols for thresholds (no numeric values here)
export const Ω_WINDOW = Symbol.for('Ω_WINDOW');
export const Ω_CONTINUITY_MIN = Symbol.for('Ω_CONTINUITY_MIN');
export const Ω_EMOTION_MIN = Symbol.for('Ω_EMOTION_MIN');
export const Ω_PACING_MIN = Symbol.for('Ω_PACING_MIN');
export const Ω_STYLE_MIN = Symbol.for('Ω_STYLE_MIN');
export const Ω_CLARITY_MIN = Symbol.for('Ω_CLARITY_MIN');
export const Ω_ORIGINALITY_MIN = Symbol.for('Ω_ORIGINALITY_MIN');
export const Ω_PROMISE_MIN = Symbol.for('Ω_PROMISE_MIN');

// Hash chain symbols
export const Ω_CHAIN_DEPTH_MAX = Symbol.for('Ω_CHAIN_DEPTH_MAX');
export const Ω_BATCH_SIZE_MAX = Symbol.for('Ω_BATCH_SIZE_MAX');

// Conflict resolution symbols
export const Ω_AUTO_RESOLVE_TIMEOUT_MS = Symbol.for('Ω_AUTO_RESOLVE_TIMEOUT_MS');
export const Ω_ESCALATION_THRESHOLD = Symbol.for('Ω_ESCALATION_THRESHOLD');

// All calibration symbols
export type CalibrationSymbol =
  | typeof Ω_WINDOW
  | typeof Ω_CONTINUITY_MIN
  | typeof Ω_EMOTION_MIN
  | typeof Ω_PACING_MIN
  | typeof Ω_STYLE_MIN
  | typeof Ω_CLARITY_MIN
  | typeof Ω_ORIGINALITY_MIN
  | typeof Ω_PROMISE_MIN
  | typeof Ω_CHAIN_DEPTH_MAX
  | typeof Ω_BATCH_SIZE_MAX
  | typeof Ω_AUTO_RESOLVE_TIMEOUT_MS
  | typeof Ω_ESCALATION_THRESHOLD;

// Calibration config interface (values provided at runtime)
export interface CalibrationConfig {
  [Ω_WINDOW]: number;
  [Ω_CONTINUITY_MIN]: number;
  [Ω_EMOTION_MIN]: number;
  [Ω_PACING_MIN]: number;
  [Ω_STYLE_MIN]: number;
  [Ω_CLARITY_MIN]: number;
  [Ω_ORIGINALITY_MIN]: number;
  [Ω_PROMISE_MIN]: number;
  [Ω_CHAIN_DEPTH_MAX]: number;
  [Ω_BATCH_SIZE_MAX]: number;
  [Ω_AUTO_RESOLVE_TIMEOUT_MS]: number;
  [Ω_ESCALATION_THRESHOLD]: number;
}

/**
 * Test calibration values.
 * ONLY for testing - production must provide explicit config.
 */
export const TEST_CALIBRATION: CalibrationConfig = {
  [Ω_WINDOW]: 5,
  [Ω_CONTINUITY_MIN]: 0.8,
  [Ω_EMOTION_MIN]: 0.7,
  [Ω_PACING_MIN]: 0.6,
  [Ω_STYLE_MIN]: 0.7,
  [Ω_CLARITY_MIN]: 0.8,
  [Ω_ORIGINALITY_MIN]: 0.5,
  [Ω_PROMISE_MIN]: 0.9,
  [Ω_CHAIN_DEPTH_MAX]: 1000,
  [Ω_BATCH_SIZE_MAX]: 100,
  [Ω_AUTO_RESOLVE_TIMEOUT_MS]: 30000,
  [Ω_ESCALATION_THRESHOLD]: 3,
};

/**
 * Get calibrated value with type safety.
 */
export function getCalibrated<S extends CalibrationSymbol>(
  config: CalibrationConfig,
  symbol: S
): number {
  const value = config[symbol];
  if (typeof value !== 'number') {
    throw new Error(`Missing calibration for ${String(symbol)}`);
  }
  return value;
}
