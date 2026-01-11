/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — SCHEDULER TYPES
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Type definitions for job scheduling and policy enforcement.
 * INV-SCHED-01: Jobs are executed in priority order.
 * INV-SCHED-02: Policies are checked before execution.
 * INV-SCHED-03: Job state transitions are atomic.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { PipelineDefinition, PipelineResult } from "../pipeline/types.js";
export type JobStatus = "queued" | "running" | "completed" | "failed" | "cancelled" | "blocked";
export type JobPriority = "critical" | "high" | "normal" | "low";
export declare const PRIORITY_VALUES: Record<JobPriority, number>;
export interface Job<T = unknown> {
    readonly id: string;
    readonly name: string;
    readonly priority: JobPriority;
    readonly pipeline: PipelineDefinition;
    readonly input: T;
    readonly createdAt: string;
    readonly metadata?: JobMetadata;
}
export interface JobMetadata {
    readonly source?: string;
    readonly userId?: string;
    readonly tags?: readonly string[];
    readonly scheduledAt?: string;
}
export interface JobState {
    readonly jobId: string;
    readonly status: JobStatus;
    readonly startedAt?: string;
    readonly completedAt?: string;
    readonly result?: PipelineResult;
    readonly error?: JobError;
    readonly blockedReason?: string;
}
export interface JobError {
    readonly code: string;
    readonly message: string;
    readonly timestamp: string;
}
export type PolicyDecision = "allow" | "deny" | "defer";
export interface Policy {
    readonly name: string;
    readonly description?: string;
    readonly check: PolicyCheck;
}
export type PolicyCheck = (job: Job, context: PolicyContext) => PolicyResult;
export interface PolicyContext {
    readonly currentTime: Date;
    readonly queueLength: number;
    readonly runningJobs: number;
    readonly totalProcessed: number;
    readonly metadata?: Record<string, unknown>;
}
export interface PolicyResult {
    readonly decision: PolicyDecision;
    readonly reason?: string;
    readonly deferMs?: number;
}
export interface SchedulerOptions {
    readonly maxConcurrent?: number;
    readonly defaultPriority?: JobPriority;
    readonly policies?: readonly Policy[];
    readonly onJobComplete?: JobCompleteHandler;
    readonly onJobError?: JobErrorHandler;
}
export type JobCompleteHandler = (job: Job, result: PipelineResult) => void;
export type JobErrorHandler = (job: Job, error: JobError) => void;
export declare const DEFAULT_SCHEDULER_OPTIONS: SchedulerOptions;
export interface QueueStats {
    readonly queued: number;
    readonly running: number;
    readonly completed: number;
    readonly failed: number;
    readonly cancelled: number;
    readonly blocked: number;
    readonly total: number;
}
//# sourceMappingURL=types.d.ts.map