/**
 * Edge Cases — Extreme Sizes Tests
 * Standard: NASA-Grade L4
 *
 * Tests for handling extreme data sizes in Atlas and Raw modules.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AtlasStore } from '../../nexus/atlas/src/index.js';
import { RawStorage, MemoryBackend } from '../../nexus/raw/src/index.js';

// ============================================================
// Atlas Extreme Sizes
// ============================================================

describe('Edge Cases — Atlas Extreme Sizes', () => {
  let store: AtlasStore;

  beforeEach(() => {
    store = new AtlasStore({
      clock: { now: () => Date.now() },
    });
  });

  test('handles 1,000 items', () => {
    const count = 1_000;

    for (let i = 0; i < count; i++) {
      store.insert(`item-${i}`, { index: i, name: `Item ${i}` });
    }

    expect(store.size()).toBe(count);

    // Query with limit
    const result = store.query({ limit: 10 });
    expect(result.views).toHaveLength(10);
    expect(result.total).toBe(count);
  });

  test('handles 10,000 items', () => {
    const count = 10_000;

    for (let i = 0; i < count; i++) {
      store.insert(`item-${i}`, { index: i });
    }

    expect(store.size()).toBe(count);

    // Filter query on large dataset
    const result = store.query({
      filter: { field: 'index', operator: 'lt', value: 100 },
    });
    expect(result.total).toBe(100);
  });

  test('handles 50,000 items with index', () => {
    const count = 50_000;

    // Create index before inserting
    store.createIndex({ name: 'by-category', field: 'category', type: 'hash' });

    for (let i = 0; i < count; i++) {
      store.insert(`item-${i}`, {
        index: i,
        category: `cat-${i % 100}`, // 100 categories
      });
    }

    expect(store.size()).toBe(count);

    // Fast lookup using index
    const indexed = store.lookupByIndex('by-category', 'cat-0');
    expect(indexed.length).toBe(500); // 50000 / 100 = 500 per category
  });

  test('handles view with large data object', () => {
    // Create a view with many fields
    const largeData: Record<string, unknown> = {};
    for (let i = 0; i < 1000; i++) {
      largeData[`field_${i}`] = `value_${i}_${'x'.repeat(100)}`;
    }

    const view = store.insert('large-view', largeData);

    expect(view.data).toBeDefined();
    expect(Object.keys(view.data).length).toBe(1000);

    // Retrieve and verify
    const retrieved = store.get('large-view');
    expect(retrieved).toBeDefined();
    expect(retrieved!.data).toEqual(largeData);
  });

  test('handles deeply nested data structure', () => {
    // Create deeply nested object (10 levels deep)
    const createNested = (depth: number): Record<string, unknown> => {
      if (depth === 0) return { leaf: 'value' };
      return { nested: createNested(depth - 1) };
    };

    const deepData = createNested(10);
    const view = store.insert('deep-nested', deepData);

    expect(view.data).toBeDefined();

    // Verify retrieval
    const retrieved = store.get('deep-nested');
    expect(retrieved).toBeDefined();
    expect(JSON.stringify(retrieved!.data)).toBe(JSON.stringify(deepData));
  });

  test('handles many subscriptions', () => {
    const subscriptionCount = 100;
    const callbacks: string[] = [];

    // Create many subscriptions
    for (let i = 0; i < subscriptionCount; i++) {
      store.subscribe((event) => {
        callbacks.push(`sub-${i}:${event.type}`);
      });
    }

    expect(store.getSubscriptionCount()).toBe(subscriptionCount);

    // Trigger events
    store.insert('test-item', { name: 'test' });

    // All subscriptions should fire
    expect(callbacks.length).toBe(subscriptionCount);
  });
});

// ============================================================
// Raw Extreme Sizes
// ============================================================

describe('Edge Cases — Raw Extreme Sizes', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 500 * 1024 * 1024 }), // 500MB limit
      clock: { now: () => Date.now() },
    });
  });

  test('handles 1 KB data', async () => {
    const data = Buffer.alloc(1024, 'x');
    await storage.store('1kb', data);

    const retrieved = await storage.retrieve('1kb');
    expect(retrieved.length).toBe(1024);
  });

  test('handles 1 MB data', async () => {
    const size = 1024 * 1024; // 1 MB
    const data = Buffer.alloc(size, 'y');
    await storage.store('1mb', data);

    const retrieved = await storage.retrieve('1mb');
    expect(retrieved.length).toBe(size);
  });

  test('handles 10 MB data', async () => {
    const size = 10 * 1024 * 1024; // 10 MB
    const data = Buffer.alloc(size, 'z');
    await storage.store('10mb', data);

    const retrieved = await storage.retrieve('10mb');
    expect(retrieved.length).toBe(size);
  });

  test('handles 50 MB data', async () => {
    const size = 50 * 1024 * 1024; // 50 MB
    const data = Buffer.alloc(size, 'a');
    await storage.store('50mb', data);

    const retrieved = await storage.retrieve('50mb');
    expect(retrieved.length).toBe(size);
  });

  test('handles 1,000 small entries', async () => {
    const count = 1_000;

    for (let i = 0; i < count; i++) {
      await storage.store(`key-${i}`, Buffer.from(`data-${i}`));
    }

    const list = await storage.list();
    expect(list.keys.length).toBe(count);
  });

  test('handles 10,000 small entries', async () => {
    const count = 10_000;

    for (let i = 0; i < count; i++) {
      await storage.store(`key-${i}`, Buffer.from(`value-${i}`));
    }

    const list = await storage.list();
    expect(list.keys.length).toBe(count);

    // Verify random access
    const mid = await storage.retrieve(`key-${count / 2}`);
    expect(mid.toString()).toBe(`value-${count / 2}`);
  });

  test('handles empty data', async () => {
    const data = Buffer.alloc(0);
    await storage.store('empty', data);

    const retrieved = await storage.retrieve('empty');
    expect(retrieved.length).toBe(0);
  });

  test('handles single byte data', async () => {
    const data = Buffer.from([0x42]);
    await storage.store('single-byte', data);

    const retrieved = await storage.retrieve('single-byte');
    expect(retrieved.length).toBe(1);
    expect(retrieved[0]).toBe(0x42);
  });
});

// ============================================================
// Memory Limits
// ============================================================

describe('Edge Cases — Memory Limits', () => {
  test('respects memory quota', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 1024 }), // 1KB limit
      clock: { now: () => Date.now() },
    });

    // Should succeed (500 bytes)
    await storage.store('small', Buffer.alloc(500, 'x'));

    // Should fail (would exceed quota)
    await expect(
      storage.store('large', Buffer.alloc(1000, 'y'))
    ).rejects.toThrow(/quota/i);
  });

  test('allows update within quota', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 2048 }), // 2KB limit
      clock: { now: () => Date.now() },
    });

    // Store 1KB
    await storage.store('data', Buffer.alloc(1024, 'x'));

    // Update to 1.5KB (should succeed, replaces old data)
    await storage.store('data', Buffer.alloc(1536, 'y'));

    const retrieved = await storage.retrieve('data');
    expect(retrieved.length).toBe(1536);
  });
});
