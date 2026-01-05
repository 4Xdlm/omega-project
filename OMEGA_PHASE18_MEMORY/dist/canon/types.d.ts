/**
 * OMEGA CANON_CORE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
import { FactType, FactSource, FactStatus, ConfidenceLevel, ConflictType, ConflictResolution } from './constants.js';
/** Métadonnées d'un fait */
export interface FactMetadata {
    /** Timestamp de création (ISO 8601) */
    readonly createdAt: string;
    /** Timestamp de dernière modification (ISO 8601) */
    readonly updatedAt: string;
    /** ID de l'utilisateur/système ayant créé le fait */
    readonly createdBy: string;
    /** Référence au texte source (optionnel) */
    readonly sourceRef?: string;
    /** Position dans le texte source (optionnel) */
    readonly sourcePosition?: {
        readonly chapter?: string;
        readonly paragraph?: number;
        readonly sentence?: number;
    };
    /** Tags additionnels */
    readonly tags?: readonly string[];
    /** Notes/commentaires */
    readonly notes?: string;
}
/** Un fait canonique — IMMUTABLE */
export interface Fact {
    /** Identifiant unique (format: fact_<timestamp>_<random>) */
    readonly id: string;
    /** Type de fait */
    readonly type: FactType;
    /** Sujet du fait (ex: "Jean", "Paris") */
    readonly subject: string;
    /** Prédicat/propriété (ex: "age", "population") */
    readonly predicate: string;
    /** Valeur du fait (toujours string, parsing externe) */
    readonly value: string;
    /** Source du fait */
    readonly source: FactSource;
    /** Statut actuel */
    readonly status: FactStatus;
    /** Niveau de confiance */
    readonly confidence: ConfidenceLevel;
    /** Numéro de version (commence à 1) */
    readonly version: number;
    /** Hash du fait précédent dans la chaîne (chain hash) */
    readonly previousHash: string;
    /** Hash de ce fait */
    readonly hash: string;
    /** Métadonnées */
    readonly metadata: FactMetadata;
}
/** Input pour créer un nouveau fait */
export interface CreateFactInput {
    /** Type de fait */
    readonly type: FactType;
    /** Sujet du fait */
    readonly subject: string;
    /** Prédicat/propriété */
    readonly predicate: string;
    /** Valeur */
    readonly value: string;
    /** Source du fait */
    readonly source: FactSource;
    /** Niveau de confiance (optionnel, déduit de source si absent) */
    readonly confidence?: ConfidenceLevel;
    /** Créateur (optionnel, default: 'system') */
    readonly createdBy?: string;
    /** Référence source (optionnel) */
    readonly sourceRef?: string;
    /** Position source (optionnel) */
    readonly sourcePosition?: {
        readonly chapter?: string;
        readonly paragraph?: number;
        readonly sentence?: number;
    };
    /** Tags (optionnel) */
    readonly tags?: readonly string[];
    /** Notes (optionnel) */
    readonly notes?: string;
}
/** Input pour mettre à jour un fait */
export interface UpdateFactInput {
    /** Nouvelle valeur */
    readonly value: string;
    /** Nouvelle source (optionnel) */
    readonly source?: FactSource;
    /** Nouveau niveau de confiance (optionnel) */
    readonly confidence?: ConfidenceLevel;
    /** Créateur de la mise à jour */
    readonly updatedBy?: string;
    /** Raison de la mise à jour */
    readonly reason?: string;
}
/** Filtre pour requêter les facts */
export interface FactFilter {
    /** Filtrer par type */
    readonly type?: FactType;
    /** Filtrer par subject (exact match) */
    readonly subject?: string;
    /** Filtrer par subject (pattern) */
    readonly subjectPattern?: string;
    /** Filtrer par predicate */
    readonly predicate?: string;
    /** Filtrer par source */
    readonly source?: FactSource;
    /** Filtrer par status */
    readonly status?: FactStatus;
    /** Filtrer par confidence minimum */
    readonly minConfidence?: ConfidenceLevel;
    /** Filtrer par tags (any match) */
    readonly tags?: readonly string[];
    /** Filtrer par date de création (après) */
    readonly createdAfter?: string;
    /** Filtrer par date de création (avant) */
    readonly createdBefore?: string;
    /** Limite de résultats */
    readonly limit?: number;
    /** Offset pour pagination */
    readonly offset?: number;
}
/** Snapshot du CANON à un instant T */
export interface CanonSnapshot {
    /** ID unique du snapshot */
    readonly id: string;
    /** Timestamp de création */
    readonly timestamp: string;
    /** Hash racine (Merkle root) */
    readonly rootHash: string;
    /** Nombre de facts actifs */
    readonly factCount: number;
    /** Hash du dernier fact ajouté */
    readonly lastFactHash: string;
    /** Version du CANON */
    readonly version: string;
}
/** Différence entre deux états du CANON */
export interface CanonDiff {
    /** Snapshot source */
    readonly from: CanonSnapshot;
    /** Snapshot destination */
    readonly to: CanonSnapshot;
    /** Facts ajoutés */
    readonly added: readonly Fact[];
    /** Facts modifiés (nouvelles versions) */
    readonly modified: readonly Fact[];
    /** Facts archivés */
    readonly archived: readonly Fact[];
    /** Facts supprimés (soft) */
    readonly deleted: readonly Fact[];
}
/** Conflit détecté entre facts */
export interface FactConflict {
    /** ID unique du conflit */
    readonly id: string;
    /** Type de conflit */
    readonly type: ConflictType;
    /** Fait existant */
    readonly existingFact: Fact;
    /** Fait entrant */
    readonly incomingFact: CreateFactInput;
    /** Résolution appliquée */
    readonly resolution: ConflictResolution;
    /** Fait gagnant (si résolu) */
    readonly winningFactId?: string;
    /** Timestamp de détection */
    readonly detectedAt: string;
    /** Timestamp de résolution */
    readonly resolvedAt?: string;
    /** Résolu par */
    readonly resolvedBy?: string;
}
/** Métriques du CANON */
export interface CanonMetrics {
    /** Nombre total de facts (toutes versions) */
    readonly totalFacts: number;
    /** Nombre de facts actifs */
    readonly activeFacts: number;
    /** Nombre de facts archivés */
    readonly archivedFacts: number;
    /** Nombre de facts supprimés */
    readonly deletedFacts: number;
    /** Nombre de facts en conflit */
    readonly conflictedFacts: number;
    /** Répartition par type */
    readonly byType: Record<FactType, number>;
    /** Répartition par source */
    readonly bySource: Record<FactSource, number>;
    /** Hash racine actuel */
    readonly currentRootHash: string;
    /** Timestamp du dernier changement */
    readonly lastModified: string;
}
/** Entrée d'audit */
export interface AuditEntry {
    /** ID unique */
    readonly id: string;
    /** Timestamp */
    readonly timestamp: string;
    /** Action effectuée */
    readonly action: 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESOLVE_CONFLICT';
    /** Fact concerné */
    readonly factId: string;
    /** Acteur */
    readonly actor: string;
    /** Détails */
    readonly details?: Record<string, unknown>;
    /** Hash de l'entrée d'audit */
    readonly hash: string;
}
/** Résultat d'une opération sur le CANON */
export type CanonResult<T> = {
    readonly success: true;
    readonly data: T;
} | {
    readonly success: false;
    readonly error: CanonError;
};
/** Erreur du CANON */
export interface CanonError {
    /** Code d'erreur */
    readonly code: CanonErrorCode;
    /** Message d'erreur */
    readonly message: string;
    /** Détails additionnels */
    readonly details?: Record<string, unknown>;
}
/** Codes d'erreur du CANON */
export declare enum CanonErrorCode {
    INVALID_SUBJECT = "INVALID_SUBJECT",
    INVALID_PREDICATE = "INVALID_PREDICATE",
    INVALID_VALUE = "INVALID_VALUE",
    INVALID_TYPE = "INVALID_TYPE",
    INVALID_SOURCE = "INVALID_SOURCE",
    SUBJECT_TOO_LONG = "SUBJECT_TOO_LONG",
    PREDICATE_TOO_LONG = "PREDICATE_TOO_LONG",
    VALUE_TOO_LONG = "VALUE_TOO_LONG",
    MAX_FACTS_EXCEEDED = "MAX_FACTS_EXCEEDED",
    MAX_VERSIONS_EXCEEDED = "MAX_VERSIONS_EXCEEDED",
    FACT_NOT_FOUND = "FACT_NOT_FOUND",
    FACT_ALREADY_EXISTS = "FACT_ALREADY_EXISTS",
    FACT_ARCHIVED = "FACT_ARCHIVED",
    FACT_DELETED = "FACT_DELETED",
    CONFLICT_UNRESOLVED = "CONFLICT_UNRESOLVED",
    HASH_MISMATCH = "HASH_MISMATCH",
    CHAIN_BROKEN = "CHAIN_BROKEN",
    SNAPSHOT_INVALID = "SNAPSHOT_INVALID",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
/** Format d'export du CANON */
export interface CanonExport {
    /** Magic number pour validation */
    readonly magic: string;
    /** Version du format */
    readonly version: string;
    /** Timestamp d'export */
    readonly exportedAt: string;
    /** Snapshot au moment de l'export */
    readonly snapshot: CanonSnapshot;
    /** Tous les facts */
    readonly facts: readonly Fact[];
    /** Historique d'audit */
    readonly auditTrail: readonly AuditEntry[];
    /** Hash de l'export complet */
    readonly exportHash: string;
}
//# sourceMappingURL=types.d.ts.map