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

import type {
  NexusRequest,
  NexusResponse,
  NexusError,
  ExecutionTrace,
  TraceStep
} from "../contracts/types.js";
import {
  unknownOperationError,
  timeoutError,
  extractNexusError
} from "../contracts/errors.js";
import { DEFAULT_SEED } from "../contracts/io.js";
import type { OperationRegistry, HandlerContext } from "./registry.js";

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface DispatcherOptions {
  readonly timeoutMs?: number;
  readonly traceEnabled?: boolean;
}

const DEFAULT_TIMEOUT_MS = 30000; // 30 seconds

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Routes requests to registered operation handlers with timeout protection.
 *
 * The dispatcher acts as the central routing layer, ensuring:
 * - INV-ROUTER-01: Unknown operations return structured errors (not exceptions)
 * - INV-ROUTER-02: All responses include execution time for metrics
 * - INV-ROUTER-03: Request ID is preserved for correlation
 *
 * Immutable by design: `withTimeout()` and `withTrace()` return new instances.
 *
 * @example
 * ```ts
 * const dispatcher = createDispatcher(registry, { timeoutMs: 5000 });
 *
 * const response = await dispatcher.execute({
 *   id: 'req-123',
 *   type: 'analyze',
 *   payload: { text: 'Hello world' },
 * });
 *
 * if (response.success) {
 *   console.log(response.data);
 * }
 * ```
 */
export class Dispatcher {
  private readonly registry: OperationRegistry;
  private timeoutMs: number;
  private traceEnabled: boolean;

  /**
   * Creates a dispatcher bound to an operation registry.
   * Prefer using `createDispatcher()` factory.
   */
  constructor(registry: OperationRegistry, options: DispatcherOptions = {}) {
    this.registry = registry;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.traceEnabled = options.traceEnabled ?? false;
  }

  /**
   * Create a new dispatcher with a different timeout.
   *
   * Returns a new instance — original dispatcher is unchanged.
   * Use for specific operations that need longer/shorter timeouts.
   *
   * @example
   * ```ts
   * const quickDispatcher = dispatcher.withTimeout(1000);
   * const slowDispatcher = dispatcher.withTimeout(120000);
   * ```
   */
  withTimeout(ms: number): Dispatcher {
    return new Dispatcher(this.registry, {
      timeoutMs: ms,
      traceEnabled: this.traceEnabled
    });
  }

  /**
   * Create a new dispatcher with tracing enabled or disabled.
   *
   * Returns a new instance — original dispatcher is unchanged.
   * Enable tracing during development/debugging, disable in production.
   */
  withTrace(enabled: boolean): Dispatcher {
    return new Dispatcher(this.registry, {
      timeoutMs: this.timeoutMs,
      traceEnabled: enabled
    });
  }

  /**
   * Execute a request by routing to its registered handler.
   *
   * Never throws — all errors are captured in the response object.
   * The response always includes `executionTimeMs` for performance monitoring.
   *
   * INV-ROUTER-01: Unknown operations return UNKNOWN_OPERATION error.
   * INV-ROUTER-02: Execution time always included.
   * INV-ROUTER-03: Request ID always preserved in response.
   *
   * @example
   * ```ts
   * const response = await dispatcher.execute(request);
   * console.log(`Completed in ${response.executionTimeMs}ms`);
   * ```
   */
  async execute<T, R>(request: NexusRequest<T>): Promise<NexusResponse<R>> {
    const startTime = Date.now();

    // Check if operation is registered
    const handler = this.registry.get(request.type);
    if (!handler) {
      return this.createErrorResponse<R>(
        request.id,
        unknownOperationError(request.type),
        startTime
      );
    }

    // Create handler context
    const context: HandlerContext = {
      requestId: request.id,
      startTime,
      seed: request.seed ?? DEFAULT_SEED,
      traceEnabled: this.traceEnabled
    };

    // Execute with timeout
    try {
      const result = await this.executeWithTimeout<R>(
        () => handler(request.payload, context) as Promise<R>,
        request.type
      );

      return this.createSuccessResponse<R>(
        request.id,
        result,
        startTime,
        context
      );
    } catch (err) {
      return this.createErrorResponse<R>(
        request.id,
        extractNexusError(err),
        startTime
      );
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  private async executeWithTimeout<R>(
    fn: () => Promise<R>,
    operationType: string
  ): Promise<R> {
    return new Promise<R>((resolve, reject) => {
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

  private createSuccessResponse<R>(
    requestId: string,
    data: R,
    startTime: number,
    context: HandlerContext
  ): NexusResponse<R> {
    const executionTimeMs = Date.now() - startTime;

    return {
      requestId,
      success: true,
      data,
      executionTimeMs
    };
  }

  private createErrorResponse<R>(
    requestId: string,
    error: NexusError,
    startTime: number
  ): NexusResponse<R> {
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
 * Factory function to create a dispatcher bound to an operation registry.
 *
 * @example
 * ```ts
 * const registry = new OperationRegistry();
 * registry.register('echo', async (payload) => payload);
 *
 * const dispatcher = createDispatcher(registry, { timeoutMs: 5000 });
 * ```
 */
export function createDispatcher(
  registry: OperationRegistry,
  options?: DispatcherOptions
): Dispatcher {
  return new Dispatcher(registry, options);
}
