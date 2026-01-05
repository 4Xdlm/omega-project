/**
 * OMEGA Memory Hook — Memory Policy Configuration
 * Phase 20.1 — v3.20.1
 * 
 * Defines how memory is managed at runtime.
 * 
 * Policies:
 * - AUTO: Load on start, save on shutdown, auto-save interval
 * - MANUAL: User controls save/load explicitly
 * - SAFE_MODE: Load only, no auto-save (read-only mode)
 * - DISABLED: No memory persistence
 */

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum MemoryPolicy {
  /** Auto load/save with optional interval */
  AUTO = 'AUTO',
  /** Manual control only */
  MANUAL = 'MANUAL',
  /** Read-only: load but never save */
  SAFE_MODE = 'SAFE_MODE',
  /** Memory persistence disabled */
  DISABLED = 'DISABLED',
}

export enum SaveTrigger {
  /** On explicit call */
  MANUAL = 'MANUAL',
  /** On shutdown signal */
  SHUTDOWN = 'SHUTDOWN',
  /** On interval timer */
  INTERVAL = 'INTERVAL',
  /** On significant change */
  ON_CHANGE = 'ON_CHANGE',
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface MemoryPolicyConfig {
  /** Memory management policy */
  readonly policy: MemoryPolicy;
  
  /** Base path for persistence */
  readonly basePath: string;
  
  /** Snapshot key prefix */
  readonly snapshotPrefix: string;
  
  /** Default snapshot key */
  readonly defaultSnapshotKey: string;
  
  /** Auto-save interval in ms (0 = disabled) */
  readonly autoSaveInterval: number;
  
  /** Save on shutdown */
  readonly saveOnShutdown: boolean;
  
  /** Load on startup */
  readonly loadOnStartup: boolean;
  
  /** Max snapshots to keep (0 = unlimited) */
  readonly maxSnapshots: number;
  
  /** Retry attempts on failure */
  readonly retryAttempts: number;
  
  /** Retry delay in ms */
  readonly retryDelay: number;
}

export interface PolicyValidationResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export const DEFAULT_MEMORY_POLICY_CONFIG: MemoryPolicyConfig = {
  policy: MemoryPolicy.AUTO,
  basePath: './out/memory',
  snapshotPrefix: 'omega_state_',
  defaultSnapshotKey: 'current',
  autoSaveInterval: 0, // Disabled by default
  saveOnShutdown: true,
  loadOnStartup: true,
  maxSnapshots: 10,
  retryAttempts: 3,
  retryDelay: 1000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRESETS
// ═══════════════════════════════════════════════════════════════════════════════

export const POLICY_PRESETS: Record<MemoryPolicy, Partial<MemoryPolicyConfig>> = {
  [MemoryPolicy.AUTO]: {
    policy: MemoryPolicy.AUTO,
    saveOnShutdown: true,
    loadOnStartup: true,
  },
  [MemoryPolicy.MANUAL]: {
    policy: MemoryPolicy.MANUAL,
    saveOnShutdown: false,
    loadOnStartup: false,
    autoSaveInterval: 0,
  },
  [MemoryPolicy.SAFE_MODE]: {
    policy: MemoryPolicy.SAFE_MODE,
    saveOnShutdown: false,
    loadOnStartup: true,
    autoSaveInterval: 0,
  },
  [MemoryPolicy.DISABLED]: {
    policy: MemoryPolicy.DISABLED,
    saveOnShutdown: false,
    loadOnStartup: false,
    autoSaveInterval: 0,
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

export function validatePolicyConfig(config: MemoryPolicyConfig): PolicyValidationResult {
  const errors: string[] = [];

  if (!config.basePath || config.basePath.trim() === '') {
    errors.push('basePath is required');
  }

  if (!config.snapshotPrefix || config.snapshotPrefix.trim() === '') {
    errors.push('snapshotPrefix is required');
  }

  if (!config.defaultSnapshotKey || config.defaultSnapshotKey.trim() === '') {
    errors.push('defaultSnapshotKey is required');
  }

  if (config.autoSaveInterval < 0) {
    errors.push('autoSaveInterval must be >= 0');
  }

  if (config.maxSnapshots < 0) {
    errors.push('maxSnapshots must be >= 0');
  }

  if (config.retryAttempts < 0) {
    errors.push('retryAttempts must be >= 0');
  }

  if (config.retryDelay < 0) {
    errors.push('retryDelay must be >= 0');
  }

  // Policy-specific validations
  if (config.policy === MemoryPolicy.SAFE_MODE && config.saveOnShutdown) {
    errors.push('SAFE_MODE policy cannot have saveOnShutdown enabled');
  }

  if (config.policy === MemoryPolicy.DISABLED && (config.loadOnStartup || config.saveOnShutdown)) {
    errors.push('DISABLED policy cannot have load or save enabled');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

export function createPolicyConfig(
  policy: MemoryPolicy,
  overrides?: Partial<MemoryPolicyConfig>
): MemoryPolicyConfig {
  const preset = POLICY_PRESETS[policy];
  
  return {
    ...DEFAULT_MEMORY_POLICY_CONFIG,
    ...preset,
    ...overrides,
    policy, // Ensure policy is not overridden incorrectly
  };
}

export function mergeConfigs(
  base: MemoryPolicyConfig,
  overrides: Partial<MemoryPolicyConfig>
): MemoryPolicyConfig {
  return {
    ...base,
    ...overrides,
  };
}
