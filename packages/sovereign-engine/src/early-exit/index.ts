/**
 * OMEGA V2.3 — Early Exit Module Index
 *
 * Sprint V2.3 implementation 2026-05-26
 */

export * from './types.js';
export { computeDispersion, computeAxisDispersion, compositeScore } from './dispersion.js';
export { EarlyExitGate } from './gate.js';
export {
  evaluateThreshold,
  gridSearchThreshold,
  generateSyntheticSamples,
  DEFAULT_CALIBRATION_SEARCH,
} from './calibration.js';
export type {
  CalibrationSample,
  CalibrationResult,
  CalibrationSearchConfig,
} from './calibration.js';
