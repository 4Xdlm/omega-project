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
export enum ConflictCategory {
  /** Valeurs contradictoires pour le même attribut */
  VALUE_CONTRADICTION = 'VALUE_CONTRADICTION',
  /** Incohérence temporelle (ex: mort avant naissance) */
  TEMPORAL_INCONSISTENCY = 'TEMPORAL_INCONSISTENCY',
  /** Incohérence spatiale (ex: en deux lieux simultanément) */
  SPATIAL_INCONSISTENCY = 'SPATIAL_INCONSISTENCY',
  /** Contradiction logique (ex: A implique B mais non-B) */
  LOGICAL_CONTRADICTION = 'LOGICAL_CONTRADICTION',
  /** Conflit de source (deux sources de même priorité) */
  SOURCE_CONFLICT = 'SOURCE_CONFLICT',
  /** Attribut manquant requis */
  MISSING_REQUIRED = 'MISSING_REQUIRED',
  /** Référence circulaire */
  CIRCULAR_REFERENCE = 'CIRCULAR_REFERENCE',
  /** Autre */
  OTHER = 'OTHER',
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT SEVERITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Sévérité d'un conflit */
export enum ConflictSeverity {
  /** Information seulement */
  INFO = 'INFO',
  /** Avertissement (non bloquant) */
  WARNING = 'WARNING',
  /** Erreur (doit être résolu) */
  ERROR = 'ERROR',
  /** Critique (bloque toute opération) */
  CRITICAL = 'CRITICAL',
}

/** Valeurs numériques de sévérité */
export const SEVERITY_VALUES: Record<ConflictSeverity, number> = {
  [ConflictSeverity.INFO]: 1,
  [ConflictSeverity.WARNING]: 10,
  [ConflictSeverity.ERROR]: 100,
  [ConflictSeverity.CRITICAL]: 1000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT STATUS
// ═══════════════════════════════════════════════════════════════════════════════

/** Statut d'un conflit */
export enum ConflictStatus {
  /** Détecté, en attente de résolution */
  PENDING = 'PENDING',
  /** En cours de revue */
  REVIEWING = 'REVIEWING',
  /** Résolu par l'utilisateur */
  RESOLVED_BY_USER = 'RESOLVED_BY_USER',
  /** Résolu automatiquement (priorité de source) */
  RESOLVED_AUTO = 'RESOLVED_AUTO',
  /** Ignoré volontairement */
  IGNORED = 'IGNORED',
  /** Reporté pour plus tard */
  DEFERRED = 'DEFERRED',
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION STRATEGIES
// ═══════════════════════════════════════════════════════════════════════════════

/** Stratégies de résolution */
export enum ResolutionStrategy {
  /** Garder la valeur existante */
  KEEP_EXISTING = 'KEEP_EXISTING',
  /** Utiliser la nouvelle valeur */
  USE_NEW = 'USE_NEW',
  /** Fusionner les valeurs */
  MERGE = 'MERGE',
  /** Garder les deux (coexistence) */
  COEXIST = 'COEXIST',
  /** Appliquer la priorité de source */
  APPLY_PRIORITY = 'APPLY_PRIORITY',
  /** Personnalisé */
  CUSTOM = 'CUSTOM',
}

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
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FLAGS
// ═══════════════════════════════════════════════════════════════════════════════

/** Flags pour le traitement des conflits */
export enum ConflictFlag {
  /** Nécessite attention utilisateur */
  REQUIRES_USER_ATTENTION = 'REQUIRES_USER_ATTENTION',
  /** Peut être résolu automatiquement */
  AUTO_RESOLVABLE = 'AUTO_RESOLVABLE',
  /** Lié à un autre conflit */
  LINKED = 'LINKED',
  /** Récurrent (déjà vu) */
  RECURRING = 'RECURRING',
  /** Urgent */
  URGENT = 'URGENT',
}
