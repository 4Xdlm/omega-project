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
export const PRIORITY_VALUES = {
    critical: 0,
    high: 1,
    normal: 2,
    low: 3
};
export const DEFAULT_SCHEDULER_OPTIONS = {
    maxConcurrent: 1,
    defaultPriority: "normal",
    policies: []
};
//# sourceMappingURL=types.js.map