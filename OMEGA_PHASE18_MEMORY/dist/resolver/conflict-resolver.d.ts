/**
 * OMEGA CONFLICT_RESOLVER — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-04: Conflit = flag user (jamais silencieux)
 * INV-MEM-08: Audit trail complet
 */
import { ConflictStatus } from './constants.js';
import type { Conflict, ConflictParty, DetectConflictInput, ResolveConflictInput, ConflictFilter, ResolverResult, ResolverMetrics, ResolutionAuditEntry, ConflictListener } from './types.js';
/** Clock function type */
export type ClockFn = () => string;
/**
 * ConflictResolver — Détection et résolution de conflits
 *
 * INV-MEM-04: Jamais de résolution silencieuse
 * - Tout conflit est tracé
 * - L'utilisateur est toujours notifié
 * - Audit trail cryptographique
 */
export declare class ConflictResolver {
    private readonly conflicts;
    private readonly auditTrail;
    private readonly listeners;
    private totalDetected;
    private totalResolved;
    private resolutionTimes;
    private autoResolutions;
    private lastAuditHash;
    private readonly clock;
    constructor(clock?: ClockFn);
    /**
     * Détecte un nouveau conflit
     * INV-MEM-04: Le conflit est TOUJOURS flaggé
     */
    detect(input: DetectConflictInput): ResolverResult<Conflict>;
    /**
     * Détection proactive - scan pour contradictions
     */
    scan(entities: readonly ConflictParty[]): readonly Conflict[];
    /**
     * Résout un conflit
     * INV-MEM-04: Résolution TOUJOURS tracée avec qui/quand/pourquoi
     */
    resolve(conflictId: string, input: ResolveConflictInput): ResolverResult<Conflict>;
    /**
     * Tente une résolution automatique (si autorisé)
     */
    tryAutoResolve(conflictId: string): ResolverResult<Conflict>;
    /**
     * Ignore un conflit (avec justification)
     */
    ignore(conflictId: string, reason: string, ignoredBy: string): ResolverResult<Conflict>;
    /**
     * Reporte un conflit
     */
    defer(conflictId: string, reason: string, deferredBy: string): ResolverResult<Conflict>;
    /**
     * Récupère un conflit par ID
     */
    getConflict(id: string): Conflict | null;
    /**
     * Requête les conflits selon un filtre
     */
    queryConflicts(filter: ConflictFilter): readonly Conflict[];
    /**
     * Récupère les conflits en attente
     */
    getPendingConflicts(): readonly Conflict[];
    /**
     * Récupère les conflits nécessitant attention utilisateur
     */
    getRequiringUserAttention(): readonly Conflict[];
    /**
     * Compte les conflits par statut
     */
    countByStatus(status: ConflictStatus): number;
    /**
     * Récupère l'audit trail
     */
    getAuditTrail(conflictId?: string): readonly ResolutionAuditEntry[];
    /**
     * Vérifie l'intégrité de l'audit trail
     */
    verifyAuditIntegrity(): {
        valid: boolean;
        errors: string[];
    };
    /**
     * Récupère les métriques
     */
    getMetrics(): ResolverMetrics;
    /**
     * Ajoute un listener
     */
    addListener(listener: ConflictListener): void;
    /**
     * Supprime un listener
     */
    removeListener(listener: ConflictListener): void;
    /**
     * Réinitialise (pour tests)
     */
    clear(): void;
    /**
     * Compte les conflits
     */
    count(): number;
    private validateDetectInput;
    private inferSeverity;
    private inferFlags;
    private generateDescription;
    private matchesFilter;
    private addAuditEntry;
    private notifyListeners;
}
/**
 * Crée un nouveau ConflictResolver
 */
export declare function createConflictResolver(clock?: ClockFn): ConflictResolver;
//# sourceMappingURL=conflict-resolver.d.ts.map