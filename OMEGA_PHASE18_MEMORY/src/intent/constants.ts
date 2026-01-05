/**
 * OMEGA INTENT_MACHINE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 * 
 * INV-MEM-02: Intent jamais ambigu
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VERSION
// ═══════════════════════════════════════════════════════════════════════════════

export const INTENT_VERSION = '3.18.0';

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT STATES (6 états formels)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * États possibles d'un intent
 * 
 * State machine formelle:
 * 
 *     ┌──────────┐
 *     │   IDLE   │ ◄───────────────────────────────┐
 *     └────┬─────┘                                 │
 *          │ create()                              │
 *          ▼                                       │
 *     ┌──────────┐                                 │
 *     │ PENDING  │                                 │
 *     └────┬─────┘                                 │
 *          │ lock()                                │ reset()
 *          ▼                                       │
 *     ┌──────────┐                                 │
 *     │  LOCKED  │                                 │
 *     └────┬─────┘                                 │
 *          │ execute()                             │
 *          ▼                                       │
 *     ┌──────────┐                                 │
 *     │EXECUTING │                                 │
 *     └────┬─────┘                                 │
 *          │ complete() / fail()                   │
 *          ▼                                       │
 *     ┌──────────┐      ┌──────────┐              │
 *     │ COMPLETE │      │  FAILED  │──────────────┘
 *     └──────────┘      └──────────┘
 */
export enum IntentState {
  /** Aucun intent actif */
  IDLE = 'IDLE',
  /** Intent créé, en attente de verrouillage */
  PENDING = 'PENDING',
  /** Intent verrouillé, prêt à exécuter */
  LOCKED = 'LOCKED',
  /** Intent en cours d'exécution */
  EXECUTING = 'EXECUTING',
  /** Intent terminé avec succès */
  COMPLETE = 'COMPLETE',
  /** Intent échoué */
  FAILED = 'FAILED',
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Types d'intent supportés */
export enum IntentType {
  /** Création d'un élément */
  CREATE = 'CREATE',
  /** Modification d'un élément */
  UPDATE = 'UPDATE',
  /** Suppression d'un élément */
  DELETE = 'DELETE',
  /** Lecture/requête */
  QUERY = 'QUERY',
  /** Action composite (plusieurs opérations) */
  COMPOSITE = 'COMPOSITE',
  /** Action personnalisée */
  CUSTOM = 'CUSTOM',
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTENT PRIORITY
// ═══════════════════════════════════════════════════════════════════════════════

/** Priorité d'un intent */
export enum IntentPriority {
  /** Priorité basse (background) */
  LOW = 'LOW',
  /** Priorité normale */
  NORMAL = 'NORMAL',
  /** Priorité haute */
  HIGH = 'HIGH',
  /** Priorité critique (immédiate) */
  CRITICAL = 'CRITICAL',
}

/** Valeurs numériques des priorités */
export const PRIORITY_VALUES: Record<IntentPriority, number> = {
  [IntentPriority.LOW]: 1,
  [IntentPriority.NORMAL]: 10,
  [IntentPriority.HIGH]: 100,
  [IntentPriority.CRITICAL]: 1000,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITIONS VALIDES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Transitions valides entre états
 * INV-MEM-02: Chaque état a des transitions strictement définies
 */
export const VALID_TRANSITIONS: Record<IntentState, readonly IntentState[]> = {
  [IntentState.IDLE]: [IntentState.PENDING],
  [IntentState.PENDING]: [IntentState.LOCKED, IntentState.IDLE], // Can cancel
  [IntentState.LOCKED]: [IntentState.EXECUTING, IntentState.IDLE], // Can cancel
  [IntentState.EXECUTING]: [IntentState.COMPLETE, IntentState.FAILED],
  [IntentState.COMPLETE]: [IntentState.IDLE], // Can reset
  [IntentState.FAILED]: [IntentState.IDLE, IntentState.PENDING], // Can retry
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/** Actions disponibles sur la machine d'état */
export enum IntentAction {
  CREATE = 'CREATE',
  LOCK = 'LOCK',
  EXECUTE = 'EXECUTE',
  COMPLETE = 'COMPLETE',
  FAIL = 'FAIL',
  CANCEL = 'CANCEL',
  RESET = 'RESET',
  RETRY = 'RETRY',
}

/**
 * Mapping action → transition d'état
 */
export const ACTION_TRANSITIONS: Record<IntentAction, { from: IntentState[]; to: IntentState }> = {
  [IntentAction.CREATE]: {
    from: [IntentState.IDLE],
    to: IntentState.PENDING,
  },
  [IntentAction.LOCK]: {
    from: [IntentState.PENDING],
    to: IntentState.LOCKED,
  },
  [IntentAction.EXECUTE]: {
    from: [IntentState.LOCKED],
    to: IntentState.EXECUTING,
  },
  [IntentAction.COMPLETE]: {
    from: [IntentState.EXECUTING],
    to: IntentState.COMPLETE,
  },
  [IntentAction.FAIL]: {
    from: [IntentState.EXECUTING],
    to: IntentState.FAILED,
  },
  [IntentAction.CANCEL]: {
    from: [IntentState.PENDING, IntentState.LOCKED],
    to: IntentState.IDLE,
  },
  [IntentAction.RESET]: {
    from: [IntentState.COMPLETE, IntentState.FAILED],
    to: IntentState.IDLE,
  },
  [IntentAction.RETRY]: {
    from: [IntentState.FAILED],
    to: IntentState.PENDING,
  },
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// LIMITES
// ═══════════════════════════════════════════════════════════════════════════════

export const INTENT_LIMITS = {
  /** Durée max en PENDING avant timeout (ms) */
  PENDING_TIMEOUT_MS: 30000,
  /** Durée max en LOCKED avant timeout (ms) */
  LOCKED_TIMEOUT_MS: 60000,
  /** Durée max en EXECUTING avant timeout (ms) */
  EXECUTING_TIMEOUT_MS: 300000,
  /** Nombre max de retries */
  MAX_RETRIES: 3,
  /** Nombre max d'intents en queue */
  MAX_QUEUE_SIZE: 100,
  /** Taille max du payload (bytes) */
  MAX_PAYLOAD_SIZE: 1048576, // 1MB
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE CODES
// ═══════════════════════════════════════════════════════════════════════════════

/** Codes d'échec pour les intents */
export enum IntentFailureCode {
  /** Timeout dépassé */
  TIMEOUT = 'TIMEOUT',
  /** Validation échouée */
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  /** Conflit avec un autre intent */
  CONFLICT = 'CONFLICT',
  /** Ressource non trouvée */
  NOT_FOUND = 'NOT_FOUND',
  /** Erreur système */
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  /** Annulé par l'utilisateur */
  CANCELLED = 'CANCELLED',
  /** Erreur inconnue */
  UNKNOWN = 'UNKNOWN',
}
