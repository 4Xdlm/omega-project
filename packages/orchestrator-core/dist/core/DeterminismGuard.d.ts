/**
 * @fileoverview DeterminismGuard - Verifies deterministic execution.
 * Compares two run results to ensure they are identical given same inputs.
 * @module @omega/orchestrator-core/core/DeterminismGuard
 */
import type { DeterminismReport, RunResult } from './types.js';
/**
 * DeterminismGuard interface.
 */
export interface DeterminismGuard {
    /**
     * Verifies that two runs are deterministically equivalent.
     * @param run1 - First run result
     * @param run2 - Second run result
     * @returns Verification report
     */
    verify(run1: RunResult, run2: RunResult): DeterminismReport;
}
/**
 * Default implementation of DeterminismGuard.
 */
export declare class DefaultDeterminismGuard implements DeterminismGuard {
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
    verify(run1: RunResult, run2: RunResult): DeterminismReport;
}
/**
 * Creates a determinism guard instance.
 * @returns DeterminismGuard instance
 */
export declare function createDeterminismGuard(): DeterminismGuard;
/**
 * Utility function to assert determinism between two runs.
 * Throws if runs are not deterministic.
 *
 * @param run1 - First run result
 * @param run2 - Second run result
 * @throws Error if runs are not deterministic
 */
export declare function assertDeterministic(run1: RunResult, run2: RunResult): void;
//# sourceMappingURL=DeterminismGuard.d.ts.map