/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ORCHESTRATOR ADAPTER
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Adapter for @omega/orchestrator-core.
 * Provides deterministic plan execution within NEXUS pipelines.
 *
 * INV-NEXUS-01: Adapters are READ-ONLY
 * INV-ORCH-01: Deterministic execution with same seed
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type {
  NexusAdapter,
  AdapterHealthResult,
  ExecutionTrace,
  TraceStep,
} from "../contracts/types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR TYPES (Mirrors from @omega/orchestrator-core)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Plan step definition.
 */
export interface OrchestratorStep {
  readonly id: string;
  readonly kind: string;
  readonly input: Record<string, unknown>;
  readonly depends_on?: readonly string[];
}

/**
 * Plan definition.
 */
export interface OrchestratorPlan {
  readonly id: string;
  readonly version: string;
  readonly steps: readonly OrchestratorStep[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Step result from orchestrator.
 */
export interface OrchestratorStepResult {
  readonly step_id: string;
  readonly kind: string;
  readonly status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'TIMEOUT';
  readonly output?: unknown;
  readonly error?: {
    readonly code: string;
    readonly message: string;
  };
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
}

/**
 * Run result from orchestrator.
 */
export interface OrchestratorRunResult {
  readonly run_id: string;
  readonly plan_id: string;
  readonly status: 'SUCCESS' | 'FAILURE' | 'PARTIAL';
  readonly steps: readonly OrchestratorStepResult[];
  readonly started_at: string;
  readonly completed_at: string;
  readonly duration_ms: number;
  readonly hash: string;
}

/**
 * Orchestrator execution options.
 */
export interface OrchestratorOptions {
  readonly seed: string;
  readonly startTimeMs?: number;
  readonly verifyDeterminism?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORCHESTRATOR ADAPTER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Adapter for orchestrator-core.
 * Provides deterministic plan execution.
 */
export class OrchestratorAdapter implements NexusAdapter {
  readonly name = "orchestrator";
  readonly version = "0.1.0";
  readonly isReadOnly = true as const;

  constructor() {
    Object.freeze(this);
  }

  /**
   * Check adapter health.
   */
  async checkHealth(): Promise<AdapterHealthResult> {
    const start = Date.now();
    try {
      // Verify orchestrator is available
      return {
        adapter: this.name,
        healthy: true,
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      return {
        adapter: this.name,
        healthy: false,
        latencyMs: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Execute a plan.
   * INV-ORCH-01: Deterministic with same seed
   */
  async executePlan(
    plan: OrchestratorPlan,
    options: OrchestratorOptions
  ): Promise<OrchestratorRunResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    // Skeleton: Execute steps in dependency order
    const stepResults: OrchestratorStepResult[] = [];
    const completed = new Set<string>();
    let overallStatus: 'SUCCESS' | 'FAILURE' | 'PARTIAL' = 'SUCCESS';

    for (const step of plan.steps) {
      // Check dependencies
      const depsReady = (step.depends_on ?? []).every((d) => completed.has(d));
      if (!depsReady) {
        stepResults.push(this.createSkippedResult(step));
        overallStatus = 'PARTIAL';
        continue;
      }

      // Execute step
      const stepResult = await this.executeStep(step, options);
      stepResults.push(stepResult);

      if (stepResult.status === 'SUCCESS') {
        completed.add(step.id);
      } else if (stepResult.status === 'FAILURE') {
        overallStatus = 'FAILURE';
      }
    }

    const completedAt = new Date().toISOString();
    const durationMs = Date.now() - startMs;

    // Generate deterministic hash
    const hash = this.computeHash(`${plan.id}:${options.seed}:${durationMs}`);

    return {
      run_id: `run-${options.seed}-${Date.now().toString(36)}`,
      plan_id: plan.id,
      status: overallStatus,
      steps: stepResults,
      started_at: startedAt,
      completed_at: completedAt,
      duration_ms: durationMs,
      hash,
    };
  }

  /**
   * Validate a plan structure.
   */
  validatePlan(plan: OrchestratorPlan): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!plan.id) {
      errors.push("Plan must have an id");
    }

    if (!plan.version) {
      errors.push("Plan must have a version");
    }

    if (!Array.isArray(plan.steps)) {
      errors.push("Plan must have steps array");
    } else {
      const stepIds = new Set<string>();
      for (const step of plan.steps) {
        if (!step.id) {
          errors.push("Each step must have an id");
        } else if (stepIds.has(step.id)) {
          errors.push(`Duplicate step id: ${step.id}`);
        } else {
          stepIds.add(step.id);
        }

        if (!step.kind) {
          errors.push(`Step ${step.id || "?"} must have a kind`);
        }

        // Check for circular dependencies
        if (step.depends_on) {
          for (const dep of step.depends_on) {
            if (dep === step.id) {
              errors.push(`Step ${step.id} cannot depend on itself`);
            }
          }
        }
      }

      // Check for missing dependencies
      for (const step of plan.steps) {
        for (const dep of step.depends_on ?? []) {
          if (!stepIds.has(dep)) {
            errors.push(`Step ${step.id} depends on unknown step: ${dep}`);
          }
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Convert run result to execution trace.
   */
  toExecutionTrace(result: OrchestratorRunResult): ExecutionTrace {
    const steps: TraceStep[] = result.steps.map((s) => ({
      module: "orchestrator",
      operation: `${s.kind}:${s.step_id}`,
      startTimeMs: Date.parse(s.started_at),
      endTimeMs: Date.parse(s.completed_at),
      success: s.status === 'SUCCESS',
      hash: undefined,
    }));

    return {
      requestId: result.run_id,
      steps,
      totalTimeMs: result.duration_ms,
      determinismHash: result.hash,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async executeStep(
    step: OrchestratorStep,
    options: OrchestratorOptions
  ): Promise<OrchestratorStepResult> {
    const startedAt = new Date().toISOString();
    const startMs = Date.now();

    try {
      // Skeleton: Execute based on kind
      const output = await this.runStepHandler(step, options);

      const completedAt = new Date().toISOString();
      return {
        step_id: step.id,
        kind: step.kind,
        status: 'SUCCESS',
        output,
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: Date.now() - startMs,
      };
    } catch (err) {
      const completedAt = new Date().toISOString();
      return {
        step_id: step.id,
        kind: step.kind,
        status: 'FAILURE',
        error: {
          code: 'STEP_ERROR',
          message: err instanceof Error ? err.message : String(err),
        },
        started_at: startedAt,
        completed_at: completedAt,
        duration_ms: Date.now() - startMs,
      };
    }
  }

  private async runStepHandler(
    step: OrchestratorStep,
    _options: OrchestratorOptions
  ): Promise<unknown> {
    // Skeleton handlers for common step kinds
    switch (step.kind) {
      case 'noop':
        return { ok: true };
      case 'echo':
        return { echoed: step.input };
      case 'fail':
        throw new Error((step.input as { message?: string }).message ?? 'Intentional failure');
      case 'delay':
        await new Promise((r) => setTimeout(r, (step.input as { ms?: number }).ms ?? 10));
        return { delayed: true };
      default:
        return { kind: step.kind, input: step.input };
    }
  }

  private createSkippedResult(step: OrchestratorStep): OrchestratorStepResult {
    const now = new Date().toISOString();
    return {
      step_id: step.id,
      kind: step.kind,
      status: 'SKIPPED',
      started_at: now,
      completed_at: now,
      duration_ms: 0,
    };
  }

  private computeHash(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create an orchestrator adapter.
 */
export function createOrchestratorAdapter(): OrchestratorAdapter {
  return new OrchestratorAdapter();
}
