/**
 * Atlas Store Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AtlasStore } from '../src/store.js';
import type { Clock, RNG, LedgerEvent } from '../src/types.js';
import { seededRNG } from '../src/types.js';
import {
  AtlasViewNotFoundError,
  AtlasViewAlreadyExistsError,
  AtlasViewVersionConflictError,
} from '../src/errors.js';

describe('AtlasStore', () => {
  let store: AtlasStore;
  let mockClock: Clock;
  let mockRng: RNG;
  let currentTime: number;

  beforeEach(() => {
    currentTime = 1000;
    mockClock = { now: () => currentTime };
    mockRng = seededRNG(42);
    store = new AtlasStore({ clock: mockClock, rng: mockRng });
  });

  describe('insert', () => {
    it('creates a new view', () => {
      const view = store.insert('1', { name: 'Test' });

      expect(view.id).toBe('1');
      expect(view.data.name).toBe('Test');
      expect(view.timestamp).toBe(1000);
      expect(view.version).toBe(1);
    });

    it('throws when view already exists', () => {
      store.insert('1', { name: 'Test' });

      expect(() => store.insert('1', { other: 'data' })).toThrow(
        AtlasViewAlreadyExistsError
      );
    });

    it('freezes the view', () => {
      const view = store.insert('1', { name: 'Test' });

      expect(Object.isFrozen(view)).toBe(true);
      expect(Object.isFrozen(view.data)).toBe(true);
    });
  });

  describe('update', () => {
    it('updates existing view', () => {
      store.insert('1', { name: 'Old' });
      currentTime = 2000;

      const view = store.update('1', { name: 'New' });

      expect(view.data.name).toBe('New');
      expect(view.timestamp).toBe(2000);
      expect(view.version).toBe(2);
    });

    it('throws when view not found', () => {
      expect(() => store.update('nonexistent', { name: 'Test' })).toThrow(
        AtlasViewNotFoundError
      );
    });

    it('checks expected version', () => {
      store.insert('1', { name: 'Test' });

      expect(() => store.update('1', { name: 'New' }, 2)).toThrow(
        AtlasViewVersionConflictError
      );
    });

    it('allows update with correct expected version', () => {
      store.insert('1', { name: 'Test' });

      const view = store.update('1', { name: 'New' }, 1);

      expect(view.version).toBe(2);
    });
  });

  describe('upsert', () => {
    it('inserts when view does not exist', () => {
      const view = store.upsert('1', { name: 'Test' });

      expect(view.version).toBe(1);
    });

    it('updates when view exists', () => {
      store.insert('1', { name: 'Old' });

      const view = store.upsert('1', { name: 'New' });

      expect(view.version).toBe(2);
      expect(view.data.name).toBe('New');
    });
  });

  describe('delete', () => {
    it('deletes existing view', () => {
      store.insert('1', { name: 'Test' });

      const deleted = store.delete('1');

      expect(deleted.id).toBe('1');
      expect(store.has('1')).toBe(false);
    });

    it('throws when view not found', () => {
      expect(() => store.delete('nonexistent')).toThrow(AtlasViewNotFoundError);
    });
  });

  describe('get', () => {
    it('returns view when exists', () => {
      store.insert('1', { name: 'Test' });

      const view = store.get('1');

      expect(view?.id).toBe('1');
    });

    it('returns undefined when not found', () => {
      const view = store.get('nonexistent');

      expect(view).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true when view exists', () => {
      store.insert('1', { name: 'Test' });

      expect(store.has('1')).toBe(true);
    });

    it('returns false when view does not exist', () => {
      expect(store.has('nonexistent')).toBe(false);
    });
  });

  describe('query', () => {
    beforeEach(() => {
      currentTime = 1000;
      store.insert('1', { name: 'Alice', age: 30 });
      currentTime = 2000;
      store.insert('2', { name: 'Bob', age: 25 });
      currentTime = 3000;
      store.insert('3', { name: 'Charlie', age: 35 });
    });

    it('returns all views when no filter', () => {
      const result = store.query();

      expect(result.views).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('applies filter', () => {
      const result = store.query({
        filter: { field: 'age', operator: 'gt', value: 28 },
      });

      expect(result.views).toHaveLength(2);
    });

    it('applies pagination', () => {
      const result = store.query({ limit: 2, offset: 1 });

      expect(result.views).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });
  });

  describe('findOne', () => {
    it('returns first matching view', () => {
      store.insert('1', { type: 'admin' });
      store.insert('2', { type: 'user' });

      const view = store.findOne({ field: 'type', operator: 'eq', value: 'admin' });

      expect(view?.id).toBe('1');
    });

    it('returns undefined when no match', () => {
      store.insert('1', { type: 'user' });

      const view = store.findOne({ field: 'type', operator: 'eq', value: 'admin' });

      expect(view).toBeUndefined();
    });
  });

  describe('findMany', () => {
    it('returns all matching views', () => {
      store.insert('1', { type: 'admin' });
      store.insert('2', { type: 'admin' });
      store.insert('3', { type: 'user' });

      const views = store.findMany({ field: 'type', operator: 'eq', value: 'admin' });

      expect(views).toHaveLength(2);
    });

    it('respects limit', () => {
      store.insert('1', { type: 'admin' });
      store.insert('2', { type: 'admin' });

      const views = store.findMany({ field: 'type', operator: 'eq', value: 'admin' }, 1);

      expect(views).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('returns total count when no filter', () => {
      store.insert('1', { name: 'A' });
      store.insert('2', { name: 'B' });

      expect(store.count()).toBe(2);
    });

    it('returns filtered count', () => {
      store.insert('1', { type: 'admin' });
      store.insert('2', { type: 'user' });
      store.insert('3', { type: 'admin' });

      const count = store.count({ field: 'type', operator: 'eq', value: 'admin' });

      expect(count).toBe(2);
    });
  });

  describe('indexes', () => {
    it('creates and uses hash index', () => {
      store.createIndex({ name: 'idx_type', field: 'type', type: 'hash' });

      store.insert('1', { type: 'admin' });
      store.insert('2', { type: 'user' });
      store.insert('3', { type: 'admin' });

      const views = store.lookupByIndex('idx_type', 'admin');

      expect(views).toHaveLength(2);
      expect(views.map((v) => v.id).sort()).toEqual(['1', '3']);
    });

    it('maintains index on insert', () => {
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      store.insert('1', { name: 'Test' });

      const views = store.lookupByIndex('idx_name', 'Test');

      expect(views).toHaveLength(1);
    });

    it('maintains index on update', () => {
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      store.insert('1', { name: 'Old' });
      store.update('1', { name: 'New' });

      expect(store.lookupByIndex('idx_name', 'Old')).toHaveLength(0);
      expect(store.lookupByIndex('idx_name', 'New')).toHaveLength(1);
    });

    it('maintains index on delete', () => {
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      store.insert('1', { name: 'Test' });
      store.delete('1');

      const views = store.lookupByIndex('idx_name', 'Test');

      expect(views).toHaveLength(0);
    });

    it('indexes existing views when creating index', () => {
      store.insert('1', { name: 'Test' });
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });

      const views = store.lookupByIndex('idx_name', 'Test');

      expect(views).toHaveLength(1);
    });

    it('dropIndex removes index', () => {
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      store.dropIndex('idx_name');

      expect(store.hasIndex('idx_name')).toBe(false);
    });

    it('getIndexStats returns stats', () => {
      store.createIndex({ name: 'idx_name', field: 'name', type: 'hash' });
      store.insert('1', { name: 'Test' });

      const stats = store.getIndexStats();

      expect(stats).toHaveLength(1);
      expect(stats[0].name).toBe('idx_name');
    });
  });

  describe('subscriptions', () => {
    it('notifies on insert', () => {
      const callback = vi.fn();
      store.subscribe(callback);

      store.insert('1', { name: 'Test' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].type).toBe('insert');
    });

    it('notifies on update', () => {
      store.insert('1', { name: 'Old' });
      const callback = vi.fn();
      store.subscribe(callback);

      store.update('1', { name: 'New' });

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].type).toBe('update');
    });

    it('notifies on delete', () => {
      store.insert('1', { name: 'Test' });
      const callback = vi.fn();
      store.subscribe(callback);

      store.delete('1');

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback.mock.calls[0][0].type).toBe('delete');
    });

    it('respects filter in subscription', () => {
      const callback = vi.fn();
      store.subscribe(callback, { field: 'type', operator: 'eq', value: 'important' });

      store.insert('1', { type: 'normal' });
      store.insert('2', { type: 'important' });

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('unsubscribe stops notifications', () => {
      const callback = vi.fn();
      const sub = store.subscribe(callback);
      store.unsubscribe(sub.id);

      store.insert('1', { name: 'Test' });

      expect(callback).not.toHaveBeenCalled();
    });

    it('getSubscriptionCount returns correct count', () => {
      expect(store.getSubscriptionCount()).toBe(0);

      store.subscribe(vi.fn());
      expect(store.getSubscriptionCount()).toBe(1);
    });
  });

  describe('projections', () => {
    it('applies event to matching projection', () => {
      store.registerProjection({
        name: 'user-projection',
        sourceEventTypes: ['USER_CREATED'],
        projector: (event) => ({
          id: event.payload.id as string,
          data: { name: event.payload.name },
          timestamp: event.timestamp,
          version: 1,
        }),
      });

      const event: LedgerEvent = {
        type: 'USER_CREATED',
        payload: { id: 'user-1', name: 'Alice' },
        timestamp: 1000,
      };

      store.applyEvent(event);

      const view = store.get('user-1');
      expect(view).toBeDefined();
      expect(view?.data.name).toBe('Alice');
    });

    it('updates existing view through projection', () => {
      store.insert('user-1', { name: 'Old' });

      store.registerProjection({
        name: 'user-projection',
        sourceEventTypes: ['USER_UPDATED'],
        projector: (event) => ({
          id: event.payload.id as string,
          data: { name: event.payload.name },
          timestamp: event.timestamp,
          version: 1,
        }),
      });

      const event: LedgerEvent = {
        type: 'USER_UPDATED',
        payload: { id: 'user-1', name: 'New' },
        timestamp: 2000,
      };

      store.applyEvent(event);

      const view = store.get('user-1');
      expect(view?.data.name).toBe('New');
    });

    it('deletes view when projector returns undefined', () => {
      store.insert('user-1', { name: 'Test' });

      store.registerProjection({
        name: 'user-projection',
        sourceEventTypes: ['USER_DELETED'],
        projector: () => undefined,
      });

      const event: LedgerEvent = {
        type: 'USER_DELETED',
        payload: { id: 'user-1' },
        timestamp: 2000,
      };

      store.applyEvent(event);

      expect(store.has('user-1')).toBe(false);
    });

    it('ignores events not matching projection', () => {
      store.registerProjection({
        name: 'user-projection',
        sourceEventTypes: ['USER_CREATED'],
        projector: (event) => ({
          id: 'test',
          data: { name: event.payload.name },
          timestamp: event.timestamp,
          version: 1,
        }),
      });

      const event: LedgerEvent = {
        type: 'OTHER_EVENT',
        payload: { id: 'test', name: 'Test' },
        timestamp: 1000,
      };

      store.applyEvent(event);

      expect(store.has('test')).toBe(false);
    });

    it('unregisterProjection removes projection', () => {
      store.registerProjection({
        name: 'user-projection',
        sourceEventTypes: ['USER_CREATED'],
        projector: () => ({
          id: 'test',
          data: {},
          timestamp: 1000,
          version: 1,
        }),
      });

      store.unregisterProjection('user-projection');

      const event: LedgerEvent = {
        type: 'USER_CREATED',
        payload: { id: 'test' },
        timestamp: 1000,
      };

      store.applyEvent(event);

      expect(store.has('test')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('returns all views sorted by ID', () => {
      store.insert('c', { name: 'C' });
      store.insert('a', { name: 'A' });
      store.insert('b', { name: 'B' });

      const views = store.getAll();

      expect(views.map((v) => v.id)).toEqual(['a', 'b', 'c']);
    });

    it('returns frozen array', () => {
      store.insert('1', { name: 'Test' });

      const views = store.getAll();

      expect(Object.isFrozen(views)).toBe(true);
    });
  });

  describe('size', () => {
    it('returns correct size', () => {
      expect(store.size()).toBe(0);

      store.insert('1', { name: 'A' });
      expect(store.size()).toBe(1);

      store.insert('2', { name: 'B' });
      expect(store.size()).toBe(2);

      store.delete('1');
      expect(store.size()).toBe(1);
    });
  });

  describe('clear', () => {
    it('removes all views', () => {
      store.insert('1', { name: 'A' });
      store.insert('2', { name: 'B' });

      store.clear();

      expect(store.size()).toBe(0);
    });

    it('notifies delete for all views', () => {
      store.insert('1', { name: 'A' });
      store.insert('2', { name: 'B' });

      const callback = vi.fn();
      store.subscribe(callback);

      store.clear();

      expect(callback).toHaveBeenCalledTimes(2);
      expect(callback.mock.calls[0][0].type).toBe('delete');
      expect(callback.mock.calls[1][0].type).toBe('delete');
    });
  });

  describe('__clearForTests', () => {
    it('clears everything including subscriptions', () => {
      store.insert('1', { name: 'Test' });
      store.createIndex({ name: 'idx', field: 'name', type: 'hash' });
      store.subscribe(vi.fn());

      store.__clearForTests();

      expect(store.size()).toBe(0);
      expect(store.getSubscriptionCount()).toBe(0);
      expect(store.getIndexNames()).toHaveLength(0);
    });
  });

  describe('determinism', () => {
    it('produces identical results across runs with same inputs', () => {
      const createStore = () => {
        const clock = { now: () => 1000 };
        const rng = seededRNG(42);
        return new AtlasStore({ clock, rng });
      };

      const store1 = createStore();
      const store2 = createStore();

      // Same operations
      store1.insert('a', { name: 'Alice' });
      store1.insert('b', { name: 'Bob' });

      store2.insert('a', { name: 'Alice' });
      store2.insert('b', { name: 'Bob' });

      // Should produce identical results
      const views1 = store1.getAll();
      const views2 = store2.getAll();

      expect(views1).toEqual(views2);
    });
  });
});
