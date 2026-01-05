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
export var MemoryPolicy;
(function (MemoryPolicy) {
    /** Auto load/save with optional interval */
    MemoryPolicy["AUTO"] = "AUTO";
    /** Manual control only */
    MemoryPolicy["MANUAL"] = "MANUAL";
    /** Read-only: load but never save */
    MemoryPolicy["SAFE_MODE"] = "SAFE_MODE";
    /** Memory persistence disabled */
    MemoryPolicy["DISABLED"] = "DISABLED";
})(MemoryPolicy || (MemoryPolicy = {}));
export var SaveTrigger;
(function (SaveTrigger) {
    /** On explicit call */
    SaveTrigger["MANUAL"] = "MANUAL";
    /** On shutdown signal */
    SaveTrigger["SHUTDOWN"] = "SHUTDOWN";
    /** On interval timer */
    SaveTrigger["INTERVAL"] = "INTERVAL";
    /** On significant change */
    SaveTrigger["ON_CHANGE"] = "ON_CHANGE";
})(SaveTrigger || (SaveTrigger = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_MEMORY_POLICY_CONFIG = {
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
export const POLICY_PRESETS = {
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
export function validatePolicyConfig(config) {
    const errors = [];
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
export function createPolicyConfig(policy, overrides) {
    const preset = POLICY_PRESETS[policy];
    return {
        ...DEFAULT_MEMORY_POLICY_CONFIG,
        ...preset,
        ...overrides,
        policy, // Ensure policy is not overridden incorrectly
    };
}
export function mergeConfigs(base, overrides) {
    return {
        ...base,
        ...overrides,
    };
}
//# sourceMappingURL=memory-policy.js.map