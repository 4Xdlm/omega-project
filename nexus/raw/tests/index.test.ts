/**
 * Raw Module Entry Point Tests - NASA-Grade
 * Phase A: Updated for new implementation
 */

import { describe, it, expect } from 'vitest';
import * as Raw from '../src/index.js';

describe('nexus/raw', () => {
  it('should export version constant', () => {
    expect(Raw.RAW_VERSION).toBe('2.0.0');
  });

  it('should export RawStorage class', () => {
    expect(Raw.RawStorage).toBeDefined();
    expect(typeof Raw.RawStorage).toBe('function');
  });

  it('should export MemoryBackend class', () => {
    expect(Raw.MemoryBackend).toBeDefined();
    expect(typeof Raw.MemoryBackend).toBe('function');
  });

  it('should export FileBackend class', () => {
    expect(Raw.FileBackend).toBeDefined();
    expect(typeof Raw.FileBackend).toBe('function');
  });

  it('should export error classes', () => {
    expect(Raw.RawError).toBeDefined();
    expect(Raw.RawPathError).toBeDefined();
    expect(Raw.RawStorageError).toBeDefined();
    expect(Raw.RawCryptoError).toBeDefined();
    expect(Raw.RawBackendError).toBeDefined();
  });

  it('should export utility functions', () => {
    expect(Raw.compress).toBeDefined();
    expect(Raw.decompress).toBeDefined();
    expect(Raw.encrypt).toBeDefined();
    expect(Raw.decrypt).toBeDefined();
    expect(Raw.sanitizeKey).toBeDefined();
    expect(Raw.computeChecksum).toBeDefined();
  });

  it('should export keyring utilities', () => {
    expect(Raw.SimpleKeyring).toBeDefined();
    expect(Raw.createKeyring).toBeDefined();
  });

  it('should export clock utilities', () => {
    expect(Raw.systemClock).toBeDefined();
    expect(Raw.mockClock).toBeDefined();
    expect(typeof Raw.systemClock.now).toBe('function');
  });

  it('should have valid StoreOptions type', () => {
    const options: Raw.StoreOptions = {
      ttl: 1000,
      compress: true,
      encrypt: false,
    };
    expect(options.ttl).toBe(1000);
  });

  it('should have valid StorageResult type', () => {
    const result: Raw.StorageResult = {
      success: true,
      key: 'test-key',
    };
    expect(result.success).toBe(true);
    expect(result.key).toBe('test-key');
  });

  it('should have valid EntryMetadata type', () => {
    const metadata: Raw.EntryMetadata = {
      createdAt: 1000,
      updatedAt: 1000,
      expiresAt: null,
      compressed: false,
      encrypted: false,
      size: 100,
      checksum: 'abc123',
    };
    expect(metadata.size).toBe(100);
  });
});
