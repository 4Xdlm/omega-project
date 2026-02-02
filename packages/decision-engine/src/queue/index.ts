/**
 * @fileoverview QUEUE module public exports.
 * @module @omega/decision-engine/queue
 */

export type {
  EscalationQueue,
  EscalationQueueOptions,
  QueueNode,
} from './types.js';

export {
  DefaultEscalationQueue,
  createEscalationQueue,
} from './escalation-queue.js';

export {
  PRIORITY_LEVELS,
  compareNodes,
  isValidPriority,
  normalizePriority,
  getPriorityLevelName,
  findInsertionIndex,
  insertSorted,
} from './priority.js';

export type { PriorityLevel } from './priority.js';
