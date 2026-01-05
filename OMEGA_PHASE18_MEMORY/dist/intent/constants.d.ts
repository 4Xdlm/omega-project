/**
 * OMEGA INTENT_MACHINE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-02: Intent jamais ambigu
 */
export declare const INTENT_VERSION = "3.18.0";
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
export declare enum IntentState {
    /** Aucun intent actif */
    IDLE = "IDLE",
    /** Intent créé, en attente de verrouillage */
    PENDING = "PENDING",
    /** Intent verrouillé, prêt à exécuter */
    LOCKED = "LOCKED",
    /** Intent en cours d'exécution */
    EXECUTING = "EXECUTING",
    /** Intent terminé avec succès */
    COMPLETE = "COMPLETE",
    /** Intent échoué */
    FAILED = "FAILED"
}
/** Types d'intent supportés */
export declare enum IntentType {
    /** Création d'un élément */
    CREATE = "CREATE",
    /** Modification d'un élément */
    UPDATE = "UPDATE",
    /** Suppression d'un élément */
    DELETE = "DELETE",
    /** Lecture/requête */
    QUERY = "QUERY",
    /** Action composite (plusieurs opérations) */
    COMPOSITE = "COMPOSITE",
    /** Action personnalisée */
    CUSTOM = "CUSTOM"
}
/** Priorité d'un intent */
export declare enum IntentPriority {
    /** Priorité basse (background) */
    LOW = "LOW",
    /** Priorité normale */
    NORMAL = "NORMAL",
    /** Priorité haute */
    HIGH = "HIGH",
    /** Priorité critique (immédiate) */
    CRITICAL = "CRITICAL"
}
/** Valeurs numériques des priorités */
export declare const PRIORITY_VALUES: Record<IntentPriority, number>;
/**
 * Transitions valides entre états
 * INV-MEM-02: Chaque état a des transitions strictement définies
 */
export declare const VALID_TRANSITIONS: Record<IntentState, readonly IntentState[]>;
/** Actions disponibles sur la machine d'état */
export declare enum IntentAction {
    CREATE = "CREATE",
    LOCK = "LOCK",
    EXECUTE = "EXECUTE",
    COMPLETE = "COMPLETE",
    FAIL = "FAIL",
    CANCEL = "CANCEL",
    RESET = "RESET",
    RETRY = "RETRY"
}
/**
 * Mapping action → transition d'état
 */
export declare const ACTION_TRANSITIONS: Record<IntentAction, {
    from: IntentState[];
    to: IntentState;
}>;
export declare const INTENT_LIMITS: {
    /** Durée max en PENDING avant timeout (ms) */
    readonly PENDING_TIMEOUT_MS: 30000;
    /** Durée max en LOCKED avant timeout (ms) */
    readonly LOCKED_TIMEOUT_MS: 60000;
    /** Durée max en EXECUTING avant timeout (ms) */
    readonly EXECUTING_TIMEOUT_MS: 300000;
    /** Nombre max de retries */
    readonly MAX_RETRIES: 3;
    /** Nombre max d'intents en queue */
    readonly MAX_QUEUE_SIZE: 100;
    /** Taille max du payload (bytes) */
    readonly MAX_PAYLOAD_SIZE: 1048576;
};
/** Codes d'échec pour les intents */
export declare enum IntentFailureCode {
    /** Timeout dépassé */
    TIMEOUT = "TIMEOUT",
    /** Validation échouée */
    VALIDATION_FAILED = "VALIDATION_FAILED",
    /** Conflit avec un autre intent */
    CONFLICT = "CONFLICT",
    /** Ressource non trouvée */
    NOT_FOUND = "NOT_FOUND",
    /** Erreur système */
    SYSTEM_ERROR = "SYSTEM_ERROR",
    /** Annulé par l'utilisateur */
    CANCELLED = "CANCELLED",
    /** Erreur inconnue */
    UNKNOWN = "UNKNOWN"
}
//# sourceMappingURL=constants.d.ts.map