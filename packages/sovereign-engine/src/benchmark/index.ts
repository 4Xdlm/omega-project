/**
 * OMEGA Benchmark — Public API
 * Sprint 17
 */
export { OMEGA_CORPUS, HUMAN_CORPUS, FULL_CORPUS } from './corpus.js';
export type { BenchmarkSample } from './corpus.js';

export { createBlindSession, validateEvaluation, EVALUATION_GRID } from './protocol.js';
export type { HumanEvaluation, BlindSample, BlindMapping, BenchmarkSession } from './protocol.js';

export { computeCorrelationReport, pearsonCorrelation, AXIS_MAPPING } from './correlation.js';
export type { AxisCorrelation, CorrelationReport, ScoreDataPoint } from './correlation.js';
