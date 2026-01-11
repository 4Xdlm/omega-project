"use strict";
/**
 * @fileoverview RunContext - Execution context with injectable dependencies.
 * Ensures deterministic execution through dependency injection.
 * @module @omega/orchestrator-core/core/RunContext
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunContext = void 0;
exports.createRunContext = createRunContext;
exports.isValidRunContextData = isValidRunContextData;
const clock_js_1 = require("../util/clock.js");
const hash_js_1 = require("../util/hash.js");
const types_js_1 = require("./types.js");
/**
 * Captures current platform information.
 * Called once at context creation, immutable thereafter.
 */
function capturePlatformInfo() {
    return {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        pid: process.pid,
    };
}
/**
 * RunContext implementation.
 * Provides deterministic execution context through dependency injection.
 */
class RunContext {
    run_id;
    seed;
    clock;
    platform;
    created_at;
    idFactory;
    /**
     * Creates a new RunContext.
     * @param options - Context options including seed (required)
     * @throws Error if seed is empty
     */
    constructor(options) {
        if (!options.seed || options.seed.trim() === '') {
            throw new Error('RunContext requires a non-empty seed');
        }
        this.seed = options.seed;
        this.clock = options.clock ?? (0, clock_js_1.createSystemClock)();
        this.idFactory = options.idFactory ?? new types_js_1.SeededIdFactory((0, hash_js_1.sha256)(options.seed));
        this.platform = capturePlatformInfo();
        this.created_at = this.clock.nowISO();
        this.run_id = this.idFactory.next();
    }
    /**
     * Generates a new unique ID using the injected factory.
     * Deterministic given the same seed.
     * @returns Unique ID string
     */
    generateId() {
        return this.idFactory.next();
    }
    /**
     * Gets current timestamp from injected clock.
     * @returns ISO timestamp string
     */
    timestamp() {
        return this.clock.nowISO();
    }
    /**
     * Converts context to plain data object (for serialization).
     * @returns RunContextData object
     */
    toData() {
        return {
            run_id: this.run_id,
            seed: this.seed,
            clock: this.clock,
            platform: this.platform,
            created_at: this.created_at,
        };
    }
}
exports.RunContext = RunContext;
/**
 * Creates a RunContext with the given options.
 * @param options - Context options
 * @returns New RunContext instance
 *
 * @example
 * ```typescript
 * // Production usage
 * const ctx = createRunContext({ seed: 'my-seed-123' });
 *
 * // Test usage with deterministic clock
 * const clock = new DeterministicClock(1000);
 * const ctx = createRunContext({ seed: 'test-seed', clock });
 * ```
 */
function createRunContext(options) {
    return new RunContext(options);
}
/**
 * Validates that a value is a valid RunContextData.
 * @param value - Value to validate
 * @returns true if valid
 */
function isValidRunContextData(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return (typeof obj.run_id === 'string' &&
        typeof obj.seed === 'string' &&
        typeof obj.created_at === 'string' &&
        obj.clock !== undefined &&
        typeof obj.platform === 'object');
}
//# sourceMappingURL=RunContext.js.map