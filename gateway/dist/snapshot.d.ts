import { SnapshotPayload, SnapshotRef, SHA256 } from './types';
export declare const SNAPSHOT_REASON_CODES: {
    readonly SNAP_CREATION_FAILED: "Failed to create snapshot";
    readonly SNAP_NOT_FOUND: "Snapshot not found";
    readonly SNAP_HASH_MISMATCH: "Snapshot hash verification failed";
    readonly SNAP_IMMUTABLE: "Cannot modify immutable snapshot";
};
export declare class SnapshotError extends Error {
    readonly code: keyof typeof SNAPSHOT_REASON_CODES;
    constructor(code: keyof typeof SNAPSHOT_REASON_CODES, message: string);
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
export declare class SnapshotEngine {
    private snapshots;
    /**
     * Crée un snapshot immuable
     */
    create(execution_token: string, pipeline_id: string, step: string, input: unknown, output?: unknown, artifacts_refs?: Array<{
        kind: string;
        content_hash: SHA256;
        storage_ref: string;
    }>): SnapshotRef;
    /**
     * Récupère un snapshot par ID
     */
    get(snapshot_id: string): SnapshotPayload | null;
    /**
     * Vérifie l'intégrité d'un snapshot (SNAP-04)
     */
    verify(ref: SnapshotRef): boolean;
    /**
     * Liste tous les snapshots d'une exécution
     */
    listByExecution(execution_token: string): SnapshotPayload[];
    /**
     * Nombre de snapshots
     */
    size(): number;
    /**
     * Calcule le hash SHA-256 de données quelconques (SNAP-02: stable)
     */
    hashData(data: unknown): SHA256;
    /**
     * Export pour archivage
     */
    export(snapshot_id: string): {
        payload: SnapshotPayload;
        hash: SHA256;
    } | null;
}
export declare function createSnapshotEngine(): SnapshotEngine;
//# sourceMappingURL=snapshot.d.ts.map