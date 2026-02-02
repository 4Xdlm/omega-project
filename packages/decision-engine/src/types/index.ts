/**
 * @fileoverview Public type exports for OMEGA Decision Engine.
 * @module @omega/decision-engine/types
 */

// Verdicts
export type {
  VerdictSource,
  VerdictOutcome,
  BuildVerdict,
  Classification,
  DecisionOutcome,
} from './verdicts.js';

export {
  classificationFromOutcome,
  outcomeFromClassification,
} from './verdicts.js';

// Events
export type {
  RuntimeEventType,
  RuntimeEventMetadata,
  RuntimeEvent,
  RuntimeSnapshot,
  SentinelStats,
} from './events.js';

// Decisions
export type {
  ClassificationResult,
  ClassificationRule,
  QueueEntry,
  IncidentEntry,
  IncidentFilter,
  Decision,
  TraceEntry,
  TraceFilter,
  ReviewDecision,
} from './decisions.js';
