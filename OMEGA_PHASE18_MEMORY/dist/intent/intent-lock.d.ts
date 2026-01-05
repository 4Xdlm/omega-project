/**
 * OMEGA INTENT_MACHINE — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-02: Intent jamais ambigu
 * INV-MEM-07: Timeout protection
 */
import { IntentState, IntentAction } from './constants.js';
import type { Intent, CreateIntentInput, CompleteIntentOptions, FailIntentOptions, TransitionHistory, QueueEntry, IntentResult, IntentMetrics, IntentStateListener } from './types.js';
/** Clock function type */
export type ClockFn = () => string;
/**
 * IntentLock — Machine à états formelle pour les intentions
 *
 * INV-MEM-02: Garantit qu'un intent n'est jamais ambigu
 * - Un seul état à tout moment
 * - Transitions strictement définies
 * - Pas de transitions implicites
 */
export declare class IntentLock {
    private readonly intents;
    private readonly transitionHistory;
    private readonly listeners;
    private readonly queue;
    private totalCreated;
    private totalCompleted;
    private totalFailed;
    private executionTimes;
    private currentIntentId;
    private readonly clock;
    constructor(clock?: ClockFn);
    /**
     * Crée un nouvel intent
     * State: IDLE → PENDING
     */
    create(input: CreateIntentInput): IntentResult<Intent>;
    /**
     * Verrouille un intent pour exécution
     * State: PENDING → LOCKED
     */
    lock(intentId: string): IntentResult<Intent>;
    /**
     * Démarre l'exécution d'un intent
     * State: LOCKED → EXECUTING
     */
    execute(intentId: string): IntentResult<Intent>;
    /**
     * Complète un intent avec succès
     * State: EXECUTING → COMPLETE
     */
    complete(intentId: string, options?: CompleteIntentOptions): IntentResult<Intent>;
    /**
     * Échoue un intent
     * State: EXECUTING → FAILED
     */
    fail(intentId: string, options: FailIntentOptions): IntentResult<Intent>;
    /**
     * Annule un intent en attente ou verrouillé
     * State: PENDING|LOCKED → IDLE
     */
    cancel(intentId: string): IntentResult<Intent>;
    /**
     * Réinitialise un intent complété ou échoué
     * State: COMPLETE|FAILED → IDLE
     */
    reset(intentId: string): IntentResult<Intent>;
    /**
     * Retente un intent échoué
     * State: FAILED → PENDING
     */
    retry(intentId: string): IntentResult<Intent>;
    /**
     * Récupère un intent par ID
     */
    getIntent(id: string): Intent | null;
    /**
     * Récupère l'intent actif en cours d'exécution
     */
    getCurrentIntent(): Intent | null;
    /**
     * Récupère l'état actuel d'un intent
     */
    getState(id: string): IntentState | null;
    /**
     * Vérifie si une transition est valide
     */
    canTransition(id: string, action: IntentAction): boolean;
    /**
     * Récupère les intents par état
     */
    getIntentsByState(state: IntentState): readonly Intent[];
    /**
     * Récupère la queue triée par priorité
     */
    getQueue(): readonly QueueEntry[];
    /**
     * Récupère le prochain intent à exécuter
     */
    getNextInQueue(): Intent | null;
    /**
     * Récupère l'historique des transitions
     */
    getTransitionHistory(intentId: string): TransitionHistory | null;
    /**
     * Vérifie qu'aucun intent n'est ambigu
     * INV-MEM-02: Intent jamais ambigu
     */
    verifyNoAmbiguity(): {
        valid: boolean;
        issues: string[];
    };
    /**
     * Récupère les métriques
     */
    getMetrics(): IntentMetrics;
    /**
     * Ajoute un listener de changement d'état
     */
    addListener(listener: IntentStateListener): void;
    /**
     * Supprime un listener
     */
    removeListener(listener: IntentStateListener): void;
    /**
     * Réinitialise (pour tests)
     */
    clear(): void;
    /**
     * Compte les intents
     */
    count(): number;
    private validateCreateInput;
    private transition;
    private recordTransition;
    private notifyListeners;
}
/**
 * Crée un nouveau IntentLock
 */
export declare function createIntentLock(clock?: ClockFn): IntentLock;
//# sourceMappingURL=intent-lock.d.ts.map