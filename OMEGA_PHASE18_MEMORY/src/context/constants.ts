/**
 * OMEGA CONTEXT_ENGINE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * INV-MEM-03: Contexte jamais perdu
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTEXT_VERSION = '3.18.0';

// ═══════════════════════════════════════════════════════════════════════════════
// SCOPE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Portée du contexte */
export enum ContextScope {
  /** Contexte global (toute l'œuvre) */
  GLOBAL = 'GLOBAL',
  /** Contexte de partie/livre */
  PART = 'PART',
  /** Contexte de chapitre */
  CHAPTER = 'CHAPTER',
  /** Contexte de scène */
  SCENE = 'SCENE',
  /** Contexte local (paragraphe) */
  LOCAL = 'LOCAL',
}

/** Hiérarchie des scopes (plus haut = plus large) */
export const SCOPE_HIERARCHY: Record<ContextScope, number> = {
  [ContextScope.GLOBAL]: 100,
  [ContextScope.PART]: 80,
  [ContextScope.CHAPTER]: 60,
  [ContextScope.SCENE]: 40,
  [ContextScope.LOCAL]: 20,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Types d'éléments actifs dans le contexte */
export enum ElementType {
  /** Personnage */
  CHARACTER = 'CHARACTER',
  /** Lieu */
  LOCATION = 'LOCATION',
  /** Objet */
  OBJECT = 'OBJECT',
  /** Concept/Thème */
  CONCEPT = 'CONCEPT',
  /** Événement en cours */
  EVENT = 'EVENT',
  /** Relation active */
  RELATION = 'RELATION',
  /** Émotion dominante */
  EMOTION = 'EMOTION',
  /** Tension narrative */
  TENSION = 'TENSION',
}

// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT STATES
// ═══════════════════════════════════════════════════════════════════════════════

/** État d'un élément dans le contexte */
export enum ElementState {
  /** Élément actif et visible */
  ACTIVE = 'ACTIVE',
  /** Élément présent mais en arrière-plan */
  BACKGROUND = 'BACKGROUND',
  /** Élément mentionné mais pas présent */
  MENTIONED = 'MENTIONED',
  /** Élément implicite (déduit) */
  IMPLICIT = 'IMPLICIT',
  /** Élément sorti du contexte */
  EXITED = 'EXITED',
}

// ═══════════════════════════════════════════════════════════════════════════════
// POSITION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/** Niveau de position dans le texte */
export enum PositionLevel {
  PART = 'PART',
  CHAPTER = 'CHAPTER',
  SCENE = 'SCENE',
  PARAGRAPH = 'PARAGRAPH',
  SENTENCE = 'SENTENCE',
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITS
// ═══════════════════════════════════════════════════════════════════════════════

export const CONTEXT_LIMITS = {
  /** Nombre max d'éléments actifs par scope */
  MAX_ACTIVE_ELEMENTS_PER_SCOPE: 50,
  /** Nombre max de niveaux d'historique */
  MAX_HISTORY_DEPTH: 100,
  /** Nombre max de snapshots */
  MAX_SNAPSHOTS: 50,
  /** Durée de vie d'un élément IMPLICIT (en positions) */
  IMPLICIT_DECAY_POSITIONS: 10,
  /** Poids minimum pour rester ACTIVE */
  MIN_ACTIVE_WEIGHT: 0.1,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Poids par défaut selon l'état */
export const DEFAULT_WEIGHTS: Record<ElementState, number> = {
  [ElementState.ACTIVE]: 1.0,
  [ElementState.BACKGROUND]: 0.5,
  [ElementState.MENTIONED]: 0.3,
  [ElementState.IMPLICIT]: 0.1,
  [ElementState.EXITED]: 0.0,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// DECAY RATES
// ═══════════════════════════════════════════════════════════════════════════════

/** Taux de décroissance par scope */
export const DECAY_RATES: Record<ContextScope, number> = {
  [ContextScope.GLOBAL]: 0.0,    // Ne décroît jamais
  [ContextScope.PART]: 0.01,    // Décroît très lentement
  [ContextScope.CHAPTER]: 0.05,  // Décroît lentement
  [ContextScope.SCENE]: 0.1,     // Décroît modérément
  [ContextScope.LOCAL]: 0.3,     // Décroît rapidement
} as const;
