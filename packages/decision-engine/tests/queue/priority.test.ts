/**
 * @fileoverview Priority management tests.
 * Target: 20 tests
 */

import { describe, it, expect } from 'vitest';
import {
  PRIORITY_LEVELS,
  compareNodes,
  isValidPriority,
  normalizePriority,
  getPriorityLevelName,
  findInsertionIndex,
  insertSorted,
} from '../../src/queue/index.js';
import type { QueueNode } from '../../src/queue/index.js';
import type { RuntimeEvent, QueueEntry } from '../../src/types/index.js';

function createTestEntry(priority: number, insertionOrder: number): QueueNode {
  const event: RuntimeEvent = {
    id: 'evt-001',
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

  const entry: QueueEntry = {
    id: `entry-${insertionOrder}`,
    event,
    priority,
    enqueuedAt: 1000,
    status: 'PENDING',
  };

  return { entry, insertionOrder };
}

describe('Queue Priority', () => {
  describe('compareNodes', () => {
    it('higher priority comes first', () => {
      const high = createTestEntry(100, 1);
      const low = createTestEntry(50, 2);
      expect(compareNodes(high, low)).toBeLessThan(0);
    });

    it('lower priority comes second', () => {
      const high = createTestEntry(100, 1);
      const low = createTestEntry(50, 2);
      expect(compareNodes(low, high)).toBeGreaterThan(0);
    });

    it('same priority uses insertion order', () => {
      const first = createTestEntry(50, 1);
      const second = createTestEntry(50, 2);
      expect(compareNodes(first, second)).toBeLessThan(0);
    });

    it('returns 0 for identical nodes', () => {
      const node = createTestEntry(50, 1);
      expect(compareNodes(node, node)).toBe(0);
    });
  });

  describe('isValidPriority', () => {
    it('returns true for valid priorities', () => {
      expect(isValidPriority(0)).toBe(true);
      expect(isValidPriority(50)).toBe(true);
      expect(isValidPriority(100)).toBe(true);
    });

    it('returns false for negative', () => {
      expect(isValidPriority(-1)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isValidPriority(NaN)).toBe(false);
    });

    it('returns false for non-number', () => {
      expect(isValidPriority('50')).toBe(false);
      expect(isValidPriority(null)).toBe(false);
    });
  });

  describe('normalizePriority', () => {
    it('returns priority unchanged if valid', () => {
      expect(normalizePriority(50)).toBe(50);
    });

    it('returns 0 for negative', () => {
      expect(normalizePriority(-10)).toBe(0);
    });

    it('returns MEDIUM for NaN', () => {
      expect(normalizePriority(NaN)).toBe(PRIORITY_LEVELS.MEDIUM);
    });

    it('returns MEDIUM for Infinity', () => {
      expect(normalizePriority(Infinity)).toBe(PRIORITY_LEVELS.MEDIUM);
    });
  });

  describe('getPriorityLevelName', () => {
    it('returns CRITICAL for 100', () => {
      expect(getPriorityLevelName(PRIORITY_LEVELS.CRITICAL)).toBe('CRITICAL');
    });

    it('returns HIGH for 75', () => {
      expect(getPriorityLevelName(PRIORITY_LEVELS.HIGH)).toBe('HIGH');
    });

    it('returns MEDIUM for 50', () => {
      expect(getPriorityLevelName(PRIORITY_LEVELS.MEDIUM)).toBe('MEDIUM');
    });

    it('returns LOW for 25', () => {
      expect(getPriorityLevelName(PRIORITY_LEVELS.LOW)).toBe('LOW');
    });

    it('returns MINIMAL for 0', () => {
      expect(getPriorityLevelName(PRIORITY_LEVELS.MINIMAL)).toBe('MINIMAL');
    });

    it('returns CUSTOM for non-standard value', () => {
      expect(getPriorityLevelName(42)).toBe('CUSTOM');
    });
  });

  describe('findInsertionIndex', () => {
    it('returns 0 for empty array', () => {
      const node = createTestEntry(50, 1);
      expect(findInsertionIndex([], node)).toBe(0);
    });

    it('inserts at beginning for highest priority', () => {
      const nodes = [createTestEntry(50, 1), createTestEntry(25, 2)];
      const newNode = createTestEntry(100, 3);
      expect(findInsertionIndex(nodes, newNode)).toBe(0);
    });

    it('inserts at end for lowest priority', () => {
      const nodes = [createTestEntry(100, 1), createTestEntry(50, 2)];
      const newNode = createTestEntry(25, 3);
      expect(findInsertionIndex(nodes, newNode)).toBe(2);
    });

    it('inserts in middle correctly', () => {
      const nodes = [createTestEntry(100, 1), createTestEntry(25, 2)];
      const newNode = createTestEntry(50, 3);
      expect(findInsertionIndex(nodes, newNode)).toBe(1);
    });
  });

  describe('insertSorted', () => {
    it('inserts into empty array', () => {
      const nodes: QueueNode[] = [];
      insertSorted(nodes, createTestEntry(50, 1));
      expect(nodes).toHaveLength(1);
    });

    it('maintains sorted order', () => {
      const nodes: QueueNode[] = [];
      insertSorted(nodes, createTestEntry(50, 1));
      insertSorted(nodes, createTestEntry(100, 2));
      insertSorted(nodes, createTestEntry(25, 3));

      expect(nodes[0]?.entry.priority).toBe(100);
      expect(nodes[1]?.entry.priority).toBe(50);
      expect(nodes[2]?.entry.priority).toBe(25);
    });

    it('respects FIFO for same priority', () => {
      const nodes: QueueNode[] = [];
      insertSorted(nodes, createTestEntry(50, 1));
      insertSorted(nodes, createTestEntry(50, 2));
      insertSorted(nodes, createTestEntry(50, 3));

      expect(nodes[0]?.insertionOrder).toBe(1);
      expect(nodes[1]?.insertionOrder).toBe(2);
      expect(nodes[2]?.insertionOrder).toBe(3);
    });
  });
});
