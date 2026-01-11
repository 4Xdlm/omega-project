/**
 * @fileoverview OMEGA Gold Suite - Type Definitions
 * @module @omega/gold-suite/types
 *
 * Types for test suite execution and aggregation.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Test suite configuration.
 */
export interface SuiteConfig {
  /** Suite name */
  readonly name: string;
  /** Suite version */
  readonly version: string;
  /** Packages to include */
  readonly packages: readonly string[];
  /** Parallel execution */
  readonly parallel: boolean;
  /** Timeout per test in ms */
  readonly timeout: number;
  /** Retry count */
  readonly retries: number;
}

/**
 * Test case result.
 */
export interface TestCase {
  readonly id: string;
  readonly name: string;
  readonly suite: string;
  readonly status: 'passed' | 'failed' | 'skipped';
  readonly duration: number;
  readonly error?: string;
  readonly stack?: string;
}

/**
 * Test suite result.
 */
export interface SuiteResult {
  readonly name: string;
  readonly package: string;
  readonly tests: readonly TestCase[];
  readonly passed: number;
  readonly failed: number;
  readonly skipped: number;
  readonly duration: number;
  readonly success: boolean;
}

/**
 * Full suite run result.
 */
export interface SuiteRunResult {
  readonly config: SuiteConfig;
  readonly suites: readonly SuiteResult[];
  readonly summary: SuiteSummary;
  readonly timestamp: string;
}

/**
 * Suite run summary.
 */
export interface SuiteSummary {
  readonly totalSuites: number;
  readonly totalTests: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalSkipped: number;
  readonly totalDuration: number;
  readonly passRate: number;
  readonly success: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUITE EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Suite event types.
 */
export type SuiteEventType =
  | 'suite:start'
  | 'suite:complete'
  | 'test:start'
  | 'test:complete'
  | 'run:start'
  | 'run:complete';

/**
 * Suite event.
 */
export interface SuiteEvent {
  readonly type: SuiteEventType;
  readonly timestamp: string;
  readonly data: unknown;
}

/**
 * Suite event handler.
 */
export type SuiteEventHandler = (event: SuiteEvent) => void;

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default suite configuration.
 */
export const DEFAULT_SUITE_CONFIG: SuiteConfig = Object.freeze({
  name: 'OMEGA Gold Suite',
  version: '1.0.0',
  packages: [],
  parallel: false,
  timeout: 30000,
  retries: 0,
});
