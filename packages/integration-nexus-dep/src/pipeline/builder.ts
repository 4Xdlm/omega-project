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

import type {
  PipelineDefinition,
  PipelineOptions,
  StageDefinition,
  StageHandler
} from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export class StageBuilder<TInput = unknown, TOutput = unknown> {
  private readonly config: {
    name: string;
    description?: string;
    handler: StageHandler<TInput, TOutput>;
    retryCount?: number;
    timeoutMs?: number;
    optional?: boolean;
    dependsOn?: string[];
  };

  constructor(name: string, handler: StageHandler<TInput, TOutput>) {
    this.config = { name, handler };
  }

  /**
   * Set stage description
   */
  describe(description: string): this {
    this.config.description = description;
    return this;
  }

  /**
   * Set retry count
   */
  retry(count: number): this {
    this.config.retryCount = count;
    return this;
  }

  /**
   * Set timeout
   */
  timeout(ms: number): this {
    this.config.timeoutMs = ms;
    return this;
  }

  /**
   * Mark as optional (pipeline continues on failure)
   */
  optional(): this {
    this.config.optional = true;
    return this;
  }

  /**
   * Set dependencies
   */
  dependsOn(...stages: string[]): this {
    this.config.dependsOn = stages;
    return this;
  }

  /**
   * Build the stage definition
   */
  build(): StageDefinition<TInput, TOutput> {
    return Object.freeze({ ...this.config });
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE BUILDER
// ═══════════════════════════════════════════════════════════════════════════════

export class PipelineBuilder {
  private name: string;
  private version: string = "1.0.0";
  private description?: string;
  private readonly stages: StageDefinition[] = [];
  private options: PipelineOptions = {};

  constructor(name: string) {
    this.name = name;
  }

  /**
   * Set pipeline version
   */
  setVersion(version: string): this {
    this.version = version;
    return this;
  }

  /**
   * Set pipeline description
   */
  describe(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Add a stage
   */
  addStage<TInput, TOutput>(
    stage: StageDefinition<TInput, TOutput> | StageBuilder<TInput, TOutput>
  ): this {
    if (stage instanceof StageBuilder) {
      this.stages.push(stage.build());
    } else {
      this.stages.push(stage);
    }
    return this;
  }

  /**
   * Add a simple stage with just name and handler
   */
  stage<TInput, TOutput>(
    name: string,
    handler: StageHandler<TInput, TOutput>
  ): this {
    this.stages.push({ name, handler });
    return this;
  }

  /**
   * Set pipeline options
   */
  withOptions(options: PipelineOptions): this {
    this.options = { ...this.options, ...options };
    return this;
  }

  /**
   * Set stop on error behavior
   */
  stopOnError(value: boolean = true): this {
    this.options.stopOnError = value;
    return this;
  }

  /**
   * Set default timeout for all stages
   */
  defaultTimeout(ms: number): this {
    this.options.defaultTimeoutMs = ms;
    return this;
  }

  /**
   * Set default retry count for all stages
   */
  defaultRetry(count: number): this {
    this.options.defaultRetryCount = count;
    return this;
  }

  /**
   * Set seed for deterministic execution
   */
  seed(value: number): this {
    this.options.seed = value;
    return this;
  }

  /**
   * Enable tracing
   */
  withTrace(): this {
    this.options.traceEnabled = true;
    return this;
  }

  /**
   * Build the pipeline definition
   * INV-PIPE-04: Produces immutable definition
   */
  build(): PipelineDefinition {
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
export function createPipeline(name: string): PipelineBuilder {
  return new PipelineBuilder(name);
}

/**
 * Create a stage builder
 */
export function createStage<TInput, TOutput>(
  name: string,
  handler: StageHandler<TInput, TOutput>
): StageBuilder<TInput, TOutput> {
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
export function createAnalysisPipeline(): PipelineDefinition {
  const myceliumAdapter = new MyceliumAdapter();
  const genomeAdapter = new GenomeAdapter();
  const bioAdapter = new MyceliumBioAdapter();

  return createPipeline("OMEGA-ANALYSIS")
    .setVersion("1.0.0")
    .describe("Standard OMEGA narrative analysis pipeline")
    .stage<{ content: string; seed?: number }, { normalizedContent: string; seed: number }>(
      "validate",
      async (input, ctx) => {
        const result = await myceliumAdapter.validateInput({
          content: input.content,
          seed: input.seed ?? ctx.seed
        });
        if (!result.valid) {
          throw new Error(result.rejectionMessage || "Validation failed");
        }
        return {
          normalizedContent: result.normalizedContent!,
          seed: input.seed ?? ctx.seed
        };
      }
    )
    .stage<{ normalizedContent: string; seed: number }, { fingerprint: string; version: string }>(
      "analyze",
      async (input) => {
        const result = await genomeAdapter.analyzeText(input.normalizedContent, input.seed);
        return {
          fingerprint: result.fingerprint,
          version: result.version
        };
      }
    )
    .stage<{ fingerprint: string; version: string }, { rootHash: string; nodeCount: number }>(
      "buildDNA",
      async (input, ctx) => {
        const validateResult = ctx.previousResults["validate"] as { normalizedContent: string };
        const result = await bioAdapter.buildDNA({
          validatedContent: validateResult.normalizedContent,
          seed: ctx.seed,
          mode: "auto"
        });
        return {
          rootHash: result.rootHash,
          nodeCount: result.nodeCount
        };
      }
    )
    .stopOnError()
    .defaultTimeout(30000)
    .build();
}

/**
 * Create a validation-only pipeline
 */
export function createValidationPipeline(): PipelineDefinition {
  const myceliumAdapter = new MyceliumAdapter();

  return createPipeline("OMEGA-VALIDATION")
    .setVersion("1.0.0")
    .describe("Input validation pipeline")
    .stage<{ content: string }, { valid: boolean; normalized?: string }>(
      "validate",
      async (input, ctx) => {
        const result = await myceliumAdapter.validateInput({
          content: input.content,
          seed: ctx.seed
        });
        return {
          valid: result.valid,
          normalized: result.normalizedContent
        };
      }
    )
    .build();
}
