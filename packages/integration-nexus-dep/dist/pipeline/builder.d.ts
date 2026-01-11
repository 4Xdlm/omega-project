/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PIPELINE BUILDER
 * Version: 0.6.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Fluent builder for pipeline definitions.
 * INV-PIPE-04: Builder produces immutable definitions.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PipelineDefinition, PipelineOptions, StageDefinition, StageHandler } from "./types.js";
export declare class StageBuilder<TInput = unknown, TOutput = unknown> {
    private readonly config;
    constructor(name: string, handler: StageHandler<TInput, TOutput>);
    /**
     * Set stage description
     */
    describe(description: string): this;
    /**
     * Set retry count
     */
    retry(count: number): this;
    /**
     * Set timeout
     */
    timeout(ms: number): this;
    /**
     * Mark as optional (pipeline continues on failure)
     */
    optional(): this;
    /**
     * Set dependencies
     */
    dependsOn(...stages: string[]): this;
    /**
     * Build the stage definition
     */
    build(): StageDefinition<TInput, TOutput>;
}
export declare class PipelineBuilder {
    private name;
    private version;
    private description?;
    private readonly stages;
    private options;
    constructor(name: string);
    /**
     * Set pipeline version
     */
    setVersion(version: string): this;
    /**
     * Set pipeline description
     */
    describe(description: string): this;
    /**
     * Add a stage
     */
    addStage<TInput, TOutput>(stage: StageDefinition<TInput, TOutput> | StageBuilder<TInput, TOutput>): this;
    /**
     * Add a simple stage with just name and handler
     */
    stage<TInput, TOutput>(name: string, handler: StageHandler<TInput, TOutput>): this;
    /**
     * Set pipeline options
     */
    withOptions(options: PipelineOptions): this;
    /**
     * Set stop on error behavior
     */
    stopOnError(value?: boolean): this;
    /**
     * Set default timeout for all stages
     */
    defaultTimeout(ms: number): this;
    /**
     * Set default retry count for all stages
     */
    defaultRetry(count: number): this;
    /**
     * Set seed for deterministic execution
     */
    seed(value: number): this;
    /**
     * Enable tracing
     */
    withTrace(): this;
    /**
     * Build the pipeline definition
     * INV-PIPE-04: Produces immutable definition
     */
    build(): PipelineDefinition;
}
/**
 * Create a pipeline builder
 */
export declare function createPipeline(name: string): PipelineBuilder;
/**
 * Create a stage builder
 */
export declare function createStage<TInput, TOutput>(name: string, handler: StageHandler<TInput, TOutput>): StageBuilder<TInput, TOutput>;
/**
 * Create a standard analysis pipeline
 */
export declare function createAnalysisPipeline(): PipelineDefinition;
/**
 * Create a validation-only pipeline
 */
export declare function createValidationPipeline(): PipelineDefinition;
//# sourceMappingURL=builder.d.ts.map