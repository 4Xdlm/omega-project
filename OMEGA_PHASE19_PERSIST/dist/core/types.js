/**
 * OMEGA Persistence Layer — Core Types
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Invariants:
 * - INV-PER-01: Write atomique (jamais état partiel)
 * - INV-PER-02: Reload == original (sha/bytes identiques)
 * - INV-PER-03: Crash mid-write => ancien OU nouveau, jamais mix
 * - INV-PER-04: Format JSON déterministe
 * - INV-PER-05: Hash intégrité post-load
 * - INV-PER-06: Version migration forward only
 */
import { createHash } from 'crypto';
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const PERSIST_VERSION = '3.19.0';
export const PERSIST_MAGIC = 'OMEGA_PERSIST_V1';
export var PersistErrorCode;
(function (PersistErrorCode) {
    // Write errors
    PersistErrorCode["WRITE_FAILED"] = "WRITE_FAILED";
    PersistErrorCode["ATOMIC_RENAME_FAILED"] = "ATOMIC_RENAME_FAILED";
    PersistErrorCode["LOCK_FAILED"] = "LOCK_FAILED";
    PersistErrorCode["LOCK_TIMEOUT"] = "LOCK_TIMEOUT";
    // Read errors
    PersistErrorCode["NOT_FOUND"] = "NOT_FOUND";
    PersistErrorCode["READ_FAILED"] = "READ_FAILED";
    PersistErrorCode["PARSE_FAILED"] = "PARSE_FAILED";
    // Integrity errors
    PersistErrorCode["HASH_MISMATCH"] = "HASH_MISMATCH";
    PersistErrorCode["MAGIC_MISMATCH"] = "MAGIC_MISMATCH";
    PersistErrorCode["VERSION_MISMATCH"] = "VERSION_MISMATCH";
    PersistErrorCode["CORRUPTED"] = "CORRUPTED";
    // Sync errors
    PersistErrorCode["CONFLICT_DETECTED"] = "CONFLICT_DETECTED";
    PersistErrorCode["MERGE_FAILED"] = "MERGE_FAILED";
    PersistErrorCode["DIVERGENCE"] = "DIVERGENCE";
    // General
    PersistErrorCode["INVALID_KEY"] = "INVALID_KEY";
    PersistErrorCode["INVALID_DATA"] = "INVALID_DATA";
    PersistErrorCode["STORAGE_FULL"] = "STORAGE_FULL";
    PersistErrorCode["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    PersistErrorCode["ADAPTER_ERROR"] = "ADAPTER_ERROR";
})(PersistErrorCode || (PersistErrorCode = {}));
export var PersistSource;
(function (PersistSource) {
    PersistSource["CANON_CORE"] = "CANON_CORE";
    PersistSource["INTENT_MACHINE"] = "INTENT_MACHINE";
    PersistSource["CONTEXT_ENGINE"] = "CONTEXT_ENGINE";
    PersistSource["CONFLICT_RESOLVER"] = "CONFLICT_RESOLVER";
    PersistSource["NEXUS"] = "NEXUS";
    PersistSource["CUSTOM"] = "CUSTOM";
})(PersistSource || (PersistSource = {}));
export const DEFAULT_ADAPTER_CONFIG = {
    basePath: './out/persist',
    instanceId: 'default',
    lockTimeout: 5000,
    maxFileSize: 50 * 1024 * 1024, // 50 MB
    schemaVersion: 1,
};
// ═══════════════════════════════════════════════════════════════════════════════
// SYNC TYPES
// ═══════════════════════════════════════════════════════════════════════════════
export var SyncStatus;
(function (SyncStatus) {
    SyncStatus["IN_SYNC"] = "IN_SYNC";
    SyncStatus["LOCAL_AHEAD"] = "LOCAL_AHEAD";
    SyncStatus["REMOTE_AHEAD"] = "REMOTE_AHEAD";
    SyncStatus["DIVERGED"] = "DIVERGED";
    SyncStatus["CONFLICT"] = "CONFLICT";
})(SyncStatus || (SyncStatus = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Calcule le hash SHA-256 d'un buffer ou string
 */
export function computeHash(data) {
    return createHash('sha256').update(data).digest('hex');
}
/**
 * Génère un ID d'instance unique
 */
export function generateInstanceId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
}
/**
 * Valide une clé de persistance
 */
export function validateKey(key) {
    if (!key || typeof key !== 'string') {
        return {
            success: false,
            error: {
                code: PersistErrorCode.INVALID_KEY,
                message: 'Key must be a non-empty string',
            },
        };
    }
    // Pas de caractères interdits Windows/Unix (mais : autorisé comme séparateur)
    const forbidden = /[<>"|?*\\/\x00-\x1f]/;
    if (forbidden.test(key)) {
        return {
            success: false,
            error: {
                code: PersistErrorCode.INVALID_KEY,
                message: 'Key contains forbidden characters',
                details: { key },
            },
        };
    }
    // Longueur max 200
    if (key.length > 200) {
        return {
            success: false,
            error: {
                code: PersistErrorCode.INVALID_KEY,
                message: 'Key exceeds maximum length of 200 characters',
                details: { length: key.length },
            },
        };
    }
    return { success: true, data: key };
}
/**
 * Crée une erreur de persistance
 */
export function createPersistError(code, message, details) {
    return { code, message, details };
}
//# sourceMappingURL=types.js.map