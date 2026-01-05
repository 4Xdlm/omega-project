/**
 * OMEGA CONFLICT_RESOLVER — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-04: Conflit = flag user (jamais silencieux)
 */
export declare const RESOLVER_VERSION = "3.18.0";
/** Types de conflits détectables */
export declare enum ConflictCategory {
    /** Valeurs contradictoires pour le même attribut */
    VALUE_CONTRADICTION = "VALUE_CONTRADICTION",
    /** Incohérence temporelle (ex: mort avant naissance) */
    TEMPORAL_INCONSISTENCY = "TEMPORAL_INCONSISTENCY",
    /** Incohérence spatiale (ex: en deux lieux simultanément) */
    SPATIAL_INCONSISTENCY = "SPATIAL_INCONSISTENCY",
    /** Contradiction logique (ex: A implique B mais non-B) */
    LOGICAL_CONTRADICTION = "LOGICAL_CONTRADICTION",
    /** Conflit de source (deux sources de même priorité) */
    SOURCE_CONFLICT = "SOURCE_CONFLICT",
    /** Attribut manquant requis */
    MISSING_REQUIRED = "MISSING_REQUIRED",
    /** Référence circulaire */
    CIRCULAR_REFERENCE = "CIRCULAR_REFERENCE",
    /** Autre */
    OTHER = "OTHER"
}
/** Sévérité d'un conflit */
export declare enum ConflictSeverity {
    /** Information seulement */
    INFO = "INFO",
    /** Avertissement (non bloquant) */
    WARNING = "WARNING",
    /** Erreur (doit être résolu) */
    ERROR = "ERROR",
    /** Critique (bloque toute opération) */
    CRITICAL = "CRITICAL"
}
/** Valeurs numériques de sévérité */
export declare const SEVERITY_VALUES: Record<ConflictSeverity, number>;
/** Statut d'un conflit */
export declare enum ConflictStatus {
    /** Détecté, en attente de résolution */
    PENDING = "PENDING",
    /** En cours de revue */
    REVIEWING = "REVIEWING",
    /** Résolu par l'utilisateur */
    RESOLVED_BY_USER = "RESOLVED_BY_USER",
    /** Résolu automatiquement (priorité de source) */
    RESOLVED_AUTO = "RESOLVED_AUTO",
    /** Ignoré volontairement */
    IGNORED = "IGNORED",
    /** Reporté pour plus tard */
    DEFERRED = "DEFERRED"
}
/** Stratégies de résolution */
export declare enum ResolutionStrategy {
    /** Garder la valeur existante */
    KEEP_EXISTING = "KEEP_EXISTING",
    /** Utiliser la nouvelle valeur */
    USE_NEW = "USE_NEW",
    /** Fusionner les valeurs */
    MERGE = "MERGE",
    /** Garder les deux (coexistence) */
    COEXIST = "COEXIST",
    /** Appliquer la priorité de source */
    APPLY_PRIORITY = "APPLY_PRIORITY",
    /** Personnalisé */
    CUSTOM = "CUSTOM"
}
export declare const RESOLVER_LIMITS: {
    /** Nombre max de conflits en attente */
    readonly MAX_PENDING_CONFLICTS: 1000;
    /** Nombre max de conflits dans l'historique */
    readonly MAX_HISTORY_SIZE: 5000;
    /** Durée max avant escalade (ms) */
    readonly ESCALATION_TIMEOUT_MS: 86400000;
};
/** Flags pour le traitement des conflits */
export declare enum ConflictFlag {
    /** Nécessite attention utilisateur */
    REQUIRES_USER_ATTENTION = "REQUIRES_USER_ATTENTION",
    /** Peut être résolu automatiquement */
    AUTO_RESOLVABLE = "AUTO_RESOLVABLE",
    /** Lié à un autre conflit */
    LINKED = "LINKED",
    /** Récurrent (déjà vu) */
    RECURRING = "RECURRING",
    /** Urgent */
    URGENT = "URGENT"
}
//# sourceMappingURL=constants.d.ts.map