// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA SNAPSHOT ENGINE — Preuves cryptographiques d'état
// Version: 1.0.0 — NASA/SpaceX-Grade
// Invariants: SNAP-01 à SNAP-04
// ═══════════════════════════════════════════════════════════════════════════════
import { createHash, randomUUID } from 'crypto';
import stringify from 'fast-json-stable-stringify';
export const SNAPSHOT_REASON_CODES = {
    SNAP_CREATION_FAILED: 'Failed to create snapshot',
    SNAP_NOT_FOUND: 'Snapshot not found',
    SNAP_HASH_MISMATCH: 'Snapshot hash verification failed',
    SNAP_IMMUTABLE: 'Cannot modify immutable snapshot',
};
export class SnapshotError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'SnapshotError';
    }
}
function computeHash(content) {
    const canonical = stringify(content);
    return createHash('sha256').update(canonical, 'utf-8').digest('hex');
}
/**
 * Snapshot Engine OMEGA — Capture d'état immuable
 *
 * Invariants:
 * - SNAP-01: Immutabilité (snapshot créé = figé)
 * - SNAP-02: Hash stable (même payload → même hash)
 * - SNAP-03: Canonicalisation (pas de champs non normalisés)
 * - SNAP-04: Référence vérifiable
 */
export class SnapshotEngine {
    snapshots = new Map();
    /**
     * Crée un snapshot immuable
     */
    create(execution_token, pipeline_id, step, input, output, artifacts_refs = []) {
        const snapshot_id = randomUUID();
        const timestamp = new Date().toISOString();
        // Canonicaliser et hasher
        const input_hash = computeHash(input);
        const output_hash = output !== undefined ? computeHash(output) : undefined;
        // State digest = hash de (input_hash + output_hash + artifacts)
        const state_digest = computeHash({ input_hash, output_hash, artifacts_refs });
        const payload = {
            snapshot_id,
            execution_token,
            pipeline_id,
            step,
            timestamp,
            input_hash,
            output_hash,
            state_digest,
            artifacts_refs,
        };
        // Hash du payload complet
        const snapshot_hash = computeHash(payload);
        // Store (SNAP-01: immutable after creation)
        this.snapshots.set(snapshot_id, { payload, hash: snapshot_hash });
        return {
            snapshot_id,
            snapshot_hash,
            storage_ref: `mem://${snapshot_id}`,
        };
    }
    /**
     * Récupère un snapshot par ID
     */
    get(snapshot_id) {
        const stored = this.snapshots.get(snapshot_id);
        return stored?.payload || null;
    }
    /**
     * Vérifie l'intégrité d'un snapshot (SNAP-04)
     */
    verify(ref) {
        const stored = this.snapshots.get(ref.snapshot_id);
        if (!stored)
            return false;
        // Recalculer le hash
        const computedHash = computeHash(stored.payload);
        return computedHash === ref.snapshot_hash && computedHash === stored.hash;
    }
    /**
     * Liste tous les snapshots d'une exécution
     */
    listByExecution(execution_token) {
        const results = [];
        for (const { payload } of this.snapshots.values()) {
            if (payload.execution_token === execution_token) {
                results.push(payload);
            }
        }
        return results.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    }
    /**
     * Nombre de snapshots
     */
    size() {
        return this.snapshots.size;
    }
    /**
     * Calcule le hash SHA-256 de données quelconques (SNAP-02: stable)
     */
    hashData(data) {
        return computeHash(data);
    }
    /**
     * Export pour archivage
     */
    export(snapshot_id) {
        return this.snapshots.get(snapshot_id) || null;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
export function createSnapshotEngine() {
    return new SnapshotEngine();
}
//# sourceMappingURL=snapshot.js.map