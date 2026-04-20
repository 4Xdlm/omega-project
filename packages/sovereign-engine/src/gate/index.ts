/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 REJECTION GATE — BARREL EXPORTS
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/index.ts
 * ADR:      docs/DEC-20260411-003-R6-REJECTION-SAMPLING.md
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Types
export type {
  R6GateConfig,
  R6GateMode,
  R6GateAttempt,
  R6GateResult,
  R6GateLog,
  R6ProseGenerator,
  R6Language,
} from './r6-types.js';

// Config builder
export { buildR6GateConfig } from './r6-types.js';

// CALC Scorer
export {
  scoreForR6Gate,
  computeRidgeScore,
  routeLang,
  type R6CalcScoreResult,
} from './r6-calc-scorer.js';

// Gate principal
export {
  runR6RejectionGate,
  selectBestAttempt,
  buildR6GateLog,
} from './r6-rejection-gate.js';

// Pipeline adapter
export {
  isR6GateEnabled,
  getR6GateMode,
  runR6GateInPipeline,
  createR6GeneratorFromProvider,
  type R6PipelineResult,
} from './r6-pipeline-adapter.js';
