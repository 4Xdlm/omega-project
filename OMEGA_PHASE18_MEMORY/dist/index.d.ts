/**
 * OMEGA Memory Foundation — Main Index
 * Phase 18 — v3.18.0
 * Standard: MIL-STD-882E / DO-178C Level A
 *
 * 4 Modules:
 * - CANON_CORE: Cryptographic fact store (INV-MEM-01, INV-MEM-05, INV-MEM-06, INV-MEM-08)
 * - INTENT_MACHINE: Formal state machine (INV-MEM-02, INV-MEM-07)
 * - CONTEXT_ENGINE: Narrative context tracking (INV-MEM-03, INV-MEM-06)
 * - CONFLICT_RESOLVER: Conflict detection & resolution (INV-MEM-04, INV-MEM-08)
 */
export { CanonStore, createCanonStore, type Fact, type FactMetadata, type CreateFactInput, type UpdateFactInput, type FactFilter, type CanonResult, type CanonError, type CanonSnapshot, type FactConflict, type AuditEntry, type CanonMetrics, FactType, FactSource, FactStatus, ConfidenceLevel, ConflictResolution, CanonErrorCode, CANON_VERSION, SOURCE_PRIORITY, CANON_LIMITS, } from './canon/index.js';
export { IntentLock, createIntentLock, type Intent, type IntentMetadata, type IntentPayload, type CreateIntentInput, type CompleteIntentOptions, type FailIntentOptions, type StateTransition, type TransitionHistory, type QueueEntry, type IntentResult, type IntentError, type IntentMetrics, type IntentStateChangeEvent, type IntentStateListener, IntentState, IntentType, IntentPriority, IntentAction, IntentFailureCode, IntentErrorCode, INTENT_VERSION, VALID_TRANSITIONS, ACTION_TRANSITIONS, PRIORITY_VALUES, INTENT_LIMITS, } from './intent/index.js';
export { ContextTracker, createContextTracker, type TextPosition, type ContextElement, type ElementMetadata, type AddElementInput, type UpdateElementInput, type ContextState, type ContextSnapshot, type HistoryEntry, type ElementFilter, type ContextResult, type ContextError, type ContextMetrics, ContextScope, ElementType, ElementState, ContextAction, ContextErrorCode, comparePositions, CONTEXT_VERSION, SCOPE_HIERARCHY, CONTEXT_LIMITS, DEFAULT_WEIGHTS, DECAY_RATES, } from './context/index.js';
export { ConflictResolver, createConflictResolver, type Conflict, type ConflictParty, type ConflictMetadata, type ConflictResolution as ConflictResolutionDetail, type DetectConflictInput, type ResolveConflictInput, type ConflictFilter, type ResolverResult, type ResolverError, type ResolverMetrics, type ResolutionAuditEntry, type ConflictEvent, type ConflictListener, ConflictCategory, ConflictSeverity, ConflictStatus, ResolutionStrategy, ConflictFlag, ResolverErrorCode, RESOLVER_VERSION, SEVERITY_VALUES, RESOLVER_LIMITS, } from './resolver/index.js';
export declare const MEMORY_FOUNDATION_VERSION = "3.18.0";
//# sourceMappingURL=index.d.ts.map