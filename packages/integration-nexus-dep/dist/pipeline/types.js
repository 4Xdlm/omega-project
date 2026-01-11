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
export const DEFAULT_PIPELINE_OPTIONS = {
    stopOnError: true,
    defaultTimeoutMs: 30000,
    defaultRetryCount: 0,
    seed: 42,
    traceEnabled: false
};
//# sourceMappingURL=types.js.map