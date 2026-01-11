/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — IO SCHEMAS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Input/Output schemas for NEXUS DEP operations.
 * All schemas are immutable (readonly) by design.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════
export const DEFAULT_SEED = 42;
export const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB
export const MIN_CONTENT_SIZE = 1; // 1 byte
// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
export function validateContentSize(content) {
    const size = Buffer.byteLength(content, "utf8");
    return size >= MIN_CONTENT_SIZE && size <= MAX_CONTENT_SIZE;
}
export function normalizeWeights(weights) {
    if (!weights) {
        return { emotion: 0.25, style: 0.25, structure: 0.25, tempo: 0.25 };
    }
    const total = weights.emotion + weights.style + weights.structure + weights.tempo;
    if (total === 0) {
        return { emotion: 0.25, style: 0.25, structure: 0.25, tempo: 0.25 };
    }
    return {
        emotion: weights.emotion / total,
        style: weights.style / total,
        structure: weights.structure / total,
        tempo: weights.tempo / total
    };
}
//# sourceMappingURL=io.js.map