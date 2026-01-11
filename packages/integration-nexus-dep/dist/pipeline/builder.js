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
// ═══════════════════════════════════════════════════════════════════════════════
// STAGE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
export class StageBuilder {
    config;
    constructor(name, handler) {
        this.config = { name, handler };
    }
    /**
     * Set stage description
     */
    describe(description) {
        this.config.description = description;
        return this;
    }
    /**
     * Set retry count
     */
    retry(count) {
        this.config.retryCount = count;
        return this;
    }
    /**
     * Set timeout
     */
    timeout(ms) {
        this.config.timeoutMs = ms;
        return this;
    }
    /**
     * Mark as optional (pipeline continues on failure)
     */
    optional() {
        this.config.optional = true;
        return this;
    }
    /**
     * Set dependencies
     */
    dependsOn(...stages) {
        this.config.dependsOn = stages;
        return this;
    }
    /**
     * Build the stage definition
     */
    build() {
        return Object.freeze({ ...this.config });
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════
export class PipelineBuilder {
    name;
    version = "1.0.0";
    description;
    stages = [];
    options = {};
    constructor(name) {
        this.name = name;
    }
    /**
     * Set pipeline version
     */
    setVersion(version) {
        this.version = version;
        return this;
    }
    /**
     * Set pipeline description
     */
    describe(description) {
        this.description = description;
        return this;
    }
    /**
     * Add a stage
     */
    addStage(stage) {
        if (stage instanceof StageBuilder) {
            this.stages.push(stage.build());
        }
        else {
            this.stages.push(stage);
        }
        return this;
    }
    /**
     * Add a simple stage with just name and handler
     */
    stage(name, handler) {
        this.stages.push({ name, handler });
        return this;
    }
    /**
     * Set pipeline options
     */
    withOptions(options) {
        this.options = { ...this.options, ...options };
        return this;
    }
    /**
     * Set stop on error behavior
     */
    stopOnError(value = true) {
        this.options.stopOnError = value;
        return this;
    }
    /**
     * Set default timeout for all stages
     */
    defaultTimeout(ms) {
        this.options.defaultTimeoutMs = ms;
        return this;
    }
    /**
     * Set default retry count for all stages
     */
    defaultRetry(count) {
        this.options.defaultRetryCount = count;
        return this;
    }
    /**
     * Set seed for deterministic execution
     */
    seed(value) {
        this.options.seed = value;
        return this;
    }
    /**
     * Enable tracing
     */
    withTrace() {
        this.options.traceEnabled = true;
        return this;
    }
    /**
     * Build the pipeline definition
     * INV-PIPE-04: Produces immutable definition
     */
    build() {
        if (this.stages.length === 0) {
            throw new Error("Pipeline must have at least one stage");
        }
        return Object.freeze({
            name: this.name,
            version: this.version,
            description: this.description,
            stages: Object.freeze([...this.stages]),
            options: Object.freeze({ ...this.options })
        });
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a pipeline builder
 */
export function createPipeline(name) {
    return new PipelineBuilder(name);
}
/**
 * Create a stage builder
 */
export function createStage(name, handler) {
    return new StageBuilder(name, handler);
}
// ═══════════════════════════════════════════════════════════════════════════════
// PRE-BUILT PIPELINES
// ═══════════════════════════════════════════════════════════════════════════════
import { GenomeAdapter } from "../adapters/genome.adapter.js";
import { MyceliumAdapter } from "../adapters/mycelium.adapter.js";
import { MyceliumBioAdapter } from "../adapters/mycelium-bio.adapter.js";
/**
 * Create a standard analysis pipeline
 */
export function createAnalysisPipeline() {
    const myceliumAdapter = new MyceliumAdapter();
    const genomeAdapter = new GenomeAdapter();
    const bioAdapter = new MyceliumBioAdapter();
    return createPipeline("OMEGA-ANALYSIS")
        .setVersion("1.0.0")
        .describe("Standard OMEGA narrative analysis pipeline")
        .stage("validate", async (input, ctx) => {
        const result = await myceliumAdapter.validateInput({
            content: input.content,
            seed: input.seed ?? ctx.seed
        });
        if (!result.valid) {
            throw new Error(result.rejectionMessage || "Validation failed");
        }
        return {
            normalizedContent: result.normalizedContent,
            seed: input.seed ?? ctx.seed
        };
    })
        .stage("analyze", async (input) => {
        const result = await genomeAdapter.analyzeText(input.normalizedContent, input.seed);
        return {
            fingerprint: result.fingerprint,
            version: result.version
        };
    })
        .stage("buildDNA", async (input, ctx) => {
        const result = await bioAdapter.buildDNA({
            validatedContent: ctx.previousResults["validate"],
            seed: ctx.seed,
            mode: "auto"
        });
        return {
            rootHash: result.rootHash,
            nodeCount: result.nodeCount
        };
    })
        .stopOnError()
        .defaultTimeout(30000)
        .build();
}
/**
 * Create a validation-only pipeline
 */
export function createValidationPipeline() {
    const myceliumAdapter = new MyceliumAdapter();
    return createPipeline("OMEGA-VALIDATION")
        .setVersion("1.0.0")
        .describe("Input validation pipeline")
        .stage("validate", async (input, ctx) => {
        const result = await myceliumAdapter.validateInput({
            content: input.content,
            seed: ctx.seed
        });
        return {
            valid: result.valid,
            normalized: result.normalizedContent
        };
    })
        .build();
}
//# sourceMappingURL=builder.js.map