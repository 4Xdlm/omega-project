"use strict";
/**
 * @fileoverview SHA-256 hashing utilities using Node.js crypto.
 * All hashes are deterministic given the same input.
 * @module @omega/orchestrator-core/util/hash
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.sha256 = sha256;
exports.sha256Buffer = sha256Buffer;
exports.sha256Json = sha256Json;
exports.verifySha256 = verifySha256;
const node_crypto_1 = require("node:crypto");
/**
 * Computes SHA-256 hash of a string.
 * @param input - String to hash
 * @returns Lowercase hex-encoded SHA-256 hash
 * @example
 * ```typescript
 * sha256('hello') // '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
 * ```
 */
function sha256(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input, 'utf8').digest('hex');
}
/**
 * Computes SHA-256 hash of a Buffer.
 * @param input - Buffer to hash
 * @returns Lowercase hex-encoded SHA-256 hash
 */
function sha256Buffer(input) {
    return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
}
/**
 * Computes SHA-256 hash of any JSON-serializable value.
 * Uses stable JSON serialization for deterministic output.
 * @param value - Value to hash (must be JSON-serializable)
 * @returns Lowercase hex-encoded SHA-256 hash
 */
function sha256Json(value) {
    // Import stableStringify to avoid circular dependency at module level
    const { stableStringify } = require('./stableJson.js');
    return sha256(stableStringify(value));
}
/**
 * Verifies that a string matches an expected SHA-256 hash.
 * @param input - String to verify
 * @param expectedHash - Expected SHA-256 hash (lowercase hex)
 * @returns true if hash matches, false otherwise
 */
function verifySha256(input, expectedHash) {
    return sha256(input) === expectedHash.toLowerCase();
}
//# sourceMappingURL=hash.js.map