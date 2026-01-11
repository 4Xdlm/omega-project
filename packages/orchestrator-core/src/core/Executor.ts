/**
 * @fileoverview OrchestratorExecutor - Deterministic plan execution engine.
 * Executes plans step-by-step with full traceability.
 * @module @omega/orchestrator-core/core/Executor
 */

import type {
  AdapterRegistry,
  RunContextData,
  RunResult,
  RunStatus,
  StepResult,
} from './types.js';
import type { OrchestratorPlan, PlanStep } from './Plan.js';
import { validatePlan } from './Plan.js';
import type { RunContext } from './RunContext.js';
import { sha256 } from '../util/hash.js';
import { stableStringify } from '../util/stableJson.js';
import {
  OrchestratorErrorCode,
  adapterNotFoundError,
  invalidPlanError,
  stepFailedError,
  timeoutError,
} from './errors.js';

/**
 * Default timeout for steps without explicit timeout.
 */
const DEFAULT_STEP_TIMEOUT_MS = 30000;

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
  execute(
    plan: OrchestratorPlan,
    ctx: RunContext,
    adapters: AdapterRegistry
  ): Promise<RunResult>;
}

/**
 * Executes a single step with timeout.
 */
async function executeStepWithTimeout(
  step: PlanStep,
  ctx: RunContextData,
  adapters: AdapterRegistry,
  timeoutMs: number
): Promise<{ output?: unknown; error?: { code: string; message: string; context?: Record<string, unknown> } }> {
  const adapter = adapters.get(step.kind);
  if (!adapter) {
    const err = adapterNotFoundError(step.kind, ctx.clock.nowISO());
    return { error: { code: err.code, message: err.message, context: err.context } };
  }

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      const err = timeoutError(step.id, timeoutMs, ctx.clock.nowISO());
      resolve({ error: { code: err.code, message: err.message, context: err.context } });
    }, timeoutMs);

    adapter
      .execute(step.input, ctx)
      .then((output) => {
        clearTimeout(timer);
        resolve({ output });
      })
      .catch((e: unknown) => {
        clearTimeout(timer);
        const err = stepFailedError(step.id, String(e), ctx.clock.nowISO(), e);
        resolve({ error: { code: err.code, message: err.message, context: err.context } });
      });
  });
}

/**
 * Computes the hash for a run result.
 * Hash is computed from serialized result WITHOUT the hash field.
 */
function computeRunResultHash(result: Omit<RunResult, 'hash'>): string {
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
  return sha256(stableStringify(hashable));
}

/**
 * Default executor implementation.
 */
export class DefaultExecutor implements OrchestratorExecutor {
  private readonly options: Required<ExecutorOptions>;

  constructor(options: ExecutorOptions = {}) {
    this.options = {
      defaultTimeoutMs: options.defaultTimeoutMs ?? DEFAULT_STEP_TIMEOUT_MS,
      continueOnFailure: options.continueOnFailure ?? false,
    };
  }

  async execute(
    plan: OrchestratorPlan,
    ctx: RunContext,
    adapters: AdapterRegistry
  ): Promise<RunResult> {
    // Validate plan first
    const validation = validatePlan(plan);
    if (!validation.valid) {
      const err = invalidPlanError(
        validation.errors.join('; '),
        ctx.timestamp(),
        { errors: validation.errors }
      );
      // Return a failed result immediately
      const started_at = ctx.timestamp();
      const result: Omit<RunResult, 'hash'> = {
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
    const stepResults: StepResult[] = [];
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
              code: OrchestratorErrorCode.OMEGA_ORCH_STEP_FAILED,
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
        } catch {
          // Hooks should not fail execution - ignore errors
        }
      }

      const stepStarted = ctx.timestamp();
      const stepStartTime = ctx.clock.now();
      const timeoutMs = step.timeout_ms ?? this.options.defaultTimeoutMs;

      const { output, error } = await executeStepWithTimeout(
        step,
        ctx.toData(),
        adapters,
        timeoutMs
      );

      const stepCompleted = ctx.timestamp();
      const stepDuration = ctx.clock.now() - stepStartTime;

      const stepResult: StepResult = {
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
      if (error && error.code === OrchestratorErrorCode.OMEGA_ORCH_TIMEOUT) {
        stepResult.status = 'TIMEOUT';
      }

      stepResults.push(stepResult);

      // Call post-step hook
      if (plan.hooks?.post_step) {
        try {
          plan.hooks.post_step(step, stepResult);
        } catch {
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
    let status: RunStatus;
    if (!hasFailure) {
      status = 'SUCCESS';
    } else if (stepResults.some((r) => r.status === 'SUCCESS')) {
      status = 'PARTIAL';
    } else {
      status = 'FAILURE';
    }

    const result: Omit<RunResult, 'hash'> = {
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
export function createExecutor(options?: ExecutorOptions): OrchestratorExecutor {
  return new DefaultExecutor(options);
}
