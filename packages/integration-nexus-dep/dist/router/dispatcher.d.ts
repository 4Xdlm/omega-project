/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — DISPATCHER
 * Version: 0.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Request dispatcher with timeout and tracing support.
 * INV-ROUTER-02: All responses include execution time.
 * INV-ROUTER-03: Request ID is preserved in response.
 * ═══════════════════════════════════════════════════════════════════════════════
 */
import type { NexusRequest, NexusResponse } from "../contracts/types.js";
import type { OperationRegistry } from "./registry.js";
export interface DispatcherOptions {
    readonly timeoutMs?: number;
    readonly traceEnabled?: boolean;
}
export declare class Dispatcher {
    private readonly registry;
    private timeoutMs;
    private traceEnabled;
    constructor(registry: OperationRegistry, options?: DispatcherOptions);
    /**
     * Create a new dispatcher with timeout
     */
    withTimeout(ms: number): Dispatcher;
    /**
     * Create a new dispatcher with tracing
     */
    withTrace(enabled: boolean): Dispatcher;
    /**
     * Execute a request
     * INV-ROUTER-01: Unknown operations return error
     * INV-ROUTER-02: Execution time included
     * INV-ROUTER-03: Request ID preserved
     */
    execute<T, R>(request: NexusRequest<T>): Promise<NexusResponse<R>>;
    private executeWithTimeout;
    private createSuccessResponse;
    private createErrorResponse;
}
/**
 * Create a new dispatcher with the given registry
 */
export declare function createDispatcher(registry: OperationRegistry, options?: DispatcherOptions): Dispatcher;
//# sourceMappingURL=dispatcher.d.ts.map