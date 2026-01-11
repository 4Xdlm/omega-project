/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — PIPELINE TYPES
 * Version: 0.6.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Type definitions for pipeline orchestration.
 * INV-PIPE-01: Pipelines are deterministic.
 * INV-PIPE-02: Stage execution is ordered.
 * INV-PIPE-03: Errors halt pipeline by default.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { NexusRequest, NexusResponse, NexusError } from "../contracts/types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE STATUS
// ═══════════════════════════════════════════════════════════════════════════════

export type PipelineStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type StageStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface StageDefinition<TInput = unknown, TOutput = unknown> {
  readonly name: string;
  readonly description?: string;
  readonly handler: StageHandler<TInput, TOutput>;
  readonly retryCount?: number;
  readonly timeoutMs?: number;
  readonly optional?: boolean;
  readonly dependsOn?: readonly string[];
}

export type StageHandler<TInput, TOutput> = (
  input: TInput,
  context: StageContext
) => Promise<TOutput>;

export interface StageContext {
  readonly pipelineId: string;
  readonly stageName: string;
  readonly stageIndex: number;
  readonly seed: number;
  readonly previousResults: Readonly<Record<string, unknown>>;
  readonly startTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STAGE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface StageResult<T = unknown> {
  readonly stageName: string;
  readonly status: StageStatus;
  readonly data?: T;
  readonly error?: NexusError;
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly durationMs: number;
  readonly retryCount: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE DEFINITION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineDefinition {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  readonly stages: readonly StageDefinition[];
  readonly options?: PipelineOptions;
}

export interface PipelineOptions {
  readonly stopOnError?: boolean;
  readonly defaultTimeoutMs?: number;
  readonly defaultRetryCount?: number;
  readonly seed?: number;
  readonly traceEnabled?: boolean;
}

export const DEFAULT_PIPELINE_OPTIONS: PipelineOptions = {
  stopOnError: true,
  defaultTimeoutMs: 30000,
  defaultRetryCount: 0,
  seed: 42,
  traceEnabled: false
};

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE RESULT
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineResult {
  readonly pipelineId: string;
  readonly pipelineName: string;
  readonly status: PipelineStatus;
  readonly stages: readonly StageResult[];
  readonly startTimeMs: number;
  readonly endTimeMs: number;
  readonly durationMs: number;
  readonly finalOutput?: unknown;
  readonly error?: NexusError;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════════════════════

export interface PipelineExecution {
  readonly id: string;
  readonly definition: PipelineDefinition;
  readonly status: PipelineStatus;
  readonly currentStage: number;
  readonly results: readonly StageResult[];
  readonly startTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

export type PipelineEventType =
  | "pipeline:start"
  | "pipeline:complete"
  | "pipeline:error"
  | "stage:start"
  | "stage:complete"
  | "stage:error"
  | "stage:retry";

export interface PipelineEvent {
  readonly type: PipelineEventType;
  readonly pipelineId: string;
  readonly timestamp: string;
  readonly stageName?: string;
  readonly data?: unknown;
}

export type PipelineEventHandler = (event: PipelineEvent) => void;
