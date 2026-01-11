/**
 * @fileoverview SHA-256 hashing utilities using Node.js crypto.
 * All hashes are deterministic given the same input.
 * @module @omega/orchestrator-core/util/hash
 */
/**
 * Computes SHA-256 hash of a string.
 * @param input - String to hash
 * @returns Lowercase hex-encoded SHA-256 hash
 * @example
 * ```typescript
 * sha256('hello') // '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
 * ```
 */
export declare function sha256(input: string): string;
/**
 * Computes SHA-256 hash of a Buffer.
 * @param input - Buffer to hash
 * @returns Lowercase hex-encoded SHA-256 hash
 */
export declare function sha256Buffer(input: Buffer): string;
/**
 * Computes SHA-256 hash of any JSON-serializable value.
 * Uses stable JSON serialization for deterministic output.
 * @param value - Value to hash (must be JSON-serializable)
 * @returns Lowercase hex-encoded SHA-256 hash
 */
export declare function sha256Json(value: unknown): string;
/**
 * Verifies that a string matches an expected SHA-256 hash.
 * @param input - String to verify
 * @param expectedHash - Expected SHA-256 hash (lowercase hex)
 * @returns true if hash matches, false otherwise
 */
export declare function verifySha256(input: string, expectedHash: string): boolean;
//# sourceMappingURL=hash.d.ts.map