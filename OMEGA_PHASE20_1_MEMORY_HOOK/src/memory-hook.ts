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
import {
  type MemoryPolicyConfig,
  MemoryPolicy,
  SaveTrigger,
  createPolicyConfig,
  DEFAULT_MEMORY_POLICY_CONFIG,
} from './config/memory-policy.js';
import {
  onStart,
  onShutdown,
  SafeModeManager,
  createSafeModeManager,
  type StartupResult,
  type ShutdownResult,
  type StartupOptions,
  type ShutdownOptions,
} from './lifecycle/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export class MemoryHook {
  private readonly memoryService: IMemoryService;
  private readonly config: MemoryPolicyConfig;
  private readonly safeModeManager: SafeModeManager;
  
  private initialized = false;
  private running = false;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private signalsRegistered = false;
  private lastSave?: SaveInfo;
  private lastLoad?: LoadInfo;

  constructor(memoryService: IMemoryService, config?: MemoryHookConfig) {
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
  async start(options?: StartupOptions): Promise<MemoryResult<StartupResult>> {
    if (this.running) {
      return { success: false, error: 'Memory hook already running' };
    }

    this.initialized = true;

    // Load snapshot
    const result = await onStart(this.memoryService, this.config, options);

    if (result.success && result.data.loaded) {
      this.lastLoad = {
        timestamp: new Date().toISOString(),
        snapshotKey: result.data.snapshotKey!,
        rootHash: result.data.rootHash!,
        factCount: result.data.factCount!,
      };
    }

    // Start auto-save if configured
    if (this.config.autoSaveInterval > 0 && this.config.policy === MemoryPolicy.AUTO) {
      this.startAutoSave();
    }

    // Register signal handlers
    if ((this.config as MemoryHookConfig).registerSignals !== false) {
      this.registerSignalHandlers();
    }

    this.running = true;
    return result;
  }

  /**
   * Stop the memory hook.
   * Saves snapshot if policy allows.
   */
  async stop(options?: ShutdownOptions): Promise<MemoryResult<ShutdownResult>> {
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
        snapshotKey: result.data.snapshotKey!,
        rootHash: result.data.rootHash!,
        factCount: result.data.factCount!,
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
  async save(snapshotKey?: string): Promise<MemoryResult<ShutdownResult>> {
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
        rootHash: result.data.rootHash!,
        factCount: result.data.factCount!,
        trigger: SaveTrigger.MANUAL,
      };
    }

    return result;
  }

  /**
   * Manually load a snapshot.
   * Works regardless of policy.
   */
  async load(snapshotKey?: string): Promise<MemoryResult<StartupResult>> {
    const key = snapshotKey ?? this.config.defaultSnapshotKey;
    
    const result = await onStart(this.memoryService, this.config, {
      snapshotKey: key,
      forceLoad: true,
    });

    if (result.success && result.data.loaded) {
      this.lastLoad = {
        timestamp: new Date().toISOString(),
        snapshotKey: key,
        rootHash: result.data.rootHash!,
        factCount: result.data.factCount!,
      };
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTO-SAVE
  // ═══════════════════════════════════════════════════════════════════════════

  private startAutoSave(): void {
    if (this.autoSaveTimer) return;

    this.autoSaveTimer = setInterval(async () => {
      if (this.safeModeManager.isInSafeMode()) return;
      
      const result = await onShutdown(this.memoryService, this.config, {
        forceSave: true,
        trigger: SaveTrigger.INTERVAL,
      });

      if (result.success && result.data.saved) {
        this.lastSave = {
          timestamp: new Date().toISOString(),
          snapshotKey: result.data.snapshotKey!,
          rootHash: result.data.rootHash!,
          factCount: result.data.factCount!,
          trigger: SaveTrigger.INTERVAL,
        };
      }
    }, this.config.autoSaveInterval);
  }

  private stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNAL HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  private registerSignalHandlers(): void {
    // INV-HOOK-08: Register only once
    if (this.signalsRegistered) return;

    const handler = async (signal: string) => {
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
  async enterSafeMode(snapshotKey?: string) {
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
  isInSafeMode(): boolean {
    return this.safeModeManager.isInSafeMode();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Get current hook state
   */
  getState(): MemoryHookState {
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
  getMemoryService(): IMemoryService {
    return this.memoryService;
  }

  /**
   * Get the current configuration
   */
  getConfig(): MemoryPolicyConfig {
    return this.config;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createMemoryHook(
  memoryService: IMemoryService,
  config?: MemoryHookConfig
): MemoryHook {
  return new MemoryHook(memoryService, config);
}
