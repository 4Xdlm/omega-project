/**
 * OMEGA Memory Hook — onShutdown Lifecycle
 * Phase 20.1 — v3.20.1
 *
 * Handles memory saving at application shutdown.
 *
 * Invariants:
 * - INV-HOOK-04: Save only if policy allows
 * - INV-HOOK-05: Never lose data silently
 * - INV-HOOK-06: Retry on transient failures
 * - INV-HOOK-07: Cleanup old snapshots if maxSnapshots set
 */
import type { IMemoryService, MemoryResult } from '../memory-service.types.js';
import type { MemoryPolicyConfig } from '../config/memory-policy.js';
import { SaveTrigger } from '../config/memory-policy.js';
export interface ShutdownResult {
    readonly saved: boolean;
    readonly snapshotKey?: string;
    readonly rootHash?: string;
    readonly factCount?: number;
    readonly bytesWritten?: number;
    readonly attempts: number;
    readonly duration: number;
    readonly trigger: SaveTrigger;
    readonly cleanedUp: number;
    readonly error?: string;
}
export interface ShutdownOptions {
    /** Override default snapshot key */
    readonly snapshotKey?: string;
    /** Skip saving even if policy allows */
    readonly skipSave?: boolean;
    /** Force save even if policy disallows */
    readonly forceSave?: boolean;
    /** Custom trigger for logging */
    readonly trigger?: SaveTrigger;
}
export declare function onShutdown(memoryService: IMemoryService, config: MemoryPolicyConfig, options?: ShutdownOptions): Promise<MemoryResult<ShutdownResult>>;
export declare function isSaveAllowed(config: MemoryPolicyConfig): boolean;
//# sourceMappingURL=onShutdown.d.ts.map