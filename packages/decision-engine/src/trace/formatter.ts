/**
 * @fileoverview Trace formatting utilities.
 * @module @omega/decision-engine/trace/formatter
 *
 * INV-TRACE-03: Export reproducible
 */

import type { TraceEntry, Decision } from '../types/index.js';

/**
 * Formats traces as JSON.
 * INV-TRACE-03: Deterministic output.
 * @param traces - Traces to format
 * @returns JSON string
 */
export function formatTracesAsJson(traces: readonly TraceEntry[]): string {
  // Sort by tracedAt for deterministic output
  const sorted = [...traces].sort((a, b) => a.tracedAt - b.tracedAt);

  // Use stable JSON stringify
  return JSON.stringify(sorted, null, 2);
}

/**
 * Formats traces as CSV.
 * INV-TRACE-03: Deterministic output.
 * @param traces - Traces to format
 * @returns CSV string
 */
export function formatTracesAsCsv(traces: readonly TraceEntry[]): string {
  // Sort by tracedAt for deterministic output
  const sorted = [...traces].sort((a, b) => a.tracedAt - b.tracedAt);

  const headers = [
    'id',
    'decision_id',
    'event_id',
    'classification',
    'score',
    'outcome',
    'decision_timestamp',
    'traced_at',
    'hash',
    'previous_hash',
  ];

  const rows: string[] = [headers.join(',')];

  for (const trace of sorted) {
    const row = [
      escapeCsvValue(trace.id),
      escapeCsvValue(trace.decision.id),
      escapeCsvValue(trace.decision.event.id),
      escapeCsvValue(trace.decision.classification.classification),
      trace.decision.classification.score.toString(),
      escapeCsvValue(trace.decision.outcome),
      trace.decision.timestamp.toString(),
      trace.tracedAt.toString(),
      escapeCsvValue(trace.hash),
      escapeCsvValue(trace.previousHash ?? ''),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}

/**
 * Escapes a value for CSV.
 * @param value - Value to escape
 * @returns Escaped value
 */
function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Formats a single trace entry for display.
 * @param trace - Trace entry
 * @returns Formatted string
 */
export function formatTraceEntry(trace: TraceEntry): string {
  const lines = [
    `Trace ID: ${trace.id}`,
    `Decision ID: ${trace.decision.id}`,
    `Event ID: ${trace.decision.event.id}`,
    `Classification: ${trace.decision.classification.classification}`,
    `Score: ${trace.decision.classification.score.toFixed(4)}`,
    `Outcome: ${trace.decision.outcome}`,
    `Decision Time: ${new Date(trace.decision.timestamp).toISOString()}`,
    `Traced At: ${new Date(trace.tracedAt).toISOString()}`,
    `Hash: ${trace.hash}`,
    `Previous Hash: ${trace.previousHash ?? 'GENESIS'}`,
  ];

  if (Object.keys(trace.metadata).length > 0) {
    lines.push(`Metadata: ${JSON.stringify(trace.metadata)}`);
  }

  return lines.join('\n');
}

/**
 * Formats a decision summary.
 * @param decision - Decision
 * @returns Summary string
 */
export function formatDecisionSummary(decision: Decision): string {
  return `[${decision.id}] ${decision.outcome} (score: ${decision.classification.score.toFixed(2)}) at ${new Date(decision.timestamp).toISOString()}`;
}

/**
 * Validates export format.
 * @param format - Format to validate
 * @returns True if valid
 */
export function isValidExportFormat(format: unknown): format is 'json' | 'csv' {
  return format === 'json' || format === 'csv';
}
