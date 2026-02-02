/**
 * @fileoverview Priority management for ESCALATION_QUEUE.
 * @module @omega/decision-engine/queue/priority
 *
 * INV-QUEUE-01: Order by priority (higher = more urgent)
 * INV-QUEUE-02: FIFO at equal priority
 */

import type { QueueNode } from './types.js';

/**
 * Priority levels as named constants.
 */
export const PRIORITY_LEVELS = {
  CRITICAL: 100,
  HIGH: 75,
  MEDIUM: 50,
  LOW: 25,
  MINIMAL: 0,
} as const;

export type PriorityLevel = keyof typeof PRIORITY_LEVELS;

/**
 * Compares two queue nodes for ordering.
 * INV-QUEUE-01: Higher priority first.
 * INV-QUEUE-02: Earlier insertion first at same priority.
 * @param a - First node
 * @param b - Second node
 * @returns Negative if a before b, positive if b before a
 */
export function compareNodes(a: QueueNode, b: QueueNode): number {
  // Higher priority comes first (negative means a is first)
  const priorityDiff = b.entry.priority - a.entry.priority;
  if (priorityDiff !== 0) {
    return priorityDiff;
  }

  // INV-QUEUE-02: FIFO at equal priority (earlier insertion first)
  return a.insertionOrder - b.insertionOrder;
}

/**
 * Validates a priority value.
 * @param priority - Priority to validate
 * @returns True if valid
 */
export function isValidPriority(priority: unknown): priority is number {
  return (
    typeof priority === 'number' &&
    Number.isFinite(priority) &&
    priority >= 0
  );
}

/**
 * Normalizes priority to valid range.
 * @param priority - Raw priority
 * @returns Normalized priority (≥0)
 */
export function normalizePriority(priority: number): number {
  if (!Number.isFinite(priority)) {
    return PRIORITY_LEVELS.MEDIUM;
  }
  return Math.max(0, priority);
}

/**
 * Gets priority level name from numeric value.
 * @param priority - Numeric priority
 * @returns Priority level name or 'CUSTOM'
 */
export function getPriorityLevelName(priority: number): PriorityLevel | 'CUSTOM' {
  for (const [name, value] of Object.entries(PRIORITY_LEVELS)) {
    if (value === priority) {
      return name as PriorityLevel;
    }
  }
  return 'CUSTOM';
}

/**
 * Binary search to find insertion index in sorted array.
 * Maintains invariants INV-QUEUE-01 and INV-QUEUE-02.
 * @param nodes - Sorted array of nodes
 * @param newNode - Node to insert
 * @returns Insertion index
 */
export function findInsertionIndex(nodes: readonly QueueNode[], newNode: QueueNode): number {
  let low = 0;
  let high = nodes.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const midNode = nodes[mid];
    if (midNode && compareNodes(midNode, newNode) <= 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  return low;
}

/**
 * Inserts a node into sorted position.
 * @param nodes - Mutable array of nodes
 * @param newNode - Node to insert
 */
export function insertSorted(nodes: QueueNode[], newNode: QueueNode): void {
  const index = findInsertionIndex(nodes, newNode);
  nodes.splice(index, 0, newNode);
}
