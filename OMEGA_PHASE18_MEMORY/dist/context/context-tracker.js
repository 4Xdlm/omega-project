/**
 * OMEGA CONTEXT_ENGINE — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-03: Contexte jamais perdu
 * INV-MEM-06: Déterminisme total
 */
import { createHash } from 'crypto';
import { ContextScope, ElementType, ElementState, CONTEXT_LIMITS, DEFAULT_WEIGHTS, DECAY_RATES, } from './constants.js';
import { ContextAction, ContextErrorCode } from './types.js';
const defaultClock = () => new Date().toISOString();
// ═══════════════════════════════════════════════════════════════════════════════
// HASH UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════
function sha256(data) {
    return createHash('sha256').update(data, 'utf8').digest('hex');
}
function hashState(position, elements) {
    const sorted = Array.from(elements.values())
        .sort((a, b) => a.id.localeCompare(b.id));
    return sha256(JSON.stringify({ position, elements: sorted }));
}
function hashSnapshot(snapshot) {
    return sha256(JSON.stringify(snapshot));
}
function generateElementId(entityRef, timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const random = sha256(`${entityRef}:${timestamp}:${Math.random()}`).substring(0, 8);
    return `elem_${ts}_${random}`;
}
function generateSnapshotId(timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const random = sha256(`snap:${timestamp}:${Math.random()}`).substring(0, 8);
    return `ctxsnap_${ts}_${random}`;
}
function generateHistoryId(timestamp) {
    const ts = timestamp.replace(/[-:TZ.]/g, '').substring(0, 14);
    const random = sha256(`hist:${timestamp}:${Math.random()}`).substring(0, 8);
    return `hist_${ts}_${random}`;
}
// ═══════════════════════════════════════════════════════════════════════════════
// CONTEXT TRACKER CLASS
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * ContextTracker — Suivi du contexte narratif
 *
 * INV-MEM-03: Contexte jamais perdu
 * - Historique complet avec rollback
 * - Snapshots pour sauvegarde
 * - Decay déterministe
 */
export class ContextTracker {
    // State
    position = { paragraph: 0 };
    elements = new Map();
    // History
    history = [];
    snapshots = new Map();
    // Clock
    clock;
    constructor(clock = defaultClock) {
        this.clock = clock;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // POSITION MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Déplace la position actuelle
     */
    moveTo(newPosition) {
        const validationError = this.validatePosition(newPosition);
        if (validationError) {
            return { success: false, error: validationError };
        }
        const now = this.clock();
        const oldPosition = { ...this.position };
        this.position = { ...newPosition };
        // Apply decay based on movement
        this.applyDecay(oldPosition, newPosition);
        // Record history
        this.recordHistory(ContextAction.MOVE, now, undefined, JSON.stringify(oldPosition), JSON.stringify(newPosition));
        return { success: true, data: this.position };
    }
    /**
     * Avance d'un paragraphe
     */
    advance() {
        return this.moveTo({
            ...this.position,
            paragraph: this.position.paragraph + 1,
        });
    }
    /**
     * Récupère la position actuelle
     */
    getPosition() {
        return { ...this.position };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // ELEMENT MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Ajoute un élément au contexte
     */
    addElement(input) {
        // Check if already exists
        const existing = this.findByEntityRef(input.entityRef);
        if (existing) {
            // Update instead of duplicate
            return this.updateElement(existing.id, {
                state: input.state ?? ElementState.ACTIVE,
                weight: input.weight,
                scope: input.scope,
            });
        }
        // Check limits
        const scope = input.scope ?? ContextScope.LOCAL;
        const scopeCount = this.countByScope(scope);
        if (scopeCount >= CONTEXT_LIMITS.MAX_ACTIVE_ELEMENTS_PER_SCOPE) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.MAX_ELEMENTS_EXCEEDED,
                    message: `Max elements (${CONTEXT_LIMITS.MAX_ACTIVE_ELEMENTS_PER_SCOPE}) exceeded for scope ${scope}`,
                },
            };
        }
        const now = this.clock();
        const state = input.state ?? ElementState.ACTIVE;
        const weight = input.weight ?? DEFAULT_WEIGHTS[state];
        const element = {
            id: generateElementId(input.entityRef, now),
            entityRef: input.entityRef,
            type: input.type,
            state,
            weight,
            scope,
            enteredAt: { ...this.position },
            metadata: {
                createdAt: now,
                updatedAt: now,
                role: input.role,
                notes: input.notes,
            },
        };
        this.elements.set(element.id, element);
        this.recordHistory(ContextAction.ADD_ELEMENT, now, element.id);
        return { success: true, data: element };
    }
    /**
     * Met à jour un élément
     */
    updateElement(id, input) {
        const existing = this.elements.get(id);
        if (!existing) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.ELEMENT_NOT_FOUND,
                    message: `Element ${id} not found`,
                },
            };
        }
        const now = this.clock();
        const newState = input.state ?? existing.state;
        const newWeight = input.weight ?? existing.weight;
        const updated = {
            ...existing,
            state: newState,
            weight: newWeight,
            scope: input.scope ?? existing.scope,
            exitedAt: newState === ElementState.EXITED ? { ...this.position } : existing.exitedAt,
            metadata: {
                ...existing.metadata,
                updatedAt: now,
                notes: input.notes ?? existing.metadata.notes,
            },
        };
        this.elements.set(id, updated);
        this.recordHistory(ContextAction.UPDATE_ELEMENT, now, id, existing.state, updated.state);
        return { success: true, data: updated };
    }
    /**
     * Retire un élément du contexte (soft remove via EXITED state)
     */
    removeElement(id) {
        return this.updateElement(id, { state: ElementState.EXITED, weight: 0 });
    }
    /**
     * Récupère un élément par ID
     */
    getElement(id) {
        return this.elements.get(id) ?? null;
    }
    /**
     * Récupère un élément par entity ref
     */
    getByEntityRef(entityRef) {
        return this.findByEntityRef(entityRef);
    }
    /**
     * Requête les éléments selon un filtre
     */
    queryElements(filter) {
        let results = [];
        for (const element of this.elements.values()) {
            if (this.matchesFilter(element, filter)) {
                results.push(element);
            }
        }
        // Sort by weight descending
        results.sort((a, b) => b.weight - a.weight);
        // Apply limit
        if (filter.limit) {
            results = results.slice(0, filter.limit);
        }
        return results;
    }
    /**
     * Récupère les éléments actifs
     */
    getActiveElements() {
        return this.queryElements({ state: ElementState.ACTIVE });
    }
    /**
     * Récupère les éléments d'un scope
     */
    getElementsByScope(scope) {
        return this.queryElements({ scope });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // SNAPSHOT & ROLLBACK (INV-MEM-03)
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Crée un snapshot du contexte actuel
     */
    createSnapshot(label) {
        if (this.snapshots.size >= CONTEXT_LIMITS.MAX_SNAPSHOTS) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.MAX_SNAPSHOTS_EXCEEDED,
                    message: `Max snapshots (${CONTEXT_LIMITS.MAX_SNAPSHOTS}) exceeded`,
                },
            };
        }
        const now = this.clock();
        const elements = Array.from(this.elements.values());
        const snapshotWithoutHash = {
            id: generateSnapshotId(now),
            position: { ...this.position },
            elements,
            timestamp: now,
            label,
        };
        const hash = hashSnapshot(snapshotWithoutHash);
        const snapshot = { ...snapshotWithoutHash, hash };
        this.snapshots.set(snapshot.id, snapshot);
        this.recordHistory(ContextAction.SNAPSHOT, now);
        return { success: true, data: snapshot };
    }
    /**
     * Restaure le contexte depuis un snapshot
     */
    rollbackTo(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.SNAPSHOT_NOT_FOUND,
                    message: `Snapshot ${snapshotId} not found`,
                },
            };
        }
        const now = this.clock();
        // Clear current elements
        this.elements.clear();
        // Restore from snapshot
        this.position = { ...snapshot.position };
        for (const element of snapshot.elements) {
            this.elements.set(element.id, element);
        }
        this.recordHistory(ContextAction.ROLLBACK, now, undefined, snapshotId, undefined);
        return { success: true, data: this.getState() };
    }
    /**
     * Annule la dernière action (si possible)
     */
    undo() {
        if (this.history.length === 0) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.HISTORY_EMPTY,
                    message: 'No history to undo',
                },
            };
        }
        // Find the most recent snapshot before the last action
        const lastEntry = this.history[this.history.length - 1];
        if (!lastEntry) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.HISTORY_EMPTY,
                    message: 'No history to undo',
                },
            };
        }
        // For now, we only support undo to the last snapshot
        const sortedSnapshots = Array.from(this.snapshots.values())
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
        if (sortedSnapshots.length === 0) {
            return {
                success: false,
                error: {
                    code: ContextErrorCode.SNAPSHOT_NOT_FOUND,
                    message: 'No snapshots available for undo',
                },
            };
        }
        return this.rollbackTo(sortedSnapshots[0].id);
    }
    /**
     * Récupère un snapshot par ID
     */
    getSnapshot(id) {
        return this.snapshots.get(id) ?? null;
    }
    /**
     * Liste tous les snapshots
     */
    listSnapshots() {
        return Array.from(this.snapshots.values())
            .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // STATE & HISTORY
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère l'état actuel complet
     */
    getState() {
        const now = this.clock();
        const hash = hashState(this.position, this.elements);
        return {
            id: `state_${now}`,
            position: { ...this.position },
            elements: new Map(this.elements),
            timestamp: now,
            hash,
        };
    }
    /**
     * Récupère l'historique
     */
    getHistory(limit) {
        const entries = [...this.history];
        if (limit) {
            return entries.slice(-limit);
        }
        return entries;
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // DECAY (INV-MEM-06: Déterminisme)
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Applique le decay aux éléments (déterministe)
     */
    applyDecay(fromPosition, toPosition) {
        const distance = this.calculateDistance(fromPosition, toPosition);
        if (distance === 0)
            return;
        const now = this.clock();
        for (const [id, element] of this.elements) {
            if (element.state === ElementState.EXITED)
                continue;
            const decayRate = DECAY_RATES[element.scope];
            const newWeight = Math.max(0, element.weight - (decayRate * distance));
            if (newWeight < CONTEXT_LIMITS.MIN_ACTIVE_WEIGHT && element.state === ElementState.ACTIVE) {
                // Transition to BACKGROUND
                const updated = {
                    ...element,
                    weight: newWeight,
                    state: newWeight === 0 ? ElementState.EXITED : ElementState.BACKGROUND,
                    metadata: {
                        ...element.metadata,
                        updatedAt: now,
                    },
                };
                this.elements.set(id, updated);
            }
            else if (newWeight !== element.weight) {
                const updated = {
                    ...element,
                    weight: newWeight,
                    metadata: {
                        ...element.metadata,
                        updatedAt: now,
                    },
                };
                this.elements.set(id, updated);
            }
        }
        this.recordHistory(ContextAction.DECAY, now);
    }
    /**
     * Réactive un élément (boost weight)
     */
    reactivate(id, weight) {
        return this.updateElement(id, {
            state: ElementState.ACTIVE,
            weight: weight ?? DEFAULT_WEIGHTS[ElementState.ACTIVE],
        });
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // METRICS
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Récupère les métriques du contexte
     */
    getMetrics() {
        const elementsByState = {
            [ElementState.ACTIVE]: 0,
            [ElementState.BACKGROUND]: 0,
            [ElementState.MENTIONED]: 0,
            [ElementState.IMPLICIT]: 0,
            [ElementState.EXITED]: 0,
        };
        const elementsByType = {
            [ElementType.CHARACTER]: 0,
            [ElementType.LOCATION]: 0,
            [ElementType.OBJECT]: 0,
            [ElementType.CONCEPT]: 0,
            [ElementType.EVENT]: 0,
            [ElementType.RELATION]: 0,
            [ElementType.EMOTION]: 0,
            [ElementType.TENSION]: 0,
        };
        const elementsByScope = {
            [ContextScope.GLOBAL]: 0,
            [ContextScope.PART]: 0,
            [ContextScope.CHAPTER]: 0,
            [ContextScope.SCENE]: 0,
            [ContextScope.LOCAL]: 0,
        };
        let totalActiveWeight = 0;
        let activeCount = 0;
        for (const element of this.elements.values()) {
            elementsByState[element.state]++;
            elementsByType[element.type]++;
            elementsByScope[element.scope]++;
            if (element.state === ElementState.ACTIVE) {
                totalActiveWeight += element.weight;
                activeCount++;
            }
        }
        return {
            currentPosition: { ...this.position },
            elementsByState,
            elementsByType,
            elementsByScope,
            historySize: this.history.length,
            snapshotCount: this.snapshots.size,
            avgActiveWeight: activeCount > 0 ? totalActiveWeight / activeCount : 0,
        };
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Réinitialise (pour tests)
     */
    clear() {
        this.position = { paragraph: 0 };
        this.elements.clear();
        this.history.length = 0;
        this.snapshots.clear();
    }
    /**
     * Compte les éléments
     */
    count() {
        return this.elements.size;
    }
    /**
     * Vérifie qu'un élément existe
     */
    hasElement(id) {
        return this.elements.has(id);
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    validatePosition(position) {
        if (position.paragraph < 0) {
            return {
                code: ContextErrorCode.INVALID_POSITION,
                message: 'Paragraph cannot be negative',
            };
        }
        if (position.chapter !== undefined && position.chapter < 0) {
            return {
                code: ContextErrorCode.INVALID_POSITION,
                message: 'Chapter cannot be negative',
            };
        }
        return null;
    }
    findByEntityRef(entityRef) {
        for (const element of this.elements.values()) {
            if (element.entityRef === entityRef && element.state !== ElementState.EXITED) {
                return element;
            }
        }
        return null;
    }
    countByScope(scope) {
        let count = 0;
        for (const element of this.elements.values()) {
            if (element.scope === scope && element.state !== ElementState.EXITED) {
                count++;
            }
        }
        return count;
    }
    matchesFilter(element, filter) {
        if (filter.type && element.type !== filter.type)
            return false;
        if (filter.state && element.state !== filter.state)
            return false;
        if (filter.scope && element.scope !== filter.scope)
            return false;
        if (filter.minWeight !== undefined && element.weight < filter.minWeight)
            return false;
        if (filter.entityRefPattern) {
            const regex = new RegExp(filter.entityRefPattern, 'i');
            if (!regex.test(element.entityRef))
                return false;
        }
        return true;
    }
    calculateDistance(from, to) {
        // Simple distance based on paragraph difference
        // Could be enhanced with chapter/scene weighting
        let distance = Math.abs(to.paragraph - from.paragraph);
        if (from.chapter !== to.chapter) {
            distance += 10; // Chapter change adds significant distance
        }
        if (from.scene !== to.scene) {
            distance += 5; // Scene change adds moderate distance
        }
        return distance;
    }
    recordHistory(action, timestamp, elementId, stateBefore, stateAfter) {
        // Enforce limit
        if (this.history.length >= CONTEXT_LIMITS.MAX_HISTORY_DEPTH) {
            this.history.shift();
        }
        const entry = {
            id: generateHistoryId(timestamp),
            position: { ...this.position },
            action,
            elementId,
            stateBefore,
            stateAfter,
            timestamp,
        };
        this.history.push(entry);
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Crée un nouveau ContextTracker
 */
export function createContextTracker(clock) {
    return new ContextTracker(clock);
}
//# sourceMappingURL=context-tracker.js.map