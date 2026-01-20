/**
 * proof-utils - Manifest, Verification, Snapshot & Diff
 * Standard: NASA-Grade L4
 * Version: 2.0.0
 *
 * @packageDocumentation
 * @module @omega-private/proof-utils
 * @public
 */

/**
 * Proof utils module version
 * @public
 */
export const PROOF_UTILS_VERSION = '2.0.0';

/**
 * Type definitions
 * @public
 */
export * from './types.js';

/**
 * Error classes
 * @public
 */
export * from './errors.js';

/**
 * Manifest building
 * @public
 */
export * from './manifest.js';

/**
 * Verification functions
 * @public
 */
export * from './verify.js';

/**
 * Snapshot functionality
 * @public
 */
export * from './snapshot.js';

/**
 * Diff functionality
 * @public
 */
export * from './diff.js';

/**
 * Serialization utilities
 * @public
 */
export * from './serialize.js';
