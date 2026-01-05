/**
 * OMEGA INTENT_MACHINE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
import { IntentState, IntentType, IntentPriority, IntentAction, IntentFailureCode } from './constants.js';
/** Métadonnées d'un intent */
export interface IntentMetadata {
    /** Timestamp de création */
    readonly createdAt: string;
    /** Timestamp de dernière mise à jour */
    readonly updatedAt: string;
    /** Créateur de l'intent */
    readonly createdBy: string;
    /** Contexte source (optionnel) */
    readonly contextId?: string;
    /** Tags */
    readonly tags?: readonly string[];
}
/** Payload d'un intent */
export interface IntentPayload {
    /** Type de cible */
    readonly targetType?: string;
    /** ID de la cible */
    readonly targetId?: string;
    /** Données de l'action */
    readonly data?: Record<string, unknown>;
    /** Paramètres additionnels */
    readonly params?: Record<string, unknown>;
}
/** Un intent IMMUTABLE */
export interface Intent {
    /** ID unique */
    readonly id: string;
    /** Type d'intent */
    readonly type: IntentType;
    /** État actuel */
    readonly state: IntentState;
    /** Priorité */
    readonly priority: IntentPriority;
    /** Description lisible */
    readonly description: string;
    /** Payload de l'action */
    readonly payload: IntentPayload;
    /** Nombre de retries effectués */
    readonly retryCount: number;
    /** Code d'échec (si failed) */
    readonly failureCode?: IntentFailureCode;
    /** Message d'échec (si failed) */
    readonly failureMessage?: string;
    /** Résultat (si complete) */
    readonly result?: unknown;
    /** Métadonnées */
    readonly metadata: IntentMetadata;
    /** Hash de l'intent */
    readonly hash: string;
}
/** Input pour créer un intent */
export interface CreateIntentInput {
    /** Type d'intent */
    readonly type: IntentType;
    /** Priorité (default: NORMAL) */
    readonly priority?: IntentPriority;
    /** Description lisible */
    readonly description: string;
    /** Payload de l'action */
    readonly payload?: IntentPayload;
    /** Créateur */
    readonly createdBy?: string;
    /** Contexte source */
    readonly contextId?: string;
    /** Tags */
    readonly tags?: readonly string[];
}
/** Options pour compléter un intent */
export interface CompleteIntentOptions {
    /** Résultat de l'exécution */
    readonly result?: unknown;
}
/** Options pour échouer un intent */
export interface FailIntentOptions {
    /** Code d'échec */
    readonly code: IntentFailureCode;
    /** Message d'erreur */
    readonly message?: string;
}
/** Transition d'état */
export interface StateTransition {
    /** État source */
    readonly from: IntentState;
    /** État destination */
    readonly to: IntentState;
    /** Action qui a causé la transition */
    readonly action: IntentAction;
    /** Timestamp */
    readonly timestamp: string;
    /** Acteur */
    readonly actor: string;
}
/** Historique des transitions */
export interface TransitionHistory {
    /** Intent concerné */
    readonly intentId: string;
    /** Liste des transitions */
    readonly transitions: readonly StateTransition[];
}
/** Entry dans la queue d'intents */
export interface QueueEntry {
    /** Intent */
    readonly intent: Intent;
    /** Position dans la queue */
    readonly position: number;
    /** Score de priorité */
    readonly priorityScore: number;
    /** Timestamp d'ajout */
    readonly addedAt: string;
}
/** Résultat d'une opération */
export type IntentResult<T> = {
    readonly success: true;
    readonly data: T;
} | {
    readonly success: false;
    readonly error: IntentError;
};
/** Erreur d'intent */
export interface IntentError {
    /** Code d'erreur */
    readonly code: IntentErrorCode;
    /** Message */
    readonly message: string;
    /** Détails */
    readonly details?: Record<string, unknown>;
}
/** Codes d'erreur */
export declare enum IntentErrorCode {
    INVALID_TYPE = "INVALID_TYPE",
    INVALID_PRIORITY = "INVALID_PRIORITY",
    INVALID_PAYLOAD = "INVALID_PAYLOAD",
    PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE",
    INVALID_TRANSITION = "INVALID_TRANSITION",
    INTENT_NOT_FOUND = "INTENT_NOT_FOUND",
    INTENT_ALREADY_EXISTS = "INTENT_ALREADY_EXISTS",
    ALREADY_EXECUTING = "ALREADY_EXECUTING",
    NOT_LOCKED = "NOT_LOCKED",
    TIMEOUT = "TIMEOUT",
    QUEUE_FULL = "QUEUE_FULL",
    INTERNAL_ERROR = "INTERNAL_ERROR"
}
/** Métriques de l'intent machine */
export interface IntentMetrics {
    /** Nombre total d'intents créés */
    readonly totalCreated: number;
    /** Nombre d'intents complétés */
    readonly totalCompleted: number;
    /** Nombre d'intents échoués */
    readonly totalFailed: number;
    /** Nombre d'intents en cours */
    readonly currentPending: number;
    readonly currentLocked: number;
    readonly currentExecuting: number;
    /** Temps moyen d'exécution (ms) */
    readonly avgExecutionTimeMs: number;
    /** Par type */
    readonly byType: Record<IntentType, number>;
    /** Par état */
    readonly byState: Record<IntentState, number>;
}
/** Événement de changement d'état */
export interface IntentStateChangeEvent {
    /** Intent concerné */
    readonly intent: Intent;
    /** Transition effectuée */
    readonly transition: StateTransition;
    /** Intent précédent */
    readonly previousIntent: Intent;
}
/** Listener de changement d'état */
export type IntentStateListener = (event: IntentStateChangeEvent) => void;
//# sourceMappingURL=types.d.ts.map