/**
 * nexus/raw - Raw Storage
 * Standard: NASA-Grade L4
 *
 * Phase A: Full implementation with backends, encryption, TTL
 */

// Version
export const RAW_VERSION = '2.0.0' as const;

// Types
export * from './types.js';

// Errors
export * from './errors.js';

// Utils
export * from './utils/paths.js';
export * from './utils/compression.js';
export * from './utils/encryption.js';
export * from './utils/keyring.js';
export * from './utils/checksum.js';

// Backends
export { MemoryBackend } from './backends/memoryBackend.js';
export { FileBackend } from './backends/fileBackend.js';

// Main Storage
export { RawStorage } from './storage.js';
export type { RawStorageConfig } from './storage.js';
