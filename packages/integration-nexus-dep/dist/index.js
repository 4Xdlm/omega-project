/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — MAIN ENTRY
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NEXUS DEP (Dependency Integration Layer)
 *
 * Purpose:
 * - Unified contracts for inter-module communication
 * - READ-ONLY adapters for sanctuarized modules
 * - Request/Response pattern with tracing
 *
 * Invariants:
 * - INV-NEXUS-01: Adapters are READ-ONLY
 * - INV-NEXUS-02: All operations are deterministic
 * - INV-NEXUS-03: Error responses include source identification
 * - INV-NEXUS-04: Request/Response with unique IDs
 * - INV-NEXUS-05: Execution traces are immutable
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const VERSION = "0.7.0";
export const PROFILE = "L4";
// ═══════════════════════════════════════════════════════════════════════════════
// CONTRACTS
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./contracts/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// ADAPTERS
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./adapters/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./router/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// TRANSLATORS
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./translators/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// CONNECTORS
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./connectors/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./pipeline/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// SCHEDULER
// ═══════════════════════════════════════════════════════════════════════════════
export * from "./scheduler/index.js";
// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Generate a unique request ID
 * Format: NEXUS-{timestamp}-{random}
 */
export function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `NEXUS-${timestamp}-${random}`;
}
/**
 * Get current ISO timestamp
 */
export function getTimestamp() {
    return new Date().toISOString();
}
//# sourceMappingURL=index.js.map