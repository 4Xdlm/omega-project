/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — UNIFIED TYPES
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * NEXUS DEP consumes types from sanctuarized modules (READ-ONLY).
 * Types here are MIRRORS for decoupling — actual data comes from adapters.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
export const EMOTION14_LIST = Object.freeze([
    "joy", "sadness", "anger", "fear",
    "surprise", "disgust", "trust", "anticipation",
    "love", "guilt", "shame", "pride",
    "envy", "hope"
]);
// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════
export function isNexusError(obj) {
    return (typeof obj === "object" &&
        obj !== null &&
        "code" in obj &&
        "message" in obj &&
        "timestamp" in obj);
}
export function isSuccessResponse(response) {
    return response.success && response.data !== undefined;
}
export function isErrorResponse(response) {
    return !response.success && response.error !== undefined;
}
// ═══════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE FACTORIES
// ═══════════════════════════════════════════════════════════════════════════════
let requestCounter = 0;
/**
 * Generate a unique request ID
 * Format: NEXUS-{timestamp}-{random}
 */
function generateRequestId() {
    const timestamp = Date.now().toString(36);
    const counter = (++requestCounter).toString(36).padStart(4, "0");
    return `NEXUS-${timestamp}-${counter}`;
}
/**
 * Create a NEXUS request
 * INV-NEXUS-04: All requests have unique IDs
 */
export function createNexusRequest(type, payload, seed) {
    return Object.freeze({
        id: generateRequestId(),
        type: type,
        payload,
        timestamp: new Date().toISOString(),
        seed
    });
}
/**
 * Create a successful NEXUS response
 */
export function createNexusResponse(requestId, data, executionTimeMs = 0) {
    return Object.freeze({
        requestId,
        success: true,
        data,
        executionTimeMs
    });
}
/**
 * Create an error NEXUS response
 */
export function createErrorResponse(requestId, error, executionTimeMs = 0) {
    return Object.freeze({
        requestId,
        success: false,
        error,
        executionTimeMs
    });
}
//# sourceMappingURL=types.js.map