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
export declare const VERSION: "0.7.0";
export declare const PROFILE: "L4";
export * from "./contracts/index.js";
export * from "./adapters/index.js";
export * from "./router/index.js";
export * from "./translators/index.js";
export * from "./connectors/index.js";
export * from "./pipeline/index.js";
export * from "./scheduler/index.js";
/**
 * Generate a unique request ID
 * Format: NEXUS-{timestamp}-{random}
 */
export declare function generateRequestId(): string;
/**
 * Get current ISO timestamp
 */
export declare function getTimestamp(): string;
//# sourceMappingURL=index.d.ts.map