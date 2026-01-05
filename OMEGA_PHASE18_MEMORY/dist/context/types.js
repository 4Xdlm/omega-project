/**
 * OMEGA CONTEXT_ENGINE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
/** Comparateur de position */
export function comparePositions(a, b) {
    if (a.part !== b.part)
        return (a.part ?? 0) - (b.part ?? 0);
    if (a.chapter !== b.chapter)
        return (a.chapter ?? 0) - (b.chapter ?? 0);
    if (a.scene !== b.scene)
        return (a.scene ?? 0) - (b.scene ?? 0);
    if (a.paragraph !== b.paragraph)
        return a.paragraph - b.paragraph;
    return (a.sentence ?? 0) - (b.sentence ?? 0);
}
/** Actions possibles sur le contexte */
export var ContextAction;
(function (ContextAction) {
    ContextAction["MOVE"] = "MOVE";
    ContextAction["ADD_ELEMENT"] = "ADD_ELEMENT";
    ContextAction["UPDATE_ELEMENT"] = "UPDATE_ELEMENT";
    ContextAction["REMOVE_ELEMENT"] = "REMOVE_ELEMENT";
    ContextAction["DECAY"] = "DECAY";
    ContextAction["SNAPSHOT"] = "SNAPSHOT";
    ContextAction["ROLLBACK"] = "ROLLBACK";
})(ContextAction || (ContextAction = {}));
/** Codes d'erreur */
export var ContextErrorCode;
(function (ContextErrorCode) {
    // Validation
    ContextErrorCode["INVALID_POSITION"] = "INVALID_POSITION";
    ContextErrorCode["INVALID_ELEMENT"] = "INVALID_ELEMENT";
    ContextErrorCode["INVALID_SCOPE"] = "INVALID_SCOPE";
    // Element errors
    ContextErrorCode["ELEMENT_NOT_FOUND"] = "ELEMENT_NOT_FOUND";
    ContextErrorCode["ELEMENT_ALREADY_EXISTS"] = "ELEMENT_ALREADY_EXISTS";
    ContextErrorCode["MAX_ELEMENTS_EXCEEDED"] = "MAX_ELEMENTS_EXCEEDED";
    // History errors
    ContextErrorCode["HISTORY_EMPTY"] = "HISTORY_EMPTY";
    ContextErrorCode["SNAPSHOT_NOT_FOUND"] = "SNAPSHOT_NOT_FOUND";
    ContextErrorCode["MAX_SNAPSHOTS_EXCEEDED"] = "MAX_SNAPSHOTS_EXCEEDED";
    // System
    ContextErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(ContextErrorCode || (ContextErrorCode = {}));
//# sourceMappingURL=types.js.map