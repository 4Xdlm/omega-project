/**
 * OMEGA V4.4 — Phase 1: Contract Layer
 *
 * REFERENCE: VISION_FINALE_SCELLEE v1.0
 * STANDARD: NASA-Grade L4 / DO-178C Level A
 *
 * Exports all contract layer components:
 * - Types (base, canon, runtime)
 * - Symbols (symbolic definitions)
 * - Invariants (L1-L6 laws)
 * - Constants (16 emotions)
 * - Schemas (Zod validation)
 */

// Types
export type {
  EmotionCategory,
  EmotionId,
  SymbolicBounds,
  RuntimeBounds,
  AxisX,
  AxisY,
  AxisZ,
  ValidationStatus,
  ValidationResult,
  ActionType,
  WindowType,
  CompassDirection,
  O2Status,
} from './types.js';

export { EMOTION_IDS } from './types.js';

// Canon types
export type { EmotionParamsCanon } from './types-canon.js';
export { isEmotionParamsCanon } from './types-canon.js';

// Runtime types
export type {
  EmotionParamsRuntime,
  EmotionParamsFull,
  RuntimeConfig,
  EmotionPosition,
  RawAxes,
  EmotionState,
  EmotionVectorMap,
  TrajectoryPoint,
  EmotionTrajectory,
  SimulationConfig,
  CoreOutput,
  InjectedConfig,
} from './types-runtime.js';

export { isInjectedConfig } from './types-runtime.js';

// Symbols
export {
  SYMBOLS,
  SYMBOL_DOCS,
  getSymbol,
  getSymbolDoc,
  verifySymbolsComplete,
} from './symbols.js';

export type { SymbolKey } from './symbols.js';

// Invariants
export type { InvariantId, InvariantDefinition } from './invariants.js';

export {
  INVARIANTS,
  INVARIANT_IDS,
  getInvariant,
  verifyInvariantsComplete,
  getInvariantCount,
} from './invariants.js';

// Constants
export type { EmotionDefinition } from './constants.js';

export {
  EMOTIONS_V44,
  getEmotionDefinition,
  getEmotionsByCategory,
  getCanonParams,
  verifyEmotionsComplete,
  verifyCategoryDistribution,
} from './constants.js';

// Schemas
export type { ValidationBounds, SchemaCollection } from './schema.js';
export { createSchemas } from './schema.js';
