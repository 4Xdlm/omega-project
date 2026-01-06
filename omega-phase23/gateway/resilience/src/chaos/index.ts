/**
 * OMEGA RESILIENCE PROOF SYSTEM
 * Chaos Algebra - Module Index
 * 
 * Phase 23 - Sprint 23.0
 * 
 * Exports all chaos algebra components.
 */

// Types
export {
  // Branded types
  PerturbationId,
  ChaosSeed,
  Magnitude,
  DurationMs,
  TimestampMs,
  
  // Enums
  PerturbationDomain,
  PerturbationEffect,
  SystemResponse,
  CompositionOperator,
  AlgebraicProperty,
  
  // Core types
  PerturbationTarget,
  TemporalBounds,
  Perturbation,
  PerturbationResult,
  ComposedPerturbation,
  CompositionParams,
  ComputedBounds,
  AlgebraicProof,
  
  // Factory functions
  perturbationId,
  chaosSeed,
  magnitude,
  durationMs,
  timestampMs,
  
  // Type guards
  isPerturbation,
  isComposedPerturbation,
  
  // Constants
  MAX_MAGNITUDE,
  IDENTITY_MAGNITUDE,
  DEFAULT_TEMPORAL_BOUNDS,
  ALL_DOMAINS,
  ALL_EFFECTS,
  ALL_RESPONSES,
  VALID_RESPONSES,
} from './types.js';

// Composition
export {
  sequence,
  parallel,
  choice,
  repeat,
  conditional,
  identity,
  isIdentity,
  sequenceAll,
  parallelAll,
  getBounds,
  verifyClosure,
  verifyAssociativity,
  verifyIdentity,
  verifyBoundedness,
  depth,
  complexity,
  flatten,
} from './composition.js';

// Factory
export {
  PerturbationBuilder,
  perturbation,
  clockSkew,
  networkDelay,
  networkFailure,
  memoryCorruption,
  logicBypass,
  resourceExhaustion,
  raceCondition,
  networkInstabilityScenario,
  clockDriftScenario,
  memoryPressureScenario,
  fullChaosScenario,
  DeterministicRandom,
  createRandom,
} from './factory.js';

// Injector
export {
  InjectionContext,
  ModuleState,
  AppliedEffect,
  InjectionRecord,
  StateSnapshot,
  ChaosInjector,
  createInjector,
  createMockContext,
} from './injector.js';
