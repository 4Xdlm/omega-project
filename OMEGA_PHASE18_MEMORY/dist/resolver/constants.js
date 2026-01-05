/**
 * OMEGA CONFLICT_RESOLVER — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-04: Conflit = flag user (jamais silencieux)
 */
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const RESOLVER_VERSION = '3.18.0';
// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/** Types de conflits détectables */
export var ConflictCategory;
(function (ConflictCategory) {
    /** Valeurs contradictoires pour le même attribut */
    ConflictCategory["VALUE_CONTRADICTION"] = "VALUE_CONTRADICTION";
    /** Incohérence temporelle (ex: mort avant naissance) */
    ConflictCategory["TEMPORAL_INCONSISTENCY"] = "TEMPORAL_INCONSISTENCY";
    /** Incohérence spatiale (ex: en deux lieux simultanément) */
    ConflictCategory["SPATIAL_INCONSISTENCY"] = "SPATIAL_INCONSISTENCY";
    /** Contradiction logique (ex: A implique B mais non-B) */
    ConflictCategory["LOGICAL_CONTRADICTION"] = "LOGICAL_CONTRADICTION";
    /** Conflit de source (deux sources de même priorité) */
    ConflictCategory["SOURCE_CONFLICT"] = "SOURCE_CONFLICT";
    /** Attribut manquant requis */
    ConflictCategory["MISSING_REQUIRED"] = "MISSING_REQUIRED";
    /** Référence circulaire */
    ConflictCategory["CIRCULAR_REFERENCE"] = "CIRCULAR_REFERENCE";
    /** Autre */
    ConflictCategory["OTHER"] = "OTHER";
})(ConflictCategory || (ConflictCategory = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════
/** Sévérité d'un conflit */
export var ConflictSeverity;
(function (ConflictSeverity) {
    /** Information seulement */
    ConflictSeverity["INFO"] = "INFO";
    /** Avertissement (non bloquant) */
    ConflictSeverity["WARNING"] = "WARNING";
    /** Erreur (doit être résolu) */
    ConflictSeverity["ERROR"] = "ERROR";
    /** Critique (bloque toute opération) */
    ConflictSeverity["CRITICAL"] = "CRITICAL";
})(ConflictSeverity || (ConflictSeverity = {}));
/** Valeurs numériques de sévérité */
export const SEVERITY_VALUES = {
    [ConflictSeverity.INFO]: 1,
    [ConflictSeverity.WARNING]: 10,
    [ConflictSeverity.ERROR]: 100,
    [ConflictSeverity.CRITICAL]: 1000,
};
// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT STATUS
// ═══════════════════════════════════════════════════════════════════════════════
/** Statut d'un conflit */
export var ConflictStatus;
(function (ConflictStatus) {
    /** Détecté, en attente de résolution */
    ConflictStatus["PENDING"] = "PENDING";
    /** En cours de revue */
    ConflictStatus["REVIEWING"] = "REVIEWING";
    /** Résolu par l'utilisateur */
    ConflictStatus["RESOLVED_BY_USER"] = "RESOLVED_BY_USER";
    /** Résolu automatiquement (priorité de source) */
    ConflictStatus["RESOLVED_AUTO"] = "RESOLVED_AUTO";
    /** Ignoré volontairement */
    ConflictStatus["IGNORED"] = "IGNORED";
    /** Reporté pour plus tard */
    ConflictStatus["DEFERRED"] = "DEFERRED";
})(ConflictStatus || (ConflictStatus = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════
/** Stratégies de résolution */
export var ResolutionStrategy;
(function (ResolutionStrategy) {
    /** Garder la valeur existante */
    ResolutionStrategy["KEEP_EXISTING"] = "KEEP_EXISTING";
    /** Utiliser la nouvelle valeur */
    ResolutionStrategy["USE_NEW"] = "USE_NEW";
    /** Fusionner les valeurs */
    ResolutionStrategy["MERGE"] = "MERGE";
    /** Garder les deux (coexistence) */
    ResolutionStrategy["COEXIST"] = "COEXIST";
    /** Appliquer la priorité de source */
    ResolutionStrategy["APPLY_PRIORITY"] = "APPLY_PRIORITY";
    /** Personnalisé */
    ResolutionStrategy["CUSTOM"] = "CUSTOM";
})(ResolutionStrategy || (ResolutionStrategy = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// LIMITS
// ═══════════════════════════════════════════════════════════════════════════════
export const RESOLVER_LIMITS = {
    /** Nombre max de conflits en attente */
    MAX_PENDING_CONFLICTS: 1000,
    /** Nombre max de conflits dans l'historique */
    MAX_HISTORY_SIZE: 5000,
    /** Durée max avant escalade (ms) */
    ESCALATION_TIMEOUT_MS: 86400000, // 24h
};
// ═══════════════════════════════════════════════════════════════════════════════
// FLAGS
// ═══════════════════════════════════════════════════════════════════════════════
/** Flags pour le traitement des conflits */
export var ConflictFlag;
(function (ConflictFlag) {
    /** Nécessite attention utilisateur */
    ConflictFlag["REQUIRES_USER_ATTENTION"] = "REQUIRES_USER_ATTENTION";
    /** Peut être résolu automatiquement */
    ConflictFlag["AUTO_RESOLVABLE"] = "AUTO_RESOLVABLE";
    /** Lié à un autre conflit */
    ConflictFlag["LINKED"] = "LINKED";
    /** Récurrent (déjà vu) */
    ConflictFlag["RECURRING"] = "RECURRING";
    /** Urgent */
    ConflictFlag["URGENT"] = "URGENT";
})(ConflictFlag || (ConflictFlag = {}));
//# sourceMappingURL=constants.js.map