/**
 * OMEGA INTENT_MACHINE — Types
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */
/** Codes d'erreur */
export var IntentErrorCode;
(function (IntentErrorCode) {
    // Validation
    IntentErrorCode["INVALID_TYPE"] = "INVALID_TYPE";
    IntentErrorCode["INVALID_PRIORITY"] = "INVALID_PRIORITY";
    IntentErrorCode["INVALID_PAYLOAD"] = "INVALID_PAYLOAD";
    IntentErrorCode["PAYLOAD_TOO_LARGE"] = "PAYLOAD_TOO_LARGE";
    // State machine
    IntentErrorCode["INVALID_TRANSITION"] = "INVALID_TRANSITION";
    IntentErrorCode["INTENT_NOT_FOUND"] = "INTENT_NOT_FOUND";
    IntentErrorCode["INTENT_ALREADY_EXISTS"] = "INTENT_ALREADY_EXISTS";
    // Execution
    IntentErrorCode["ALREADY_EXECUTING"] = "ALREADY_EXECUTING";
    IntentErrorCode["NOT_LOCKED"] = "NOT_LOCKED";
    IntentErrorCode["TIMEOUT"] = "TIMEOUT";
    // Queue
    IntentErrorCode["QUEUE_FULL"] = "QUEUE_FULL";
    // System
    IntentErrorCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
})(IntentErrorCode || (IntentErrorCode = {}));
//# sourceMappingURL=types.js.map