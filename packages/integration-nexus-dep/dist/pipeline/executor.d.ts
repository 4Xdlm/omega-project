/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PIPELINE EXECUTOR
 * Version: 0.6.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Pipeline execution engine.
 * INV-PIPE-01: Deterministic execution with seed.
 * INV-PIPE-02: Sequential stage execution.
 * INV-PIPE-03: Error handling with optional retry.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PipelineDefinition, PipelineOptions, PipelineResult, PipelineEventHandler } from "./types.js";
export declare class PipelineExecutor {
    private readonly options;
    private readonly eventHandlers;
    private executionCounter;
    constructor(options?: PipelineOptions);
    /**
     * Execute a pipeline
     * INV-PIPE-01: Deterministic with seed
     */
    execute<TInput, TOutput>(definition: PipelineDefinition, input: TInput): Promise<PipelineResult>;
    /**
     * Execute a single stage
     */
    private executeStage;
    /**
     * Execute with timeout
     */
    private executeWithTimeout;
    /**
     * Create a failed stage result
     */
    private createFailedStageResult;
    /**
     * Generate unique pipeline ID
     */
    private generatePipelineId;
    /**
     * Register event handler
     */
    on(handler: PipelineEventHandler): void;
    /**
     * Remove event handler
     */
    off(handler: PipelineEventHandler): void;
    /**
     * Emit event
     */
    private emit;
}
/**
 * Create a pipeline executor
 */
export declare function createPipelineExecutor(options?: PipelineOptions): PipelineExecutor;
//# sourceMappingURL=executor.d.ts.map