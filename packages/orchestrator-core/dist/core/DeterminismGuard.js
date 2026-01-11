"use strict";
/**
 * @fileoverview DeterminismGuard - Verifies deterministic execution.
 * Compares two run results to ensure they are identical given same inputs.
 * @module @omega/orchestrator-core/core/DeterminismGuard
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultDeterminismGuard = void 0;
exports.createDeterminismGuard = createDeterminismGuard;
exports.assertDeterministic = assertDeterministic;
const stableJson_js_1 = require("../util/stableJson.js");
/**
 * Finds differences between two values recursively.
 * @param v1 - First value
 * @param v2 - Second value
 * @param path - Current path
 * @returns Array of differences
 */
function findDifferences(v1, v2, path) {
    const differences = [];
    // Handle null/undefined
    if (v1 === null || v1 === undefined || v2 === null || v2 === undefined) {
        if (v1 !== v2) {
            differences.push({ path, value1: v1, value2: v2 });
        }
        return differences;
    }
    // Handle primitives
    if (typeof v1 !== 'object' || typeof v2 !== 'object') {
        if (v1 !== v2) {
            differences.push({ path, value1: v1, value2: v2 });
        }
        return differences;
    }
    // Handle arrays
    if (Array.isArray(v1) && Array.isArray(v2)) {
        if (v1.length !== v2.length) {
            differences.push({ path: `${path}.length`, value1: v1.length, value2: v2.length });
        }
        const minLen = Math.min(v1.length, v2.length);
        for (let i = 0; i < minLen; i++) {
            differences.push(...findDifferences(v1[i], v2[i], `${path}[${i}]`));
        }
        return differences;
    }
    // Handle array vs non-array
    if (Array.isArray(v1) !== Array.isArray(v2)) {
        differences.push({ path, value1: v1, value2: v2 });
        return differences;
    }
    // Handle objects
    const obj1 = v1;
    const obj2 = v2;
    const keys1 = Object.keys(obj1).sort();
    const keys2 = Object.keys(obj2).sort();
    // Check for missing keys
    const allKeys = new Set([...keys1, ...keys2]);
    for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key;
        if (!(key in obj1)) {
            differences.push({ path: newPath, value1: undefined, value2: obj2[key] });
        }
        else if (!(key in obj2)) {
            differences.push({ path: newPath, value1: obj1[key], value2: undefined });
        }
        else {
            differences.push(...findDifferences(obj1[key], obj2[key], newPath));
        }
    }
    return differences;
}
// Note: Ignored fields are handled by normalizeForComparison which
// explicitly selects which fields to compare, ignoring timestamps.
/**
 * Normalizes a run result for determinism comparison.
 * Removes fields that are expected to differ.
 */
function normalizeForComparison(result) {
    const normalized = {
        run_id: result.run_id,
        plan_id: result.plan_id,
        status: result.status,
        duration_ms: result.duration_ms,
        steps: result.steps.map((step) => ({
            step_id: step.step_id,
            kind: step.kind,
            status: step.status,
            output: step.output,
            error: step.error,
            duration_ms: step.duration_ms,
        })),
    };
    return normalized;
}
/**
 * Default implementation of DeterminismGuard.
 */
class DefaultDeterminismGuard {
    /**
     * Verifies that two runs produced deterministically equivalent results.
     *
     * Two runs are considered deterministic if:
     * 1. They have the same hash
     * 2. All non-timestamp fields are identical
     *
     * @param run1 - First run result
     * @param run2 - Second run result
     * @returns Verification report
     *
     * @example
     * ```typescript
     * const guard = new DefaultDeterminismGuard();
     * const report = guard.verify(result1, result2);
     * if (!report.is_deterministic) {
     *   console.error('Differences:', report.differences);
     * }
     * ```
     */
    verify(run1, run2) {
        // Quick check: if hashes match, runs are deterministic
        if (run1.hash === run2.hash) {
            return {
                is_deterministic: true,
                hash1: run1.hash,
                hash2: run2.hash,
                differences: [],
            };
        }
        // Deep comparison to find differences
        const norm1 = normalizeForComparison(run1);
        const norm2 = normalizeForComparison(run2);
        const differences = findDifferences(norm1, norm2, '');
        return {
            is_deterministic: false,
            hash1: run1.hash,
            hash2: run2.hash,
            differences,
        };
    }
}
exports.DefaultDeterminismGuard = DefaultDeterminismGuard;
/**
 * Creates a determinism guard instance.
 * @returns DeterminismGuard instance
 */
function createDeterminismGuard() {
    return new DefaultDeterminismGuard();
}
/**
 * Utility function to assert determinism between two runs.
 * Throws if runs are not deterministic.
 *
 * @param run1 - First run result
 * @param run2 - Second run result
 * @throws Error if runs are not deterministic
 */
function assertDeterministic(run1, run2) {
    const guard = createDeterminismGuard();
    const report = guard.verify(run1, run2);
    if (!report.is_deterministic) {
        const diffSummary = report.differences
            .slice(0, 5)
            .map((d) => `  ${d.path}: ${(0, stableJson_js_1.stableStringify)(d.value1)} !== ${(0, stableJson_js_1.stableStringify)(d.value2)}`)
            .join('\n');
        throw new Error(`Determinism violation detected:\n` +
            `Hash 1: ${report.hash1}\n` +
            `Hash 2: ${report.hash2}\n` +
            `Differences:\n${diffSummary}` +
            (report.differences.length > 5 ? `\n  ... and ${report.differences.length - 5} more` : ''));
    }
}
//# sourceMappingURL=DeterminismGuard.js.map