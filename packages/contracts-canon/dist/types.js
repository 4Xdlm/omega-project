/**
 * @fileoverview OMEGA Contracts Canon - Core Types
 * @module @omega/contracts-canon
 *
 * Canonical source of truth for all OMEGA interface contracts.
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 */
// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════
export function isContractVersion(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'major' in obj &&
        typeof obj.major === 'number' &&
        'minor' in obj &&
        typeof obj.minor === 'number' &&
        'patch' in obj &&
        typeof obj.patch === 'number');
}
export function isContractMetadata(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        typeof obj.id === 'string' &&
        'name' in obj &&
        typeof obj.name === 'string' &&
        'version' in obj &&
        isContractVersion(obj.version) &&
        'stability' in obj &&
        typeof obj.stability === 'string' &&
        'since' in obj &&
        typeof obj.since === 'string' &&
        'description' in obj &&
        typeof obj.description === 'string');
}
export function isInvariantContract(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'id' in obj &&
        'name' in obj &&
        'severity' in obj &&
        'description' in obj &&
        'module' in obj &&
        'condition' in obj);
}
export function isModuleContract(obj) {
    return (typeof obj === 'object' &&
        obj !== null &&
        'metadata' in obj &&
        isContractMetadata(obj.metadata) &&
        'type' in obj &&
        'package' in obj &&
        'dependencies' in obj &&
        'exports' in obj &&
        'invariants' in obj);
}
//# sourceMappingURL=types.js.map