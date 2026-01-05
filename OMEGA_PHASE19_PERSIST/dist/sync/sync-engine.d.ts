/**
 * OMEGA Persistence Layer — Sync Engine
 * Phase 19 — v3.19.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * Invariants:
 * - INV-SYNC-01: Divergence => conflit explicite (pas de merge silencieux)
 * - INV-SYNC-02: Merge déterministe si non conflict
 *
 * Stratégie MVP:
 * - Pull then merge
 * - Si divergence → conflict flag
 * - Résolution manuelle via user choice
 */
import { PersistenceAdapter, PersistResult, SaveResult, SyncEngine as ISyncEngine, SyncState, SyncConflict, MergeResult } from '../core/types.js';
export declare class SyncEngine implements ISyncEngine {
    private readonly localAdapter;
    private readonly remoteAdapter;
    private readonly conflicts;
    constructor(localAdapter: PersistenceAdapter, remoteAdapter: PersistenceAdapter);
    compare(key: string): Promise<PersistResult<SyncState>>;
    pull(key: string): Promise<PersistResult<MergeResult>>;
    push(key: string): Promise<PersistResult<SaveResult>>;
    resolveConflict(key: string, winner: 'local' | 'remote' | 'merge', mergedData?: unknown): Promise<PersistResult<SaveResult>>;
    /**
     * Récupère tous les conflits en cours
     */
    getConflicts(): readonly SyncConflict[];
    /**
     * Vérifie si une clé a un conflit
     */
    hasConflict(key: string): boolean;
    /**
     * Récupère le conflit pour une clé
     */
    getConflict(key: string): SyncConflict | undefined;
    /**
     * Efface tous les conflits
     */
    clearConflicts(): void;
}
export declare function createSyncEngine(localAdapter: PersistenceAdapter, remoteAdapter: PersistenceAdapter): SyncEngine;
//# sourceMappingURL=sync-engine.d.ts.map