/**
 * OMEGA CANON_CORE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-01: CANON = source de vérité absolue
 */
// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════
export const CANON_VERSION = '3.18.0';
export const CANON_MAGIC = 'OMEGA_CANON_V1';
// ═══════════════════════════════════════════════════════════════════════════════
// FACT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/** Types de faits stockables dans le CANON */
export var FactType;
(function (FactType) {
    /** Fait concernant un personnage */
    FactType["CHARACTER"] = "CHARACTER";
    /** Fait concernant un lieu */
    FactType["LOCATION"] = "LOCATION";
    /** Fait concernant un objet */
    FactType["OBJECT"] = "OBJECT";
    /** Fait concernant un événement */
    FactType["EVENT"] = "EVENT";
    /** Fait concernant une relation */
    FactType["RELATION"] = "RELATION";
    /** Fait concernant une règle du monde */
    FactType["WORLD_RULE"] = "WORLD_RULE";
    /** Fait temporel (date, durée) */
    FactType["TEMPORAL"] = "TEMPORAL";
    /** Métadonnée */
    FactType["META"] = "META";
})(FactType || (FactType = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE TYPES & PRIORITY
// ═══════════════════════════════════════════════════════════════════════════════
/** Source d'un fait — détermine la priorité */
export var FactSource;
(function (FactSource) {
    /** Défini explicitement par l'utilisateur (priorité MAX) */
    FactSource["USER"] = "USER";
    /** Extrait du texte original */
    FactSource["TEXT"] = "TEXT";
    /** Importé depuis une source externe */
    FactSource["IMPORTED"] = "IMPORTED";
    /** Inféré par le système (priorité MIN) */
    FactSource["INFERRED"] = "INFERRED";
})(FactSource || (FactSource = {}));
/**
 * Priorité des sources (plus haut = plus prioritaire)
 * INV-MEM-01: USER > TEXT > IMPORTED > INFERRED
 */
export const SOURCE_PRIORITY = {
    [FactSource.USER]: 1000,
    [FactSource.TEXT]: 100,
    [FactSource.IMPORTED]: 10,
    [FactSource.INFERRED]: 1,
};
// ═══════════════════════════════════════════════════════════════════════════════
// FACT STATUS
// ═══════════════════════════════════════════════════════════════════════════════
/** Statut d'un fait */
export var FactStatus;
(function (FactStatus) {
    /** Fait actif et valide */
    FactStatus["ACTIVE"] = "ACTIVE";
    /** Fait archivé (remplacé par une version plus récente) */
    FactStatus["ARCHIVED"] = "ARCHIVED";
    /** Fait marqué comme supprimé (soft delete) */
    FactStatus["DELETED"] = "DELETED";
    /** Fait en conflit nécessitant résolution */
    FactStatus["CONFLICTED"] = "CONFLICTED";
})(FactStatus || (FactStatus = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════
/** Niveau de confiance d'un fait */
export var ConfidenceLevel;
(function (ConfidenceLevel) {
    /** Certitude absolue (ex: défini par USER) */
    ConfidenceLevel["ABSOLUTE"] = "ABSOLUTE";
    /** Haute confiance (ex: extrait du texte) */
    ConfidenceLevel["HIGH"] = "HIGH";
    /** Confiance moyenne (ex: importé) */
    ConfidenceLevel["MEDIUM"] = "MEDIUM";
    /** Basse confiance (ex: inféré) */
    ConfidenceLevel["LOW"] = "LOW";
    /** Incertain (nécessite validation) */
    ConfidenceLevel["UNCERTAIN"] = "UNCERTAIN";
})(ConfidenceLevel || (ConfidenceLevel = {}));
/** Mapping source → confidence par défaut */
export const DEFAULT_CONFIDENCE = {
    [FactSource.USER]: ConfidenceLevel.ABSOLUTE,
    [FactSource.TEXT]: ConfidenceLevel.HIGH,
    [FactSource.IMPORTED]: ConfidenceLevel.MEDIUM,
    [FactSource.INFERRED]: ConfidenceLevel.LOW,
};
// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/** Type de conflit détecté */
export var ConflictType;
(function (ConflictType) {
    /** Même sujet+prédicat, valeurs différentes */
    ConflictType["VALUE_MISMATCH"] = "VALUE_MISMATCH";
    /** Même sujet+prédicat, sources différentes de même priorité */
    ConflictType["SOURCE_CONFLICT"] = "SOURCE_CONFLICT";
    /** Contradiction temporelle */
    ConflictType["TEMPORAL_CONFLICT"] = "TEMPORAL_CONFLICT";
    /** Contradiction logique */
    ConflictType["LOGICAL_CONFLICT"] = "LOGICAL_CONFLICT";
})(ConflictType || (ConflictType = {}));
/** Résolution de conflit */
export var ConflictResolution;
(function (ConflictResolution) {
    /** Priorité de source appliquée automatiquement */
    ConflictResolution["AUTO_PRIORITY"] = "AUTO_PRIORITY";
    /** Utilisateur a choisi */
    ConflictResolution["USER_CHOICE"] = "USER_CHOICE";
    /** Les deux coexistent */
    ConflictResolution["COEXIST"] = "COEXIST";
    /** En attente de résolution */
    ConflictResolution["PENDING"] = "PENDING";
})(ConflictResolution || (ConflictResolution = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// LIMITS
// ═══════════════════════════════════════════════════════════════════════════════
/** Limites système */
export const CANON_LIMITS = {
    /** Longueur max d'un subject */
    MAX_SUBJECT_LENGTH: 256,
    /** Longueur max d'un predicate */
    MAX_PREDICATE_LENGTH: 128,
    /** Longueur max d'une value */
    MAX_VALUE_LENGTH: 4096,
    /** Nombre max de facts par subject */
    MAX_FACTS_PER_SUBJECT: 1000,
    /** Nombre max de versions par fact */
    MAX_VERSIONS_PER_FACT: 100,
    /** Nombre max de facts total */
    MAX_TOTAL_FACTS: 100000,
};
// ═══════════════════════════════════════════════════════════════════════════════
// HASH CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
/** Configuration du hashing */
export const HASH_CONFIG = {
    /** Algorithme utilisé */
    ALGORITHM: 'SHA-256',
    /** Encodage de sortie */
    ENCODING: 'hex',
    /** Hash de genèse (premier fact) */
    GENESIS_HASH: '0000000000000000000000000000000000000000000000000000000000000000',
};
//# sourceMappingURL=constants.js.map