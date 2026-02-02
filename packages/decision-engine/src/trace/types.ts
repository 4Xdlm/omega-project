/**
 * @fileoverview TRACE module type definitions.
 * @module @omega/decision-engine/trace/types
 */

import type { Decision, TraceEntry, TraceFilter } from '../types/index.js';

/**
 * DECISION_TRACE interface - audit trail for all decisions.
 * INV-TRACE-01: All decisions traced.
 * INV-TRACE-02: Hash chained (merkle-style).
 * INV-TRACE-03: Export reproductible.
 */
export interface DecisionTrace {
  /**
   * Traces a decision.
   * INV-TRACE-01: Records the decision.
   * INV-TRACE-02: Chains to previous hash.
   * @param decision - Decision to trace
   * @param metadata - Optional metadata
   * @returns Created trace entry
   */
  trace(decision: Decision, metadata?: Record<string, unknown>): TraceEntry;

  /**
   * Gets a trace by ID.
   * @param id - Trace ID
   * @returns Trace entry or null
   */
  getTrace(id: string): TraceEntry | null;

  /**
   * Gets traces matching filter.
   * @param filter - Optional filter criteria
   * @returns Array of matching traces
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[];

  /**
   * Exports traces to specified format.
   * INV-TRACE-03: Deterministic export.
   * @param format - Export format
   * @returns Formatted string
   */
  exportTraces(format: 'json' | 'csv'): string;

  /**
   * Gets all traces.
   * @returns All trace entries
   */
  getAll(): readonly TraceEntry[];

  /**
   * Verifies chain integrity.
   * INV-TRACE-02: Hash chain verification.
   * @returns True if chain valid
   */
  verifyChain(): boolean;

  /**
   * Gets trace count.
   * @returns Number of traces
   */
  size(): number;
}

/**
 * Options for creating a DecisionTrace.
 */
export interface DecisionTraceOptions {
  /** Clock function for timestamps */
  readonly clock?: () => number;
  /** ID generator function */
  readonly idGenerator?: () => string;
  /** Genesis hash for first entry */
  readonly genesisHash?: string;
}

/**
 * Chain verification result.
 */
export interface ChainVerificationResult {
  /** Overall validity */
  readonly valid: boolean;
  /** Number of entries verified */
  readonly entriesVerified: number;
  /** First invalid entry ID (if any) */
  readonly firstInvalidId: string | null;
  /** Error message (if invalid) */
  readonly error: string | null;
}
