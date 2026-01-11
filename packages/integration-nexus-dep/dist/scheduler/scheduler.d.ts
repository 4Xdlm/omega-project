/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — JOB SCHEDULER
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Job scheduling and queue management.
 * INV-SCHED-01: Priority queue ordering.
 * INV-SCHED-02: Concurrent execution limits.
 * INV-SCHED-03: Policy enforcement.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { Job, JobState, JobPriority, JobMetadata, SchedulerOptions, QueueStats } from "./types.js";
import type { PipelineDefinition } from "../pipeline/types.js";
export declare class JobScheduler {
    private readonly options;
    private readonly executor;
    private readonly queue;
    private readonly states;
    private readonly running;
    private jobCounter;
    private isProcessing;
    private totalProcessed;
    constructor(options?: SchedulerOptions);
    /**
     * Submit a job for execution
     * INV-SCHED-01: Jobs are queued by priority
     * INV-SCHED-02: Policies are checked on submission
     */
    submit<T>(name: string, pipeline: PipelineDefinition, input: T, options?: {
        priority?: JobPriority;
        metadata?: JobMetadata;
    }): string;
    /**
     * Get job state
     */
    getState(jobId: string): JobState | undefined;
    /**
     * Get job by ID
     */
    getJob(jobId: string): Job | undefined;
    /**
     * Cancel a job
     * INV-SCHED-03: Atomic state transitions
     */
    cancel(jobId: string): boolean;
    /**
     * Get queue statistics
     */
    getStats(): QueueStats;
    /**
     * Wait for job completion
     */
    waitFor(jobId: string, timeoutMs?: number): Promise<JobState>;
    /**
     * Clear completed/failed/cancelled jobs
     */
    cleanup(): number;
    private generateJobId;
    private insertByPriority;
    private getPriorityValue;
    private removeFromQueue;
    private processQueue;
    private checkPolicies;
    private executeJob;
}
/**
 * Create a job scheduler
 */
export declare function createScheduler(options?: SchedulerOptions): JobScheduler;
//# sourceMappingURL=scheduler.d.ts.map