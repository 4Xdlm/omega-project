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
// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMITING POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Rate limiting policy - limits jobs per time window
 */
export function createRateLimitPolicy(maxJobsPerMinute) {
    const jobTimestamps = [];
    return {
        name: "rate-limit",
        description: `Limit to ${maxJobsPerMinute} jobs per minute`,
        check: (_job, context) => {
            const now = context.currentTime.getTime();
            const oneMinuteAgo = now - 60000;
            // Clean old timestamps
            while (jobTimestamps.length > 0 && jobTimestamps[0] < oneMinuteAgo) {
                jobTimestamps.shift();
            }
            if (jobTimestamps.length >= maxJobsPerMinute) {
                const oldestInWindow = jobTimestamps[0];
                const deferMs = oldestInWindow + 60000 - now + 100;
                return {
                    decision: "defer",
                    reason: `Rate limit exceeded: ${maxJobsPerMinute}/minute`,
                    deferMs
                };
            }
            jobTimestamps.push(now);
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// MAX QUEUE DEPTH POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Max queue depth policy - blocks when queue is too long
 */
export function createMaxQueuePolicy(maxQueueLength) {
    return {
        name: "max-queue",
        description: `Block when queue exceeds ${maxQueueLength}`,
        check: (_job, context) => {
            if (context.queueLength >= maxQueueLength) {
                return {
                    decision: "deny",
                    reason: `Queue full: ${context.queueLength}/${maxQueueLength}`
                };
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// TIME WINDOW POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Time window policy - only allows jobs during specific hours
 */
export function createTimeWindowPolicy(startHour, endHour) {
    return {
        name: "time-window",
        description: `Only allow jobs between ${startHour}:00 and ${endHour}:00`,
        check: (_job, context) => {
            const hour = context.currentTime.getHours();
            if (hour < startHour || hour >= endHour) {
                return {
                    decision: "deny",
                    reason: `Outside allowed hours: ${hour}:00 not in ${startHour}:00-${endHour}:00`
                };
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// PRIORITY POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Priority policy - only allows critical/high priority when queue is large
 */
export function createPriorityPolicy(queueThreshold) {
    return {
        name: "priority-filter",
        description: `Only high priority when queue > ${queueThreshold}`,
        check: (job, context) => {
            if (context.queueLength > queueThreshold) {
                if (job.priority !== "critical" && job.priority !== "high") {
                    return {
                        decision: "defer",
                        reason: `Queue is busy, deferring ${job.priority} priority job`,
                        deferMs: 1000
                    };
                }
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// TAG FILTER POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Tag filter policy - blocks jobs with certain tags
 */
export function createTagFilterPolicy(blockedTags) {
    return {
        name: "tag-filter",
        description: `Block jobs with tags: ${blockedTags.join(", ")}`,
        check: (job, _context) => {
            const jobTags = job.metadata?.tags ?? [];
            const hasBlockedTag = blockedTags.some(tag => jobTags.includes(tag));
            if (hasBlockedTag) {
                return {
                    decision: "deny",
                    reason: "Job has blocked tag"
                };
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE FILTER POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Source filter policy - only allows jobs from certain sources
 */
export function createSourceFilterPolicy(allowedSources) {
    return {
        name: "source-filter",
        description: `Only allow jobs from: ${allowedSources.join(", ")}`,
        check: (job, _context) => {
            const source = job.metadata?.source;
            if (!source || !allowedSources.includes(source)) {
                return {
                    decision: "deny",
                    reason: `Source '${source}' not in allowed list`
                };
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// CONCURRENT LIMIT POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Concurrent limit policy - defers if too many jobs running
 */
export function createConcurrentLimitPolicy(maxConcurrent) {
    return {
        name: "concurrent-limit",
        description: `Limit to ${maxConcurrent} concurrent jobs`,
        check: (_job, context) => {
            if (context.runningJobs >= maxConcurrent) {
                return {
                    decision: "defer",
                    reason: `Max concurrent reached: ${context.runningJobs}/${maxConcurrent}`,
                    deferMs: 500
                };
            }
            return { decision: "allow" };
        }
    };
}
// ═══════════════════════════════════════════════════════════════════════════════
// COMPOSITE POLICY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Combine multiple policies - all must allow
 */
export function createCompositePolicy(name, policies) {
    return {
        name,
        description: `Composite policy: ${policies.map(p => p.name).join(", ")}`,
        check: (job, context) => {
            for (const policy of policies) {
                const result = policy.check(job, context);
                if (result.decision !== "allow") {
                    return {
                        ...result,
                        reason: `${policy.name}: ${result.reason}`
                    };
                }
            }
            return { decision: "allow" };
        }
    };
}
//# sourceMappingURL=policies.js.map