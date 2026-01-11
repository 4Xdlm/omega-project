"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createArtifactRegistry = exports.InMemoryArtifactRegistry = exports.assertDeterministic = exports.createDeterminismGuard = exports.DefaultDeterminismGuard = exports.createExecutor = exports.DefaultExecutor = exports.PlanBuilder = exports.createPlanBuilder = exports.validatePlan = exports.isValidRunContextData = exports.createRunContext = exports.RunContext = exports.isOrchestratorError = exports.adapterNotFoundError = exports.determinismViolationError = exports.timeoutError = exports.stepFailedError = exports.invalidPlanError = exports.createError = exports.OrchestratorErrorCode = exports.SimpleAdapterRegistry = exports.SeededIdFactory = exports.stableEquals = exports.stableParse = exports.stableStringify = exports.verifySha256 = exports.sha256Json = exports.sha256Buffer = exports.sha256 = exports.createDeterministicClock = exports.createSystemClock = exports.DeterministicClock = exports.SystemClock = void 0;
// ============================================================================
// Clock utilities
// ============================================================================
var clock_js_1 = require("./util/clock.js");
Object.defineProperty(exports, "SystemClock", { enumerable: true, get: function () { return clock_js_1.SystemClock; } });
Object.defineProperty(exports, "DeterministicClock", { enumerable: true, get: function () { return clock_js_1.DeterministicClock; } });
Object.defineProperty(exports, "createSystemClock", { enumerable: true, get: function () { return clock_js_1.createSystemClock; } });
Object.defineProperty(exports, "createDeterministicClock", { enumerable: true, get: function () { return clock_js_1.createDeterministicClock; } });
// ============================================================================
// Hash utilities
// ============================================================================
var hash_js_1 = require("./util/hash.js");
Object.defineProperty(exports, "sha256", { enumerable: true, get: function () { return hash_js_1.sha256; } });
Object.defineProperty(exports, "sha256Buffer", { enumerable: true, get: function () { return hash_js_1.sha256Buffer; } });
Object.defineProperty(exports, "sha256Json", { enumerable: true, get: function () { return hash_js_1.sha256Json; } });
Object.defineProperty(exports, "verifySha256", { enumerable: true, get: function () { return hash_js_1.verifySha256; } });
// ============================================================================
// Stable JSON utilities
// ============================================================================
var stableJson_js_1 = require("./util/stableJson.js");
Object.defineProperty(exports, "stableStringify", { enumerable: true, get: function () { return stableJson_js_1.stableStringify; } });
Object.defineProperty(exports, "stableParse", { enumerable: true, get: function () { return stableJson_js_1.stableParse; } });
Object.defineProperty(exports, "stableEquals", { enumerable: true, get: function () { return stableJson_js_1.stableEquals; } });
var types_js_1 = require("./core/types.js");
Object.defineProperty(exports, "SeededIdFactory", { enumerable: true, get: function () { return types_js_1.SeededIdFactory; } });
Object.defineProperty(exports, "SimpleAdapterRegistry", { enumerable: true, get: function () { return types_js_1.SimpleAdapterRegistry; } });
// ============================================================================
// Errors
// ============================================================================
var errors_js_1 = require("./core/errors.js");
Object.defineProperty(exports, "OrchestratorErrorCode", { enumerable: true, get: function () { return errors_js_1.OrchestratorErrorCode; } });
Object.defineProperty(exports, "createError", { enumerable: true, get: function () { return errors_js_1.createError; } });
Object.defineProperty(exports, "invalidPlanError", { enumerable: true, get: function () { return errors_js_1.invalidPlanError; } });
Object.defineProperty(exports, "stepFailedError", { enumerable: true, get: function () { return errors_js_1.stepFailedError; } });
Object.defineProperty(exports, "timeoutError", { enumerable: true, get: function () { return errors_js_1.timeoutError; } });
Object.defineProperty(exports, "determinismViolationError", { enumerable: true, get: function () { return errors_js_1.determinismViolationError; } });
Object.defineProperty(exports, "adapterNotFoundError", { enumerable: true, get: function () { return errors_js_1.adapterNotFoundError; } });
Object.defineProperty(exports, "isOrchestratorError", { enumerable: true, get: function () { return errors_js_1.isOrchestratorError; } });
var RunContext_js_1 = require("./core/RunContext.js");
Object.defineProperty(exports, "RunContext", { enumerable: true, get: function () { return RunContext_js_1.RunContext; } });
Object.defineProperty(exports, "createRunContext", { enumerable: true, get: function () { return RunContext_js_1.createRunContext; } });
Object.defineProperty(exports, "isValidRunContextData", { enumerable: true, get: function () { return RunContext_js_1.isValidRunContextData; } });
var Plan_js_1 = require("./core/Plan.js");
Object.defineProperty(exports, "validatePlan", { enumerable: true, get: function () { return Plan_js_1.validatePlan; } });
Object.defineProperty(exports, "createPlanBuilder", { enumerable: true, get: function () { return Plan_js_1.createPlanBuilder; } });
Object.defineProperty(exports, "PlanBuilder", { enumerable: true, get: function () { return Plan_js_1.PlanBuilder; } });
var Executor_js_1 = require("./core/Executor.js");
Object.defineProperty(exports, "DefaultExecutor", { enumerable: true, get: function () { return Executor_js_1.DefaultExecutor; } });
Object.defineProperty(exports, "createExecutor", { enumerable: true, get: function () { return Executor_js_1.createExecutor; } });
var DeterminismGuard_js_1 = require("./core/DeterminismGuard.js");
Object.defineProperty(exports, "DefaultDeterminismGuard", { enumerable: true, get: function () { return DeterminismGuard_js_1.DefaultDeterminismGuard; } });
Object.defineProperty(exports, "createDeterminismGuard", { enumerable: true, get: function () { return DeterminismGuard_js_1.createDeterminismGuard; } });
Object.defineProperty(exports, "assertDeterministic", { enumerable: true, get: function () { return DeterminismGuard_js_1.assertDeterministic; } });
var ArtifactRegistry_js_1 = require("./artifacts/ArtifactRegistry.js");
Object.defineProperty(exports, "InMemoryArtifactRegistry", { enumerable: true, get: function () { return ArtifactRegistry_js_1.InMemoryArtifactRegistry; } });
Object.defineProperty(exports, "createArtifactRegistry", { enumerable: true, get: function () { return ArtifactRegistry_js_1.createArtifactRegistry; } });
//# sourceMappingURL=index.js.map