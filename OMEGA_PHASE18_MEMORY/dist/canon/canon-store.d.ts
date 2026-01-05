/**
 * OMEGA CANON_CORE — Store Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-01: CANON = source de vérité absolue
 * INV-MEM-05: Persistence intègre
 * INV-MEM-06: Déterminisme total
 * INV-MEM-08: Audit trail complet
 */
import type { Fact, CreateFactInput, UpdateFactInput, FactFilter, CanonSnapshot, CanonDiff, FactConflict, CanonMetrics, AuditEntry, CanonResult, CanonExport } from './types.js';
/**
 * CanonStore — Source de vérité cryptographiquement sécurisée
 *
 * Propriétés:
 * - Immutable facts avec versioning
 * - Chain hash pour intégrité
 * - Source priority pour résolution automatique
 * - Audit trail complet
 */
/** Clock function type for injectable timestamps */
export type ClockFn = () => string;
export declare class CanonStore {
    private readonly facts;
    private readonly factsBySubject;
    private readonly factsByKey;
    private readonly auditTrail;
    private readonly conflicts;
    private lastHash;
    private lastAuditHash;
    private readonly clock;
    constructor(clock?: ClockFn);
    /**
     * Ajoute un nouveau fait au CANON
     * INV-MEM-01: Auto-override si source prioritaire
     */
    add(input: CreateFactInput): CanonResult<Fact>;
    /**
     * Récupère un fait par subject et predicate
     * Retourne le fait ACTIF avec la plus haute priorité
     */
    getFact(subject: string, predicate: string): Fact | null;
    /**
     * Récupère un fait par son ID
     */
    getFactById(id: string): Fact | null;
    /**
     * Met à jour un fait existant (crée une nouvelle version)
     */
    update(subject: string, predicate: string, input: UpdateFactInput): CanonResult<Fact>;
    /**
     * Supprime un fait (soft delete)
     */
    delete(subject: string, predicate: string, deletedBy?: string, reason?: string): CanonResult<Fact>;
    /**
     * Recherche des faits selon un filtre
     */
    query(filter: FactFilter): readonly Fact[];
    /**
     * Récupère tous les faits d'un subject
     */
    getSubjectFacts(subject: string): readonly Fact[];
    /**
     * Vérifie si un fait existe
     */
    has(subject: string, predicate: string): boolean;
    /**
     * Compte le nombre de facts
     */
    count(filter?: FactFilter): number;
    /**
     * Crée un snapshot de l'état actuel
     */
    createSnapshot(): CanonSnapshot;
    /**
     * Calcule la différence entre l'état actuel et un snapshot
     */
    diff(fromSnapshot: CanonSnapshot): CanonDiff;
    /**
     * Récupère les conflits en attente
     */
    getPendingConflicts(): readonly FactConflict[];
    /**
     * Résout un conflit
     * INV-MEM-04: User flag obligatoire pour résolution
     */
    resolveConflict(conflictId: string, choice: 'existing' | 'incoming', resolvedBy: string): CanonResult<Fact>;
    /**
     * Récupère les métriques du CANON
     */
    getMetrics(): CanonMetrics;
    /**
     * Récupère l'historique d'audit
     */
    getAuditTrail(factId?: string): readonly AuditEntry[];
    /**
     * Vérifie l'intégrité de tous les faits
     */
    verifyIntegrity(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Exporte le CANON complet
     */
    export(): CanonExport;
    /**
     * Importe un CANON exporté
     */
    static import(data: CanonExport): CanonResult<CanonStore>;
    /**
     * Réinitialise le store (pour tests)
     */
    clear(): void;
    private makeKey;
    private validateInput;
    private createFact;
    private storeFact;
    private archiveFact;
    private getActiveFact;
    private getActiveFactHashes;
    private replaceWithHigherPriority;
    private archiveAsLowerPriority;
    private createConflict;
    private replaceWithUserChoice;
    private matchesFilter;
    private addAuditEntry;
}
/**
 * Crée un nouveau CanonStore
 * @param clock - Optional clock function for deterministic testing
 */
export declare function createCanonStore(clock?: ClockFn): CanonStore;
//# sourceMappingURL=canon-store.d.ts.map