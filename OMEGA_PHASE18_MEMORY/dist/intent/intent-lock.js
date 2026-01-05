/**
 * OMEGA INTENT_MACHINE — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-02: Intent jamais ambigu
 * INV-MEM-07: Timeout protection
 */
import { createHash } from 'crypto';
import { IntentState, IntentType, IntentPriority, IntentAction, IntentFailureCode, ACTION_TRANSITIONS, PRIORITY_VALUES, INTENT_LIMITS, } from './constants.js';
import { IntentErrorCode } from './types.js';
const defaultClock = () => new Date().toISOString();
// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function sha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
function hashIntent(intent) {
    const hashable = {
        id: intent.id,
        type: intent.type,
        state: intent.state,
        priority: intent.priority,
        description: intent.description,
        payload: intent.payload,
        createdAt: intent.metadata.createdAt,
    };
    return sha256(JSON.stringify(hashable));
}
function generateIntentId(type, timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const random = sha256(`${type}:${timestamp}:${Math.random()}`).substring(0, 8);
    return `intent_${ts}_${random}`;
}
// ═══════════════════════════════════════════════════════════════════════════════
// INTENT LOCK CLASS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * IntentLock — Machine à états formelle pour les intentions
 *
 * INV-MEM-02: Garantit qu'un intent n'est jamais ambigu
 * - Un seul état à tout moment
 * - Transitions strictement définies
 * - Pas de transitions implicites
 */
export class IntentLock {
    // Storage
    intents = new Map();
    transitionHistory = new Map();
    listeners = new Set();
    // Queue management
    queue = new Map();
    // Metrics
    totalCreated = 0;
    totalCompleted = 0;
    totalFailed = 0;
    executionTimes = [];
    // Current active intent (only one at a time)
    currentIntentId = null;
    // Clock
    clock;
    constructor(clock = defaultClock) {
        this.clock = clock;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // CORE OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Crée un nouvel intent
     * State: IDLE → PENDING
     */
    create(input) {
        // Validation
        const validationError = this.validateCreateInput(input);
        if (validationError) {
            return { success: false, error: validationError };
        }
        // Check queue limit
        if (this.queue.size >= INTENT_LIMITS.MAX_QUEUE_SIZE) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.QUEUE_FULL,
                    message: `Queue is full (max: ${INTENT_LIMITS.MAX_QUEUE_SIZE})`,
                },
            };
        }
        const now = this.clock();
        const id = generateIntentId(input.type, now);
        const intentWithoutHash = {
            id,
            type: input.type,
            state: IntentState.PENDING,
            priority: input.priority ?? IntentPriority.NORMAL,
            description: input.description,
            payload: input.payload ?? {},
            retryCount: 0,
            metadata: {
                createdAt: now,
                updatedAt: now,
                createdBy: input.createdBy ?? 'system',
                contextId: input.contextId,
                tags: input.tags,
            },
        };
        const hash = hashIntent(intentWithoutHash);
        const intent = { ...intentWithoutHash, hash };
        // Store
        this.intents.set(id, intent);
        this.totalCreated++;
        // Add to queue
        const queueEntry = {
            intent,
            position: this.queue.size,
            priorityScore: PRIORITY_VALUES[intent.priority],
            addedAt: now,
        };
        this.queue.set(id, queueEntry);
        // Record transition
        this.recordTransition(intent, IntentState.IDLE, IntentAction.CREATE, now);
        // Notify listeners (create a virtual "previous" intent for the event)
        const previousIntent = {
            ...intent,
            state: IntentState.IDLE,
        };
        this.notifyListeners(intent, previousIntent);
        return { success: true, data: intent };
    }
    /**
     * Verrouille un intent pour exécution
     * State: PENDING → LOCKED
     */
    lock(intentId) {
        return this.transition(intentId, IntentAction.LOCK);
    }
    /**
     * Démarre l'exécution d'un intent
     * State: LOCKED → EXECUTING
     */
    execute(intentId) {
        // Check if another intent is already executing
        if (this.currentIntentId && this.currentIntentId !== intentId) {
            const current = this.intents.get(this.currentIntentId);
            if (current && current.state === IntentState.EXECUTING) {
                return {
                    success: false,
                    error: {
                        code: IntentErrorCode.ALREADY_EXECUTING,
                        message: `Intent ${this.currentIntentId} is already executing`,
                    },
                };
            }
        }
        const result = this.transition(intentId, IntentAction.EXECUTE);
        if (result.success) {
            this.currentIntentId = intentId;
        }
        return result;
    }
    /**
     * Complète un intent avec succès
     * State: EXECUTING → COMPLETE
     */
    complete(intentId, options) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        if (intent.state !== IntentState.EXECUTING) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot complete from state ${intent.state}`,
                },
            };
        }
        const now = this.clock();
        const completedIntent = {
            ...intent,
            state: IntentState.COMPLETE,
            result: options?.result,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(completedIntent);
        const finalIntent = { ...completedIntent, hash };
        this.intents.set(intentId, finalIntent);
        this.queue.delete(intentId);
        this.totalCompleted++;
        // Track execution time
        const startTime = new Date(intent.metadata.updatedAt).getTime();
        const endTime = new Date(now).getTime();
        this.executionTimes.push(endTime - startTime);
        // Clear current if this was it
        if (this.currentIntentId === intentId) {
            this.currentIntentId = null;
        }
        // Record transition
        this.recordTransition(finalIntent, intent.state, IntentAction.COMPLETE, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    /**
     * Échoue un intent
     * State: EXECUTING → FAILED
     */
    fail(intentId, options) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        if (intent.state !== IntentState.EXECUTING) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot fail from state ${intent.state}`,
                },
            };
        }
        const now = this.clock();
        const failedIntent = {
            ...intent,
            state: IntentState.FAILED,
            failureCode: options.code,
            failureMessage: options.message,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(failedIntent);
        const finalIntent = { ...failedIntent, hash };
        this.intents.set(intentId, finalIntent);
        this.totalFailed++;
        // Clear current if this was it
        if (this.currentIntentId === intentId) {
            this.currentIntentId = null;
        }
        // Record transition
        this.recordTransition(finalIntent, intent.state, IntentAction.FAIL, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    /**
     * Annule un intent en attente ou verrouillé
     * State: PENDING|LOCKED → IDLE
     */
    cancel(intentId) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        if (intent.state !== IntentState.PENDING && intent.state !== IntentState.LOCKED) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot cancel from state ${intent.state}`,
                },
            };
        }
        const now = this.clock();
        const cancelledIntent = {
            ...intent,
            state: IntentState.IDLE,
            failureCode: IntentFailureCode.CANCELLED,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(cancelledIntent);
        const finalIntent = { ...cancelledIntent, hash };
        this.intents.set(intentId, finalIntent);
        this.queue.delete(intentId);
        // Record transition
        this.recordTransition(finalIntent, intent.state, IntentAction.CANCEL, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    /**
     * Réinitialise un intent complété ou échoué
     * State: COMPLETE|FAILED → IDLE
     */
    reset(intentId) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        if (intent.state !== IntentState.COMPLETE && intent.state !== IntentState.FAILED) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot reset from state ${intent.state}`,
                },
            };
        }
        const now = this.clock();
        const resetIntent = {
            ...intent,
            state: IntentState.IDLE,
            failureCode: undefined,
            failureMessage: undefined,
            result: undefined,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(resetIntent);
        const finalIntent = { ...resetIntent, hash };
        this.intents.set(intentId, finalIntent);
        // Record transition
        this.recordTransition(finalIntent, intent.state, IntentAction.RESET, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    /**
     * Retente un intent échoué
     * State: FAILED → PENDING
     */
    retry(intentId) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        if (intent.state !== IntentState.FAILED) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot retry from state ${intent.state}`,
                },
            };
        }
        if (intent.retryCount >= INTENT_LIMITS.MAX_RETRIES) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Max retries (${INTENT_LIMITS.MAX_RETRIES}) exceeded`,
                },
            };
        }
        const now = this.clock();
        const retryIntent = {
            ...intent,
            state: IntentState.PENDING,
            retryCount: intent.retryCount + 1,
            failureCode: undefined,
            failureMessage: undefined,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(retryIntent);
        const finalIntent = { ...retryIntent, hash };
        this.intents.set(intentId, finalIntent);
        // Re-add to queue
        const queueEntry = {
            intent: finalIntent,
            position: this.queue.size,
            priorityScore: PRIORITY_VALUES[finalIntent.priority],
            addedAt: now,
        };
        this.queue.set(intentId, queueEntry);
        // Record transition
        this.recordTransition(finalIntent, intent.state, IntentAction.RETRY, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // QUERY OPERATIONS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère un intent par ID
     */
    getIntent(id) {
        return this.intents.get(id) ?? null;
    }
    /**
     * Récupère l'intent actif en cours d'exécution
     */
    getCurrentIntent() {
        if (!this.currentIntentId)
            return null;
        return this.intents.get(this.currentIntentId) ?? null;
    }
    /**
     * Récupère l'état actuel d'un intent
     */
    getState(id) {
        const intent = this.intents.get(id);
        return intent?.state ?? null;
    }
    /**
     * Vérifie si une transition est valide
     */
    canTransition(id, action) {
        const intent = this.intents.get(id);
        if (!intent)
            return false;
        const transition = ACTION_TRANSITIONS[action];
        return transition.from.includes(intent.state);
    }
    /**
     * Récupère les intents par état
     */
    getIntentsByState(state) {
        const results = [];
        for (const intent of this.intents.values()) {
            if (intent.state === state) {
                results.push(intent);
            }
        }
        return results;
    }
    /**
     * Récupère la queue triée par priorité
     */
    getQueue() {
        return Array.from(this.queue.values())
            .sort((a, b) => b.priorityScore - a.priorityScore);
    }
    /**
     * Récupère le prochain intent à exécuter
     */
    getNextInQueue() {
        const queue = this.getQueue();
        if (queue.length === 0)
            return null;
        // Find first PENDING intent (check actual state from store, not queue entry)
        for (const entry of queue) {
            const currentIntent = this.intents.get(entry.intent.id);
            if (currentIntent && currentIntent.state === IntentState.PENDING) {
                return currentIntent;
            }
        }
        return null;
    }
    /**
     * Récupère l'historique des transitions
     */
    getTransitionHistory(intentId) {
        const transitions = this.transitionHistory.get(intentId);
        if (!transitions)
            return null;
        return {
            intentId,
            transitions: [...transitions],
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Vérifie qu'aucun intent n'est ambigu
     * INV-MEM-02: Intent jamais ambigu
     */
    verifyNoAmbiguity() {
        const issues = [];
        // Check: only one EXECUTING at a time
        const executing = this.getIntentsByState(IntentState.EXECUTING);
        if (executing.length > 1) {
            issues.push(`Multiple intents executing: ${executing.map(i => i.id).join(', ')}`);
        }
        // Check: each intent has valid state
        for (const intent of this.intents.values()) {
            if (!Object.values(IntentState).includes(intent.state)) {
                issues.push(`Intent ${intent.id} has invalid state: ${intent.state}`);
            }
        }
        // Check: transition history is consistent
        for (const [id, history] of this.transitionHistory) {
            const intent = this.intents.get(id);
            if (intent && history.length > 0) {
                const lastTransition = history[history.length - 1];
                if (lastTransition && lastTransition.to !== intent.state) {
                    issues.push(`Intent ${id} state (${intent.state}) doesn't match last transition (${lastTransition.to})`);
                }
            }
        }
        return {
            valid: issues.length === 0,
            issues,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère les métriques
     */
    getMetrics() {
        const byType = {
            [IntentType.CREATE]: 0,
            [IntentType.UPDATE]: 0,
            [IntentType.DELETE]: 0,
            [IntentType.QUERY]: 0,
            [IntentType.COMPOSITE]: 0,
            [IntentType.CUSTOM]: 0,
        };
        const byState = {
            [IntentState.IDLE]: 0,
            [IntentState.PENDING]: 0,
            [IntentState.LOCKED]: 0,
            [IntentState.EXECUTING]: 0,
            [IntentState.COMPLETE]: 0,
            [IntentState.FAILED]: 0,
        };
        for (const intent of this.intents.values()) {
            byType[intent.type]++;
            byState[intent.state]++;
        }
        const avgExecutionTime = this.executionTimes.length > 0
            ? this.executionTimes.reduce((a, b) => a + b, 0) / this.executionTimes.length
            : 0;
        return {
            totalCreated: this.totalCreated,
            totalCompleted: this.totalCompleted,
            totalFailed: this.totalFailed,
            currentPending: byState[IntentState.PENDING],
            currentLocked: byState[IntentState.LOCKED],
            currentExecuting: byState[IntentState.EXECUTING],
            avgExecutionTimeMs: avgExecutionTime,
            byType,
            byState,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // LISTENERS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Ajoute un listener de changement d'état
     */
    addListener(listener) {
        this.listeners.add(listener);
    }
    /**
     * Supprime un listener
     */
    removeListener(listener) {
        this.listeners.delete(listener);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Réinitialise (pour tests)
     */
    clear() {
        this.intents.clear();
        this.transitionHistory.clear();
        this.queue.clear();
        this.listeners.clear();
        this.currentIntentId = null;
        this.totalCreated = 0;
        this.totalCompleted = 0;
        this.totalFailed = 0;
        this.executionTimes = [];
    }
    /**
     * Compte les intents
     */
    count() {
        return this.intents.size;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE
    // ═══════════════════════════════════════════════════════════════════════════
    validateCreateInput(input) {
        if (!input.type || !Object.values(IntentType).includes(input.type)) {
            return { code: IntentErrorCode.INVALID_TYPE, message: 'Invalid intent type' };
        }
        if (input.priority && !Object.values(IntentPriority).includes(input.priority)) {
            return { code: IntentErrorCode.INVALID_PRIORITY, message: 'Invalid priority' };
        }
        if (!input.description || input.description.length === 0) {
            return { code: IntentErrorCode.INVALID_PAYLOAD, message: 'Description is required' };
        }
        // Check payload size
        if (input.payload) {
            const payloadSize = JSON.stringify(input.payload).length;
            if (payloadSize > INTENT_LIMITS.MAX_PAYLOAD_SIZE) {
                return {
                    code: IntentErrorCode.PAYLOAD_TOO_LARGE,
                    message: `Payload exceeds ${INTENT_LIMITS.MAX_PAYLOAD_SIZE} bytes`,
                };
            }
        }
        return null;
    }
    transition(intentId, action) {
        const intent = this.intents.get(intentId);
        if (!intent) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INTENT_NOT_FOUND,
                    message: `Intent ${intentId} not found`,
                },
            };
        }
        const transitionDef = ACTION_TRANSITIONS[action];
        if (!transitionDef.from.includes(intent.state)) {
            return {
                success: false,
                error: {
                    code: IntentErrorCode.INVALID_TRANSITION,
                    message: `Cannot ${action} from state ${intent.state}`,
                },
            };
        }
        const now = this.clock();
        const updatedIntent = {
            ...intent,
            state: transitionDef.to,
            metadata: {
                ...intent.metadata,
                updatedAt: now,
            },
            hash: '', // Will be recomputed
        };
        const hash = hashIntent(updatedIntent);
        const finalIntent = { ...updatedIntent, hash };
        this.intents.set(intentId, finalIntent);
        // Record transition
        this.recordTransition(finalIntent, intent.state, action, now);
        this.notifyListeners(finalIntent, intent);
        return { success: true, data: finalIntent };
    }
    recordTransition(intent, fromState, action, timestamp) {
        const transition = {
            from: fromState,
            to: intent.state,
            action,
            timestamp,
            actor: intent.metadata.createdBy,
        };
        if (!this.transitionHistory.has(intent.id)) {
            this.transitionHistory.set(intent.id, []);
        }
        this.transitionHistory.get(intent.id).push(transition);
    }
    notifyListeners(intent, previousIntent) {
        const history = this.transitionHistory.get(intent.id);
        if (!history || history.length === 0)
            return;
        const transition = history[history.length - 1];
        const event = {
            intent,
            transition,
            previousIntent,
        };
        for (const listener of this.listeners) {
            try {
                listener(event);
            }
            catch {
                // Ignore listener errors
            }
        }
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Crée un nouveau IntentLock
 */
export function createIntentLock(clock) {
    return new IntentLock(clock);
}
//# sourceMappingURL=intent-lock.js.map