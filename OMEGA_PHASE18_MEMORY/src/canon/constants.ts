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
export enum FactType {
  /** Fait concernant un personnage */
  CHARACTER = 'CHARACTER',
  /** Fait concernant un lieu */
  LOCATION = 'LOCATION',
  /** Fait concernant un objet */
  OBJECT = 'OBJECT',
  /** Fait concernant un événement */
  EVENT = 'EVENT',
  /** Fait concernant une relation */
  RELATION = 'RELATION',
  /** Fait concernant une règle du monde */
  WORLD_RULE = 'WORLD_RULE',
  /** Fait temporel (date, durée) */
  TEMPORAL = 'TEMPORAL',
  /** Métadonnée */
  META = 'META',
}

// ═══════════════════════════════════════════════════════════════════════════════
// SOURCE TYPES & PRIORITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Source d'un fait — détermine la priorité */
export enum FactSource {
  /** Défini explicitement par l'utilisateur (priorité MAX) */
  USER = 'USER',
  /** Extrait du texte original */
  TEXT = 'TEXT',
  /** Importé depuis une source externe */
  IMPORTED = 'IMPORTED',
  /** Inféré par le système (priorité MIN) */
  INFERRED = 'INFERRED',
}

/**
 * Priorité des sources (plus haut = plus prioritaire)
 * INV-MEM-01: USER > TEXT > IMPORTED > INFERRED
 */
export const SOURCE_PRIORITY: Record<FactSource, number> = {
  [FactSource.USER]: 1000,
  [FactSource.TEXT]: 100,
  [FactSource.IMPORTED]: 10,
  [FactSource.INFERRED]: 1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FACT STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/** Statut d'un fait */
export enum FactStatus {
  /** Fait actif et valide */
  ACTIVE = 'ACTIVE',
  /** Fait archivé (remplacé par une version plus récente) */
  ARCHIVED = 'ARCHIVED',
  /** Fait marqué comme supprimé (soft delete) */
  DELETED = 'DELETED',
  /** Fait en conflit nécessitant résolution */
  CONFLICTED = 'CONFLICTED',
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIDENCE LEVELS
// ═══════════════════════════════════════════════════════════════════════════════

/** Niveau de confiance d'un fait */
export enum ConfidenceLevel {
  /** Certitude absolue (ex: défini par USER) */
  ABSOLUTE = 'ABSOLUTE',
  /** Haute confiance (ex: extrait du texte) */
  HIGH = 'HIGH',
  /** Confiance moyenne (ex: importé) */
  MEDIUM = 'MEDIUM',
  /** Basse confiance (ex: inféré) */
  LOW = 'LOW',
  /** Incertain (nécessite validation) */
  UNCERTAIN = 'UNCERTAIN',
}

/** Mapping source → confidence par défaut */
export const DEFAULT_CONFIDENCE: Record<FactSource, ConfidenceLevel> = {
  [FactSource.USER]: ConfidenceLevel.ABSOLUTE,
  [FactSource.TEXT]: ConfidenceLevel.HIGH,
  [FactSource.IMPORTED]: ConfidenceLevel.MEDIUM,
  [FactSource.INFERRED]: ConfidenceLevel.LOW,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Type de conflit détecté */
export enum ConflictType {
  /** Même sujet+prédicat, valeurs différentes */
  VALUE_MISMATCH = 'VALUE_MISMATCH',
  /** Même sujet+prédicat, sources différentes de même priorité */
  SOURCE_CONFLICT = 'SOURCE_CONFLICT',
  /** Contradiction temporelle */
  TEMPORAL_CONFLICT = 'TEMPORAL_CONFLICT',
  /** Contradiction logique */
  LOGICAL_CONFLICT = 'LOGICAL_CONFLICT',
}

/** Résolution de conflit */
export enum ConflictResolution {
  /** Priorité de source appliquée automatiquement */
  AUTO_PRIORITY = 'AUTO_PRIORITY',
  /** Utilisateur a choisi */
  USER_CHOICE = 'USER_CHOICE',
  /** Les deux coexistent */
  COEXIST = 'COEXIST',
  /** En attente de résolution */
  PENDING = 'PENDING',
}

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
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HASH CONFIG
// ═══════════════════════════════════════════════════════════════════════════════

/** Configuration du hashing */
export const HASH_CONFIG = {
  /** Algorithme utilisé */
  ALGORITHM: 'SHA-256',
  /** Encodage de sortie */
  ENCODING: 'hex' as const,
  /** Hash de genèse (premier fact) */
  GENESIS_HASH: '0000000000000000000000000000000000000000000000000000000000000000',
} as const;
