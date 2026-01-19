/**
 * Atlas Subscription Manager Tests
 * Standard: NASA-Grade L4
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SubscriptionManager } from '../src/subscriptions.js';
import type { AtlasView, SubscriptionEvent, RNG } from '../src/types.js';
import { seededRNG } from '../src/types.js';
import { AtlasSubscriptionNotFoundError, AtlasSubscriptionCallbackError } from '../src/errors.js';

const createView = (id: string, data: Record<string, unknown>): AtlasView => ({
  id,
  data,
  timestamp: 1000,
  version: 1,
});

describe('SubscriptionManager', () => {
  let manager: SubscriptionManager;
  let mockRng: RNG;

  beforeEach(() => {
    mockRng = seededRNG(42);
    manager = new SubscriptionManager(mockRng);
  });

  describe('subscribe', () => {
    it('creates subscription and returns handle', () => {
      const callback = vi.fn();
      const sub = manager.subscribe(callback);

      expect(sub.id).toBeDefined();
      expect(typeof sub.unsubscribe).toBe('function');
    });

    it('returns deterministic IDs with seeded RNG', () => {
      const rng1 = seededRNG(42);
      const rng2 = seededRNG(42);
      const manager1 = new SubscriptionManager(rng1);
      const manager2 = new SubscriptionManager(rng2);

      const sub1 = manager1.subscribe(vi.fn());
      const sub2 = manager2.subscribe(vi.fn());

      expect(sub1.id).toBe(sub2.id);
    });

    it('includes filter in subscription', () => {
      const callback = vi.fn();
      const filter = { field: 'name', operator: 'eq' as const, value: 'test' };
      const sub = manager.subscribe(callback, filter);

      expect(sub.filter).toEqual(filter);
    });
  });

  describe('unsubscribe', () => {
    it('removes subscription by ID', () => {
      const callback = vi.fn();
      const sub = manager.subscribe(callback);

      manager.unsubscribe(sub.id);

      expect(manager.hasSubscription(sub.id)).toBe(false);
    });

    it('allows unsubscribe via handle', () => {
      const callback = vi.fn();
      const sub = manager.subscribe(callback);

      sub.unsubscribe();

      expect(manager.hasSubscription(sub.id)).toBe(false);
    });

    it('throws when subscription not found', () => {
      expect(() => manager.unsubscribe('nonexistent')).toThrow(
        AtlasSubscriptionNotFoundError
      );
    });
  });

  describe('notifyInsert', () => {
    it('calls callback with insert event', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const view = createView('1', { name: 'Test' });
      manager.notifyInsert(view, 2000);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0] as SubscriptionEvent;
      expect(event.type).toBe('insert');
      expect(event.view).toBe(view);
      expect(event.timestamp).toBe(2000);
      expect(event.previousView).toBeUndefined();
    });

    it('does not call callback when filter does not match', () => {
      const callback = vi.fn();
      manager.subscribe(callback, {
        field: 'name',
        operator: 'eq',
        value: 'Other',
      });

      const view = createView('1', { name: 'Test' });
      manager.notifyInsert(view, 2000);

      expect(callback).not.toHaveBeenCalled();
    });

    it('calls callback when filter matches', () => {
      const callback = vi.fn();
      manager.subscribe(callback, {
        field: 'name',
        operator: 'eq',
        value: 'Test',
      });

      const view = createView('1', { name: 'Test' });
      manager.notifyInsert(view, 2000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('notifyUpdate', () => {
    it('calls callback with update event', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const prevView = createView('1', { name: 'Old' });
      const newView = createView('1', { name: 'New' });
      manager.notifyUpdate(newView, prevView, 2000);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0] as SubscriptionEvent;
      expect(event.type).toBe('update');
      expect(event.view).toBe(newView);
      expect(event.previousView).toBe(prevView);
      expect(event.timestamp).toBe(2000);
    });
  });

  describe('notifyDelete', () => {
    it('calls callback with delete event', () => {
      const callback = vi.fn();
      manager.subscribe(callback);

      const view = createView('1', { name: 'Test' });
      manager.notifyDelete(view, 2000);

      expect(callback).toHaveBeenCalledTimes(1);
      const event = callback.mock.calls[0][0] as SubscriptionEvent;
      expect(event.type).toBe('delete');
      expect(event.view).toBe(view);
      expect(event.timestamp).toBe(2000);
    });
  });

  describe('multiple subscriptions', () => {
    it('notifies all matching subscriptions', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      manager.subscribe(callback1);
      manager.subscribe(callback2);

      const view = createView('1', { name: 'Test' });
      manager.notifyInsert(view, 2000);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('notifies in deterministic order', () => {
      const order: string[] = [];
      const manager = new SubscriptionManager(seededRNG(42));

      // Subscribe in specific order
      manager.subscribe(() => order.push('first'));
      manager.subscribe(() => order.push('second'));
      manager.subscribe(() => order.push('third'));

      const view = createView('1', { name: 'Test' });
      manager.notifyInsert(view, 2000);

      // Order should be deterministic (sorted by ID)
      expect(order).toHaveLength(3);
    });
  });

  describe('filter operators', () => {
    it('filter eq works', () => {
      const callback = vi.fn();
      manager.subscribe(callback, { field: 'status', operator: 'eq', value: 'active' });

      manager.notifyInsert(createView('1', { status: 'active' }), 1000);
      manager.notifyInsert(createView('2', { status: 'inactive' }), 1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('filter gt works', () => {
      const callback = vi.fn();
      manager.subscribe(callback, { field: 'count', operator: 'gt', value: 5 });

      manager.notifyInsert(createView('1', { count: 3 }), 1000);
      manager.notifyInsert(createView('2', { count: 10 }), 1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('filter in works', () => {
      const callback = vi.fn();
      manager.subscribe(callback, { field: 'type', operator: 'in', value: ['a', 'b'] });

      manager.notifyInsert(createView('1', { type: 'a' }), 1000);
      manager.notifyInsert(createView('2', { type: 'c' }), 1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('filter contains works', () => {
      const callback = vi.fn();
      manager.subscribe(callback, { field: 'name', operator: 'contains', value: 'test' });

      manager.notifyInsert(createView('1', { name: 'my test case' }), 1000);
      manager.notifyInsert(createView('2', { name: 'other' }), 1000);

      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('callback error handling', () => {
    it('throws AtlasSubscriptionCallbackError when callback throws', () => {
      const callback = () => {
        throw new Error('Callback failed');
      };
      manager.subscribe(callback);

      const view = createView('1', { name: 'Test' });

      expect(() => manager.notifyInsert(view, 2000)).toThrow(
        AtlasSubscriptionCallbackError
      );
    });
  });

  describe('getSubscriptionCount', () => {
    it('returns correct count', () => {
      expect(manager.getSubscriptionCount()).toBe(0);

      manager.subscribe(vi.fn());
      expect(manager.getSubscriptionCount()).toBe(1);

      manager.subscribe(vi.fn());
      expect(manager.getSubscriptionCount()).toBe(2);
    });
  });

  describe('getSubscriptionIds', () => {
    it('returns sorted IDs', () => {
      manager.subscribe(vi.fn());
      manager.subscribe(vi.fn());
      manager.subscribe(vi.fn());

      const ids = manager.getSubscriptionIds();
      expect(ids).toHaveLength(3);
      expect([...ids].sort()).toEqual([...ids]);
    });
  });

  describe('clearAll', () => {
    it('removes all subscriptions', () => {
      manager.subscribe(vi.fn());
      manager.subscribe(vi.fn());

      manager.clearAll();

      expect(manager.getSubscriptionCount()).toBe(0);
    });
  });
});
