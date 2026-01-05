/**
 * OMEGA CANON_CORE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-01: CANON = source de vérité absolue
 */
export declare const CANON_VERSION = "3.18.0";
export declare const CANON_MAGIC = "OMEGA_CANON_V1";
/** Types de faits stockables dans le CANON */
export declare enum FactType {
    /** Fait concernant un personnage */
    CHARACTER = "CHARACTER",
    /** Fait concernant un lieu */
    LOCATION = "LOCATION",
    /** Fait concernant un objet */
    OBJECT = "OBJECT",
    /** Fait concernant un événement */
    EVENT = "EVENT",
    /** Fait concernant une relation */
    RELATION = "RELATION",
    /** Fait concernant une règle du monde */
    WORLD_RULE = "WORLD_RULE",
    /** Fait temporel (date, durée) */
    TEMPORAL = "TEMPORAL",
    /** Métadonnée */
    META = "META"
}
/** Source d'un fait — détermine la priorité */
export declare enum FactSource {
    /** Défini explicitement par l'utilisateur (priorité MAX) */
    USER = "USER",
    /** Extrait du texte original */
    TEXT = "TEXT",
    /** Importé depuis une source externe */
    IMPORTED = "IMPORTED",
    /** Inféré par le système (priorité MIN) */
    INFERRED = "INFERRED"
}
/**
 * Priorité des sources (plus haut = plus prioritaire)
 * INV-MEM-01: USER > TEXT > IMPORTED > INFERRED
 */
export declare const SOURCE_PRIORITY: Record<FactSource, number>;
/** Statut d'un fait */
export declare enum FactStatus {
    /** Fait actif et valide */
    ACTIVE = "ACTIVE",
    /** Fait archivé (remplacé par une version plus récente) */
    ARCHIVED = "ARCHIVED",
    /** Fait marqué comme supprimé (soft delete) */
    DELETED = "DELETED",
    /** Fait en conflit nécessitant résolution */
    CONFLICTED = "CONFLICTED"
}
/** Niveau de confiance d'un fait */
export declare enum ConfidenceLevel {
    /** Certitude absolue (ex: défini par USER) */
    ABSOLUTE = "ABSOLUTE",
    /** Haute confiance (ex: extrait du texte) */
    HIGH = "HIGH",
    /** Confiance moyenne (ex: importé) */
    MEDIUM = "MEDIUM",
    /** Basse confiance (ex: inféré) */
    LOW = "LOW",
    /** Incertain (nécessite validation) */
    UNCERTAIN = "UNCERTAIN"
}
/** Mapping source → confidence par défaut */
export declare const DEFAULT_CONFIDENCE: Record<FactSource, ConfidenceLevel>;
/** Type de conflit détecté */
export declare enum ConflictType {
    /** Même sujet+prédicat, valeurs différentes */
    VALUE_MISMATCH = "VALUE_MISMATCH",
    /** Même sujet+prédicat, sources différentes de même priorité */
    SOURCE_CONFLICT = "SOURCE_CONFLICT",
    /** Contradiction temporelle */
    TEMPORAL_CONFLICT = "TEMPORAL_CONFLICT",
    /** Contradiction logique */
    LOGICAL_CONFLICT = "LOGICAL_CONFLICT"
}
/** Résolution de conflit */
export declare enum ConflictResolution {
    /** Priorité de source appliquée automatiquement */
    AUTO_PRIORITY = "AUTO_PRIORITY",
    /** Utilisateur a choisi */
    USER_CHOICE = "USER_CHOICE",
    /** Les deux coexistent */
    COEXIST = "COEXIST",
    /** En attente de résolution */
    PENDING = "PENDING"
}
/** Limites système */
export declare const CANON_LIMITS: {
    /** Longueur max d'un subject */
    readonly MAX_SUBJECT_LENGTH: 256;
    /** Longueur max d'un predicate */
    readonly MAX_PREDICATE_LENGTH: 128;
    /** Longueur max d'une value */
    readonly MAX_VALUE_LENGTH: 4096;
    /** Nombre max de facts par subject */
    readonly MAX_FACTS_PER_SUBJECT: 1000;
    /** Nombre max de versions par fact */
    readonly MAX_VERSIONS_PER_FACT: 100;
    /** Nombre max de facts total */
    readonly MAX_TOTAL_FACTS: 100000;
};
/** Configuration du hashing */
export declare const HASH_CONFIG: {
    /** Algorithme utilisé */
    readonly ALGORITHM: "SHA-256";
    /** Encodage de sortie */
    readonly ENCODING: "hex";
    /** Hash de genèse (premier fact) */
    readonly GENESIS_HASH: "0000000000000000000000000000000000000000000000000000000000000000";
};
//# sourceMappingURL=constants.d.ts.map