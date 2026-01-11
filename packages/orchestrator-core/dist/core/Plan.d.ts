/**
 * @fileoverview OrchestratorPlan - Plan definition and validation.
 * Plans are immutable configurations for orchestration runs.
 * @module @omega/orchestrator-core/core/Plan
 */
import type { RunContextData, StepResult } from './types.js';
/**
 * Single step in an orchestration plan.
 */
export interface PlanStep {
    /** Unique step identifier */
    id: string;
    /** Step kind (determines which adapter handles it) */
    kind: string;
    /** Input data for the step */
    input: unknown;
    /** Optional list of expected output keys (for validation) */
    expected_outputs?: string[];
    /** Optional timeout in milliseconds */
    timeout_ms?: number;
    /** Optional dependencies (step IDs that must complete first) */
    depends_on?: string[];
}
/**
 * Hook function called before step execution.
 * Must be pure (no side effects outside logging).
 */
export type PreStepHook = (step: PlanStep, ctx: RunContextData) => void;
/**
 * Hook function called after step execution.
 * Must be pure (no side effects outside logging).
 */
export type PostStepHook = (step: PlanStep, result: StepResult) => void;
/**
 * Hooks for observing plan execution.
 */
export interface PlanHooks {
    /** Called before each step executes */
    pre_step?: PreStepHook;
    /** Called after each step completes */
    post_step?: PostStepHook;
}
/**
 * Orchestration plan definition.
 * Immutable configuration for a run.
 */
export interface OrchestratorPlan {
    /** Unique plan identifier */
    id: string;
    /** Plan version string */
    version: string;
    /** Ordered list of steps to execute */
    steps: PlanStep[];
    /** Optional hooks for observation */
    hooks?: PlanHooks;
    /** Optional plan metadata */
    metadata?: Record<string, unknown>;
}
/**
 * Validation result for a plan.
 */
export interface PlanValidationResult {
    /** Whether the plan is valid */
    valid: boolean;
    /** List of validation errors (if any) */
    errors: string[];
}
/**
 * Validates an orchestrator plan.
 * @param plan - Plan to validate
 * @returns Validation result with any errors
 *
 * @example
 * ```typescript
 * const result = validatePlan(myPlan);
 * if (!result.valid) {
 *   console.error('Plan errors:', result.errors);
 * }
 * ```
 */
export declare function validatePlan(plan: OrchestratorPlan): PlanValidationResult;
/**
 * Creates a plan builder for fluent construction.
 * @param id - Plan ID
 * @param version - Plan version
 * @returns PlanBuilder instance
 */
export declare function createPlanBuilder(id: string, version: string): PlanBuilder;
/**
 * Fluent builder for constructing plans.
 */
export declare class PlanBuilder {
    private readonly plan;
    constructor(id: string, version: string);
    /**
     * Adds a step to the plan.
     * @param step - Step to add
     * @returns this for chaining
     */
    addStep(step: PlanStep): this;
    /**
     * Sets the pre-step hook.
     * @param hook - Hook function
     * @returns this for chaining
     */
    onPreStep(hook: PreStepHook): this;
    /**
     * Sets the post-step hook.
     * @param hook - Hook function
     * @returns this for chaining
     */
    onPostStep(hook: PostStepHook): this;
    /**
     * Sets plan metadata.
     * @param metadata - Metadata object
     * @returns this for chaining
     */
    withMetadata(metadata: Record<string, unknown>): this;
    /**
     * Builds and validates the plan.
     * @returns The constructed plan
     * @throws Error if plan is invalid
     */
    build(): OrchestratorPlan;
    /**
     * Builds without validation.
     * Use only for testing invalid plans.
     * @returns The constructed plan (may be invalid)
     */
    buildUnsafe(): OrchestratorPlan;
}
//# sourceMappingURL=Plan.d.ts.map