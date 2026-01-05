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
import { MemoryPolicy, SaveTrigger, DEFAULT_MEMORY_POLICY_CONFIG, } from './config/memory-policy.js';
import { onStart, onShutdown, createSafeModeManager, } from './lifecycle/index.js';
// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY HOOK
// ═══════════════════════════════════════════════════════════════════════════════
export class MemoryHook {
    memoryService;
    config;
    safeModeManager;
    initialized = false;
    running = false;
    autoSaveTimer = null;
    signalsRegistered = false;
    lastSave;
    lastLoad;
    constructor(memoryService, config) {
        this.memoryService = memoryService;
        this.config = {
            ...DEFAULT_MEMORY_POLICY_CONFIG,
            ...config,
        };
        this.safeModeManager = createSafeModeManager(memoryService, this.config);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LIFECYCLE
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Initialize and start the memory hook.
     * Loads snapshot if policy allows.
     */
    async start(options) {
        if (this.running) {
            return { success: false, error: 'Memory hook already running' };
        }
        this.initialized = true;
        // Load snapshot
        const result = await onStart(this.memoryService, this.config, options);
        if (result.success && result.data.loaded) {
            this.lastLoad = {
                timestamp: new Date().toISOString(),
                snapshotKey: result.data.snapshotKey,
                rootHash: result.data.rootHash,
                factCount: result.data.factCount,
            };
        }
        // Start auto-save if configured
        if (this.config.autoSaveInterval > 0 && this.config.policy === MemoryPolicy.AUTO) {
            this.startAutoSave();
        }
        // Register signal handlers
        if (this.config.registerSignals !== false) {
            this.registerSignalHandlers();
        }
        this.running = true;
        return result;
    }
    /**
     * Stop the memory hook.
     * Saves snapshot if policy allows.
     */
    async stop(options) {
        if (!this.running) {
            return { success: false, error: 'Memory hook not running' };
        }
        // Stop auto-save
        this.stopAutoSave();
        // Exit safe mode if active
        if (this.safeModeManager.isInSafeMode()) {
            this.safeModeManager.exitSafeMode();
        }
        // Save snapshot
        const result = await onShutdown(this.memoryService, this.config, options);
        if (result.success && result.data.saved) {
            this.lastSave = {
                timestamp: new Date().toISOString(),
                snapshotKey: result.data.snapshotKey,
                rootHash: result.data.rootHash,
                factCount: result.data.factCount,
                trigger: result.data.trigger,
            };
        }
        this.running = false;
        return result;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // MANUAL OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Manually save a snapshot.
     * Works regardless of policy.
     */
    async save(snapshotKey) {
        const key = snapshotKey ?? this.config.defaultSnapshotKey;
        const result = await onShutdown(this.memoryService, this.config, {
            snapshotKey: key,
            forceSave: true,
            trigger: SaveTrigger.MANUAL,
        });
        if (result.success && result.data.saved) {
            this.lastSave = {
                timestamp: new Date().toISOString(),
                snapshotKey: key,
                rootHash: result.data.rootHash,
                factCount: result.data.factCount,
                trigger: SaveTrigger.MANUAL,
            };
        }
        return result;
    }
    /**
     * Manually load a snapshot.
     * Works regardless of policy.
     */
    async load(snapshotKey) {
        const key = snapshotKey ?? this.config.defaultSnapshotKey;
        const result = await onStart(this.memoryService, this.config, {
            snapshotKey: key,
            forceLoad: true,
        });
        if (result.success && result.data.loaded) {
            this.lastLoad = {
                timestamp: new Date().toISOString(),
                snapshotKey: key,
                rootHash: result.data.rootHash,
                factCount: result.data.factCount,
            };
        }
        return result;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // AUTO-SAVE
    // ═══════════════════════════════════════════════════════════════════════════
    startAutoSave() {
        if (this.autoSaveTimer)
            return;
        this.autoSaveTimer = setInterval(async () => {
            if (this.safeModeManager.isInSafeMode())
                return;
            const result = await onShutdown(this.memoryService, this.config, {
                forceSave: true,
                trigger: SaveTrigger.INTERVAL,
            });
            if (result.success && result.data.saved) {
                this.lastSave = {
                    timestamp: new Date().toISOString(),
                    snapshotKey: result.data.snapshotKey,
                    rootHash: result.data.rootHash,
                    factCount: result.data.factCount,
                    trigger: SaveTrigger.INTERVAL,
                };
            }
        }, this.config.autoSaveInterval);
    }
    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SIGNAL HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════
    registerSignalHandlers() {
        // INV-HOOK-08: Register only once
        if (this.signalsRegistered)
            return;
        const handler = async (signal) => {
            console.log(`[MemoryHook] Received ${signal}, saving state...`);
            await this.stop({ trigger: SaveTrigger.SHUTDOWN });
            process.exit(0);
        };
        process.on('SIGINT', () => handler('SIGINT'));
        process.on('SIGTERM', () => handler('SIGTERM'));
        this.signalsRegistered = true;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SAFE MODE
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Enter safe mode (read-only operation)
     */
    async enterSafeMode(snapshotKey) {
        return this.safeModeManager.enterSafeMode({ snapshotKey });
    }
    /**
     * Exit safe mode
     */
    exitSafeMode() {
        return this.safeModeManager.exitSafeMode();
    }
    /**
     * Check if in safe mode
     */
    isInSafeMode() {
        return this.safeModeManager.isInSafeMode();
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Get current hook state
     */
    getState() {
        return {
            initialized: this.initialized,
            running: this.running,
            policy: this.config.policy,
            lastSave: this.lastSave,
            lastLoad: this.lastLoad,
            autoSaveActive: this.autoSaveTimer !== null,
            safeModeActive: this.safeModeManager.isInSafeMode(),
        };
    }
    /**
     * Get the underlying memory service
     */
    getMemoryService() {
        return this.memoryService;
    }
    /**
     * Get the current configuration
     */
    getConfig() {
        return this.config;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createMemoryHook(memoryService, config) {
    return new MemoryHook(memoryService, config);
}
//# sourceMappingURL=memory-hook.js.map