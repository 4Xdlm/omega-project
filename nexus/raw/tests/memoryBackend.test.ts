/**
 * Memory Backend Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryBackend } from '../src/backends/memoryBackend.js';
import { mockClock } from '../src/types.js';
import type { EntryMetadata } from '../src/types.js';
import { RawStorageQuotaError } from '../src/errors.js';

const createMetadata = (clock: { now(): number }): EntryMetadata => ({
  createdAt: clock.now(),
  updatedAt: clock.now(),
  expiresAt: null,
  compressed: false,
  encrypted: false,
  size: 0,
  checksum: 'test-checksum',
});

describe('MemoryBackend', () => {
  let backend: MemoryBackend;
  let clock: ReturnType<typeof mockClock>;

  beforeEach(() => {
    clock = mockClock(1000);
    backend = new MemoryBackend({ clock });
  });

  describe('store', () => {
    it('stores data', async () => {
      const data = Buffer.from('Hello');
      const metadata = createMetadata(clock);

      await backend.store('test-key', data, metadata);

      const entry = await backend.retrieve('test-key');
      expect(entry).not.toBeNull();
      expect(entry!.data.equals(data)).toBe(true);
    });

    it('overwrites existing key', async () => {
      const data1 = Buffer.from('First');
      const data2 = Buffer.from('Second');
      const metadata = createMetadata(clock);

      await backend.store('key', data1, metadata);
      await backend.store('key', data2, metadata);

      const entry = await backend.retrieve('key');
      expect(entry!.data.toString()).toBe('Second');
    });

    it('enforces quota', async () => {
      const backend = new MemoryBackend({ clock, maxSize: 100 });
      const data = Buffer.alloc(101);
      const metadata = createMetadata(clock);

      await expect(backend.store('key', data, metadata)).rejects.toThrow(
        RawStorageQuotaError
      );
    });

    it('allows store after delete frees space', async () => {
      const backend = new MemoryBackend({ clock, maxSize: 100 });
      const data = Buffer.alloc(50);
      const metadata = createMetadata(clock);

      await backend.store('key1', data, metadata);
      await backend.store('key2', data, metadata);

      // Should fail - 150 bytes > 100
      await expect(
        backend.store('key3', Buffer.alloc(10), metadata)
      ).rejects.toThrow(RawStorageQuotaError);

      // Delete one
      await backend.delete('key1');

      // Now should succeed
      await backend.store('key3', Buffer.alloc(10), metadata);
    });
  });

  describe('retrieve', () => {
    it('returns null for non-existent key', async () => {
      const entry = await backend.retrieve('nonexistent');
      expect(entry).toBeNull();
    });

    it('returns frozen entry', async () => {
      const data = Buffer.from('Hello');
      const metadata = createMetadata(clock);
      await backend.store('key', data, metadata);

      const entry = await backend.retrieve('key');

      expect(Object.isFrozen(entry)).toBe(true);
    });
  });

  describe('delete', () => {
    it('deletes existing key', async () => {
      const metadata = createMetadata(clock);
      await backend.store('key', Buffer.from('test'), metadata);

      const deleted = await backend.delete('key');

      expect(deleted).toBe(true);
      expect(await backend.exists('key')).toBe(false);
    });

    it('returns false for non-existent key', async () => {
      const deleted = await backend.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('exists', () => {
    it('returns true for existing key', async () => {
      const metadata = createMetadata(clock);
      await backend.store('key', Buffer.from('test'), metadata);

      expect(await backend.exists('key')).toBe(true);
    });

    it('returns false for non-existent key', async () => {
      expect(await backend.exists('nonexistent')).toBe(false);
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const metadata = createMetadata(clock);
      await backend.store('c-key', Buffer.from('c'), metadata);
      await backend.store('a-key', Buffer.from('a'), metadata);
      await backend.store('b-key', Buffer.from('b'), metadata);
      await backend.store('other', Buffer.from('x'), metadata);
    });

    it('lists all keys sorted', async () => {
      const result = await backend.list();

      expect(result.keys).toEqual(['a-key', 'b-key', 'c-key', 'other']);
      expect(result.total).toBe(4);
      expect(result.hasMore).toBe(false);
    });

    it('filters by prefix', async () => {
      const result = await backend.list({ prefix: 'a-' });

      expect(result.keys).toEqual(['a-key']);
      expect(result.total).toBe(1);
    });

    it('applies pagination', async () => {
      const result = await backend.list({ limit: 2, offset: 1 });

      expect(result.keys).toEqual(['b-key', 'c-key']);
      expect(result.total).toBe(4);
      expect(result.hasMore).toBe(true);
    });

    it('includes metadata when requested', async () => {
      const result = await backend.list({ includeMetadata: true });

      expect(result.entries).toBeDefined();
      expect(result.entries!.length).toBe(4);
    });
  });

  describe('clear', () => {
    it('removes all entries', async () => {
      const metadata = createMetadata(clock);
      await backend.store('key1', Buffer.from('1'), metadata);
      await backend.store('key2', Buffer.from('2'), metadata);

      await backend.clear();

      const result = await backend.list();
      expect(result.keys).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', async () => {
      const metadata1 = { ...createMetadata(clock), createdAt: 1000 };
      const metadata2 = { ...createMetadata(clock), createdAt: 2000 };
      await backend.store('key1', Buffer.from('hello'), metadata1);
      await backend.store('key2', Buffer.from('world'), metadata2);

      const stats = await backend.getStats();

      expect(stats.type).toBe('memory');
      expect(stats.entryCount).toBe(2);
      expect(stats.totalSize).toBe(10);
      expect(stats.oldestEntry).toBe(1000);
      expect(stats.newestEntry).toBe(2000);
    });
  });
});
