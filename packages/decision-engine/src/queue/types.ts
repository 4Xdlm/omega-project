/**
 * @fileoverview QUEUE module type definitions.
 * @module @omega/decision-engine/queue/types
 */

import type { RuntimeEvent, QueueEntry } from '../types/index.js';

/**
 * ESCALATION_QUEUE interface - priority queue for ALERT events.
 * INV-QUEUE-01: Order by priority (dequeue = max priority).
 * INV-QUEUE-02: FIFO at equal priority.
 * INV-QUEUE-03: No event loss.
 * INV-QUEUE-04: Thread-safe.
 */
export interface EscalationQueue {
  /**
   * Adds an event to the queue.
   * @param event - Event to enqueue
   * @param priority - Priority level (higher = more urgent)
   * @returns Created queue entry
   */
  enqueue(event: RuntimeEvent, priority: number): QueueEntry;

  /**
   * Removes and returns the highest priority entry.
   * INV-QUEUE-01: Returns max priority.
   * INV-QUEUE-02: FIFO at same priority.
   * @returns Queue entry or null if empty
   */
  dequeue(): QueueEntry | null;

  /**
   * Returns the highest priority entry without removing.
   * @returns Queue entry or null if empty
   */
  peek(): QueueEntry | null;

  /**
   * Gets current queue size.
   * @returns Number of entries
   */
  size(): number;

  /**
   * Checks if queue is empty.
   * @returns True if empty
   */
  isEmpty(): boolean;

  /**
   * Clears all entries from the queue.
   */
  clear(): void;

  /**
   * Gets all entries.
   * @returns Array of queue entries
   */
  getAll(): readonly QueueEntry[];

  /**
   * Gets entry by ID.
   * @param id - Entry ID
   * @returns Queue entry or null
   */
  getById(id: string): QueueEntry | null;

  /**
   * Updates entry status.
   * @param id - Entry ID
   * @param status - New status
   * @returns True if updated
   */
  updateStatus(id: string, status: QueueEntry['status']): boolean;
}

/**
 * Options for creating an EscalationQueue.
 */
export interface EscalationQueueOptions {
  /** Clock function for timestamps */
  readonly clock?: () => number;
  /** ID generator function */
  readonly idGenerator?: () => string;
  /** Maximum queue size (0 = unlimited) */
  readonly maxSize?: number;
}

/**
 * Internal queue node for priority ordering.
 */
export interface QueueNode {
  /** The queue entry */
  readonly entry: QueueEntry;
  /** Insertion order for FIFO tiebreaker */
  readonly insertionOrder: number;
}
