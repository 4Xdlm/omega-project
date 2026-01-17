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

import type {
  NexusRequest,
  NexusResponse,
  NexusOperationType
} from "../contracts/types.js";
import { generateRequestId, getTimestamp } from "../index.js";
import {
  OperationRegistry,
  getDefaultRegistry,
  type OperationHandler,
  type HandlerContext
} from "./registry.js";
import { Dispatcher, createDispatcher, type DispatcherOptions } from "./dispatcher.js";

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER OPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export interface RouterOptions extends DispatcherOptions {
  readonly defaultSeed?: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export class NexusRouter {
  private readonly registry: OperationRegistry;
  private readonly dispatcher: Dispatcher;
  private readonly defaultSeed: number;

  constructor(options: RouterOptions = {}) {
    this.registry = new OperationRegistry();
    this.dispatcher = createDispatcher(this.registry, options);
    this.defaultSeed = options.defaultSeed ?? 42;
  }

  /**
   * Register an operation handler
   */
  register<T, R>(
    type: NexusOperationType,
    handler: OperationHandler<T, R>
  ): this {
    this.registry.register(type, handler);
    return this;
  }

  /**
   * Dispatch a request
   */
  async dispatch<T, R>(request: NexusRequest<T>): Promise<NexusResponse<R>> {
    return this.dispatcher.execute<T, R>(request);
  }

  /**
   * Convenience method to dispatch with just payload
   */
  async execute<T, R>(
    type: NexusOperationType,
    payload: T,
    seed?: number
  ): Promise<NexusResponse<R>> {
    const request: NexusRequest<T> = {
      id: generateRequestId(),
      type,
      payload,
      timestamp: getTimestamp(),
      seed: seed ?? this.defaultSeed
    };
    return this.dispatch<T, R>(request);
  }

  /**
   * Get list of registered operations
   */
  getOperations(): readonly NexusOperationType[] {
    return this.registry.list();
  }

  /**
   * Check if operation is registered
   */
  hasOperation(type: NexusOperationType): boolean {
    return this.registry.has(type);
  }

  /**
   * Create a router with timeout
   */
  withTimeout(ms: number): NexusRouter {
    const newRouter = new NexusRouter({
      timeoutMs: ms,
      defaultSeed: this.defaultSeed
    });
    // Copy registrations
    for (const type of this.registry.list()) {
      const handler = this.registry.get(type);
      if (handler) {
        newRouter.register(type, handler);
      }
    }
    return newRouter;
  }

  /**
   * Create a router with tracing enabled
   */
  withTrace(enabled: boolean): NexusRouter {
    const newRouter = new NexusRouter({
      traceEnabled: enabled,
      defaultSeed: this.defaultSeed
    });
    // Copy registrations
    for (const type of this.registry.list()) {
      const handler = this.registry.get(type);
      if (handler) {
        newRouter.register(type, handler);
      }
    }
    return newRouter;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new NEXUS router
 */
export function createRouter(options?: RouterOptions): NexusRouter {
  return new NexusRouter(options);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRE-CONFIGURED ROUTER WITH DEFAULT HANDLERS — DEPENDENCY INJECTION
// ═══════════════════════════════════════════════════════════════════════════════

import { GenomeAdapter } from "../adapters/genome.adapter.js";
import { MyceliumAdapter } from "../adapters/mycelium.adapter.js";
import { MyceliumBioAdapter } from "../adapters/mycelium-bio.adapter.js";
import type { AnalyzeTextInput, AnalyzeTextOutput } from "../contracts/io.js";

/**
 * Interface for validation adapter (DI)
 */
export interface IRouterValidationAdapter {
  validateInput(input: { content: string; seed?: number }): Promise<{
    valid: boolean;
    normalizedContent?: string;
    rejectionMessage?: string;
  }>;
}

/**
 * Interface for genome analysis adapter (DI)
 */
export interface IRouterGenomeAdapter {
  analyzeText(content: string, seed: number): Promise<{
    fingerprint: string;
    version: string;
    axes: { emotion: { distribution: Record<string, number> } };
  }>;
}

/**
 * Interface for DNA building adapter (DI)
 */
export interface IRouterDNAAdapter {
  buildDNA(input: { validatedContent: string; seed: number; mode: string }): Promise<{
    rootHash: string;
    nodeCount: number;
  }>;
}

/**
 * Adapters bundle for router injection
 */
export interface RouterAdapters {
  validation?: IRouterValidationAdapter;
  genome?: IRouterGenomeAdapter;
  dna?: IRouterDNAAdapter;
}

/**
 * Options for createDefaultRouter with optional adapters
 */
export interface DefaultRouterOptions extends RouterOptions {
  adapters?: RouterAdapters;
}

/**
 * Create a router with default NEXUS handlers pre-registered
 * @param options Router options including optional adapters for DI
 */
export function createDefaultRouter(options?: DefaultRouterOptions): NexusRouter {
  const router = createRouter(options);

  // Adapters (use injected or default)
  const genomeAdapter = options?.adapters?.genome ?? new GenomeAdapter();
  const myceliumAdapter = options?.adapters?.validation ?? new MyceliumAdapter();
  const bioAdapter = options?.adapters?.dna ?? new MyceliumBioAdapter();

  // Register ANALYZE_TEXT handler
  router.register<AnalyzeTextInput, AnalyzeTextOutput>(
    "ANALYZE_TEXT",
    async (payload, context) => {
      const { content, seed = context.seed } = payload;

      // Validate input
      const validation = await myceliumAdapter.validateInput({
        content,
        seed
      });

      if (!validation.valid) {
        throw new Error(validation.rejectionMessage || "Validation failed");
      }

      // Analyze with genome
      const genome = await genomeAdapter.analyzeText(
        validation.normalizedContent!,
        seed
      );

      // Build DNA
      const dna = await bioAdapter.buildDNA({
        validatedContent: validation.normalizedContent!,
        seed,
        mode: "auto"
      });

      return {
        genomeFingerprint: genome.fingerprint,
        dnaRootHash: dna.rootHash,
        emotionDistribution: genome.axes.emotion.distribution
      };
    }
  );

  // Register VALIDATE_INPUT handler
  router.register("VALIDATE_INPUT", async (payload, context) => {
    const validation = await myceliumAdapter.validateInput(payload as never);
    return validation;
  });

  // Register BUILD_DNA handler
  router.register("BUILD_DNA", async (payload, context) => {
    const result = await bioAdapter.buildDNA(payload as never);
    return result;
  });

  return router;
}
