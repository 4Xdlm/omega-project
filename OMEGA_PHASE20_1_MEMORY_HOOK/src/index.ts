/**
 * OMEGA Memory Hook — Main Index
 * Phase 20.1 — v3.20.1
 * 
 * Gateway Memory Hook Runtime
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

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const MEMORY_HOOK_VERSION = '3.20.1';

// ═══════════════════════════════════════════════════════════════════════════════
// MEMORY HOOK
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MemoryHook,
  createMemoryHook,
  type MemoryHookConfig,
  type MemoryHookState,
  type SaveInfo,
  type LoadInfo,
} from './memory-hook.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

export {
  MemoryPolicy,
  SaveTrigger,
  createPolicyConfig,
  validatePolicyConfig,
  mergeConfigs,
  DEFAULT_MEMORY_POLICY_CONFIG,
  POLICY_PRESETS,
  type MemoryPolicyConfig,
  type PolicyValidationResult,
} from './config/memory-policy.js';

// ═══════════════════════════════════════════════════════════════════════════════
// LIFECYCLE
// ═══════════════════════════════════════════════════════════════════════════════

export {
  onStart,
  onShutdown,
  SafeModeManager,
  createSafeModeManager,
  isLoadAllowed,
  isSaveAllowed,
  type StartupResult,
  type StartupOptions,
  type ShutdownResult,
  type ShutdownOptions,
  type SafeModeSession,
  type SafeModeOptions,
} from './lifecycle/index.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES (for integration with Phase 20)
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  IMemoryService,
  ICanonStore,
  MemoryResult,
  SaveSnapshotResult,
  LoadSnapshotResult,
  CanonFact,
  CanonSnapshot,
} from './memory-service.types.js';

// Mock implementations for testing
export { MockMemoryService, MockCanonStore } from './memory-service.types.js';
