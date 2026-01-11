/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ERROR CONTRACTS
 * Version: 0.1.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Error definitions and factory functions for NEXUS DEP.
 * All errors include source tracing for debugging.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusError, NexusErrorCode } from "./types.js";
/**
 * Create a NEXUS error with timestamp
 */
export declare function createNexusError(code: NexusErrorCode, message: string, source?: string): NexusError;
export declare function validationError(message: string, source?: string): NexusError;
export declare function adapterError(adapter: string, operation: string, details: string): NexusError;
export declare function timeoutError(operation: string, timeoutMs: number): NexusError;
export declare function determinismViolation(expected: string, actual: string, source?: string): NexusError;
export declare function sanctuaryAccessDenied(sanctuary: string, operation: string): NexusError;
export declare function unknownOperationError(operation: string): NexusError;
export declare const ERROR_CATALOG: Readonly<Record<NexusErrorCode, string>>;
export declare class NexusOperationError extends Error {
    readonly nexusError: NexusError;
    constructor(error: NexusError);
    toJSON(): NexusError;
}
export declare function isNexusOperationError(err: unknown): err is NexusOperationError;
export declare function extractNexusError(err: unknown): NexusError;
//# sourceMappingURL=errors.d.ts.map