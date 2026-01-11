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

import { createNexusError } from "../contracts/errors.js";
import type { NexusError } from "../contracts/types.js";
import type {
  PipelineDefinition,
  PipelineOptions,
  PipelineResult,
  PipelineStatus,
  PipelineExecution,
  PipelineEvent,
  PipelineEventHandler,
  StageDefinition,
  StageResult,
  StageStatus,
  StageContext,
  DEFAULT_PIPELINE_OPTIONS
} from "./types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTOR
// ═══════════════════════════════════════════════════════════════════════════════

export class PipelineExecutor {
  private readonly options: PipelineOptions;
  private readonly eventHandlers: PipelineEventHandler[] = [];
  private executionCounter = 0;

  constructor(options: PipelineOptions = {}) {
    this.options = {
      stopOnError: true,
      defaultTimeoutMs: 30000,
      defaultRetryCount: 0,
      seed: 42,
      traceEnabled: false,
      ...options
    };
  }

  /**
   * Execute a pipeline
   * INV-PIPE-01: Deterministic with seed
   */
  async execute<TInput, TOutput>(
    definition: PipelineDefinition,
    input: TInput
  ): Promise<PipelineResult> {
    const pipelineId = this.generatePipelineId();
    const startTimeMs = Date.now();

    this.emit({
      type: "pipeline:start",
      pipelineId,
      timestamp: new Date().toISOString(),
      data: { pipelineName: definition.name, input }
    });

    const stageResults: StageResult[] = [];
    const previousResults: Record<string, unknown> = { input };
    let status: PipelineStatus = "running";
    let currentOutput: unknown = input;
    let pipelineError: NexusError | undefined;

    const mergedOptions = { ...this.options, ...definition.options };

    try {
      // Execute stages sequentially
      for (let i = 0; i < definition.stages.length; i++) {
        const stage = definition.stages[i];

        // Check dependencies
        if (stage.dependsOn) {
          const unmetDeps = stage.dependsOn.filter(
            dep => !stageResults.some(r => r.stageName === dep && r.status === "completed")
          );
          if (unmetDeps.length > 0) {
            const error = createNexusError(
              "VALIDATION_FAILED",
              `Unmet dependencies for stage ${stage.name}: ${unmetDeps.join(", ")}`,
              "pipeline"
            );
            stageResults.push(this.createFailedStageResult(stage.name, error));
            if (mergedOptions.stopOnError && !stage.optional) {
              status = "failed";
              pipelineError = error;
              break;
            }
            continue;
          }
        }

        const stageResult = await this.executeStage(
          stage,
          currentOutput,
          {
            pipelineId,
            stageName: stage.name,
            stageIndex: i,
            seed: mergedOptions.seed ?? 42,
            previousResults,
            startTime: Date.now()
          },
          mergedOptions
        );

        stageResults.push(stageResult);
        previousResults[stage.name] = stageResult.data;

        if (stageResult.status === "completed") {
          currentOutput = stageResult.data;
        } else if (stageResult.status === "failed") {
          if (mergedOptions.stopOnError && !stage.optional) {
            status = "failed";
            pipelineError = stageResult.error;
            break;
          }
        }
      }

      if (status === "running") {
        status = "completed";
      }
    } catch (err) {
      status = "failed";
      pipelineError = err instanceof Error
        ? createNexusError("ADAPTER_ERROR", err.message, "pipeline")
        : createNexusError("ADAPTER_ERROR", String(err), "pipeline");
    }

    const endTimeMs = Date.now();

    const result: PipelineResult = {
      pipelineId,
      pipelineName: definition.name,
      status,
      stages: stageResults,
      startTimeMs,
      endTimeMs,
      durationMs: endTimeMs - startTimeMs,
      finalOutput: status === "completed" ? currentOutput : undefined,
      error: pipelineError
    };

    this.emit({
      type: status === "completed" ? "pipeline:complete" : "pipeline:error",
      pipelineId,
      timestamp: new Date().toISOString(),
      data: result
    });

    return result;
  }

  /**
   * Execute a single stage
   */
  private async executeStage<TInput, TOutput>(
    stage: StageDefinition<TInput, TOutput>,
    input: TInput,
    context: StageContext,
    options: PipelineOptions
  ): Promise<StageResult<TOutput>> {
    const startTimeMs = Date.now();
    const maxRetries = stage.retryCount ?? options.defaultRetryCount ?? 0;
    const timeoutMs = stage.timeoutMs ?? options.defaultTimeoutMs ?? 30000;

    this.emit({
      type: "stage:start",
      pipelineId: context.pipelineId,
      timestamp: new Date().toISOString(),
      stageName: stage.name,
      data: { input }
    });

    let lastError: NexusError | undefined;
    let retryCount = 0;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.executeWithTimeout(
          () => stage.handler(input, context),
          timeoutMs
        );

        const endTimeMs = Date.now();

        this.emit({
          type: "stage:complete",
          pipelineId: context.pipelineId,
          timestamp: new Date().toISOString(),
          stageName: stage.name,
          data: { output: result }
        });

        return {
          stageName: stage.name,
          status: "completed",
          data: result,
          startTimeMs,
          endTimeMs,
          durationMs: endTimeMs - startTimeMs,
          retryCount
        };
      } catch (err) {
        // Preserve NexusError if already one (e.g., timeout errors)
        if (typeof err === "object" && err !== null && "code" in err && "timestamp" in err) {
          lastError = err as NexusError;
        } else {
          lastError = err instanceof Error
            ? createNexusError("ADAPTER_ERROR", err.message, stage.name)
            : createNexusError("ADAPTER_ERROR", String(err), stage.name);
        }

        if (attempt < maxRetries) {
          retryCount++;
          this.emit({
            type: "stage:retry",
            pipelineId: context.pipelineId,
            timestamp: new Date().toISOString(),
            stageName: stage.name,
            data: { attempt: attempt + 1, error: lastError }
          });
        }
      }
    }

    const endTimeMs = Date.now();

    this.emit({
      type: "stage:error",
      pipelineId: context.pipelineId,
      timestamp: new Date().toISOString(),
      stageName: stage.name,
      data: { error: lastError }
    });

    return {
      stageName: stage.name,
      status: "failed",
      error: lastError,
      startTimeMs,
      endTimeMs,
      durationMs: endTimeMs - startTimeMs,
      retryCount
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(createNexusError("TIMEOUT", `Stage timed out after ${timeoutMs}ms`, "executor"));
      }, timeoutMs);

      fn()
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(err => {
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  /**
   * Create a failed stage result
   */
  private createFailedStageResult(stageName: string, error: NexusError): StageResult {
    const now = Date.now();
    return {
      stageName,
      status: "failed",
      error,
      startTimeMs: now,
      endTimeMs: now,
      durationMs: 0,
      retryCount: 0
    };
  }

  /**
   * Generate unique pipeline ID
   */
  private generatePipelineId(): string {
    const timestamp = Date.now().toString(36);
    const counter = (++this.executionCounter).toString(36).padStart(4, "0");
    return `PIPE-${timestamp}-${counter}`;
  }

  /**
   * Register event handler
   */
  on(handler: PipelineEventHandler): void {
    this.eventHandlers.push(handler);
  }

  /**
   * Remove event handler
   */
  off(handler: PipelineEventHandler): void {
    const index = this.eventHandlers.indexOf(handler);
    if (index !== -1) {
      this.eventHandlers.splice(index, 1);
    }
  }

  /**
   * Emit event
   */
  private emit(event: PipelineEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a pipeline executor
 */
export function createPipelineExecutor(options?: PipelineOptions): PipelineExecutor {
  return new PipelineExecutor(options);
}
