/**
 * OMEGA Memory Hook — Main Hook Class
 * Phase 20.1 — v3.20.1
 *
 * Unified API for Gateway memory integration.
 * Manages the complete lifecycle of memory persistence.
 *
 * Features:
 * - Automatic load on start
 * - Automatic save on shutdown
 * - Auto-save interval (optional)
 * - Safe mode support
 * - Signal handlers (SIGINT, SIGTERM)
 *
 * Invariants:
 * - INV-HOOK-01: Load only if policy allows
 * - INV-HOOK-02: Graceful fallback on missing snapshot
 * - INV-HOOK-03: Retry on transient failures
 * - INV-HOOK-04: Save only if policy allows
 * - INV-HOOK-05: Never lose data silently
 * - INV-HOOK-06: Retry on save failures
 * - INV-HOOK-07: Cleanup old snapshots
 * - INV-HOOK-08: Shutdown handlers registered once
 */
import type { IMemoryService, MemoryResult } from './memory-service.types.js';
import { type MemoryPolicyConfig, MemoryPolicy, SaveTrigger } from './config/memory-policy.js';
import { type StartupResult, type ShutdownResult, type StartupOptions, type ShutdownOptions } from './lifecycle/index.js';
export interface MemoryHookConfig extends Partial<MemoryPolicyConfig> {
    /** Register process signal handlers */
    readonly registerSignals?: boolean;
}
export interface MemoryHookState {
    readonly initialized: boolean;
    readonly running: boolean;
    readonly policy: MemoryPolicy;
    readonly lastSave?: SaveInfo;
    readonly lastLoad?: LoadInfo;
    readonly autoSaveActive: boolean;
    readonly safeModeActive: boolean;
}
export interface SaveInfo {
    readonly timestamp: string;
    readonly snapshotKey: string;
    readonly rootHash: string;
    readonly factCount: number;
    readonly trigger: SaveTrigger;
}
export interface LoadInfo {
    readonly timestamp: string;
    readonly snapshotKey: string;
    readonly rootHash: string;
    readonly factCount: number;
}
export declare class MemoryHook {
    private readonly memoryService;
    private readonly config;
    private readonly safeModeManager;
    private initialized;
    private running;
    private autoSaveTimer;
    private signalsRegistered;
    private lastSave?;
    private lastLoad?;
    constructor(memoryService: IMemoryService, config?: MemoryHookConfig);
    /**
     * Initialize and start the memory hook.
     * Loads snapshot if policy allows.
     */
    start(options?: StartupOptions): Promise<MemoryResult<StartupResult>>;
    /**
     * Stop the memory hook.
     * Saves snapshot if policy allows.
     */
    stop(options?: ShutdownOptions): Promise<MemoryResult<ShutdownResult>>;
    /**
     * Manually save a snapshot.
     * Works regardless of policy.
     */
    save(snapshotKey?: string): Promise<MemoryResult<ShutdownResult>>;
    /**
     * Manually load a snapshot.
     * Works regardless of policy.
     */
    load(snapshotKey?: string): Promise<MemoryResult<StartupResult>>;
    private startAutoSave;
    private stopAutoSave;
    private registerSignalHandlers;
    /**
     * Enter safe mode (read-only operation)
     */
    enterSafeMode(snapshotKey?: string): Promise<MemoryResult<import("./lifecycle/safeMode.js").SafeModeSession>>;
    /**
     * Exit safe mode
     */
    exitSafeMode(): MemoryResult<import("./lifecycle/safeMode.js").SafeModeSession>;
    /**
     * Check if in safe mode
     */
    isInSafeMode(): boolean;
    /**
     * Get current hook state
     */
    getState(): MemoryHookState;
    /**
     * Get the underlying memory service
     */
    getMemoryService(): IMemoryService;
    /**
     * Get the current configuration
     */
    getConfig(): MemoryPolicyConfig;
}
export declare function createMemoryHook(memoryService: IMemoryService, config?: MemoryHookConfig): MemoryHook;
//# sourceMappingURL=memory-hook.d.ts.map