/**
 * OMEGA Memory Hook — onStart Lifecycle
 * Phase 20.1 — v3.20.1
 *
 * Handles memory loading at application startup.
 *
 * Invariants:
 * - INV-HOOK-01: Load only if policy allows
 * - INV-HOOK-02: Graceful fallback on missing snapshot
 * - INV-HOOK-03: Retry on transient failures
 */
import type { IMemoryService, MemoryResult } from '../memory-service.types.js';
import type { MemoryPolicyConfig } from '../config/memory-policy.js';
export interface StartupResult {
    readonly loaded: boolean;
    readonly snapshotKey?: string;
    readonly rootHash?: string;
    readonly factCount?: number;
    readonly attempts: number;
    readonly duration: number;
    readonly error?: string;
}
export interface StartupOptions {
    /** Override default snapshot key */
    readonly snapshotKey?: string;
    /** Skip loading even if policy allows */
    readonly skipLoad?: boolean;
    /** Force load even if policy disallows */
    readonly forceLoad?: boolean;
}
export declare function onStart(memoryService: IMemoryService, config: MemoryPolicyConfig, options?: StartupOptions): Promise<MemoryResult<StartupResult>>;
export declare function isLoadAllowed(config: MemoryPolicyConfig): boolean;
//# sourceMappingURL=onStart.d.ts.map