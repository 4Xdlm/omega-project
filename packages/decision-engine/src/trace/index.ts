/**
 * @fileoverview TRACE module public exports.
 * @module @omega/decision-engine/trace
 */

export type {
  DecisionTrace,
  DecisionTraceOptions,
  ChainVerificationResult,
} from './types.js';

export {
  DefaultDecisionTrace,
  createDecisionTrace,
} from './decision-trace.js';

export {
  formatTracesAsJson,
  formatTracesAsCsv,
  formatTraceEntry,
  formatDecisionSummary,
  isValidExportFormat,
} from './formatter.js';
