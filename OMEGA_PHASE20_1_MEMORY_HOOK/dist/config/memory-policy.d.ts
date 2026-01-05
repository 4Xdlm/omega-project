/**
 * OMEGA Memory Hook — Memory Policy Configuration
 * Phase 20.1 — v3.20.1
 *
 * Defines how memory is managed at runtime.
 *
 * Policies:
 * - AUTO: Load on start, save on shutdown, auto-save interval
 * - MANUAL: User controls save/load explicitly
 * - SAFE_MODE: Load only, no auto-save (read-only mode)
 * - DISABLED: No memory persistence
 */
export declare enum MemoryPolicy {
    /** Auto load/save with optional interval */
    AUTO = "AUTO",
    /** Manual control only */
    MANUAL = "MANUAL",
    /** Read-only: load but never save */
    SAFE_MODE = "SAFE_MODE",
    /** Memory persistence disabled */
    DISABLED = "DISABLED"
}
export declare enum SaveTrigger {
    /** On explicit call */
    MANUAL = "MANUAL",
    /** On shutdown signal */
    SHUTDOWN = "SHUTDOWN",
    /** On interval timer */
    INTERVAL = "INTERVAL",
    /** On significant change */
    ON_CHANGE = "ON_CHANGE"
}
export interface MemoryPolicyConfig {
    /** Memory management policy */
    readonly policy: MemoryPolicy;
    /** Base path for persistence */
    readonly basePath: string;
    /** Snapshot key prefix */
    readonly snapshotPrefix: string;
    /** Default snapshot key */
    readonly defaultSnapshotKey: string;
    /** Auto-save interval in ms (0 = disabled) */
    readonly autoSaveInterval: number;
    /** Save on shutdown */
    readonly saveOnShutdown: boolean;
    /** Load on startup */
    readonly loadOnStartup: boolean;
    /** Max snapshots to keep (0 = unlimited) */
    readonly maxSnapshots: number;
    /** Retry attempts on failure */
    readonly retryAttempts: number;
    /** Retry delay in ms */
    readonly retryDelay: number;
}
export interface PolicyValidationResult {
    readonly valid: boolean;
    readonly errors: readonly string[];
}
export declare const DEFAULT_MEMORY_POLICY_CONFIG: MemoryPolicyConfig;
export declare const POLICY_PRESETS: Record<MemoryPolicy, Partial<MemoryPolicyConfig>>;
export declare function validatePolicyConfig(config: MemoryPolicyConfig): PolicyValidationResult;
export declare function createPolicyConfig(policy: MemoryPolicy, overrides?: Partial<MemoryPolicyConfig>): MemoryPolicyConfig;
export declare function mergeConfigs(base: MemoryPolicyConfig, overrides: Partial<MemoryPolicyConfig>): MemoryPolicyConfig;
//# sourceMappingURL=memory-policy.d.ts.map