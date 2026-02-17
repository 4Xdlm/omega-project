/**
 * OMEGA Calibration — Public API
 * Sprint 18
 */
export { calibrateWeights, DEFAULT_MACRO_WEIGHTS } from './weight-calibrator.js';
export type { WeightAdjustment, CalibrationResult, WeightConfig } from './weight-calibrator.js';

export { decidePhysicsActivation, getPhysicsWeight, createActivationConfig } from './physics-activation.js';
export type { ActivationLevel, PhysicsActivationConfig, ActivationDecision } from './physics-activation.js';

export { getGenreProfile, getAllGenreProfiles, applyGenreWeights, getGenreAxisFloor, getGenreThreshold, listGenres } from './genre-thresholds.js';
export type { Genre, GenreProfile } from './genre-thresholds.js';
