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

import type {
  NexusOperationType,
  NexusRequest,
  NexusResponse,
  ExecutionTrace
} from "../contracts/types.js";

// ═══════════════════════════════════════════════════════════════════════════════
// HANDLER TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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
export type OperationHandler<T = unknown, R = unknown> = (
  payload: T,
  context: HandlerContext
) => Promise<R>;

/**
 * Registered handler with metadata
 */
export interface RegisteredHandler {
  readonly type: NexusOperationType;
  readonly handler: OperationHandler;
  readonly registeredAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Central registry for operation handlers.
 *
 * Enforces unique operation types and provides lookup/enumeration.
 * Each registration is timestamped for debugging and audit purposes.
 *
 * INV-ROUTER-01: Only registered operations can be executed.
 *
 * @example
 * ```ts
 * const registry = new OperationRegistry();
 *
 * registry.register('analyze', async (payload, ctx) => {
 *   return { result: 'analyzed', seed: ctx.seed };
 * });
 *
 * registry.register('transform', async (payload) => {
 *   return { transformed: payload };
 * });
 *
 * console.log(registry.list()); // ['analyze', 'transform']
 * ```
 */
export class OperationRegistry {
  private readonly handlers: Map<NexusOperationType, RegisteredHandler>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a handler for an operation type.
   *
   * Each operation type can only be registered once. Attempting to
   * register a duplicate throws an error to prevent silent overwrites.
   *
   * @throws Error if operation type is already registered
   */
  register<T, R>(
    type: NexusOperationType,
    handler: OperationHandler<T, R>
  ): void {
    if (this.handlers.has(type)) {
      throw new Error(`Operation '${type}' is already registered`);
    }

    this.handlers.set(type, {
      type,
      handler: handler as OperationHandler,
      registeredAt: new Date().toISOString()
    });
  }

  /**
   * Get a registered handler
   */
  get(type: NexusOperationType): OperationHandler | undefined {
    const registered = this.handlers.get(type);
    return registered?.handler;
  }

  /**
   * Check if operation is registered
   */
  has(type: NexusOperationType): boolean {
    return this.handlers.has(type);
  }

  /**
   * List all registered operations
   */
  list(): readonly NexusOperationType[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Get registration metadata
   */
  getMetadata(type: NexusOperationType): RegisteredHandler | undefined {
    return this.handlers.get(type);
  }

  /**
   * Unregister an operation (for testing)
   */
  unregister(type: NexusOperationType): boolean {
    return this.handlers.delete(type);
  }

  /**
   * Clear all registrations (for testing)
   */
  clear(): void {
    this.handlers.clear();
  }

  /**
   * Get count of registered operations
   */
  get size(): number {
    return this.handlers.size;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════

let defaultRegistry: OperationRegistry | null = null;

/**
 * Get the singleton registry instance.
 *
 * Use for application-wide operation registration. Creates the
 * instance on first call (lazy initialization).
 *
 * @example
 * ```ts
 * // In module initialization
 * getDefaultRegistry().register('myOp', myHandler);
 *
 * // In dispatcher setup
 * const dispatcher = createDispatcher(getDefaultRegistry());
 * ```
 */
export function getDefaultRegistry(): OperationRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new OperationRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the singleton registry to initial state.
 *
 * **For testing only** — clears all registrations and releases
 * the singleton instance. Production code should never call this.
 */
export function resetDefaultRegistry(): void {
  if (defaultRegistry) {
    defaultRegistry.clear();
  }
  defaultRegistry = null;
}
