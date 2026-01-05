/**
 * OMEGA CONTEXT_ENGINE — Constants
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * INV-MEM-03: Contexte jamais perdu
 */
export declare const CONTEXT_VERSION = "3.18.0";
/** Portée du contexte */
export declare enum ContextScope {
    /** Contexte global (toute l'œuvre) */
    GLOBAL = "GLOBAL",
    /** Contexte de partie/livre */
    PART = "PART",
    /** Contexte de chapitre */
    CHAPTER = "CHAPTER",
    /** Contexte de scène */
    SCENE = "SCENE",
    /** Contexte local (paragraphe) */
    LOCAL = "LOCAL"
}
/** Hiérarchie des scopes (plus haut = plus large) */
export declare const SCOPE_HIERARCHY: Record<ContextScope, number>;
/** Types d'éléments actifs dans le contexte */
export declare enum ElementType {
    /** Personnage */
    CHARACTER = "CHARACTER",
    /** Lieu */
    LOCATION = "LOCATION",
    /** Objet */
    OBJECT = "OBJECT",
    /** Concept/Thème */
    CONCEPT = "CONCEPT",
    /** Événement en cours */
    EVENT = "EVENT",
    /** Relation active */
    RELATION = "RELATION",
    /** Émotion dominante */
    EMOTION = "EMOTION",
    /** Tension narrative */
    TENSION = "TENSION"
}
/** État d'un élément dans le contexte */
export declare enum ElementState {
    /** Élément actif et visible */
    ACTIVE = "ACTIVE",
    /** Élément présent mais en arrière-plan */
    BACKGROUND = "BACKGROUND",
    /** Élément mentionné mais pas présent */
    MENTIONED = "MENTIONED",
    /** Élément implicite (déduit) */
    IMPLICIT = "IMPLICIT",
    /** Élément sorti du contexte */
    EXITED = "EXITED"
}
/** Niveau de position dans le texte */
export declare enum PositionLevel {
    PART = "PART",
    CHAPTER = "CHAPTER",
    SCENE = "SCENE",
    PARAGRAPH = "PARAGRAPH",
    SENTENCE = "SENTENCE"
}
export declare const CONTEXT_LIMITS: {
    /** Nombre max d'éléments actifs par scope */
    readonly MAX_ACTIVE_ELEMENTS_PER_SCOPE: 50;
    /** Nombre max de niveaux d'historique */
    readonly MAX_HISTORY_DEPTH: 100;
    /** Nombre max de snapshots */
    readonly MAX_SNAPSHOTS: 50;
    /** Durée de vie d'un élément IMPLICIT (en positions) */
    readonly IMPLICIT_DECAY_POSITIONS: 10;
    /** Poids minimum pour rester ACTIVE */
    readonly MIN_ACTIVE_WEIGHT: 0.1;
};
/** Poids par défaut selon l'état */
export declare const DEFAULT_WEIGHTS: Record<ElementState, number>;
/** Taux de décroissance par scope */
export declare const DECAY_RATES: Record<ContextScope, number>;
//# sourceMappingURL=constants.d.ts.map