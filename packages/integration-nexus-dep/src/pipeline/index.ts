/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PIPELINE INDEX
 * Version: 0.6.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Types
export type {
  PipelineStatus,
  StageStatus,
  StageDefinition,
  StageHandler,
  StageContext,
  StageResult,
  PipelineDefinition,
  PipelineOptions,
  PipelineResult,
  PipelineExecution,
  PipelineEventType,
  PipelineEvent,
  PipelineEventHandler
} from "./types.js";

export { DEFAULT_PIPELINE_OPTIONS } from "./types.js";

// Executor
export { PipelineExecutor, createPipelineExecutor } from "./executor.js";

// Builder
export {
  PipelineBuilder,
  StageBuilder,
  createPipeline,
  createStage,
  createAnalysisPipeline,
  createValidationPipeline
} from "./builder.js";

// DI Interfaces
export type {
  IValidationAdapter,
  IGenomeAdapter,
  IDNAAdapter,
  PipelineAdapters
} from "./builder.js";
