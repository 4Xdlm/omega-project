/**
 * @fileoverview ESCALATION_QUEUE implementation - priority queue for ALERT events.
 * @module @omega/decision-engine/queue/escalation-queue
 *
 * INVARIANTS:
 * - INV-QUEUE-01: Order by priority (dequeue = max priority)
 * - INV-QUEUE-02: FIFO at equal priority
 * - INV-QUEUE-03: No event loss
 * - INV-QUEUE-04: Thread-safe (single-threaded JS assumption)
 */

import type { RuntimeEvent, QueueEntry } from '../types/index.js';
import type { EscalationQueue, EscalationQueueOptions, QueueNode } from './types.js';
import { normalizePriority, insertSorted, compareNodes } from './priority.js';

/**
 * Generates a queue entry ID.
 */
function generateQueueId(clock: () => number): string {
  const timestamp = clock();
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `qe_${timestamp}_${random}`;
}

/**
 * Default EscalationQueue implementation.
 * Priority queue with FIFO ordering at equal priority.
 */
export class DefaultEscalationQueue implements EscalationQueue {
  private readonly clock: () => number;
  private readonly idGenerator: () => string;
  private readonly maxSize: number;
  private readonly nodes: QueueNode[] = [];
  private readonly entryMap: Map<string, QueueNode> = new Map();
  private insertionCounter = 0;

  constructor(options: EscalationQueueOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? (() => generateQueueId(this.clock));
    this.maxSize = options.maxSize ?? 0;
  }

  /**
   * Adds an event to the queue.
   * INV-QUEUE-03: Event is guaranteed to be stored.
   */
  enqueue(event: RuntimeEvent, priority: number): QueueEntry {
    // Check max size
    if (this.maxSize > 0 && this.nodes.length >= this.maxSize) {
      throw new Error(`Queue is full (max size: ${this.maxSize})`);
    }

    const normalizedPriority = normalizePriority(priority);
    const entryId = this.idGenerator();
    const now = this.clock();

    const entry: QueueEntry = {
      id: entryId,
      event,
      priority: normalizedPriority,
      enqueuedAt: now,
      status: 'PENDING',
    };

    const node: QueueNode = {
      entry,
      insertionOrder: this.insertionCounter++,
    };

    // INV-QUEUE-01 & INV-QUEUE-02: Insert in sorted position
    insertSorted(this.nodes, node);
    this.entryMap.set(entryId, node);

    return entry;
  }

  /**
   * Removes and returns the highest priority entry.
   * INV-QUEUE-01: Returns max priority first.
   * INV-QUEUE-02: FIFO at same priority.
   */
  dequeue(): QueueEntry | null {
    if (this.nodes.length === 0) {
      return null;
    }

    // First element has highest priority (sorted)
    const node = this.nodes.shift();
    if (!node) {
      return null;
    }

    this.entryMap.delete(node.entry.id);
    return node.entry;
  }

  /**
   * Returns the highest priority entry without removing.
   */
  peek(): QueueEntry | null {
    const node = this.nodes[0];
    return node?.entry ?? null;
  }

  /**
   * Gets current queue size.
   */
  size(): number {
    return this.nodes.length;
  }

  /**
   * Checks if queue is empty.
   */
  isEmpty(): boolean {
    return this.nodes.length === 0;
  }

  /**
   * Clears all entries from the queue.
   */
  clear(): void {
    this.nodes.length = 0;
    this.entryMap.clear();
  }

  /**
   * Gets all entries in priority order.
   */
  getAll(): readonly QueueEntry[] {
    return Object.freeze(this.nodes.map(n => n.entry));
  }

  /**
   * Gets entry by ID.
   */
  getById(id: string): QueueEntry | null {
    const node = this.entryMap.get(id);
    return node?.entry ?? null;
  }

  /**
   * Updates entry status.
   */
  updateStatus(id: string, status: QueueEntry['status']): boolean {
    const node = this.entryMap.get(id);
    if (!node) {
      return false;
    }

    // Create updated entry (entries are readonly, so we need to rebuild)
    const updatedEntry: QueueEntry = {
      ...node.entry,
      status,
    };

    // Find and update in nodes array
    const index = this.nodes.findIndex(n => n.entry.id === id);
    if (index !== -1) {
      const existingNode = this.nodes[index];
      if (existingNode) {
        this.nodes[index] = {
          ...existingNode,
          entry: updatedEntry,
        };
      }
    }

    // Update in map
    const existingNode = this.entryMap.get(id);
    if (existingNode) {
      this.entryMap.set(id, {
        ...existingNode,
        entry: updatedEntry,
      });
    }

    return true;
  }

  /**
   * Gets entries by status.
   */
  getByStatus(status: QueueEntry['status']): readonly QueueEntry[] {
    return Object.freeze(
      this.nodes
        .filter(n => n.entry.status === status)
        .map(n => n.entry)
    );
  }

  /**
   * Validates queue integrity (for testing).
   * Checks INV-QUEUE-01 and INV-QUEUE-02.
   */
  validateIntegrity(): boolean {
    for (let i = 1; i < this.nodes.length; i++) {
      const prev = this.nodes[i - 1];
      const curr = this.nodes[i];
      if (prev && curr && compareNodes(prev, curr) > 0) {
        return false; // Ordering violation
      }
    }
    return true;
  }
}

/**
 * Creates a new EscalationQueue instance.
 * @param options - Configuration options
 * @returns EscalationQueue instance
 */
export function createEscalationQueue(options: EscalationQueueOptions = {}): EscalationQueue {
  return new DefaultEscalationQueue(options);
}
