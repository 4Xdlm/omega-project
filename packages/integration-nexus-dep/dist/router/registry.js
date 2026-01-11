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
// ═══════════════════════════════════════════════════════════════════════════════
// OPERATION REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
export class OperationRegistry {
    handlers;
    constructor() {
        this.handlers = new Map();
    }
    /**
     * Register an operation handler
     */
    register(type, handler) {
        if (this.handlers.has(type)) {
            throw new Error(`Operation '${type}' is already registered`);
        }
        this.handlers.set(type, {
            type,
            handler: handler,
            registeredAt: new Date().toISOString()
        });
    }
    /**
     * Get a registered handler
     */
    get(type) {
        const registered = this.handlers.get(type);
        return registered?.handler;
    }
    /**
     * Check if operation is registered
     */
    has(type) {
        return this.handlers.has(type);
    }
    /**
     * List all registered operations
     */
    list() {
        return Array.from(this.handlers.keys());
    }
    /**
     * Get registration metadata
     */
    getMetadata(type) {
        return this.handlers.get(type);
    }
    /**
     * Unregister an operation (for testing)
     */
    unregister(type) {
        return this.handlers.delete(type);
    }
    /**
     * Clear all registrations (for testing)
     */
    clear() {
        this.handlers.clear();
    }
    /**
     * Get count of registered operations
     */
    get size() {
        return this.handlers.size;
    }
}
// ═══════════════════════════════════════════════════════════════════════════════
// SINGLETON REGISTRY
// ═══════════════════════════════════════════════════════════════════════════════
let defaultRegistry = null;
/**
 * Get the default registry instance
 */
export function getDefaultRegistry() {
    if (!defaultRegistry) {
        defaultRegistry = new OperationRegistry();
    }
    return defaultRegistry;
}
/**
 * Reset the default registry (for testing)
 */
export function resetDefaultRegistry() {
    if (defaultRegistry) {
        defaultRegistry.clear();
    }
    defaultRegistry = null;
}
//# sourceMappingURL=registry.js.map