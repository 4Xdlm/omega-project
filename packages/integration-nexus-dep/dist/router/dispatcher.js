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
import { unknownOperationError, timeoutError, extractNexusError } from "../contracts/errors.js";
import { DEFAULT_SEED } from "../contracts/io.js";
const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds
// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════
export class Dispatcher {
    registry;
    timeoutMs;
    traceEnabled;
    constructor(registry, options = {}) {
        this.registry = registry;
        this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
        this.traceEnabled = options.traceEnabled ?? false;
    }
    /**
     * Create a new dispatcher with timeout
     */
    withTimeout(ms) {
        return new Dispatcher(this.registry, {
            timeoutMs: ms,
            traceEnabled: this.traceEnabled
        });
    }
    /**
     * Create a new dispatcher with tracing
     */
    withTrace(enabled) {
        return new Dispatcher(this.registry, {
            timeoutMs: this.timeoutMs,
            traceEnabled: enabled
        });
    }
    /**
     * Execute a request
     * INV-ROUTER-01: Unknown operations return error
     * INV-ROUTER-02: Execution time included
     * INV-ROUTER-03: Request ID preserved
     */
    async execute(request) {
        const startTime = Date.now();
        // Check if operation is registered
        const handler = this.registry.get(request.type);
        if (!handler) {
            return this.createErrorResponse(request.id, unknownOperationError(request.type), startTime);
        }
        // Create handler context
        const context = {
            requestId: request.id,
            startTime,
            seed: request.seed ?? DEFAULT_SEED,
            traceEnabled: this.traceEnabled
        };
        // Execute with timeout
        try {
            const result = await this.executeWithTimeout(() => handler(request.payload, context), request.type);
            return this.createSuccessResponse(request.id, result, startTime, context);
        }
        catch (err) {
            return this.createErrorResponse(request.id, extractNexusError(err), startTime);
        }
    }
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════════════════
    async executeWithTimeout(fn, operationType) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(timeoutError(operationType, this.timeoutMs));
            }, this.timeoutMs);
            fn()
                .then(result => {
                clearTimeout(timer);
                resolve(result);
            })
                .catch(err => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }
    createSuccessResponse(requestId, data, startTime, context) {
        const executionTimeMs = Date.now() - startTime;
        return {
            requestId,
            success: true,
            data,
            executionTimeMs
        };
    }
    createErrorResponse(requestId, error, startTime) {
        return {
            requestId,
            success: false,
            error,
            executionTimeMs: Date.now() - startTime
        };
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Create a new dispatcher with the given registry
 */
export function createDispatcher(registry, options) {
    return new Dispatcher(registry, options);
}
//# sourceMappingURL=dispatcher.js.map