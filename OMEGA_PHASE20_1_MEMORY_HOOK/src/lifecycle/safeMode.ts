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
import { MemoryPolicy, createPolicyConfig } from '../config/memory-policy.js';
import { onStart, type StartupResult } from './onStart.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// SAFE MODE MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

export class SafeModeManager {
  private session: SafeModeSession | null = null;
  private readonly memoryService: IMemoryService;
  private readonly originalConfig: MemoryPolicyConfig;

  constructor(memoryService: IMemoryService, config: MemoryPolicyConfig) {
    this.memoryService = memoryService;
    this.originalConfig = config;
  }

  /**
   * Enter safe mode (read-only operation)
   */
  async enterSafeMode(options?: SafeModeOptions): Promise<MemoryResult<SafeModeSession>> {
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
  exitSafeMode(): MemoryResult<SafeModeSession> {
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
  isInSafeMode(): boolean {
    return this.session?.active ?? false;
  }

  /**
   * Get current session info
   */
  getSession(): SafeModeSession | null {
    return this.session;
  }

  /**
   * Find the most recent snapshot
   */
  private async findLatestSnapshot(): Promise<string | null> {
    const listResult = await this.memoryService.listSnapshots(
      this.originalConfig.snapshotPrefix
    );

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

export function createSafeModeManager(
  memoryService: IMemoryService,
  config: MemoryPolicyConfig
): SafeModeManager {
  return new SafeModeManager(memoryService, config);
}
