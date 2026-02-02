/**
 * @fileoverview OMEGA Orchestrator Core - Public API exports.
 * @module @omega/orchestrator-core
 * @version 0.1.0
 *
 * Deterministic execution engine for OMEGA pipeline orchestration.
 *
 * @example
 * ```typescript
 * import {
 *   createRunContext,
 *   createPlanBuilder,
 *   createExecutor,
 *   SimpleAdapterRegistry,
 *   DeterministicClock
 * } from '@omega/orchestrator-core';
 *
 * // Create deterministic context
 * const clock = new DeterministicClock(0);
 * const ctx = createRunContext({ seed: 'my-seed', clock });
 *
 * // Build a plan
 * const plan = createPlanBuilder('my-plan', '1.0.0')
 *   .addStep({ id: 'step1', kind: 'noop', input: {} })
 *   .build();
 *
 * // Execute
 * const executor = createExecutor();
 * const adapters = new SimpleAdapterRegistry();
 * const result = await executor.execute(plan, ctx, adapters);
 * ```
 */

// ============================================================================
// Clock utilities
// ============================================================================
export {
  Clock,
  SystemClock,
  DeterministicClock,
  createSystemClock,
  createDeterministicClock,
} from './util/clock.js';

// ============================================================================
// Hash utilities
// ============================================================================
export {
  sha256,
  sha256Buffer,
  sha256Json,
  verifySha256,
} from './util/hash.js';

// ============================================================================
// PRNG utilities
// ============================================================================
export type { PRNG } from './util/prng.js';

export {
  DEFAULT_PRNG_SEED,
  SeededPRNG,
  createPRNG,
  createPRNGFromEnv,
} from './util/prng.js';

// ============================================================================
// Stable JSON utilities
// ============================================================================
export {
  stableStringify,
  stableParse,
  stableEquals,
} from './util/stableJson.js';

// ============================================================================
// Core types
// ============================================================================
export type {
  PlatformInfo,
  IdFactory,
  StepAdapter,
  AdapterRegistry,
  RunContextData,
  StepResult,
  RunStatus,
  RunResult,
  DeterminismReport,
  DeterminismDifference,
} from './core/types.js';

export {
  SeededIdFactory,
  SimpleAdapterRegistry,
} from './core/types.js';

// ============================================================================
// Errors
// ============================================================================
export {
  OrchestratorErrorCode,
  OrchestratorError,
  createError,
  invalidPlanError,
  stepFailedError,
  timeoutError,
  determinismViolationError,
  adapterNotFoundError,
  isOrchestratorError,
} from './core/errors.js';

// ============================================================================
// RunContext
// ============================================================================
export type { RunContextOptions } from './core/RunContext.js';

export {
  RunContext,
  createRunContext,
  isValidRunContextData,
} from './core/RunContext.js';

// ============================================================================
// Plan
// ============================================================================
export type {
  PlanStep,
  PreStepHook,
  PostStepHook,
  PlanHooks,
  OrchestratorPlan,
  PlanValidationResult,
} from './core/Plan.js';

export {
  validatePlan,
  createPlanBuilder,
  PlanBuilder,
} from './core/Plan.js';

// ============================================================================
// Executor
// ============================================================================
export type {
  ExecutorOptions,
  OrchestratorExecutor,
} from './core/Executor.js';

export {
  DefaultExecutor,
  createExecutor,
} from './core/Executor.js';

// ============================================================================
// DeterminismGuard
// ============================================================================
export type { DeterminismGuard } from './core/DeterminismGuard.js';

export {
  DefaultDeterminismGuard,
  createDeterminismGuard,
  assertDeterministic,
} from './core/DeterminismGuard.js';

// ============================================================================
// Artifact Registry
// ============================================================================
export type {
  ArtifactMetadata,
  Artifact,
  ArtifactQuery,
  ArtifactRegistry,
  IdGenerator,
} from './artifacts/ArtifactRegistry.js';

export {
  InMemoryArtifactRegistry,
  createArtifactRegistry,
} from './artifacts/ArtifactRegistry.js';
