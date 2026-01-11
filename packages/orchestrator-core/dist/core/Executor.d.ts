/**
 * @fileoverview OrchestratorExecutor - Deterministic plan execution engine.
 * Executes plans step-by-step with full traceability.
 * @module @omega/orchestrator-core/core/Executor
 */
import type { AdapterRegistry, RunResult } from './types.js';
import type { OrchestratorPlan } from './Plan.js';
import type { RunContext } from './RunContext.js';
/**
 * Executor configuration options.
 */
export interface ExecutorOptions {
    /** Default timeout for steps (ms) */
    defaultTimeoutMs?: number;
    /** Whether to continue on step failure */
    continueOnFailure?: boolean;
}
/**
 * Orchestrator executor interface.
 */
export interface OrchestratorExecutor {
    /**
     * Executes a plan with given context and adapters.
     * @param plan - Plan to execute
     * @param ctx - Run context
     * @param adapters - Adapter registry
     * @returns Run result with all step results
     */
    execute(plan: OrchestratorPlan, ctx: RunContext, adapters: AdapterRegistry): Promise<RunResult>;
}
/**
 * Default executor implementation.
 */
export declare class DefaultExecutor implements OrchestratorExecutor {
    private readonly options;
    constructor(options?: ExecutorOptions);
    execute(plan: OrchestratorPlan, ctx: RunContext, adapters: AdapterRegistry): Promise<RunResult>;
}
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
export declare function createExecutor(options?: ExecutorOptions): OrchestratorExecutor;
//# sourceMappingURL=Executor.d.ts.map