/**
 * nexus/raw - Raw Storage
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with backends, encryption, TTL
 *
 * @packageDocumentation
 * @module @omega-private/nexus-raw
 * @public
 */

/**
 * Raw module version
 * @public
 */
export const RAW_VERSION = '2.0.0' as const;

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
 * Path utilities
 * @public
 */
export * from './utils/paths.js';

/**
 * Compression utilities
 * @public
 */
export * from './utils/compression.js';

/**
 * Encryption utilities
 * @public
 */
export * from './utils/encryption.js';

/**
 * Keyring management
 * @public
 */
export * from './utils/keyring.js';

/**
 * Checksum utilities
 * @public
 */
export * from './utils/checksum.js';

/**
 * In-memory storage backend
 * @public
 */
export { MemoryBackend } from './backends/memoryBackend.js';

/**
 * File-based storage backend
 * @public
 */
export { FileBackend } from './backends/fileBackend.js';

/**
 * Main Raw storage
 * @public
 */
export { RawStorage } from './storage.js';
export type { RawStorageConfig } from './storage.js';
