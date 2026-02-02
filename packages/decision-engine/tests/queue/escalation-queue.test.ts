/**
 * @fileoverview ESCALATION_QUEUE unit tests.
 * Target: 60 tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createEscalationQueue,
  DefaultEscalationQueue,
  PRIORITY_LEVELS,
} from '../../src/queue/index.js';
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
    metadata: {
      observedAt: 1000,
      hash: 'event-hash',
    },
  };
}

describe('ESCALATION_QUEUE', () => {
  describe('createEscalationQueue', () => {
    it('creates a queue instance', () => {
      const queue = createEscalationQueue();
      expect(queue).toBeDefined();
    });

    it('creates queue with custom clock', () => {
      let time = 5000;
      const queue = createEscalationQueue({ clock: () => time++ });
      const entry = queue.enqueue(createTestEvent(), 50);
      expect(entry.enqueuedAt).toBeGreaterThanOrEqual(5000);
    });

    it('creates queue with max size', () => {
      const queue = createEscalationQueue({ maxSize: 5 });
      for (let i = 0; i < 5; i++) {
        queue.enqueue(createTestEvent(`evt-${i}`), 50);
      }
      expect(() => queue.enqueue(createTestEvent('overflow'), 50)).toThrow();
    });
  });

  describe('DefaultEscalationQueue', () => {
    let queue: DefaultEscalationQueue;

    beforeEach(() => {
      queue = new DefaultEscalationQueue();
    });

    describe('enqueue', () => {
      it('adds event to queue', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(entry).toBeDefined();
        expect(entry.event.id).toBe('evt-001');
      });

      it('assigns unique ID', () => {
        const e1 = queue.enqueue(createTestEvent('a'), 50);
        const e2 = queue.enqueue(createTestEvent('b'), 50);
        expect(e1.id).not.toBe(e2.id);
      });

      it('stores priority', () => {
        const entry = queue.enqueue(createTestEvent(), 75);
        expect(entry.priority).toBe(75);
      });

      it('sets status to PENDING', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(entry.status).toBe('PENDING');
      });

      it('records enqueued timestamp', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(entry.enqueuedAt).toBeGreaterThan(0);
      });

      it('normalizes negative priority to 0', () => {
        const entry = queue.enqueue(createTestEvent(), -10);
        expect(entry.priority).toBe(0);
      });

      it('handles NaN priority', () => {
        const entry = queue.enqueue(createTestEvent(), NaN);
        expect(entry.priority).toBe(50); // Default MEDIUM
      });
    });

    describe('dequeue', () => {
      it('returns null for empty queue', () => {
        expect(queue.dequeue()).toBeNull();
      });

      it('removes and returns entry', () => {
        queue.enqueue(createTestEvent(), 50);
        const entry = queue.dequeue();
        expect(entry).not.toBeNull();
        expect(queue.size()).toBe(0);
      });

      it('returns highest priority first', () => {
        queue.enqueue(createTestEvent('low'), 10);
        queue.enqueue(createTestEvent('high'), 100);
        queue.enqueue(createTestEvent('mid'), 50);

        expect(queue.dequeue()?.event.id).toBe('high');
        expect(queue.dequeue()?.event.id).toBe('mid');
        expect(queue.dequeue()?.event.id).toBe('low');
      });

      it('FIFO at same priority', () => {
        queue.enqueue(createTestEvent('first'), 50);
        queue.enqueue(createTestEvent('second'), 50);
        queue.enqueue(createTestEvent('third'), 50);

        expect(queue.dequeue()?.event.id).toBe('first');
        expect(queue.dequeue()?.event.id).toBe('second');
        expect(queue.dequeue()?.event.id).toBe('third');
      });
    });

    describe('peek', () => {
      it('returns null for empty queue', () => {
        expect(queue.peek()).toBeNull();
      });

      it('returns highest priority without removing', () => {
        queue.enqueue(createTestEvent('low'), 10);
        queue.enqueue(createTestEvent('high'), 100);

        expect(queue.peek()?.event.id).toBe('high');
        expect(queue.size()).toBe(2);
      });

      it('multiple peeks return same entry', () => {
        queue.enqueue(createTestEvent('test'), 50);
        expect(queue.peek()?.event.id).toBe('test');
        expect(queue.peek()?.event.id).toBe('test');
      });
    });

    describe('size', () => {
      it('returns 0 for empty queue', () => {
        expect(queue.size()).toBe(0);
      });

      it('returns correct size after enqueue', () => {
        queue.enqueue(createTestEvent('a'), 50);
        queue.enqueue(createTestEvent('b'), 50);
        expect(queue.size()).toBe(2);
      });

      it('returns correct size after dequeue', () => {
        queue.enqueue(createTestEvent('a'), 50);
        queue.enqueue(createTestEvent('b'), 50);
        queue.dequeue();
        expect(queue.size()).toBe(1);
      });
    });

    describe('isEmpty', () => {
      it('returns true for empty queue', () => {
        expect(queue.isEmpty()).toBe(true);
      });

      it('returns false after enqueue', () => {
        queue.enqueue(createTestEvent(), 50);
        expect(queue.isEmpty()).toBe(false);
      });

      it('returns true after clearing', () => {
        queue.enqueue(createTestEvent(), 50);
        queue.clear();
        expect(queue.isEmpty()).toBe(true);
      });
    });

    describe('clear', () => {
      it('removes all entries', () => {
        queue.enqueue(createTestEvent('a'), 50);
        queue.enqueue(createTestEvent('b'), 50);
        queue.clear();
        expect(queue.size()).toBe(0);
      });

      it('allows new enqueues after clear', () => {
        queue.enqueue(createTestEvent('before'), 50);
        queue.clear();
        queue.enqueue(createTestEvent('after'), 50);
        expect(queue.size()).toBe(1);
      });
    });

    describe('getAll', () => {
      it('returns empty array for empty queue', () => {
        expect(queue.getAll()).toEqual([]);
      });

      it('returns all entries in priority order', () => {
        queue.enqueue(createTestEvent('low'), 10);
        queue.enqueue(createTestEvent('high'), 100);
        const all = queue.getAll();
        expect(all).toHaveLength(2);
        expect(all[0]?.event.id).toBe('high');
      });

      it('returns frozen array', () => {
        queue.enqueue(createTestEvent(), 50);
        const all = queue.getAll();
        expect(Object.isFrozen(all)).toBe(true);
      });
    });

    describe('getById', () => {
      it('returns null for non-existent ID', () => {
        expect(queue.getById('does-not-exist')).toBeNull();
      });

      it('returns entry by ID', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(queue.getById(entry.id)).not.toBeNull();
        expect(queue.getById(entry.id)?.id).toBe(entry.id);
      });
    });

    describe('updateStatus', () => {
      it('updates status to REVIEWING', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(queue.updateStatus(entry.id, 'REVIEWING')).toBe(true);
        expect(queue.getById(entry.id)?.status).toBe('REVIEWING');
      });

      it('updates status to RESOLVED', () => {
        const entry = queue.enqueue(createTestEvent(), 50);
        expect(queue.updateStatus(entry.id, 'RESOLVED')).toBe(true);
        expect(queue.getById(entry.id)?.status).toBe('RESOLVED');
      });

      it('returns false for non-existent ID', () => {
        expect(queue.updateStatus('does-not-exist', 'RESOLVED')).toBe(false);
      });
    });

    describe('validateIntegrity', () => {
      it('returns true for empty queue', () => {
        expect(queue.validateIntegrity()).toBe(true);
      });

      it('returns true for properly ordered queue', () => {
        queue.enqueue(createTestEvent('a'), 100);
        queue.enqueue(createTestEvent('b'), 50);
        queue.enqueue(createTestEvent('c'), 10);
        expect(queue.validateIntegrity()).toBe(true);
      });

      it('maintains integrity after operations', () => {
        for (let i = 0; i < 50; i++) {
          queue.enqueue(createTestEvent(`evt-${i}`), Math.random() * 100);
        }
        for (let i = 0; i < 25; i++) {
          queue.dequeue();
        }
        expect(queue.validateIntegrity()).toBe(true);
      });
    });
  });

  describe('PRIORITY_LEVELS', () => {
    it('CRITICAL is highest', () => {
      expect(PRIORITY_LEVELS.CRITICAL).toBeGreaterThan(PRIORITY_LEVELS.HIGH);
    });

    it('HIGH > MEDIUM > LOW > MINIMAL', () => {
      expect(PRIORITY_LEVELS.HIGH).toBeGreaterThan(PRIORITY_LEVELS.MEDIUM);
      expect(PRIORITY_LEVELS.MEDIUM).toBeGreaterThan(PRIORITY_LEVELS.LOW);
      expect(PRIORITY_LEVELS.LOW).toBeGreaterThan(PRIORITY_LEVELS.MINIMAL);
    });

    it('MINIMAL is 0', () => {
      expect(PRIORITY_LEVELS.MINIMAL).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('handles 1000 entries', () => {
      const queue = createEscalationQueue();
      for (let i = 0; i < 1000; i++) {
        queue.enqueue(createTestEvent(`evt-${i}`), i % 100);
      }
      expect(queue.size()).toBe(1000);
    });

    it('dequeue order is correct with many priorities', () => {
      const queue = createEscalationQueue();
      const priorities = [50, 30, 90, 10, 70];
      priorities.forEach((p, i) => {
        queue.enqueue(createTestEvent(`evt-${i}`), p);
      });

      const dequeued: number[] = [];
      while (!queue.isEmpty()) {
        const entry = queue.dequeue();
        if (entry) dequeued.push(entry.priority);
      }

      for (let i = 1; i < dequeued.length; i++) {
        expect(dequeued[i]).toBeLessThanOrEqual(dequeued[i - 1]!);
      }
    });

    it('handles interleaved enqueue/dequeue', () => {
      const queue = createEscalationQueue();
      queue.enqueue(createTestEvent('a'), 50);
      queue.dequeue();
      queue.enqueue(createTestEvent('b'), 60);
      queue.enqueue(createTestEvent('c'), 40);
      queue.dequeue();
      queue.enqueue(createTestEvent('d'), 70);

      expect(queue.peek()?.event.id).toBe('d');
    });
  });
});
