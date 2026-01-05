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
export var IntentState;
(function (IntentState) {
    /** Aucun intent actif */
    IntentState["IDLE"] = "IDLE";
    /** Intent créé, en attente de verrouillage */
    IntentState["PENDING"] = "PENDING";
    /** Intent verrouillé, prêt à exécuter */
    IntentState["LOCKED"] = "LOCKED";
    /** Intent en cours d'exécution */
    IntentState["EXECUTING"] = "EXECUTING";
    /** Intent terminé avec succès */
    IntentState["COMPLETE"] = "COMPLETE";
    /** Intent échoué */
    IntentState["FAILED"] = "FAILED";
})(IntentState || (IntentState = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// INTENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/** Types d'intent supportés */
export var IntentType;
(function (IntentType) {
    /** Création d'un élément */
    IntentType["CREATE"] = "CREATE";
    /** Modification d'un élément */
    IntentType["UPDATE"] = "UPDATE";
    /** Suppression d'un élément */
    IntentType["DELETE"] = "DELETE";
    /** Lecture/requête */
    IntentType["QUERY"] = "QUERY";
    /** Action composite (plusieurs opérations) */
    IntentType["COMPOSITE"] = "COMPOSITE";
    /** Action personnalisée */
    IntentType["CUSTOM"] = "CUSTOM";
})(IntentType || (IntentType = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// INTENT PRIORITY
// ═══════════════════════════════════════════════════════════════════════════════
/** Priorité d'un intent */
export var IntentPriority;
(function (IntentPriority) {
    /** Priorité basse (background) */
    IntentPriority["LOW"] = "LOW";
    /** Priorité normale */
    IntentPriority["NORMAL"] = "NORMAL";
    /** Priorité haute */
    IntentPriority["HIGH"] = "HIGH";
    /** Priorité critique (immédiate) */
    IntentPriority["CRITICAL"] = "CRITICAL";
})(IntentPriority || (IntentPriority = {}));
/** Valeurs numériques des priorités */
export const PRIORITY_VALUES = {
    [IntentPriority.LOW]: 1,
    [IntentPriority.NORMAL]: 10,
    [IntentPriority.HIGH]: 100,
    [IntentPriority.CRITICAL]: 1000,
};
// ═══════════════════════════════════════════════════════════════════════════════
// TRANSITIONS VALIDES
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Transitions valides entre états
 * INV-MEM-02: Chaque état a des transitions strictement définies
 */
export const VALID_TRANSITIONS = {
    [IntentState.IDLE]: [IntentState.PENDING],
    [IntentState.PENDING]: [IntentState.LOCKED, IntentState.IDLE], // Can cancel
    [IntentState.LOCKED]: [IntentState.EXECUTING, IntentState.IDLE], // Can cancel
    [IntentState.EXECUTING]: [IntentState.COMPLETE, IntentState.FAILED],
    [IntentState.COMPLETE]: [IntentState.IDLE], // Can reset
    [IntentState.FAILED]: [IntentState.IDLE, IntentState.PENDING], // Can retry
};
// ═══════════════════════════════════════════════════════════════════════════════
// ACTIONS
// ═══════════════════════════════════════════════════════════════════════════════
/** Actions disponibles sur la machine d'état */
export var IntentAction;
(function (IntentAction) {
    IntentAction["CREATE"] = "CREATE";
    IntentAction["LOCK"] = "LOCK";
    IntentAction["EXECUTE"] = "EXECUTE";
    IntentAction["COMPLETE"] = "COMPLETE";
    IntentAction["FAIL"] = "FAIL";
    IntentAction["CANCEL"] = "CANCEL";
    IntentAction["RESET"] = "RESET";
    IntentAction["RETRY"] = "RETRY";
})(IntentAction || (IntentAction = {}));
/**
 * Mapping action → transition d'état
 */
export const ACTION_TRANSITIONS = {
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
};
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
};
// ═══════════════════════════════════════════════════════════════════════════════
// FAILURE CODES
// ═══════════════════════════════════════════════════════════════════════════════
/** Codes d'échec pour les intents */
export var IntentFailureCode;
(function (IntentFailureCode) {
    /** Timeout dépassé */
    IntentFailureCode["TIMEOUT"] = "TIMEOUT";
    /** Validation échouée */
    IntentFailureCode["VALIDATION_FAILED"] = "VALIDATION_FAILED";
    /** Conflit avec un autre intent */
    IntentFailureCode["CONFLICT"] = "CONFLICT";
    /** Ressource non trouvée */
    IntentFailureCode["NOT_FOUND"] = "NOT_FOUND";
    /** Erreur système */
    IntentFailureCode["SYSTEM_ERROR"] = "SYSTEM_ERROR";
    /** Annulé par l'utilisateur */
    IntentFailureCode["CANCELLED"] = "CANCELLED";
    /** Erreur inconnue */
    IntentFailureCode["UNKNOWN"] = "UNKNOWN";
})(IntentFailureCode || (IntentFailureCode = {}));
//# sourceMappingURL=constants.js.map