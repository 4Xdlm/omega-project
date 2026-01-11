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
import type { NexusAdapter, AdapterHealthResult, ExecutionTrace } from "../contracts/types.js";
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
/**
 * Adapter for orchestrator-core.
 * Provides deterministic plan execution.
 */
export declare class OrchestratorAdapter implements NexusAdapter {
    readonly name = "orchestrator";
    readonly version = "0.1.0";
    readonly isReadOnly: true;
    constructor();
    /**
     * Check adapter health.
     */
    checkHealth(): Promise<AdapterHealthResult>;
    /**
     * Execute a plan.
     * INV-ORCH-01: Deterministic with same seed
     */
    executePlan(plan: OrchestratorPlan, options: OrchestratorOptions): Promise<OrchestratorRunResult>;
    /**
     * Validate a plan structure.
     */
    validatePlan(plan: OrchestratorPlan): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Convert run result to execution trace.
     */
    toExecutionTrace(result: OrchestratorRunResult): ExecutionTrace;
    private executeStep;
    private runStepHandler;
    private createSkippedResult;
    private computeHash;
}
/**
 * Create an orchestrator adapter.
 */
export declare function createOrchestratorAdapter(): OrchestratorAdapter;
//# sourceMappingURL=orchestrator.adapter.d.ts.map