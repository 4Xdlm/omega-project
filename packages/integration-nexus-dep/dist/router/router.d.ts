/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — NEXUS ROUTER
 * Version: 0.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Main router for NEXUS DEP operations.
 * Combines registry and dispatcher functionality.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusRequest, NexusResponse, NexusOperationType } from "../contracts/types.js";
import { type OperationHandler } from "./registry.js";
import { type DispatcherOptions } from "./dispatcher.js";
export interface RouterOptions extends DispatcherOptions {
    readonly defaultSeed?: number;
}
export declare class NexusRouter {
    private readonly registry;
    private readonly dispatcher;
    private readonly defaultSeed;
    constructor(options?: RouterOptions);
    /**
     * Register an operation handler
     */
    register<T, R>(type: NexusOperationType, handler: OperationHandler<T, R>): this;
    /**
     * Dispatch a request
     */
    dispatch<T, R>(request: NexusRequest<T>): Promise<NexusResponse<R>>;
    /**
     * Convenience method to dispatch with just payload
     */
    execute<T, R>(type: NexusOperationType, payload: T, seed?: number): Promise<NexusResponse<R>>;
    /**
     * Get list of registered operations
     */
    getOperations(): readonly NexusOperationType[];
    /**
     * Check if operation is registered
     */
    hasOperation(type: NexusOperationType): boolean;
    /**
     * Create a router with timeout
     */
    withTimeout(ms: number): NexusRouter;
    /**
     * Create a router with tracing enabled
     */
    withTrace(enabled: boolean): NexusRouter;
}
/**
 * Create a new NEXUS router
 */
export declare function createRouter(options?: RouterOptions): NexusRouter;
/**
 * Create a router with default NEXUS handlers pre-registered
 */
export declare function createDefaultRouter(options?: RouterOptions): NexusRouter;
//# sourceMappingURL=router.d.ts.map