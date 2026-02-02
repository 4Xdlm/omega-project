/**
 * @fileoverview OMEGA Decision Engine - Public API exports.
 * @module @omega/decision-engine
 * @version 1.0.0
 *
 * NASA-Grade L4 compliant decision system with:
 * - SENTINEL: Read-only verdict observation
 * - CLASSIFIER: Deterministic event classification
 * - ESCALATION_QUEUE: Priority queue for ALERT events
 * - INCIDENT_LOG: Append-only journal for BLOCK events
 * - DECISION_TRACE: Hash-chained audit trail
 * - REVIEW_INTERFACE: Human review API
 *
 * @example
 * ```typescript
 * import {
 *   createSentinel,
 *   createClassifier,
 *   createEscalationQueue,
 *   createIncidentLog,
 *   createDecisionTrace,
 *   createReviewInterface,
 *   createDefaultRules,
 * } from '@omega/decision-engine';
 *
 * // Initialize components
 * const sentinel = createSentinel();
 * const classifier = createClassifier({ rules: createDefaultRules() });
 * const queue = createEscalationQueue();
 * const incidentLog = createIncidentLog();
 * const trace = createDecisionTrace();
 * const review = createReviewInterface({ queue });
 *
 * // Process a verdict
 * const event = sentinel.observeVerdict(verdict);
 * const result = classifier.classify(event);
 *
 * switch (result.classification) {
 *   case 'ACCEPT':
 *     // Process accepted event
 *     break;
 *   case 'ALERT':
 *     queue.enqueue(event, 50);
 *     break;
 *   case 'BLOCK':
 *     incidentLog.logIncident(event, result.reasoning);
 *     break;
 * }
 *
 * // Trace decision
 * trace.trace({
 *   id: 'decision-1',
 *   event,
 *   classification: result,
 *   outcome: outcomeFromClassification(result.classification),
 *   timestamp: Date.now(),
 * });
 * ```
 */

// ============================================================================
// Types
// ============================================================================
export type {
  // Verdicts
  VerdictSource,
  VerdictOutcome,
  BuildVerdict,
  Classification,
  DecisionOutcome,
  // Events
  RuntimeEventType,
  RuntimeEventMetadata,
  RuntimeEvent,
  RuntimeSnapshot,
  SentinelStats,
  // Decisions
  ClassificationResult,
  ClassificationRule,
  QueueEntry,
  IncidentEntry,
  IncidentFilter,
  Decision,
  TraceEntry,
  TraceFilter,
  ReviewDecision,
} from './types/index.js';

export {
  classificationFromOutcome,
  outcomeFromClassification,
} from './types/index.js';

// ============================================================================
// SENTINEL
// ============================================================================
export type { Sentinel, SentinelOptions, ObservationRecord } from './sentinel/index.js';

export {
  DefaultSentinel,
  createSentinel,
  generateEventId,
  computeEventHash,
  isValidBuildVerdict,
  isHashPreserved,
  computeLatency,
  deepFreeze,
} from './sentinel/index.js';

// ============================================================================
// CLASSIFIER
// ============================================================================
export type {
  Classifier,
  ClassifierOptions,
  ScoreBreakdown,
  RuleScoreContribution,
} from './classifier/index.js';

export {
  DefaultClassifier,
  createClassifier,
  sortRulesByPriority,
  isValidRule,
  createMatchAllRule,
  createSourceRule,
  createVerdictRule,
  createAndRule,
  createOrRule,
  createNotRule,
  createDefaultRules,
  computeScoreBreakdown,
  normalizeScore,
  computeFinalScore,
  classificationFromScore,
  getBaseScore,
} from './classifier/index.js';

// ============================================================================
// QUEUE
// ============================================================================
export type {
  EscalationQueue,
  EscalationQueueOptions,
  QueueNode,
  PriorityLevel,
} from './queue/index.js';

export {
  DefaultEscalationQueue,
  createEscalationQueue,
  PRIORITY_LEVELS,
  compareNodes,
  isValidPriority,
  normalizePriority,
  getPriorityLevelName,
  findInsertionIndex,
  insertSorted,
} from './queue/index.js';

// ============================================================================
// INCIDENT
// ============================================================================
export type {
  IncidentLog,
  IncidentLogOptions,
  IncidentStorage,
} from './incident/index.js';

export {
  DefaultIncidentLog,
  createIncidentLog,
  InMemoryIncidentStorage,
  createInMemoryStorage,
  validateStorageIntegrity,
} from './incident/index.js';

// ============================================================================
// TRACE
// ============================================================================
export type {
  DecisionTrace,
  DecisionTraceOptions,
  ChainVerificationResult,
} from './trace/index.js';

export {
  DefaultDecisionTrace,
  createDecisionTrace,
  formatTracesAsJson,
  formatTracesAsCsv,
  formatTraceEntry,
  formatDecisionSummary,
  isValidExportFormat,
} from './trace/index.js';

// ============================================================================
// REVIEW
// ============================================================================
export type {
  ReviewInterface,
  ReviewInterfaceOptions,
  ReviewAction,
  ReviewRequest,
} from './review/index.js';

export {
  DefaultReviewInterface,
  createReviewInterface,
  isValidReviewerId,
  isValidReviewAction,
  isValidReviewRequest,
  createApproveRequest,
  createRejectRequest,
  createDeferRequest,
  getActionDisplayName,
  isTerminalAction,
} from './review/index.js';
