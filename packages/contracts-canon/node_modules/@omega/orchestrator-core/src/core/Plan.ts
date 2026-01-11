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
 * Validates a plan step.
 * @param step - Step to validate
 * @param index - Step index in plan
 * @returns Array of error messages (empty if valid)
 */
function validateStep(step: PlanStep, index: number): string[] {
  const errors: string[] = [];
  const prefix = `Step[${index}]`;

  if (!step.id || typeof step.id !== 'string' || step.id.trim() === '') {
    errors.push(`${prefix}: 'id' is required and must be a non-empty string`);
  }

  if (!step.kind || typeof step.kind !== 'string' || step.kind.trim() === '') {
    errors.push(`${prefix}: 'kind' is required and must be a non-empty string`);
  }

  if (step.timeout_ms !== undefined) {
    if (typeof step.timeout_ms !== 'number' || step.timeout_ms <= 0) {
      errors.push(`${prefix}: 'timeout_ms' must be a positive number`);
    }
  }

  if (step.expected_outputs !== undefined) {
    if (!Array.isArray(step.expected_outputs)) {
      errors.push(`${prefix}: 'expected_outputs' must be an array`);
    } else if (!step.expected_outputs.every((o) => typeof o === 'string')) {
      errors.push(`${prefix}: 'expected_outputs' must contain only strings`);
    }
  }

  if (step.depends_on !== undefined) {
    if (!Array.isArray(step.depends_on)) {
      errors.push(`${prefix}: 'depends_on' must be an array`);
    } else if (!step.depends_on.every((d) => typeof d === 'string')) {
      errors.push(`${prefix}: 'depends_on' must contain only strings`);
    }
  }

  return errors;
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
export function validatePlan(plan: OrchestratorPlan): PlanValidationResult {
  const errors: string[] = [];

  // Validate plan-level fields
  if (!plan.id || typeof plan.id !== 'string' || plan.id.trim() === '') {
    errors.push("Plan 'id' is required and must be a non-empty string");
  }

  if (!plan.version || typeof plan.version !== 'string' || plan.version.trim() === '') {
    errors.push("Plan 'version' is required and must be a non-empty string");
  }

  if (!Array.isArray(plan.steps)) {
    errors.push("Plan 'steps' is required and must be an array");
    return { valid: false, errors };
  }

  if (plan.steps.length === 0) {
    errors.push('Plan must have at least one step');
  }

  // Validate each step
  const stepIds = new Set<string>();
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    const stepErrors = validateStep(step, i);
    errors.push(...stepErrors);

    // Check for duplicate IDs
    if (step.id) {
      if (stepIds.has(step.id)) {
        errors.push(`Step[${i}]: duplicate step id '${step.id}'`);
      }
      stepIds.add(step.id);
    }
  }

  // Validate dependencies reference valid step IDs
  for (let i = 0; i < plan.steps.length; i++) {
    const step = plan.steps[i];
    if (step.depends_on) {
      for (const depId of step.depends_on) {
        if (!stepIds.has(depId)) {
          errors.push(`Step[${i}]: depends_on references unknown step '${depId}'`);
        }
        if (depId === step.id) {
          errors.push(`Step[${i}]: step cannot depend on itself`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Creates a plan builder for fluent construction.
 * @param id - Plan ID
 * @param version - Plan version
 * @returns PlanBuilder instance
 */
export function createPlanBuilder(id: string, version: string): PlanBuilder {
  return new PlanBuilder(id, version);
}

/**
 * Fluent builder for constructing plans.
 */
export class PlanBuilder {
  private readonly plan: OrchestratorPlan;

  constructor(id: string, version: string) {
    this.plan = {
      id,
      version,
      steps: [],
    };
  }

  /**
   * Adds a step to the plan.
   * @param step - Step to add
   * @returns this for chaining
   */
  addStep(step: PlanStep): this {
    this.plan.steps.push(step);
    return this;
  }

  /**
   * Sets the pre-step hook.
   * @param hook - Hook function
   * @returns this for chaining
   */
  onPreStep(hook: PreStepHook): this {
    if (!this.plan.hooks) {
      this.plan.hooks = {};
    }
    this.plan.hooks.pre_step = hook;
    return this;
  }

  /**
   * Sets the post-step hook.
   * @param hook - Hook function
   * @returns this for chaining
   */
  onPostStep(hook: PostStepHook): this {
    if (!this.plan.hooks) {
      this.plan.hooks = {};
    }
    this.plan.hooks.post_step = hook;
    return this;
  }

  /**
   * Sets plan metadata.
   * @param metadata - Metadata object
   * @returns this for chaining
   */
  withMetadata(metadata: Record<string, unknown>): this {
    this.plan.metadata = metadata;
    return this;
  }

  /**
   * Builds and validates the plan.
   * @returns The constructed plan
   * @throws Error if plan is invalid
   */
  build(): OrchestratorPlan {
    const result = validatePlan(this.plan);
    if (!result.valid) {
      throw new Error(`Invalid plan: ${result.errors.join('; ')}`);
    }
    return { ...this.plan };
  }

  /**
   * Builds without validation.
   * Use only for testing invalid plans.
   * @returns The constructed plan (may be invalid)
   */
  buildUnsafe(): OrchestratorPlan {
    return { ...this.plan };
  }
}
