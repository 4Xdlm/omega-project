"use strict";
/**
 * @fileoverview Core type definitions for the Orchestrator.
 * @module @omega/orchestrator-core/core/types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleAdapterRegistry = exports.SeededIdFactory = void 0;
/**
 * Seeded ID factory for deterministic ID generation.
 */
class SeededIdFactory {
    counter = 0;
    prefix;
    /**
     * Creates an ID factory with a seed-based prefix.
     * @param seed - Seed string for determinism
     */
    constructor(seed) {
        // Use first 8 chars of seed hash as prefix
        this.prefix = seed.substring(0, 8);
    }
    next() {
        const id = `${this.prefix}-${String(this.counter).padStart(6, '0')}`;
        this.counter++;
        return id;
    }
    reset() {
        this.counter = 0;
    }
}
exports.SeededIdFactory = SeededIdFactory;
/**
 * Simple adapter registry implementation.
 */
class SimpleAdapterRegistry {
    adapters = new Map();
    get(kind) {
        return this.adapters.get(kind);
    }
    register(adapter) {
        if (this.adapters.has(adapter.kind)) {
            throw new Error(`Adapter for kind '${adapter.kind}' already registered`);
        }
        this.adapters.set(adapter.kind, adapter);
    }
    kinds() {
        return Array.from(this.adapters.keys()).sort();
    }
}
exports.SimpleAdapterRegistry = SimpleAdapterRegistry;
//# sourceMappingURL=types.js.map