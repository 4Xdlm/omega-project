/**
 * @fileoverview OMEGA Contracts Canon - System Invariants
 * @module @omega/contracts-canon/invariants
 *
 * Canonical registry of all OMEGA system invariants.
 * These are the inviolable rules of the system.
 */
import type { InvariantContract, InvariantSeverity } from './types.js';
export declare const INV_DET_01: InvariantContract;
export declare const INV_DET_02: InvariantContract;
export declare const INV_DET_03: InvariantContract;
export declare const INV_DET_04: InvariantContract;
export declare const INV_DET_05: InvariantContract;
export declare const INV_EXE_01: InvariantContract;
export declare const INV_EXE_02: InvariantContract;
export declare const INV_EXE_03: InvariantContract;
export declare const INV_EXE_04: InvariantContract;
export declare const INV_REP_01: InvariantContract;
export declare const INV_REP_02: InvariantContract;
export declare const INV_REP_03: InvariantContract;
export declare const INV_REP_04: InvariantContract;
export declare const INV_ART_01: InvariantContract;
export declare const INV_ART_02: InvariantContract;
export declare const INV_ART_03: InvariantContract;
export declare const INV_NEX_01: InvariantContract;
export declare const INV_NEX_02: InvariantContract;
export declare const INV_NEX_03: InvariantContract;
export declare const INV_SAN_01: InvariantContract;
export declare const INV_SAN_02: InvariantContract;
/**
 * All system invariants.
 */
export declare const ALL_INVARIANTS: readonly InvariantContract[];
/**
 * Get invariants by module.
 */
export declare function getInvariantsByModule(module: string): readonly InvariantContract[];
/**
 * Get invariants by severity.
 */
export declare function getInvariantsBySeverity(severity: InvariantSeverity): readonly InvariantContract[];
/**
 * Get invariant by ID.
 */
export declare function getInvariant(id: string): InvariantContract | undefined;
/**
 * Total invariant count.
 */
export declare const INVARIANT_COUNT: number;
//# sourceMappingURL=invariants.d.ts.map