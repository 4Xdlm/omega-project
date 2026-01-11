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
import { generateRequestId, getTimestamp } from "../index.js";
import { OperationRegistry } from "./registry.js";
import { createDispatcher } from "./dispatcher.js";
// ═══════════════════════════════════════════════════════════════════════════════
// NEXUS ROUTER
// ═══════════════════════════════════════════════════════════════════════════════
export class NexusRouter {
    registry;
    dispatcher;
    defaultSeed;
    constructor(options = {}) {
        this.registry = new OperationRegistry();
        this.dispatcher = createDispatcher(this.registry, options);
        this.defaultSeed = options.defaultSeed ?? 42;
    }
    /**
     * Register an operation handler
     */
    register(type, handler) {
        this.registry.register(type, handler);
        return this;
    }
    /**
     * Dispatch a request
     */
    async dispatch(request) {
        return this.dispatcher.execute(request);
    }
    /**
     * Convenience method to dispatch with just payload
     */
    async execute(type, payload, seed) {
        const request = {
            id: generateRequestId(),
            type,
            payload,
            timestamp: getTimestamp(),
            seed: seed ?? this.defaultSeed
        };
        return this.dispatch(request);
    }
    /**
     * Get list of registered operations
     */
    getOperations() {
        return this.registry.list();
    }
    /**
     * Check if operation is registered
     */
    hasOperation(type) {
        return this.registry.has(type);
    }
    /**
     * Create a router with timeout
     */
    withTimeout(ms) {
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
    withTrace(enabled) {
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
export function createRouter(options) {
    return new NexusRouter(options);
}
// ═══════════════════════════════════════════════════════════════════════════════
// PRE-CONFIGURED ROUTER WITH DEFAULT HANDLERS
// ═══════════════════════════════════════════════════════════════════════════════
import { GenomeAdapter } from "../adapters/genome.adapter.js";
import { MyceliumAdapter } from "../adapters/mycelium.adapter.js";
import { MyceliumBioAdapter } from "../adapters/mycelium-bio.adapter.js";
/**
 * Create a router with default NEXUS handlers pre-registered
 */
export function createDefaultRouter(options) {
    const router = createRouter(options);
    // Adapters
    const genomeAdapter = new GenomeAdapter();
    const myceliumAdapter = new MyceliumAdapter();
    const bioAdapter = new MyceliumBioAdapter();
    // Register ANALYZE_TEXT handler
    router.register("ANALYZE_TEXT", async (payload, context) => {
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
        const genome = await genomeAdapter.analyzeText(validation.normalizedContent, seed);
        // Build DNA
        const dna = await bioAdapter.buildDNA({
            validatedContent: validation.normalizedContent,
            seed,
            mode: "auto"
        });
        return {
            genomeFingerprint: genome.fingerprint,
            dnaRootHash: dna.rootHash,
            emotionDistribution: genome.axes.emotion.distribution
        };
    });
    // Register VALIDATE_INPUT handler
    router.register("VALIDATE_INPUT", async (payload, context) => {
        const validation = await myceliumAdapter.validateInput(payload);
        return validation;
    });
    // Register BUILD_DNA handler
    router.register("BUILD_DNA", async (payload, context) => {
        const result = await bioAdapter.buildDNA(payload);
        return result;
    });
    return router;
}
//# sourceMappingURL=router.js.map