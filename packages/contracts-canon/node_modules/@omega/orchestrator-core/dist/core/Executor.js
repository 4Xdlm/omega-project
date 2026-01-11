"use strict";
/**
 * @fileoverview OrchestratorExecutor - Deterministic plan execution engine.
 * Executes plans step-by-step with full traceability.
 * @module @omega/orchestrator-core/core/Executor
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultExecutor = void 0;
exports.createExecutor = createExecutor;
const Plan_js_1 = require("./Plan.js");
const hash_js_1 = require("../util/hash.js");
const stableJson_js_1 = require("../util/stableJson.js");
const errors_js_1 = require("./errors.js");
/**
 * Default timeout for steps without explicit timeout.
 */
const DEFAULT_STEP_TIMEOUT_MS = 30000;
/**
 * Executes a single step with timeout.
 */
async function executeStepWithTimeout(step, ctx, adapters, timeoutMs) {
    const adapter = adapters.get(step.kind);
    if (!adapter) {
        const err = (0, errors_js_1.adapterNotFoundError)(step.kind, ctx.clock.nowISO());
        return { error: { code: err.code, message: err.message, context: err.context } };
    }
    return new Promise((resolve) => {
        const timer = setTimeout(() => {
            const err = (0, errors_js_1.timeoutError)(step.id, timeoutMs, ctx.clock.nowISO());
            resolve({ error: { code: err.code, message: err.message, context: err.context } });
        }, timeoutMs);
        adapter
            .execute(step.input, ctx)
            .then((output) => {
            clearTimeout(timer);
            resolve({ output });
        })
            .catch((e) => {
            clearTimeout(timer);
            const err = (0, errors_js_1.stepFailedError)(step.id, String(e), ctx.clock.nowISO(), e);
            resolve({ error: { code: err.code, message: err.message, context: err.context } });
        });
    });
}
/**
 * Computes the hash for a run result.
 * Hash is computed from serialized result WITHOUT the hash field.
 */
function computeRunResultHash(result) {
    // Create a deterministic representation excluding timestamps for step-level
    // but keeping structure for verification
    const hashable = {
        run_id: result.run_id,
        plan_id: result.plan_id,
        status: result.status,
        steps: result.steps.map((s) => ({
            step_id: s.step_id,
            kind: s.kind,
            status: s.status,
            output: s.output,
            error: s.error,
            duration_ms: s.duration_ms,
        })),
        duration_ms: result.duration_ms,
    };
    return (0, hash_js_1.sha256)((0, stableJson_js_1.stableStringify)(hashable));
}
/**
 * Default executor implementation.
 */
class DefaultExecutor {
    options;
    constructor(options = {}) {
        this.options = {
            defaultTimeoutMs: options.defaultTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
            continueOnFailure: options.continueOnFailure ?? false,
        };
    }
    async execute(plan, ctx, adapters) {
        // Validate plan first
        const validation = (0, Plan_js_1.validatePlan)(plan);
        if (!validation.valid) {
            // Return a failed result immediately
            const started_at = ctx.timestamp();
            const result = {
                run_id: ctx.run_id,
                plan_id: plan.id,
                status: 'FAILURE',
                steps: [],
                started_at,
                completed_at: ctx.timestamp(),
                duration_ms: 0,
            };
            return { ...result, hash: computeRunResultHash(result) };
        }
        const started_at = ctx.timestamp();
        const startTime = ctx.clock.now();
        const stepResults = [];
        let hasFailure = false;
        // Execute steps in order
        for (const step of plan.steps) {
            // Check dependencies
            if (step.depends_on && step.depends_on.length > 0) {
                const depsFailed = step.depends_on.some((depId) => {
                    const depResult = stepResults.find((r) => r.step_id === depId);
                    return depResult && depResult.status !== 'SUCCESS';
                });
                if (depsFailed) {
                    // Skip this step due to failed dependency
                    const stepStarted = ctx.timestamp();
                    stepResults.push({
                        step_id: step.id,
                        kind: step.kind,
                        status: 'SKIPPED',
                        started_at: stepStarted,
                        completed_at: ctx.timestamp(),
                        duration_ms: 0,
                        error: {
                            code: errors_js_1.OrchestratorErrorCode.OMEGA_ORCH_STEP_FAILED,
                            message: 'Skipped due to failed dependency',
                        },
                    });
                    continue;
                }
            }
            // Call pre-step hook
            if (plan.hooks?.pre_step) {
                try {
                    plan.hooks.pre_step(step, ctx.toData());
                }
                catch {
                    // Hooks should not fail execution - ignore errors
                }
            }
            const stepStarted = ctx.timestamp();
            const stepStartTime = ctx.clock.now();
            const timeoutMs = step.timeout_ms ?? this.options.defaultTimeoutMs;
            const { output, error } = await executeStepWithTimeout(step, ctx.toData(), adapters, timeoutMs);
            const stepCompleted = ctx.timestamp();
            const stepDuration = ctx.clock.now() - stepStartTime;
            const stepResult = {
                step_id: step.id,
                kind: step.kind,
                status: error ? 'FAILURE' : 'SUCCESS',
                output: error ? undefined : output,
                error: error,
                started_at: stepStarted,
                completed_at: stepCompleted,
                duration_ms: stepDuration,
            };
            // Check for timeout specifically
            if (error && error.code === errors_js_1.OrchestratorErrorCode.OMEGA_ORCH_TIMEOUT) {
                stepResult.status = 'TIMEOUT';
            }
            stepResults.push(stepResult);
            // Call post-step hook
            if (plan.hooks?.post_step) {
                try {
                    plan.hooks.post_step(step, stepResult);
                }
                catch {
                    // Hooks should not fail execution - ignore errors
                }
            }
            if (stepResult.status !== 'SUCCESS') {
                hasFailure = true;
                if (!this.options.continueOnFailure) {
                    break;
                }
            }
        }
        const completed_at = ctx.timestamp();
        const duration_ms = ctx.clock.now() - startTime;
        // Determine overall status
        let status;
        if (!hasFailure) {
            status = 'SUCCESS';
        }
        else if (stepResults.some((r) => r.status === 'SUCCESS')) {
            status = 'PARTIAL';
        }
        else {
            status = 'FAILURE';
        }
        const result = {
            run_id: ctx.run_id,
            plan_id: plan.id,
            status,
            steps: stepResults,
            started_at,
            completed_at,
            duration_ms,
        };
        return {
            ...result,
            hash: computeRunResultHash(result),
        };
    }
}
exports.DefaultExecutor = DefaultExecutor;
/**
 * Creates a default executor instance.
 * @param options - Executor options
 * @returns Executor instance
 *
 * @example
 * ```typescript
 * const executor = createExecutor({ continueOnFailure: true });
 * const result = await executor.execute(plan, ctx, adapters);
 * ```
 */
function createExecutor(options) {
    return new DefaultExecutor(options);
}
//# sourceMappingURL=Executor.js.map