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

import type { IMemoryService, LoadSnapshotResult, MemoryResult } from '../memory-service.types.js';
import type { MemoryPolicyConfig } from '../config/memory-policy.js';
import { MemoryPolicy } from '../config/memory-policy.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════════════════════
// IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function onStart(
  memoryService: IMemoryService,
  config: MemoryPolicyConfig,
  options?: StartupOptions
): Promise<MemoryResult<StartupResult>> {
  const startTime = Date.now();
  const snapshotKey = options?.snapshotKey ?? config.defaultSnapshotKey;

  // INV-HOOK-01: Check if loading is allowed
  const shouldLoad = determineShouldLoad(config, options);

  if (!shouldLoad) {
    return {
      success: true,
      data: {
        loaded: false,
        attempts: 0,
        duration: Date.now() - startTime,
      },
    };
  }

  // Check if snapshot exists
  const exists = await memoryService.exists(snapshotKey);
  
  if (!exists) {
    // INV-HOOK-02: Graceful fallback on missing snapshot
    return {
      success: true,
      data: {
        loaded: false,
        snapshotKey,
        attempts: 1,
        duration: Date.now() - startTime,
        error: 'Snapshot not found (fresh start)',
      },
    };
  }

  // INV-HOOK-03: Retry on transient failures
  let lastError: string | undefined;
  
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    const result = await memoryService.loadSnapshot(snapshotKey);

    if (result.success) {
      return {
        success: true,
        data: {
          loaded: true,
          snapshotKey,
          rootHash: result.data.rootHash,
          factCount: result.data.factCount,
          attempts: attempt,
          duration: Date.now() - startTime,
        },
      };
    }

    lastError = result.error;

    // Wait before retry (except on last attempt)
    if (attempt < config.retryAttempts) {
      await sleep(config.retryDelay);
    }
  }

  // All retries failed
  return {
    success: false,
    error: `Failed to load snapshot after ${config.retryAttempts} attempts: ${lastError}`,
  };
}

function determineShouldLoad(
  config: MemoryPolicyConfig,
  options?: StartupOptions
): boolean {
  // Force overrides
  if (options?.skipLoad) return false;
  if (options?.forceLoad) return true;

  // Policy-based decision
  switch (config.policy) {
    case MemoryPolicy.AUTO:
    case MemoryPolicy.SAFE_MODE:
      return config.loadOnStartup;
    case MemoryPolicy.MANUAL:
    case MemoryPolicy.DISABLED:
      return false;
    default:
      return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export function isLoadAllowed(config: MemoryPolicyConfig): boolean {
  return config.policy !== MemoryPolicy.DISABLED && config.loadOnStartup;
}
