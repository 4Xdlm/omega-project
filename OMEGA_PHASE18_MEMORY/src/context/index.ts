/**
 * OMEGA CONTEXT_ENGINE — Public API
 * Phase 18 — Memory Foundation
 * Standard: MIL-STD-882E / DO-178C Level A
 */

// Main class
export { ContextTracker, createContextTracker } from './context-tracker.js';
export type { ClockFn } from './context-tracker.js';

// Types
export type {
  TextPosition,
  ContextElement,
  ElementMetadata,
  AddElementInput,
  UpdateElementInput,
  ContextState,
  ContextSnapshot,
  HistoryEntry,
  ElementFilter,
  ContextResult,
  ContextError,
  ContextMetrics,
} from './types.js';

export { ContextAction, ContextErrorCode, comparePositions } from './types.js';

// Constants
export {
  CONTEXT_VERSION,
  ContextScope,
  ElementType,
  ElementState,
  SCOPE_HIERARCHY,
  CONTEXT_LIMITS,
  DEFAULT_WEIGHTS,
  DECAY_RATES,
} from './constants.js';
