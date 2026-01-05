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
import { MemoryPolicy, createPolicyConfig } from '../config/memory-policy.js';
import { onStart } from './onStart.js';
// ═══════════════════════════════════════════════════════════════════════════════
// SAFE MODE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════
export class SafeModeManager {
    session = null;
    memoryService;
    originalConfig;
    constructor(memoryService, config) {
        this.memoryService = memoryService;
        this.originalConfig = config;
    }
    /**
     * Enter safe mode (read-only operation)
     */
    async enterSafeMode(options) {
        if (this.session?.active) {
            return { success: false, error: 'Already in safe mode' };
        }
        // Create safe mode config
        const safeModeConfig = createPolicyConfig(MemoryPolicy.SAFE_MODE, {
            basePath: this.originalConfig.basePath,
            snapshotPrefix: this.originalConfig.snapshotPrefix,
            defaultSnapshotKey: options?.snapshotKey ?? this.originalConfig.defaultSnapshotKey,
        });
        // Determine which snapshot to load
        let snapshotKey = options?.snapshotKey ?? safeModeConfig.defaultSnapshotKey;
        if (options?.loadLatest) {
            const latestKey = await this.findLatestSnapshot();
            if (latestKey) {
                snapshotKey = latestKey;
            }
        }
        // Load the snapshot
        const startResult = await onStart(this.memoryService, safeModeConfig, {
            snapshotKey,
            forceLoad: true,
        });
        if (!startResult.success) {
            return { success: false, error: startResult.error };
        }
        // Create session
        this.session = {
            active: true,
            startedAt: new Date().toISOString(),
            originalPolicy: this.originalConfig.policy,
            snapshotKey: startResult.data.loaded ? snapshotKey : undefined,
            rootHash: startResult.data.rootHash,
            factCount: startResult.data.factCount,
        };
        return { success: true, data: this.session };
    }
    /**
     * Exit safe mode
     */
    exitSafeMode() {
        if (!this.session?.active) {
            return { success: false, error: 'Not in safe mode' };
        }
        const closedSession = { ...this.session, active: false };
        this.session = null;
        return { success: true, data: closedSession };
    }
    /**
     * Check if in safe mode
     */
    isInSafeMode() {
        return this.session?.active ?? false;
    }
    /**
     * Get current session info
     */
    getSession() {
        return this.session;
    }
    /**
     * Find the most recent snapshot
     */
    async findLatestSnapshot() {
        const listResult = await this.memoryService.listSnapshots(this.originalConfig.snapshotPrefix);
        if (!listResult.success || listResult.data.length === 0) {
            return null;
        }
        // Sort descending (assumes timestamp-based naming)
        const sorted = [...listResult.data].sort().reverse();
        return sorted[0] ?? null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createSafeModeManager(memoryService, config) {
    return new SafeModeManager(memoryService, config);
}
//# sourceMappingURL=safeMode.js.map