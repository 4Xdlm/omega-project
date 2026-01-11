"use strict";
/**
 * @fileoverview Injectable clock abstraction for deterministic time handling.
 * NEVER use Date.now() directly - always inject a Clock instance.
 * @module @omega/orchestrator-core/util/clock
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeterministicClock = exports.SystemClock = void 0;
exports.createSystemClock = createSystemClock;
exports.createDeterministicClock = createDeterministicClock;
/**
 * System clock implementation using real time.
 * Use only in production - NOT for tests requiring determinism.
 */
class SystemClock {
    now() {
        return Date.now();
    }
    nowISO() {
        return new Date(this.now()).toISOString();
    }
}
exports.SystemClock = SystemClock;
/**
 * Deterministic clock for testing.
 * Time advances only when explicitly incremented.
 */
class DeterministicClock {
    currentTime;
    /**
     * Creates a deterministic clock starting at specified time.
     * @param startTime - Initial timestamp in ms (default: 0)
     */
    constructor(startTime = 0) {
        this.currentTime = startTime;
    }
    now() {
        return this.currentTime;
    }
    nowISO() {
        return new Date(this.currentTime).toISOString();
    }
    /**
     * Advances clock by specified milliseconds.
     * @param ms - Milliseconds to advance
     */
    advance(ms) {
        if (ms < 0) {
            throw new Error('Cannot advance clock by negative value');
        }
        this.currentTime += ms;
    }
    /**
     * Sets clock to specific timestamp.
     * @param time - Timestamp in ms
     */
    setTime(time) {
        if (time < 0) {
            throw new Error('Cannot set clock to negative value');
        }
        this.currentTime = time;
    }
    /**
     * Resets clock to initial state (0).
     */
    reset() {
        this.currentTime = 0;
    }
}
exports.DeterministicClock = DeterministicClock;
/**
 * Creates a system clock instance.
 * @returns SystemClock instance
 */
function createSystemClock() {
    return new SystemClock();
}
/**
 * Creates a deterministic clock instance for testing.
 * @param startTime - Initial timestamp in ms (default: 0)
 * @returns DeterministicClock instance
 */
function createDeterministicClock(startTime = 0) {
    return new DeterministicClock(startTime);
}
//# sourceMappingURL=clock.js.map