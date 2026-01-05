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
import { MemoryPolicy, SaveTrigger } from '../config/memory-policy.js';
// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
export async function onShutdown(memoryService, config, options) {
    const startTime = Date.now();
    const snapshotKey = options?.snapshotKey ?? config.defaultSnapshotKey;
    const trigger = options?.trigger ?? SaveTrigger.SHUTDOWN;
    // INV-HOOK-04: Check if saving is allowed
    const shouldSave = determineShouldSave(config, options);
    if (!shouldSave) {
        return {
            success: true,
            data: {
                saved: false,
                attempts: 0,
                duration: Date.now() - startTime,
                trigger,
                cleanedUp: 0,
            },
        };
    }
    // Check if there's anything to save
    const canon = memoryService.getCanon();
    if (canon.size === 0) {
        return {
            success: true,
            data: {
                saved: false,
                snapshotKey,
                attempts: 0,
                duration: Date.now() - startTime,
                trigger,
                cleanedUp: 0,
                error: 'Nothing to save (empty canon)',
            },
        };
    }
    // INV-HOOK-06: Retry on transient failures
    let lastError;
    for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
        const result = await memoryService.saveSnapshot(snapshotKey);
        if (result.success) {
            // INV-HOOK-07: Cleanup old snapshots
            const cleanedUp = await cleanupOldSnapshots(memoryService, config);
            return {
                success: true,
                data: {
                    saved: true,
                    snapshotKey,
                    rootHash: result.data.rootHash,
                    factCount: result.data.factCount,
                    bytesWritten: result.data.bytesWritten,
                    attempts: attempt,
                    duration: Date.now() - startTime,
                    trigger,
                    cleanedUp,
                },
            };
        }
        lastError = result.error;
        // Wait before retry (except on last attempt)
        if (attempt < config.retryAttempts) {
            await sleep(config.retryDelay);
        }
    }
    // INV-HOOK-05: Never lose data silently - return error
    return {
        success: false,
        error: `Failed to save snapshot after ${config.retryAttempts} attempts: ${lastError}`,
    };
}
function determineShouldSave(config, options) {
    // Force overrides
    if (options?.skipSave)
        return false;
    if (options?.forceSave)
        return true;
    // Policy-based decision
    switch (config.policy) {
        case MemoryPolicy.AUTO:
            return config.saveOnShutdown;
        case MemoryPolicy.MANUAL:
            return false; // Manual only saves explicitly
        case MemoryPolicy.SAFE_MODE:
            return false; // Read-only mode
        case MemoryPolicy.DISABLED:
            return false;
        default:
            return false;
    }
}
async function cleanupOldSnapshots(memoryService, config) {
    if (config.maxSnapshots <= 0)
        return 0;
    const listResult = await memoryService.listSnapshots(config.snapshotPrefix);
    if (!listResult.success)
        return 0;
    const snapshots = listResult.data;
    if (snapshots.length <= config.maxSnapshots)
        return 0;
    // Sort by name (assumes timestamp-based naming)
    const sorted = [...snapshots].sort();
    const toDelete = sorted.slice(0, snapshots.length - config.maxSnapshots);
    let deleted = 0;
    for (const key of toDelete) {
        // Don't delete the default snapshot key
        if (key === config.defaultSnapshotKey)
            continue;
        const result = await memoryService.delete(key);
        if (result.success && result.data) {
            deleted++;
        }
    }
    return deleted;
}
// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
export function isSaveAllowed(config) {
    return config.policy === MemoryPolicy.AUTO && config.saveOnShutdown;
}
//# sourceMappingURL=onShutdown.js.map