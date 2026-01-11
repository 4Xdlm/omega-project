/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — OPERATION REGISTRY
 * Version: 0.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Registry for operation handlers.
 * INV-ROUTER-01: Unknown operations are not registered.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusOperationType } from "../contracts/types.js";
/**
 * Handler context passed to operations
 */
export interface HandlerContext {
    readonly requestId: string;
    readonly startTime: number;
    readonly seed: number;
    readonly traceEnabled: boolean;
}
/**
 * Operation handler function
 */
export type OperationHandler<T = unknown, R = unknown> = (payload: T, context: HandlerContext) => Promise<R>;
/**
 * Registered handler with metadata
 */
export interface RegisteredHandler {
    readonly type: NexusOperationType;
    readonly handler: OperationHandler;
    readonly registeredAt: string;
}
export declare class OperationRegistry {
    private readonly handlers;
    constructor();
    /**
     * Register an operation handler
     */
    register<T, R>(type: NexusOperationType, handler: OperationHandler<T, R>): void;
    /**
     * Get a registered handler
     */
    get(type: NexusOperationType): OperationHandler | undefined;
    /**
     * Check if operation is registered
     */
    has(type: NexusOperationType): boolean;
    /**
     * List all registered operations
     */
    list(): readonly NexusOperationType[];
    /**
     * Get registration metadata
     */
    getMetadata(type: NexusOperationType): RegisteredHandler | undefined;
    /**
     * Unregister an operation (for testing)
     */
    unregister(type: NexusOperationType): boolean;
    /**
     * Clear all registrations (for testing)
     */
    clear(): void;
    /**
     * Get count of registered operations
     */
    get size(): number;
}
/**
 * Get the default registry instance
 */
export declare function getDefaultRegistry(): OperationRegistry;
/**
 * Reset the default registry (for testing)
 */
export declare function resetDefaultRegistry(): void;
//# sourceMappingURL=registry.d.ts.map