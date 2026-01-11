/**
 * @fileoverview OMEGA Gold Suite - Public API
 * @module @omega/gold-suite
 *
 * Consolidated test suite runner.
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  SuiteConfig,
  TestCase,
  SuiteResult,
  SuiteRunResult,
  SuiteSummary,
  SuiteEventType,
  SuiteEvent,
  SuiteEventHandler,
} from './types.js';

export { DEFAULT_SUITE_CONFIG } from './types.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RUNNER
// ═══════════════════════════════════════════════════════════════════════════════

export {
  SuiteRunner,
  createSuiteRunner,
  runAllSuites,
} from './runner.js';

// ═══════════════════════════════════════════════════════════════════════════════
// AGGREGATOR
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  AggregatedResult,
  PackageResult,
} from './aggregator.js';

export {
  aggregateResults,
  formatResultText,
  formatResultJson,
  formatResultMarkdown,
} from './aggregator.js';
