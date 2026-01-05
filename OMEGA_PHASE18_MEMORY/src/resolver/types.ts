/**
 * OMEGA CONFLICT_RESOLVER — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */

import {
  ConflictCategory,
  ConflictSeverity,
  ConflictStatus,
  ResolutionStrategy,
  ConflictFlag,
} from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFLICT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Partie impliquée dans un conflit */
export interface ConflictParty {
  /** ID de l'entité (fact, element, etc.) */
  readonly entityId: string;
  /** Type d'entité */
  readonly entityType: string;
  /** Valeur concernée */
  readonly value: string;
  /** Source de la valeur */
  readonly source: string;
  /** Priorité de la source */
  readonly priority: number;
  /** Contexte additionnel */
  readonly context?: Record<string, unknown>;
}

/** Un conflit détecté */
export interface Conflict {
  /** ID unique du conflit */
  readonly id: string;
  /** Catégorie du conflit */
  readonly category: ConflictCategory;
  /** Sévérité */
  readonly severity: ConflictSeverity;
  /** Statut actuel */
  readonly status: ConflictStatus;
  /** Première partie */
  readonly partyA: ConflictParty;
  /** Seconde partie */
  readonly partyB: ConflictParty;
  /** Description du conflit */
  readonly description: string;
  /** Flags */
  readonly flags: readonly ConflictFlag[];
  /** Stratégie de résolution appliquée */
  readonly resolution?: ConflictResolution;
  /** Métadonnées */
  readonly metadata: ConflictMetadata;
}

/** Métadonnées d'un conflit */
export interface ConflictMetadata {
  /** Timestamp de détection */
  readonly detectedAt: string;
  /** Timestamp de résolution */
  readonly resolvedAt?: string;
  /** Détecté par */
  readonly detectedBy: string;
  /** Résolu par */
  readonly resolvedBy?: string;
  /** Liens vers d'autres conflits */
  readonly linkedConflicts?: readonly string[];
  /** Notes */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESOLUTION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Résolution d'un conflit */
export interface ConflictResolution {
  /** Stratégie utilisée */
  readonly strategy: ResolutionStrategy;
  /** Partie gagnante (si applicable) */
  readonly winner?: 'A' | 'B' | 'BOTH' | 'NEITHER';
  /** Valeur finale */
  readonly finalValue?: string;
  /** Raison de la résolution */
  readonly reason: string;
  /** Résolu automatiquement */
  readonly isAutomatic: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Input pour détecter un conflit */
export interface DetectConflictInput {
  /** Catégorie présumée */
  readonly category: ConflictCategory;
  /** Première partie */
  readonly partyA: ConflictParty;
  /** Seconde partie */
  readonly partyB: ConflictParty;
  /** Description */
  readonly description?: string;
  /** Sévérité initiale */
  readonly severity?: ConflictSeverity;
  /** Détecté par */
  readonly detectedBy?: string;
}

/** Input pour résoudre un conflit */
export interface ResolveConflictInput {
  /** Stratégie de résolution */
  readonly strategy: ResolutionStrategy;
  /** Partie gagnante */
  readonly winner?: 'A' | 'B' | 'BOTH' | 'NEITHER';
  /** Valeur personnalisée (pour CUSTOM/MERGE) */
  readonly customValue?: string;
  /** Raison */
  readonly reason?: string;
  /** Résolu par */
  readonly resolvedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Filtre pour requêter les conflits */
export interface ConflictFilter {
  /** Filtrer par catégorie */
  readonly category?: ConflictCategory;
  /** Filtrer par sévérité minimum */
  readonly minSeverity?: ConflictSeverity;
  /** Filtrer par statut */
  readonly status?: ConflictStatus;
  /** Filtrer par entity ID */
  readonly entityId?: string;
  /** Filtrer par flag */
  readonly flag?: ConflictFlag;
  /** Détecté après */
  readonly detectedAfter?: string;
  /** Limite */
  readonly limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Résultat d'une opération */
export type ResolverResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ResolverError };

/** Erreur */
export interface ResolverError {
  readonly code: ResolverErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/** Codes d'erreur */
export enum ResolverErrorCode {
  // Validation
  INVALID_CATEGORY = 'INVALID_CATEGORY',
  INVALID_PARTY = 'INVALID_PARTY',
  INVALID_STRATEGY = 'INVALID_STRATEGY',
  
  // Conflict errors
  CONFLICT_NOT_FOUND = 'CONFLICT_NOT_FOUND',
  CONFLICT_ALREADY_RESOLVED = 'CONFLICT_ALREADY_RESOLVED',
  MAX_CONFLICTS_EXCEEDED = 'MAX_CONFLICTS_EXCEEDED',
  
  // Resolution errors
  CANNOT_AUTO_RESOLVE = 'CANNOT_AUTO_RESOLVE',
  REQUIRES_USER_INPUT = 'REQUIRES_USER_INPUT',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUDIT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Entry dans l'audit trail */
export interface ResolutionAuditEntry {
  /** ID unique */
  readonly id: string;
  /** ID du conflit */
  readonly conflictId: string;
  /** Action */
  readonly action: 'DETECTED' | 'RESOLVED' | 'IGNORED' | 'DEFERRED' | 'ESCALATED';
  /** Acteur */
  readonly actor: string;
  /** Timestamp */
  readonly timestamp: string;
  /** Détails */
  readonly details?: Record<string, unknown>;
  /** Hash */
  readonly hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Métriques du resolver */
export interface ResolverMetrics {
  /** Total de conflits détectés */
  readonly totalDetected: number;
  /** Total résolus */
  readonly totalResolved: number;
  /** Total en attente */
  readonly totalPending: number;
  /** Total ignorés */
  readonly totalIgnored: number;
  /** Par catégorie */
  readonly byCategory: Record<ConflictCategory, number>;
  /** Par sévérité */
  readonly bySeverity: Record<ConflictSeverity, number>;
  /** Par statut */
  readonly byStatus: Record<ConflictStatus, number>;
  /** Temps moyen de résolution (ms) */
  readonly avgResolutionTimeMs: number;
  /** Taux de résolution automatique */
  readonly autoResolutionRate: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LISTENER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Événement de conflit */
export interface ConflictEvent {
  /** Type d'événement */
  readonly type: 'DETECTED' | 'RESOLVED' | 'ESCALATED';
  /** Conflit concerné */
  readonly conflict: Conflict;
  /** Timestamp */
  readonly timestamp: string;
}

/** Listener */
export type ConflictListener = (event: ConflictEvent) => void;
