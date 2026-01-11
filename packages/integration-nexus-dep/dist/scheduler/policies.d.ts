/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — SCHEDULER POLICIES
 * Version: 0.7.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Common policies for job scheduling.
 * INV-SCHED-02: Policies are checked before execution.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { Policy } from "./types.js";
/**
 * Rate limiting policy - limits jobs per time window
 */
export declare function createRateLimitPolicy(maxJobsPerMinute: number): Policy;
/**
 * Max queue depth policy - blocks when queue is too long
 */
export declare function createMaxQueuePolicy(maxQueueLength: number): Policy;
/**
 * Time window policy - only allows jobs during specific hours
 */
export declare function createTimeWindowPolicy(startHour: number, endHour: number): Policy;
/**
 * Priority policy - only allows critical/high priority when queue is large
 */
export declare function createPriorityPolicy(queueThreshold: number): Policy;
/**
 * Tag filter policy - blocks jobs with certain tags
 */
export declare function createTagFilterPolicy(blockedTags: string[]): Policy;
/**
 * Source filter policy - only allows jobs from certain sources
 */
export declare function createSourceFilterPolicy(allowedSources: string[]): Policy;
/**
 * Concurrent limit policy - defers if too many jobs running
 */
export declare function createConcurrentLimitPolicy(maxConcurrent: number): Policy;
/**
 * Combine multiple policies - all must allow
 */
export declare function createCompositePolicy(name: string, policies: Policy[]): Policy;
//# sourceMappingURL=policies.d.ts.map