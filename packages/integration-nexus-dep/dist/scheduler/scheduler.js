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
import { createPipelineExecutor } from "../pipeline/executor.js";
// ═══════════════════════════════════════════════════════════════════════════════
// JOB SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════
export class JobScheduler {
    options;
    executor;
    queue = [];
    states = new Map();
    running = new Set();
    jobCounter = 0;
    isProcessing = false;
    totalProcessed = 0;
    constructor(options = {}) {
        this.options = {
            maxConcurrent: 1,
            defaultPriority: "normal",
            policies: [],
            ...options
        };
        this.executor = createPipelineExecutor();
    }
    /**
     * Submit a job for execution
     * INV-SCHED-01: Jobs are queued by priority
     * INV-SCHED-02: Policies are checked on submission
     */
    submit(name, pipeline, input, options) {
        const jobId = this.generateJobId();
        const job = {
            id: jobId,
            name,
            priority: options?.priority ?? this.options.defaultPriority ?? "normal",
            pipeline,
            input,
            createdAt: new Date().toISOString(),
            metadata: options?.metadata
        };
        // Check policies BEFORE queueing (INV-SCHED-02)
        const policyResult = this.checkPolicies(job);
        if (policyResult.decision === "deny") {
            this.states.set(jobId, {
                jobId,
                status: "blocked",
                blockedReason: policyResult.reason
            });
            return jobId;
        }
        // Initialize state
        this.states.set(jobId, {
            jobId,
            status: "queued"
        });
        // Insert in priority order
        this.insertByPriority(job);
        // Trigger processing
        this.processQueue();
        return jobId;
    }
    /**
     * Get job state
     */
    getState(jobId) {
        return this.states.get(jobId);
    }
    /**
     * Get job by ID
     */
    getJob(jobId) {
        return this.queue.find(j => j.id === jobId);
    }
    /**
     * Cancel a job
     * INV-SCHED-03: Atomic state transitions
     */
    cancel(jobId) {
        const state = this.states.get(jobId);
        if (!state)
            return false;
        if (state.status === "running") {
            // Cannot cancel running job
            return false;
        }
        if (state.status === "queued" || state.status === "blocked") {
            this.states.set(jobId, {
                ...state,
                status: "cancelled",
                completedAt: new Date().toISOString()
            });
            this.removeFromQueue(jobId);
            return true;
        }
        return false;
    }
    /**
     * Get queue statistics
     */
    getStats() {
        let queued = 0, running = 0, completed = 0, failed = 0, cancelled = 0, blocked = 0;
        for (const state of this.states.values()) {
            switch (state.status) {
                case "queued":
                    queued++;
                    break;
                case "running":
                    running++;
                    break;
                case "completed":
                    completed++;
                    break;
                case "failed":
                    failed++;
                    break;
                case "cancelled":
                    cancelled++;
                    break;
                case "blocked":
                    blocked++;
                    break;
            }
        }
        return {
            queued,
            running,
            completed,
            failed,
            cancelled,
            blocked,
            total: this.states.size
        };
    }
    /**
     * Wait for job completion
     */
    async waitFor(jobId, timeoutMs = 30000) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            const state = this.states.get(jobId);
            if (!state) {
                throw new Error(`Job ${jobId} not found`);
            }
            if (["completed", "failed", "cancelled"].includes(state.status)) {
                return state;
            }
            await new Promise(resolve => setTimeout(resolve, 50));
        }
        throw new Error(`Timeout waiting for job ${jobId}`);
    }
    /**
     * Clear completed/failed/cancelled jobs
     */
    cleanup() {
        let removed = 0;
        const terminalStates = ["completed", "failed", "cancelled"];
        for (const [jobId, state] of this.states) {
            if (terminalStates.includes(state.status)) {
                this.states.delete(jobId);
                removed++;
            }
        }
        return removed;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE METHODS
    // ═══════════════════════════════════════════════════════════════════════════
    generateJobId() {
        const timestamp = Date.now().toString(36);
        const counter = (++this.jobCounter).toString(36).padStart(4, "0");
        return `JOB-${timestamp}-${counter}`;
    }
    insertByPriority(job) {
        const jobPriority = this.getPriorityValue(job.priority);
        // Find insertion point
        let insertIndex = this.queue.length;
        for (let i = 0; i < this.queue.length; i++) {
            const queuedPriority = this.getPriorityValue(this.queue[i].priority);
            if (jobPriority < queuedPriority) {
                insertIndex = i;
                break;
            }
        }
        this.queue.splice(insertIndex, 0, job);
    }
    getPriorityValue(priority) {
        const values = {
            critical: 0,
            high: 1,
            normal: 2,
            low: 3
        };
        return values[priority];
    }
    removeFromQueue(jobId) {
        const index = this.queue.findIndex(j => j.id === jobId);
        if (index !== -1) {
            this.queue.splice(index, 1);
        }
    }
    async processQueue() {
        if (this.isProcessing)
            return;
        this.isProcessing = true;
        try {
            while (this.queue.length > 0) {
                const maxConcurrent = this.options.maxConcurrent ?? 1;
                if (this.running.size >= maxConcurrent) {
                    break;
                }
                const job = this.queue.shift();
                if (!job)
                    break;
                // Check policies
                const policyResult = this.checkPolicies(job);
                if (policyResult.decision === "deny") {
                    this.states.set(job.id, {
                        jobId: job.id,
                        status: "blocked",
                        blockedReason: policyResult.reason
                    });
                    continue;
                }
                if (policyResult.decision === "defer") {
                    // Re-queue with delay
                    this.queue.push(job);
                    await new Promise(resolve => setTimeout(resolve, policyResult.deferMs ?? 100));
                    continue;
                }
                // Execute job
                this.executeJob(job);
            }
        }
        finally {
            this.isProcessing = false;
        }
    }
    checkPolicies(job) {
        const context = {
            currentTime: new Date(),
            queueLength: this.queue.length,
            runningJobs: this.running.size,
            totalProcessed: this.totalProcessed
        };
        for (const policy of this.options.policies ?? []) {
            const result = policy.check(job, context);
            if (result.decision !== "allow") {
                return result;
            }
        }
        return { decision: "allow" };
    }
    async executeJob(job) {
        this.running.add(job.id);
        this.states.set(job.id, {
            jobId: job.id,
            status: "running",
            startedAt: new Date().toISOString()
        });
        try {
            const result = await this.executor.execute(job.pipeline, job.input);
            this.totalProcessed++;
            const completedState = {
                jobId: job.id,
                status: result.status === "completed" ? "completed" : "failed",
                startedAt: this.states.get(job.id)?.startedAt,
                completedAt: new Date().toISOString(),
                result
            };
            this.states.set(job.id, completedState);
            if (result.status === "completed" && this.options.onJobComplete) {
                this.options.onJobComplete(job, result);
            }
            if (result.status === "failed" && this.options.onJobError) {
                const error = {
                    code: result.error?.code ?? "UNKNOWN",
                    message: result.error?.message ?? "Pipeline failed",
                    timestamp: new Date().toISOString()
                };
                this.options.onJobError(job, error);
            }
        }
        catch (err) {
            const error = {
                code: "EXECUTION_ERROR",
                message: err instanceof Error ? err.message : String(err),
                timestamp: new Date().toISOString()
            };
            this.states.set(job.id, {
                jobId: job.id,
                status: "failed",
                startedAt: this.states.get(job.id)?.startedAt,
                completedAt: new Date().toISOString(),
                error
            });
            if (this.options.onJobError) {
                this.options.onJobError(job, error);
            }
        }
        finally {
            this.running.delete(job.id);
            // Continue processing queue
            this.processQueue();
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a job scheduler
 */
export function createScheduler(options) {
    return new JobScheduler(options);
}
//# sourceMappingURL=scheduler.js.map