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
export var ContextScope;
(function (ContextScope) {
    /** Contexte global (toute l'œuvre) */
    ContextScope["GLOBAL"] = "GLOBAL";
    /** Contexte de partie/livre */
    ContextScope["PART"] = "PART";
    /** Contexte de chapitre */
    ContextScope["CHAPTER"] = "CHAPTER";
    /** Contexte de scène */
    ContextScope["SCENE"] = "SCENE";
    /** Contexte local (paragraphe) */
    ContextScope["LOCAL"] = "LOCAL";
})(ContextScope || (ContextScope = {}));
/** Hiérarchie des scopes (plus haut = plus large) */
export const SCOPE_HIERARCHY = {
    [ContextScope.GLOBAL]: 100,
    [ContextScope.PART]: 80,
    [ContextScope.CHAPTER]: 60,
    [ContextScope.SCENE]: 40,
    [ContextScope.LOCAL]: 20,
};
// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════════
/** Types d'éléments actifs dans le contexte */
export var ElementType;
(function (ElementType) {
    /** Personnage */
    ElementType["CHARACTER"] = "CHARACTER";
    /** Lieu */
    ElementType["LOCATION"] = "LOCATION";
    /** Objet */
    ElementType["OBJECT"] = "OBJECT";
    /** Concept/Thème */
    ElementType["CONCEPT"] = "CONCEPT";
    /** Événement en cours */
    ElementType["EVENT"] = "EVENT";
    /** Relation active */
    ElementType["RELATION"] = "RELATION";
    /** Émotion dominante */
    ElementType["EMOTION"] = "EMOTION";
    /** Tension narrative */
    ElementType["TENSION"] = "TENSION";
})(ElementType || (ElementType = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// ELEMENT STATES
// ═══════════════════════════════════════════════════════════════════════════════
/** État d'un élément dans le contexte */
export var ElementState;
(function (ElementState) {
    /** Élément actif et visible */
    ElementState["ACTIVE"] = "ACTIVE";
    /** Élément présent mais en arrière-plan */
    ElementState["BACKGROUND"] = "BACKGROUND";
    /** Élément mentionné mais pas présent */
    ElementState["MENTIONED"] = "MENTIONED";
    /** Élément implicite (déduit) */
    ElementState["IMPLICIT"] = "IMPLICIT";
    /** Élément sorti du contexte */
    ElementState["EXITED"] = "EXITED";
})(ElementState || (ElementState = {}));
// ═══════════════════════════════════════════════════════════════════════════════
// POSITION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════
/** Niveau de position dans le texte */
export var PositionLevel;
(function (PositionLevel) {
    PositionLevel["PART"] = "PART";
    PositionLevel["CHAPTER"] = "CHAPTER";
    PositionLevel["SCENE"] = "SCENE";
    PositionLevel["PARAGRAPH"] = "PARAGRAPH";
    PositionLevel["SENTENCE"] = "SENTENCE";
})(PositionLevel || (PositionLevel = {}));
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
};
// ═══════════════════════════════════════════════════════════════════════════════
// WEIGHT DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════
/** Poids par défaut selon l'état */
export const DEFAULT_WEIGHTS = {
    [ElementState.ACTIVE]: 1.0,
    [ElementState.BACKGROUND]: 0.5,
    [ElementState.MENTIONED]: 0.3,
    [ElementState.IMPLICIT]: 0.1,
    [ElementState.EXITED]: 0.0,
};
// ═══════════════════════════════════════════════════════════════════════════════
// DECAY RATES
// ═══════════════════════════════════════════════════════════════════════════════
/** Taux de décroissance par scope */
export const DECAY_RATES = {
    [ContextScope.GLOBAL]: 0.0, // Ne décroît jamais
    [ContextScope.PART]: 0.01, // Décroît très lentement
    [ContextScope.CHAPTER]: 0.05, // Décroît lentement
    [ContextScope.SCENE]: 0.1, // Décroît modérément
    [ContextScope.LOCAL]: 0.3, // Décroît rapidement
};
//# sourceMappingURL=constants.js.map