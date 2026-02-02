/**
 * @fileoverview QUEUE invariant tests.
 * Tests for INV-QUEUE-01 through INV-QUEUE-04
 * Target: 20 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createEscalationQueue, DefaultEscalationQueue } from '../../src/queue/index.js';
import type { RuntimeEvent } from '../../src/types/index.js';

function createTestEvent(id: string = 'evt-001'): RuntimeEvent {
  return {
    id,
    timestamp: 1000,
    type: 'VERDICT_OBSERVED',
    verdict: {
      id: 'v-001',
      timestamp: 999,
      source: 'ORACLE',
      verdict: 'CONDITIONAL',
      payload: {},
      hash: 'hash123',
    },
    metadata: { observedAt: 1000, hash: 'event-hash' },
  };
}

describe('QUEUE Invariants', () => {
  let queue: DefaultEscalationQueue;

  beforeEach(() => {
    queue = new DefaultEscalationQueue();
  });

  describe('INV-QUEUE-01: Order by priority (dequeue = max priority)', () => {
    it('dequeue returns highest priority', () => {
      queue.enqueue(createTestEvent('low'), 10);
      queue.enqueue(createTestEvent('high'), 100);
      queue.enqueue(createTestEvent('mid'), 50);

      expect(queue.dequeue()?.priority).toBe(100);
    });

    it('maintains order with many entries', () => {
      const priorities = [45, 90, 15, 60, 30, 75, 5, 85, 40, 55];
      priorities.forEach((p, i) => {
        queue.enqueue(createTestEvent(`evt-${i}`), p);
      });

      let lastPriority = Infinity;
      while (!queue.isEmpty()) {
        const entry = queue.dequeue();
        expect(entry!.priority).toBeLessThanOrEqual(lastPriority);
        lastPriority = entry!.priority;
      }
    });

    it('peek returns max priority without change', () => {
      queue.enqueue(createTestEvent('low'), 10);
      queue.enqueue(createTestEvent('high'), 100);

      expect(queue.peek()?.priority).toBe(100);
      expect(queue.peek()?.priority).toBe(100);
      expect(queue.size()).toBe(2);
    });

    it('order maintained after interleaved operations', () => {
      queue.enqueue(createTestEvent('a'), 50);
      queue.dequeue();
      queue.enqueue(createTestEvent('b'), 30);
      queue.enqueue(createTestEvent('c'), 70);
      queue.enqueue(createTestEvent('d'), 40);
      queue.dequeue();

      expect(queue.peek()?.event.id).toBe('d');
    });
  });

  describe('INV-QUEUE-02: FIFO at equal priority', () => {
    it('same priority dequeues in insertion order', () => {
      queue.enqueue(createTestEvent('first'), 50);
      queue.enqueue(createTestEvent('second'), 50);
      queue.enqueue(createTestEvent('third'), 50);

      expect(queue.dequeue()?.event.id).toBe('first');
      expect(queue.dequeue()?.event.id).toBe('second');
      expect(queue.dequeue()?.event.id).toBe('third');
    });

    it('FIFO maintained within each priority tier', () => {
      queue.enqueue(createTestEvent('high-1'), 100);
      queue.enqueue(createTestEvent('low-1'), 10);
      queue.enqueue(createTestEvent('high-2'), 100);
      queue.enqueue(createTestEvent('low-2'), 10);

      expect(queue.dequeue()?.event.id).toBe('high-1');
      expect(queue.dequeue()?.event.id).toBe('high-2');
      expect(queue.dequeue()?.event.id).toBe('low-1');
      expect(queue.dequeue()?.event.id).toBe('low-2');
    });

    it('FIFO with interleaved inserts at same priority', () => {
      queue.enqueue(createTestEvent('a'), 50);
      queue.enqueue(createTestEvent('b'), 50);
      queue.dequeue(); // Remove 'a'
      queue.enqueue(createTestEvent('c'), 50);

      expect(queue.dequeue()?.event.id).toBe('b');
      expect(queue.dequeue()?.event.id).toBe('c');
    });
  });

  describe('INV-QUEUE-03: No event loss', () => {
    it('all enqueued events can be dequeued', () => {
      const ids = ['a', 'b', 'c', 'd', 'e'];
      ids.forEach(id => queue.enqueue(createTestEvent(id), 50));

      const dequeued: string[] = [];
      while (!queue.isEmpty()) {
        const entry = queue.dequeue();
        if (entry) dequeued.push(entry.event.id);
      }

      expect(dequeued.sort()).toEqual(ids.sort());
    });

    it('getAll returns all entries', () => {
      queue.enqueue(createTestEvent('a'), 50);
      queue.enqueue(createTestEvent('b'), 50);
      queue.enqueue(createTestEvent('c'), 50);

      expect(queue.getAll()).toHaveLength(3);
    });

    it('size equals number of enqueued minus dequeued', () => {
      queue.enqueue(createTestEvent('a'), 50);
      queue.enqueue(createTestEvent('b'), 50);
      queue.enqueue(createTestEvent('c'), 50);
      queue.dequeue();

      expect(queue.size()).toBe(2);
    });

    it('events survive status updates', () => {
      const entry = queue.enqueue(createTestEvent('test'), 50);
      queue.updateStatus(entry.id, 'REVIEWING');
      queue.updateStatus(entry.id, 'RESOLVED');

      expect(queue.getById(entry.id)).not.toBeNull();
    });

    it('no data corruption with many operations', () => {
      for (let i = 0; i < 100; i++) {
        queue.enqueue(createTestEvent(`evt-${i}`), i % 10);
      }

      for (let i = 0; i < 50; i++) {
        queue.dequeue();
      }

      expect(queue.size()).toBe(50);
      expect(queue.validateIntegrity()).toBe(true);
    });
  });

  describe('INV-QUEUE-04: Thread-safe (single-threaded assumption)', () => {
    it('operations are atomic', () => {
      const entry = queue.enqueue(createTestEvent('test'), 50);
      const id = entry.id;

      // Simultaneous reads should be consistent
      const fromGet = queue.getById(id);
      const fromAll = queue.getAll().find(e => e.id === id);
      const fromPeek = queue.peek();

      expect(fromGet?.id).toBe(id);
      expect(fromAll?.id).toBe(id);
      expect(fromPeek?.id).toBe(id);
    });

    it('clear is atomic', () => {
      for (let i = 0; i < 10; i++) {
        queue.enqueue(createTestEvent(`evt-${i}`), 50);
      }

      queue.clear();

      expect(queue.size()).toBe(0);
      expect(queue.getAll()).toEqual([]);
      expect(queue.peek()).toBeNull();
    });

    it('dequeue is atomic', () => {
      queue.enqueue(createTestEvent('only'), 50);

      const entry = queue.dequeue();

      expect(entry).not.toBeNull();
      expect(queue.size()).toBe(0);
      expect(queue.getById(entry!.id)).toBeNull();
    });

    it('status update is atomic', () => {
      const entry = queue.enqueue(createTestEvent('test'), 50);
      queue.updateStatus(entry.id, 'REVIEWING');

      const fromGet = queue.getById(entry.id);
      const fromAll = queue.getAll().find(e => e.id === entry.id);

      expect(fromGet?.status).toBe('REVIEWING');
      expect(fromAll?.status).toBe('REVIEWING');
    });
  });
});
