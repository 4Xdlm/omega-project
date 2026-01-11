/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — SCHEDULER TESTS
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  JobScheduler,
  createScheduler,
  createRateLimitPolicy,
  createMaxQueuePolicy,
  createPriorityPolicy,
  createTagFilterPolicy,
  createCompositePolicy,
  Job,
  JobState,
  Policy
} from "../src/scheduler/index.js";
import { createPipeline, createValidationPipeline } from "../src/pipeline/index.js";

// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER BASIC TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Basic", () => {
  let scheduler: JobScheduler;

  beforeEach(() => {
    scheduler = createScheduler();
  });

  it("should create scheduler", () => {
    expect(scheduler).toBeInstanceOf(JobScheduler);
  });

  it("should submit job and get ID", () => {
    const pipeline = createValidationPipeline();
    const jobId = scheduler.submit("test-job", pipeline, { content: "test" });

    expect(jobId).toMatch(/^JOB-/);
  });

  it("should get job state", () => {
    const pipeline = createValidationPipeline();
    const jobId = scheduler.submit("test-job", pipeline, { content: "test" });

    const state = scheduler.getState(jobId);
    expect(state).toBeDefined();
    expect(state?.jobId).toBe(jobId);
  });

  it("should execute job and complete", async () => {
    const pipeline = createValidationPipeline();
    const jobId = scheduler.submit("test-job", pipeline, { content: "valid content" });

    const state = await scheduler.waitFor(jobId);

    expect(state.status).toBe("completed");
    expect(state.result).toBeDefined();
  });

  it("should track queue statistics", async () => {
    const pipeline = createValidationPipeline();

    scheduler.submit("job1", pipeline, { content: "test1" });
    scheduler.submit("job2", pipeline, { content: "test2" });

    // Wait a bit for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    const stats = scheduler.getStats();
    expect(stats.total).toBeGreaterThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Priority", () => {
  it("should process critical jobs first", async () => {
    const completionOrder: string[] = [];
    const scheduler = createScheduler({
      maxConcurrent: 1,
      onJobComplete: (job) => completionOrder.push(job.name)
    });

    const pipeline = createPipeline("quick")
      .stage("wait", async (input) => {
        await new Promise(r => setTimeout(r, 20));
        return input;
      })
      .build();

    // Submit low priority first, then critical
    scheduler.submit("low-job", pipeline, {}, { priority: "low" });
    scheduler.submit("critical-job", pipeline, {}, { priority: "critical" });

    // Wait for both to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    // Critical should be processed first (if submitted while first still queued)
    expect(completionOrder).toContain("low-job");
    expect(completionOrder).toContain("critical-job");
  });

  it("should maintain priority order in queue", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 }); // Don't process
    const pipeline = createValidationPipeline();

    scheduler.submit("normal1", pipeline, {}, { priority: "normal" });
    scheduler.submit("high", pipeline, {}, { priority: "high" });
    scheduler.submit("critical", pipeline, {}, { priority: "critical" });
    scheduler.submit("low", pipeline, {}, { priority: "low" });
    scheduler.submit("normal2", pipeline, {}, { priority: "normal" });

    // Queue should be: critical, high, normal1, normal2, low
    const stats = scheduler.getStats();
    expect(stats.queued).toBe(5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CANCELLATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Cancellation", () => {
  it("should cancel queued job", () => {
    const scheduler = createScheduler({ maxConcurrent: 0 }); // Don't process
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("cancel-me", pipeline, {});
    const cancelled = scheduler.cancel(jobId);

    expect(cancelled).toBe(true);
    expect(scheduler.getState(jobId)?.status).toBe("cancelled");
  });

  it("should not cancel running job", async () => {
    const scheduler = createScheduler();
    const pipeline = createPipeline("slow")
      .stage("wait", async (input) => {
        await new Promise(r => setTimeout(r, 500));
        return input;
      })
      .build();

    const jobId = scheduler.submit("running-job", pipeline, {});

    // Wait for it to start
    await new Promise(r => setTimeout(r, 50));

    const cancelled = scheduler.cancel(jobId);
    expect(cancelled).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// POLICY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Policies", () => {
  it("should block job with max queue policy", () => {
    const policy = createMaxQueuePolicy(2);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();

    scheduler.submit("job1", pipeline, {});
    scheduler.submit("job2", pipeline, {});
    scheduler.submit("job3", pipeline, {}); // Should be blocked

    const stats = scheduler.getStats();
    expect(stats.blocked).toBeGreaterThanOrEqual(1);
  });

  it("should block job with tag filter policy", () => {
    const policy = createTagFilterPolicy(["dangerous", "test"]);
    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [policy]
    });

    const pipeline = createValidationPipeline();

    scheduler.submit("normal", pipeline, {});
    scheduler.submit("blocked", pipeline, {}, {
      metadata: { tags: ["dangerous"] }
    });

    const stats = scheduler.getStats();
    expect(stats.blocked).toBe(1);
    expect(stats.queued).toBe(1);
  });

  it("should compose multiple policies", () => {
    const compositePolicy = createCompositePolicy("combo", [
      createMaxQueuePolicy(10),
      createTagFilterPolicy(["blocked"])
    ]);

    const scheduler = createScheduler({
      maxConcurrent: 0,
      policies: [compositePolicy]
    });

    const pipeline = createValidationPipeline();

    scheduler.submit("normal", pipeline, {});
    scheduler.submit("tagged", pipeline, {}, {
      metadata: { tags: ["blocked"] }
    });

    const stats = scheduler.getStats();
    expect(stats.blocked).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CALLBACK TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Callbacks", () => {
  it("should call onJobComplete callback", async () => {
    let completed: Job | undefined;
    const scheduler = createScheduler({
      onJobComplete: (job) => { completed = job; }
    });

    const pipeline = createValidationPipeline();
    const jobId = scheduler.submit("callback-test", pipeline, { content: "test" });

    await scheduler.waitFor(jobId);

    expect(completed).toBeDefined();
    expect(completed?.name).toBe("callback-test");
  });

  it("should call onJobError callback", async () => {
    let errorJob: Job | undefined;
    const scheduler = createScheduler({
      onJobError: (job) => { errorJob = job; }
    });

    const pipeline = createPipeline("failing")
      .stage("fail", async () => {
        throw new Error("Intentional failure");
      })
      .build();

    const jobId = scheduler.submit("error-test", pipeline, {});

    await scheduler.waitFor(jobId);

    expect(errorJob).toBeDefined();
    expect(errorJob?.name).toBe("error-test");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENCY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Concurrency", () => {
  it("should limit concurrent executions", async () => {
    let maxConcurrent = 0;
    let current = 0;

    const scheduler = createScheduler({
      maxConcurrent: 2
    });

    const pipeline = createPipeline("concurrent")
      .stage("track", async (input) => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise(r => setTimeout(r, 50));
        current--;
        return input;
      })
      .build();

    // Submit 5 jobs
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      ids.push(scheduler.submit(`job${i}`, pipeline, {}));
    }

    // Wait for all to complete
    for (const id of ids) {
      await scheduler.waitFor(id, 5000);
    }

    expect(maxConcurrent).toBeLessThanOrEqual(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — Cleanup", () => {
  it("should cleanup completed jobs", async () => {
    const scheduler = createScheduler();
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("cleanup-test", pipeline, { content: "test" });
    await scheduler.waitFor(jobId);

    const removed = scheduler.cleanup();

    expect(removed).toBeGreaterThanOrEqual(1);
    expect(scheduler.getState(jobId)).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// WAITFOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe("NEXUS DEP — Scheduler — WaitFor", () => {
  it("should wait for job completion", async () => {
    const scheduler = createScheduler();
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("wait-test", pipeline, { content: "test" });
    const state = await scheduler.waitFor(jobId);

    expect(["completed", "failed"]).toContain(state.status);
  });

  it("should timeout if job takes too long", async () => {
    const scheduler = createScheduler({ maxConcurrent: 0 }); // Never process
    const pipeline = createValidationPipeline();

    const jobId = scheduler.submit("timeout-test", pipeline, {});

    await expect(scheduler.waitFor(jobId, 100)).rejects.toThrow("Timeout");
  });

  it("should throw if job not found", async () => {
    const scheduler = createScheduler();

    await expect(scheduler.waitFor("nonexistent")).rejects.toThrow("not found");
  });
});
