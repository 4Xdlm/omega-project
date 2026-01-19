/**
 * Raw Storage Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { RawStorage } from '../src/storage.js';
import { MemoryBackend } from '../src/backends/memoryBackend.js';
import { createKeyring } from '../src/utils/keyring.js';
import { seededRNG } from '../src/utils/encryption.js';
import { mockClock } from '../src/types.js';
import { RawStorageNotFoundError, RawTTLExpiredError } from '../src/errors.js';

describe('RawStorage', () => {
  let storage: RawStorage;
  let backend: MemoryBackend;
  let currentTime: number;
  let clock: { now(): number };

  beforeEach(() => {
    currentTime = 1000;
    clock = { now: () => currentTime };
    backend = new MemoryBackend({ clock });
    storage = new RawStorage({
      backend,
      clock,
      rng: seededRNG(42),
    });
  });

  describe('store/retrieve', () => {
    it('stores and retrieves data', async () => {
      const data = Buffer.from('Hello, World!');
      await storage.store('test-key', data);

      const retrieved = await storage.retrieve('test-key');
      expect(retrieved.equals(data)).toBe(true);
    });

    it('throws on retrieve non-existent key', async () => {
      await expect(storage.retrieve('nonexistent')).rejects.toThrow(
        RawStorageNotFoundError
      );
    });
  });

  describe('compression', () => {
    it('compresses and decompresses transparently', async () => {
      const data = Buffer.from('Hello, World!'.repeat(100));
      await storage.store('compressed', data, { compress: true });

      const retrieved = await storage.retrieve('compressed');
      expect(retrieved.equals(data)).toBe(true);
    });

    it('stores compressed data smaller than original', async () => {
      const data = Buffer.from('Hello, World!'.repeat(100));
      await storage.store('compressed', data, { compress: true });

      const entry = await backend.retrieve('compressed');
      expect(entry!.data.length).toBeLessThan(data.length);
    });
  });

  describe('encryption', () => {
    let encryptedStorage: RawStorage;

    beforeEach(() => {
      const keyring = createKeyring(clock, seededRNG(42));
      encryptedStorage = new RawStorage({
        backend,
        clock,
        keyring,
        rng: seededRNG(42),
      });
    });

    it('encrypts and decrypts transparently', async () => {
      const data = Buffer.from('Secret message');
      await encryptedStorage.store('encrypted', data, { encrypt: true });

      const retrieved = await encryptedStorage.retrieve('encrypted');
      expect(retrieved.equals(data)).toBe(true);
    });

    it('stores encrypted data that differs from original', async () => {
      const data = Buffer.from('Secret message');
      await encryptedStorage.store('encrypted', data, { encrypt: true });

      const entry = await backend.retrieve('encrypted');
      expect(entry!.data.equals(data)).toBe(false);
    });
  });

  describe('compression + encryption', () => {
    let fullStorage: RawStorage;

    beforeEach(() => {
      const keyring = createKeyring(clock, seededRNG(42));
      fullStorage = new RawStorage({
        backend,
        clock,
        keyring,
        rng: seededRNG(42),
      });
    });

    it('compresses then encrypts', async () => {
      const data = Buffer.from('Hello, World!'.repeat(100));
      await fullStorage.store('both', data, { compress: true, encrypt: true });

      const retrieved = await fullStorage.retrieve('both');
      expect(retrieved.equals(data)).toBe(true);
    });
  });

  describe('TTL', () => {
    it('retrieves non-expired entry', async () => {
      const data = Buffer.from('Hello');
      await storage.store('ttl-key', data, { ttl: 1000 });

      // Still within TTL
      currentTime = 1500;
      const retrieved = await storage.retrieve('ttl-key');
      expect(retrieved.equals(data)).toBe(true);
    });

    it('throws on expired entry', async () => {
      const data = Buffer.from('Hello');
      await storage.store('ttl-key', data, { ttl: 1000 });

      // After TTL
      currentTime = 3000;
      await expect(storage.retrieve('ttl-key')).rejects.toThrow(
        RawTTLExpiredError
      );
    });

    it('deletes expired entry on retrieve', async () => {
      const data = Buffer.from('Hello');
      await storage.store('ttl-key', data, { ttl: 1000 });

      currentTime = 3000;

      // First retrieve throws
      await expect(storage.retrieve('ttl-key')).rejects.toThrow();

      // Entry should be deleted
      expect(await backend.exists('ttl-key')).toBe(false);
    });

    it('exists returns false for expired entry', async () => {
      const data = Buffer.from('Hello');
      await storage.store('ttl-key', data, { ttl: 1000 });

      currentTime = 3000;

      expect(await storage.exists('ttl-key')).toBe(false);
    });
  });

  describe('delete', () => {
    it('deletes existing entry', async () => {
      await storage.store('key', Buffer.from('test'));

      const deleted = await storage.delete('key');

      expect(deleted).toBe(true);
      expect(await storage.exists('key')).toBe(false);
    });

    it('returns false for non-existent entry', async () => {
      const deleted = await storage.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('exists', () => {
    it('returns true for existing entry', async () => {
      await storage.store('key', Buffer.from('test'));
      expect(await storage.exists('key')).toBe(true);
    });

    it('returns false for non-existent entry', async () => {
      expect(await storage.exists('nonexistent')).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      await storage.store('b-key', Buffer.from('b'));
      await storage.store('a-key', Buffer.from('a'));
      await storage.store('c-key', Buffer.from('c'));
    });

    it('lists all keys', async () => {
      const result = await storage.list();
      expect(result.keys).toContain('a-key');
      expect(result.keys).toContain('b-key');
      expect(result.keys).toContain('c-key');
      expect(result.total).toBe(3);
    });

    it('filters by prefix', async () => {
      const result = await storage.list({ prefix: 'a-' });
      expect(result.keys).toEqual(['a-key']);
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      await storage.store('key1', Buffer.from('1'));
      await storage.store('key2', Buffer.from('2'));

      await storage.clear();

      const result = await storage.list();
      expect(result.keys).toHaveLength(0);
    });
  });

  describe('retrieveWithMetadata', () => {
    it('returns data and metadata', async () => {
      await storage.store('key', Buffer.from('test'), {
        metadata: { custom: 'value' },
      });

      const { data, metadata } = await storage.retrieveWithMetadata('key');

      expect(data.toString()).toBe('test');
      expect(metadata.custom).toEqual({ custom: 'value' });
    });
  });

  describe('cleanupExpired', () => {
    it('removes expired entries', async () => {
      await storage.store('keep', Buffer.from('keep'));
      await storage.store('expire1', Buffer.from('1'), { ttl: 500 });
      await storage.store('expire2', Buffer.from('2'), { ttl: 500 });

      currentTime = 2000;

      const cleaned = await storage.cleanupExpired();

      expect(cleaned).toBe(2);
      expect(await storage.exists('keep')).toBe(true);
      expect(await backend.exists('expire1')).toBe(false);
      expect(await backend.exists('expire2')).toBe(false);
    });
  });

  describe('checksum verification', () => {
    it('verifies checksum on retrieve', async () => {
      await storage.store('key', Buffer.from('test'));

      // Corrupt the stored data
      const entry = await backend.retrieve('key');
      await backend.store('key', Buffer.from('corrupted'), entry!.metadata);

      // Should throw due to checksum mismatch
      await expect(storage.retrieve('key')).rejects.toThrow();
    });
  });

  describe('default options', () => {
    it('applies default TTL', async () => {
      const storageWithDefaults = new RawStorage({
        backend,
        clock,
        defaultTTL: 1000,
      });

      await storageWithDefaults.store('key', Buffer.from('test'));

      const entry = await backend.retrieve('key');
      expect(entry!.metadata.expiresAt).toBe(2000); // 1000 + 1000
    });

    it('applies default compression', async () => {
      const storageWithDefaults = new RawStorage({
        backend,
        clock,
        defaultCompress: true,
      });

      await storageWithDefaults.store('key', Buffer.from('test'.repeat(100)));

      const entry = await backend.retrieve('key');
      expect(entry!.metadata.compressed).toBe(true);
    });
  });

  describe('getters', () => {
    it('returns backend name and type', () => {
      expect(storage.getBackendName()).toBe('memory');
      expect(storage.getBackendType()).toBe('memory');
    });
  });
});
