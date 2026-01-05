/**
 * OMEGA CONTEXT_ENGINE — Implementation
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-03: Contexte jamais perdu
 * INV-MEM-06: Déterminisme total
 */
import { ContextScope } from './constants.js';
import type { TextPosition, ContextElement, AddElementInput, UpdateElementInput, ContextState, ContextSnapshot, HistoryEntry, ElementFilter, ContextResult, ContextMetrics } from './types.js';
/** Clock function type */
export type ClockFn = () => string;
/**
 * ContextTracker — Suivi du contexte narratif
 *
 * INV-MEM-03: Contexte jamais perdu
 * - Historique complet avec rollback
 * - Snapshots pour sauvegarde
 * - Decay déterministe
 */
export declare class ContextTracker {
    private position;
    private readonly elements;
    private readonly history;
    private readonly snapshots;
    private readonly clock;
    constructor(clock?: ClockFn);
    /**
     * Déplace la position actuelle
     */
    moveTo(newPosition: TextPosition): ContextResult<TextPosition>;
    /**
     * Avance d'un paragraphe
     */
    advance(): ContextResult<TextPosition>;
    /**
     * Récupère la position actuelle
     */
    getPosition(): TextPosition;
    /**
     * Ajoute un élément au contexte
     */
    addElement(input: AddElementInput): ContextResult<ContextElement>;
    /**
     * Met à jour un élément
     */
    updateElement(id: string, input: UpdateElementInput): ContextResult<ContextElement>;
    /**
     * Retire un élément du contexte (soft remove via EXITED state)
     */
    removeElement(id: string): ContextResult<ContextElement>;
    /**
     * Récupère un élément par ID
     */
    getElement(id: string): ContextElement | null;
    /**
     * Récupère un élément par entity ref
     */
    getByEntityRef(entityRef: string): ContextElement | null;
    /**
     * Requête les éléments selon un filtre
     */
    queryElements(filter: ElementFilter): readonly ContextElement[];
    /**
     * Récupère les éléments actifs
     */
    getActiveElements(): readonly ContextElement[];
    /**
     * Récupère les éléments d'un scope
     */
    getElementsByScope(scope: ContextScope): readonly ContextElement[];
    /**
     * Crée un snapshot du contexte actuel
     */
    createSnapshot(label?: string): ContextResult<ContextSnapshot>;
    /**
     * Restaure le contexte depuis un snapshot
     */
    rollbackTo(snapshotId: string): ContextResult<ContextState>;
    /**
     * Annule la dernière action (si possible)
     */
    undo(): ContextResult<ContextState>;
    /**
     * Récupère un snapshot par ID
     */
    getSnapshot(id: string): ContextSnapshot | null;
    /**
     * Liste tous les snapshots
     */
    listSnapshots(): readonly ContextSnapshot[];
    /**
     * Récupère l'état actuel complet
     */
    getState(): ContextState;
    /**
     * Récupère l'historique
     */
    getHistory(limit?: number): readonly HistoryEntry[];
    /**
     * Applique le decay aux éléments (déterministe)
     */
    applyDecay(fromPosition: TextPosition, toPosition: TextPosition): void;
    /**
     * Réactive un élément (boost weight)
     */
    reactivate(id: string, weight?: number): ContextResult<ContextElement>;
    /**
     * Récupère les métriques du contexte
     */
    getMetrics(): ContextMetrics;
    /**
     * Réinitialise (pour tests)
     */
    clear(): void;
    /**
     * Compte les éléments
     */
    count(): number;
    /**
     * Vérifie qu'un élément existe
     */
    hasElement(id: string): boolean;
    private validatePosition;
    private findByEntityRef;
    private countByScope;
    private matchesFilter;
    private calculateDistance;
    private recordHistory;
}
/**
 * Crée un nouveau ContextTracker
 */
export declare function createContextTracker(clock?: ClockFn): ContextTracker;
//# sourceMappingURL=context-tracker.d.ts.map