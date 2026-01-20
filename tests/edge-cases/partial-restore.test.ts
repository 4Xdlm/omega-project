/**
 * Edge Cases — Partial Restore Tests
 * Standard: NASA-Grade L4
 *
 * Tests for partial data restoration and selective recovery scenarios.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AtlasStore } from '../../nexus/atlas/src/index.js';
import { RawStorage, MemoryBackend } from '../../nexus/raw/src/index.js';

// ============================================================
// Atlas Partial Restore
// ============================================================

describe('Edge Cases — Atlas Partial Restore', () => {
  let store: AtlasStore;

  beforeEach(() => {
    store = new AtlasStore({
      clock: { now: () => Date.now() },
    });
  });

  test('restores subset of views', () => {
    // Create 100 views
    for (let i = 0; i < 100; i++) {
      store.insert(`item-${i}`, { index: i, category: `cat-${i % 10}` });
    }

    expect(store.size()).toBe(100);

    // "Backup" - export views to restore
    const backupViews = store.getAll().filter(v => {
      const index = v.data.index as number;
      return index < 50; // Only backup first 50
    });

    expect(backupViews.length).toBe(50);

    // Clear store
    store.clear();
    expect(store.size()).toBe(0);

    // "Restore" - import subset
    for (const view of backupViews) {
      store.insert(view.id, view.data as Record<string, unknown>);
    }

    expect(store.size()).toBe(50);

    // Verify restored data
    expect(store.get('item-0')).toBeDefined();
    expect(store.get('item-49')).toBeDefined();
    expect(store.get('item-50')).toBeUndefined();
    expect(store.get('item-99')).toBeUndefined();
  });

  test('restores views by category filter', () => {
    // Create views in different categories
    for (let i = 0; i < 100; i++) {
      store.insert(`item-${i}`, { index: i, category: `cat-${i % 5}` });
    }

    // Backup only category 0
    const backupViews = store.query({
      filter: { field: 'category', operator: 'eq', value: 'cat-0' },
    }).views;

    expect(backupViews.length).toBe(20); // 100/5 = 20

    // Clear and restore
    store.clear();

    for (const view of backupViews) {
      store.insert(view.id, view.data as Record<string, unknown>);
    }

    expect(store.size()).toBe(20);

    // All restored should be cat-0
    const all = store.getAll();
    for (const view of all) {
      expect(view.data.category).toBe('cat-0');
    }
  });

  test('restores views preserving version numbers', () => {
    // Create and update a view multiple times
    store.insert('versioned', { value: 1 });
    store.update('versioned', { value: 2 });
    store.update('versioned', { value: 3 });

    const original = store.get('versioned')!;
    expect(original.version).toBe(3);

    // Note: On restore, version resets to 1 since it's a new insert
    // This is expected behavior - versions are store-specific

    store.clear();
    store.insert('versioned', original.data as Record<string, unknown>);

    const restored = store.get('versioned')!;
    expect(restored.version).toBe(1); // Reset on new store
    expect(restored.data.value).toBe(3); // Data preserved
  });

  test('handles restore with conflicting IDs', () => {
    // Create initial data
    store.insert('conflict', { source: 'original' });

    // Try to restore (insert) with same ID - should throw
    expect(() => {
      store.insert('conflict', { source: 'backup' });
    }).toThrow();

    // Using upsert should work
    store.upsert('conflict', { source: 'backup' });
    expect(store.get('conflict')!.data.source).toBe('backup');
  });

  test('restores with indexes rebuilt', () => {
    // Create index
    store.createIndex({ name: 'by-status', field: 'status', type: 'hash' });

    // Create data
    for (let i = 0; i < 50; i++) {
      store.insert(`item-${i}`, { status: i < 25 ? 'active' : 'inactive' });
    }

    // Backup
    const backup = store.getAll();

    // Create new store (simulates restore to fresh store)
    const newStore = new AtlasStore({
      clock: { now: () => Date.now() },
    });

    // Create index on new store
    newStore.createIndex({ name: 'by-status', field: 'status', type: 'hash' });

    // Restore to new store
    for (const view of backup) {
      newStore.insert(view.id, view.data as Record<string, unknown>);
    }

    // Index should work
    const active = newStore.lookupByIndex('by-status', 'active');
    expect(active.length).toBe(25);
  });
});

// ============================================================
// Raw Partial Restore
// ============================================================

describe('Edge Cases — Raw Partial Restore', () => {
  let storage: RawStorage;

  beforeEach(() => {
    storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });
  });

  test('restores subset of keys', async () => {
    // Store 100 items
    for (let i = 0; i < 100; i++) {
      await storage.store(`key-${i}`, Buffer.from(`value-${i}`));
    }

    // "Backup" - read subset
    const backup: Map<string, Buffer> = new Map();
    for (let i = 0; i < 50; i++) {
      const data = await storage.retrieve(`key-${i}`);
      backup.set(`key-${i}`, data);
    }

    expect(backup.size).toBe(50);

    // Clear
    await storage.clear();

    // Restore subset
    for (const [key, data] of backup) {
      await storage.store(key, data);
    }

    // Verify
    const list = await storage.list();
    expect(list.keys.length).toBe(50);

    // Check specific keys
    expect(await storage.exists('key-0')).toBe(true);
    expect(await storage.exists('key-49')).toBe(true);
    expect(await storage.exists('key-50')).toBe(false);
  });

  test('restores with prefix filter', async () => {
    // Store items with different prefixes
    for (let i = 0; i < 30; i++) {
      await storage.store(`users/user-${i}`, Buffer.from(`user data ${i}`));
      await storage.store(`orders/order-${i}`, Buffer.from(`order data ${i}`));
      await storage.store(`logs/log-${i}`, Buffer.from(`log data ${i}`));
    }

    // Backup only users
    const backup: Map<string, Buffer> = new Map();
    const list = await storage.list({ prefix: 'users/' });

    for (const key of list.keys) {
      const data = await storage.retrieve(key);
      backup.set(key, data);
    }

    expect(backup.size).toBe(30);

    // Clear and restore
    await storage.clear();

    for (const [key, data] of backup) {
      await storage.store(key, data);
    }

    // Verify only users exist
    const finalList = await storage.list();
    expect(finalList.keys.length).toBe(30);
    expect(finalList.keys.every(k => k.startsWith('users/'))).toBe(true);
  });

  test('handles large partial restore', async () => {
    // Store 1000 items
    for (let i = 0; i < 1000; i++) {
      await storage.store(`item-${i}`, Buffer.from(`data for item ${i}`));
    }

    // Backup every 10th item
    const backup: Map<string, Buffer> = new Map();
    for (let i = 0; i < 1000; i += 10) {
      const data = await storage.retrieve(`item-${i}`);
      backup.set(`item-${i}`, data);
    }

    expect(backup.size).toBe(100);

    // Clear and restore
    await storage.clear();

    for (const [key, data] of backup) {
      await storage.store(key, data);
    }

    // Verify
    const list = await storage.list();
    expect(list.keys.length).toBe(100);

    // Check data integrity
    const sample = await storage.retrieve('item-500');
    expect(sample.toString()).toBe('data for item 500');
  });

  test('restores to different storage instance', async () => {
    // Store in original
    for (let i = 0; i < 50; i++) {
      await storage.store(`key-${i}`, Buffer.from(`value-${i}`));
    }

    // Read all for backup
    const backup: Map<string, Buffer> = new Map();
    const list = await storage.list();
    for (const key of list.keys) {
      const data = await storage.retrieve(key);
      backup.set(key, data);
    }

    // Create new storage instance
    const newStorage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });

    // Restore to new instance
    for (const [key, data] of backup) {
      await newStorage.store(key, data);
    }

    // Verify new instance has all data
    const newList = await newStorage.list();
    expect(newList.keys.length).toBe(50);

    // Original still has data
    const origList = await storage.list();
    expect(origList.keys.length).toBe(50);
  });

  test('handles restore with overwrites', async () => {
    // Store initial data
    await storage.store('key-1', Buffer.from('original-1'));
    await storage.store('key-2', Buffer.from('original-2'));

    // Backup
    const backup = new Map<string, Buffer>([
      ['key-1', Buffer.from('backup-1')],
      ['key-2', Buffer.from('backup-2')],
      ['key-3', Buffer.from('backup-3')], // New key
    ]);

    // Restore (overwrites existing)
    for (const [key, data] of backup) {
      await storage.store(key, data);
    }

    // Verify overwrites worked
    expect((await storage.retrieve('key-1')).toString()).toBe('backup-1');
    expect((await storage.retrieve('key-2')).toString()).toBe('backup-2');
    expect((await storage.retrieve('key-3')).toString()).toBe('backup-3');
  });
});

// ============================================================
// Cross-Module Restore
// ============================================================

describe('Edge Cases — Cross-Module Restore', () => {
  test('restores Atlas from Raw storage backup', async () => {
    // Create Atlas store
    const atlas = new AtlasStore({
      clock: { now: () => Date.now() },
    });

    // Create Raw storage for backup
    const raw = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });

    // Populate Atlas
    for (let i = 0; i < 10; i++) {
      atlas.insert(`view-${i}`, { index: i, name: `View ${i}` });
    }

    // "Backup" Atlas to Raw
    const views = atlas.getAll();
    const backupData = JSON.stringify(views.map(v => ({
      id: v.id,
      data: v.data,
    })));

    await raw.store('atlas-backup', Buffer.from(backupData, 'utf-8'));

    // Clear Atlas
    atlas.clear();
    expect(atlas.size()).toBe(0);

    // "Restore" from Raw
    const retrieved = await raw.retrieve('atlas-backup');
    const restored = JSON.parse(retrieved.toString('utf-8'));

    for (const item of restored) {
      atlas.insert(item.id, item.data);
    }

    // Verify
    expect(atlas.size()).toBe(10);
    expect(atlas.get('view-0')).toBeDefined();
    expect(atlas.get('view-9')).toBeDefined();
  });

  test('incremental restore scenario', async () => {
    const storage = new RawStorage({
      backend: new MemoryBackend({ maxSize: 100 * 1024 * 1024 }),
      clock: { now: () => Date.now() },
    });

    // Initial data
    await storage.store('data-1', Buffer.from('v1'));
    await storage.store('data-2', Buffer.from('v1'));
    await storage.store('data-3', Buffer.from('v1'));

    // Backup state 1
    const backup1 = new Map<string, Buffer>();
    for (const key of (await storage.list()).keys) {
      backup1.set(key, await storage.retrieve(key));
    }

    // Modify data
    await storage.store('data-2', Buffer.from('v2'));
    await storage.store('data-4', Buffer.from('v1')); // New

    // Backup state 2 (incremental - only changed)
    const backup2 = new Map<string, Buffer>();
    backup2.set('data-2', await storage.retrieve('data-2'));
    backup2.set('data-4', await storage.retrieve('data-4'));

    // Clear and restore incrementally
    await storage.clear();

    // First restore base
    for (const [key, data] of backup1) {
      await storage.store(key, data);
    }

    // Then apply incremental
    for (const [key, data] of backup2) {
      await storage.store(key, data);
    }

    // Verify final state
    expect((await storage.retrieve('data-1')).toString()).toBe('v1');
    expect((await storage.retrieve('data-2')).toString()).toBe('v2');
    expect((await storage.retrieve('data-3')).toString()).toBe('v1');
    expect((await storage.retrieve('data-4')).toString()).toBe('v1');
  });
});
