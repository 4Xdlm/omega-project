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

export class OperationRegistry {
  private readonly handlers: Map<NexusOperationType, RegisteredHandler>;

  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register an operation handler
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
 * Get the default registry instance
 */
export function getDefaultRegistry(): OperationRegistry {
  if (!defaultRegistry) {
    defaultRegistry = new OperationRegistry();
  }
  return defaultRegistry;
}

/**
 * Reset the default registry (for testing)
 */
export function resetDefaultRegistry(): void {
  if (defaultRegistry) {
    defaultRegistry.clear();
  }
  defaultRegistry = null;
}
