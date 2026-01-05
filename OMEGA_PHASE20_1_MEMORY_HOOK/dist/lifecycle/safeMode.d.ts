/**
 * OMEGA Memory Hook — Safe Mode Handler
 * Phase 20.1 — v3.20.1
 *
 * Safe mode allows read-only operation.
 * Memory is loaded but never persisted.
 *
 * Use cases:
 * - Debug sessions
 * - Read-only analysis
 * - Testing without side effects
 * - Recovery from corrupted state
 */
import type { IMemoryService, MemoryResult } from '../memory-service.types.js';
import type { MemoryPolicyConfig } from '../config/memory-policy.js';
import { MemoryPolicy } from '../config/memory-policy.js';
export interface SafeModeSession {
    readonly active: boolean;
    readonly startedAt: string;
    readonly originalPolicy: MemoryPolicy;
    readonly snapshotKey?: string;
    readonly rootHash?: string;
    readonly factCount?: number;
}
export interface SafeModeOptions {
    /** Snapshot to load (optional) */
    readonly snapshotKey?: string;
    /** Load from most recent snapshot */
    readonly loadLatest?: boolean;
}
export declare class SafeModeManager {
    private session;
    private readonly memoryService;
    private readonly originalConfig;
    constructor(memoryService: IMemoryService, config: MemoryPolicyConfig);
    /**
     * Enter safe mode (read-only operation)
     */
    enterSafeMode(options?: SafeModeOptions): Promise<MemoryResult<SafeModeSession>>;
    /**
     * Exit safe mode
     */
    exitSafeMode(): MemoryResult<SafeModeSession>;
    /**
     * Check if in safe mode
     */
    isInSafeMode(): boolean;
    /**
     * Get current session info
     */
    getSession(): SafeModeSession | null;
    /**
     * Find the most recent snapshot
     */
    private findLatestSnapshot;
}
export declare function createSafeModeManager(memoryService: IMemoryService, config: MemoryPolicyConfig): SafeModeManager;
//# sourceMappingURL=safeMode.d.ts.map