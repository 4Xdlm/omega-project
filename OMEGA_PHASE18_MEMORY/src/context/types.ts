/**
 * OMEGA CONTEXT_ENGINE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */

import {
  ContextScope,
  ElementType,
  ElementState,
  PositionLevel,
} from './constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Position dans le texte */
export interface TextPosition {
  /** Partie (optionnel) */
  readonly part?: number;
  /** Chapitre (optionnel) */
  readonly chapter?: number;
  /** Scène (optionnel) */
  readonly scene?: number;
  /** Paragraphe */
  readonly paragraph: number;
  /** Phrase (optionnel) */
  readonly sentence?: number;
}

/** Comparateur de position */
export function comparePositions(a: TextPosition, b: TextPosition): number {
  if (a.part !== b.part) return (a.part ?? 0) - (b.part ?? 0);
  if (a.chapter !== b.chapter) return (a.chapter ?? 0) - (b.chapter ?? 0);
  if (a.scene !== b.scene) return (a.scene ?? 0) - (b.scene ?? 0);
  if (a.paragraph !== b.paragraph) return a.paragraph - b.paragraph;
  return (a.sentence ?? 0) - (b.sentence ?? 0);
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Élément actif dans le contexte */
export interface ContextElement {
  /** ID unique */
  readonly id: string;
  /** Référence à l'entité (ex: fact ID, character name) */
  readonly entityRef: string;
  /** Type d'élément */
  readonly type: ElementType;
  /** État actuel */
  readonly state: ElementState;
  /** Poids (0-1) */
  readonly weight: number;
  /** Scope de l'élément */
  readonly scope: ContextScope;
  /** Position d'entrée */
  readonly enteredAt: TextPosition;
  /** Position de sortie (si EXITED) */
  readonly exitedAt?: TextPosition;
  /** Métadonnées */
  readonly metadata: ElementMetadata;
}

/** Métadonnées d'un élément */
export interface ElementMetadata {
  /** Timestamp de création */
  readonly createdAt: string;
  /** Timestamp de mise à jour */
  readonly updatedAt: string;
  /** Rôle dans la scène (optionnel) */
  readonly role?: string;
  /** Notes */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Input pour ajouter un élément */
export interface AddElementInput {
  /** Référence à l'entité */
  readonly entityRef: string;
  /** Type d'élément */
  readonly type: ElementType;
  /** État initial (default: ACTIVE) */
  readonly state?: ElementState;
  /** Poids initial (default: selon état) */
  readonly weight?: number;
  /** Scope (default: LOCAL) */
  readonly scope?: ContextScope;
  /** Rôle dans la scène */
  readonly role?: string;
  /** Notes */
  readonly notes?: string;
}

/** Input pour mettre à jour un élément */
export interface UpdateElementInput {
  /** Nouvel état */
  readonly state?: ElementState;
  /** Nouveau poids */
  readonly weight?: number;
  /** Nouveau scope */
  readonly scope?: ContextScope;
  /** Notes */
  readonly notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT STATE
// ═══════════════════════════════════════════════════════════════════════════════

/** État complet du contexte */
export interface ContextState {
  /** ID unique */
  readonly id: string;
  /** Position actuelle */
  readonly position: TextPosition;
  /** Éléments actifs par scope */
  readonly elements: ReadonlyMap<string, ContextElement>;
  /** Timestamp */
  readonly timestamp: string;
  /** Hash de l'état */
  readonly hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SNAPSHOT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Snapshot immutable du contexte */
export interface ContextSnapshot {
  /** ID unique */
  readonly id: string;
  /** Position au moment du snapshot */
  readonly position: TextPosition;
  /** Tous les éléments */
  readonly elements: readonly ContextElement[];
  /** Timestamp */
  readonly timestamp: string;
  /** Label (optionnel) */
  readonly label?: string;
  /** Hash */
  readonly hash: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HISTORY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Entry dans l'historique */
export interface HistoryEntry {
  /** ID unique */
  readonly id: string;
  /** Position */
  readonly position: TextPosition;
  /** Action effectuée */
  readonly action: ContextAction;
  /** Element concerné (si applicable) */
  readonly elementId?: string;
  /** État avant */
  readonly stateBefore?: string;
  /** État après */
  readonly stateAfter?: string;
  /** Timestamp */
  readonly timestamp: string;
}

/** Actions possibles sur le contexte */
export enum ContextAction {
  MOVE = 'MOVE',
  ADD_ELEMENT = 'ADD_ELEMENT',
  UPDATE_ELEMENT = 'UPDATE_ELEMENT',
  REMOVE_ELEMENT = 'REMOVE_ELEMENT',
  DECAY = 'DECAY',
  SNAPSHOT = 'SNAPSHOT',
  ROLLBACK = 'ROLLBACK',
}

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Filtre pour requêter les éléments */
export interface ElementFilter {
  /** Filtrer par type */
  readonly type?: ElementType;
  /** Filtrer par état */
  readonly state?: ElementState;
  /** Filtrer par scope */
  readonly scope?: ContextScope;
  /** Filtrer par poids minimum */
  readonly minWeight?: number;
  /** Filtrer par entity ref pattern */
  readonly entityRefPattern?: string;
  /** Limite */
  readonly limit?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESULT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Résultat d'une opération */
export type ContextResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ContextError };

/** Erreur de contexte */
export interface ContextError {
  readonly code: ContextErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
}

/** Codes d'erreur */
export enum ContextErrorCode {
  // Validation
  INVALID_POSITION = 'INVALID_POSITION',
  INVALID_ELEMENT = 'INVALID_ELEMENT',
  INVALID_SCOPE = 'INVALID_SCOPE',
  
  // Element errors
  ELEMENT_NOT_FOUND = 'ELEMENT_NOT_FOUND',
  ELEMENT_ALREADY_EXISTS = 'ELEMENT_ALREADY_EXISTS',
  MAX_ELEMENTS_EXCEEDED = 'MAX_ELEMENTS_EXCEEDED',
  
  // History errors
  HISTORY_EMPTY = 'HISTORY_EMPTY',
  SNAPSHOT_NOT_FOUND = 'SNAPSHOT_NOT_FOUND',
  MAX_SNAPSHOTS_EXCEEDED = 'MAX_SNAPSHOTS_EXCEEDED',
  
  // System
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ═══════════════════════════════════════════════════════════════════════════════
// METRICS TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Métriques du contexte */
export interface ContextMetrics {
  /** Position actuelle */
  readonly currentPosition: TextPosition;
  /** Nombre d'éléments par état */
  readonly elementsByState: Record<ElementState, number>;
  /** Nombre d'éléments par type */
  readonly elementsByType: Record<ElementType, number>;
  /** Nombre d'éléments par scope */
  readonly elementsByScope: Record<ContextScope, number>;
  /** Taille de l'historique */
  readonly historySize: number;
  /** Nombre de snapshots */
  readonly snapshotCount: number;
  /** Poids moyen des éléments actifs */
  readonly avgActiveWeight: number;
}
