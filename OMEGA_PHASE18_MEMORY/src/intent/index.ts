/**
 * OMEGA INTENT_MACHINE — Public API
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */

// Main class
export { IntentLock, createIntentLock } from './intent-lock.js';
export type { ClockFn } from './intent-lock.js';

// Types
export type {
  Intent,
  IntentMetadata,
  IntentPayload,
  CreateIntentInput,
  CompleteIntentOptions,
  FailIntentOptions,
  StateTransition,
  TransitionHistory,
  QueueEntry,
  IntentResult,
  IntentError,
  IntentMetrics,
  IntentStateChangeEvent,
  IntentStateListener,
} from './types.js';

export { IntentErrorCode } from './types.js';

// Constants
export {
  INTENT_VERSION,
  IntentState,
  IntentType,
  IntentPriority,
  IntentAction,
  IntentFailureCode,
  VALID_TRANSITIONS,
  ACTION_TRANSITIONS,
  PRIORITY_VALUES,
  INTENT_LIMITS,
} from './constants.js';
