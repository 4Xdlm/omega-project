/**
 * @fileoverview DECISION_TRACE implementation - audit trail for decisions.
 * @module @omega/decision-engine/trace/decision-trace
 *
 * INVARIANTS:
 * - INV-TRACE-01: All decisions traced
 * - INV-TRACE-02: Hash chained (merkle-style)
 * - INV-TRACE-03: Export reproducible
 */

import { hashJson } from '../util/hash.js';
import type { Decision, TraceEntry, TraceFilter } from '../types/index.js';
import type { DecisionTrace, DecisionTraceOptions, ChainVerificationResult } from './types.js';
import { formatTracesAsJson, formatTracesAsCsv, isValidExportFormat } from './formatter.js';

/**
 * Genesis hash for first entry in chain.
 */
const DEFAULT_GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Generates a trace ID.
 */
function generateTraceId(clock: () => number): string {
  const timestamp = clock();
  const random = Math.floor(Math.random() * 1e9).toString(36);
  return `tr_${timestamp}_${random}`;
}

/**
 * Computes hash for a trace entry.
 * INV-TRACE-02: Includes previous hash in computation.
 * @param entry - Entry without hash
 * @param previousHash - Previous entry hash
 * @returns SHA-256 hash
 */
function computeTraceHash(
  entry: Omit<TraceEntry, 'hash'>,
  previousHash: string | null
): string {
  return hashJson({
    id: entry.id,
    decision: entry.decision,
    tracedAt: entry.tracedAt,
    previousHash: previousHash ?? DEFAULT_GENESIS_HASH,
    metadata: entry.metadata,
  });
}

/**
 * Default DecisionTrace implementation.
 * Hash-chained audit trail for all decisions.
 */
export class DefaultDecisionTrace implements DecisionTrace {
  private readonly clock: () => number;
  private readonly idGenerator: () => string;
  private readonly genesisHash: string;
  private readonly entries: TraceEntry[] = [];
  private readonly entryMap: Map<string, TraceEntry> = new Map();
  private lastHash: string | null = null;

  constructor(options: DecisionTraceOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? (() => generateTraceId(this.clock));
    this.genesisHash = options.genesisHash ?? DEFAULT_GENESIS_HASH;
  }

  /**
   * Traces a decision.
   * INV-TRACE-01: Records the decision.
   * INV-TRACE-02: Chains to previous hash.
   */
  trace(decision: Decision, metadata: Record<string, unknown> = {}): TraceEntry {
    const id = this.idGenerator();
    const tracedAt = this.clock();
    const previousHash = this.lastHash;

    const entryWithoutHash: Omit<TraceEntry, 'hash'> = {
      id,
      decision,
      tracedAt,
      previousHash,
      metadata: Object.freeze({ ...metadata }),
    };

    // INV-TRACE-02: Compute hash including previous hash
    const hash = computeTraceHash(entryWithoutHash, previousHash);

    const entry: TraceEntry = Object.freeze({
      ...entryWithoutHash,
      hash,
    });

    this.entries.push(entry);
    this.entryMap.set(id, entry);
    this.lastHash = hash;

    return entry;
  }

  /**
   * Gets a trace by ID.
   */
  getTrace(id: string): TraceEntry | null {
    return this.entryMap.get(id) ?? null;
  }

  /**
   * Gets traces matching filter.
   */
  getTraces(filter?: TraceFilter): readonly TraceEntry[] {
    let result = [...this.entries];

    if (filter) {
      if (filter.since !== undefined) {
        result = result.filter(e => e.tracedAt >= filter.since!);
      }
      if (filter.until !== undefined) {
        result = result.filter(e => e.tracedAt <= filter.until!);
      }
      if (filter.outcome !== undefined) {
        result = result.filter(e => e.decision.outcome === filter.outcome);
      }
      if (filter.limit !== undefined && filter.limit > 0) {
        result = result.slice(0, filter.limit);
      }
    }

    return Object.freeze(result);
  }

  /**
   * Exports traces to specified format.
   * INV-TRACE-03: Deterministic export.
   */
  exportTraces(format: 'json' | 'csv'): string {
    if (!isValidExportFormat(format)) {
      throw new Error(`Invalid export format: ${format}`);
    }

    switch (format) {
      case 'json':
        return formatTracesAsJson(this.entries);
      case 'csv':
        return formatTracesAsCsv(this.entries);
    }
  }

  /**
   * Gets all traces.
   */
  getAll(): readonly TraceEntry[] {
    return Object.freeze([...this.entries]);
  }

  /**
   * Verifies chain integrity.
   * INV-TRACE-02: Hash chain verification.
   */
  verifyChain(): boolean {
    return this.verifyChainDetailed().valid;
  }

  /**
   * Verifies chain with detailed result.
   */
  verifyChainDetailed(): ChainVerificationResult {
    let previousHash: string | null = null;

    for (let i = 0; i < this.entries.length; i++) {
      const entry = this.entries[i];
      if (!entry) {
        return {
          valid: false,
          entriesVerified: i,
          firstInvalidId: null,
          error: `Missing entry at index ${i}`,
        };
      }

      // Check previous hash matches
      if (entry.previousHash !== previousHash) {
        return {
          valid: false,
          entriesVerified: i,
          firstInvalidId: entry.id,
          error: `Previous hash mismatch at entry ${entry.id}`,
        };
      }

      // Recompute and verify hash
      const expectedHash = computeTraceHash(
        {
          id: entry.id,
          decision: entry.decision,
          tracedAt: entry.tracedAt,
          previousHash: entry.previousHash,
          metadata: entry.metadata,
        },
        previousHash
      );

      if (entry.hash !== expectedHash) {
        return {
          valid: false,
          entriesVerified: i,
          firstInvalidId: entry.id,
          error: `Hash mismatch at entry ${entry.id}`,
        };
      }

      previousHash = entry.hash;
    }

    return {
      valid: true,
      entriesVerified: this.entries.length,
      firstInvalidId: null,
      error: null,
    };
  }

  /**
   * Gets trace count.
   */
  size(): number {
    return this.entries.length;
  }

  /**
   * Gets the last hash in the chain.
   */
  getLastHash(): string | null {
    return this.lastHash;
  }

  /**
   * Gets the genesis hash.
   */
  getGenesisHash(): string {
    return this.genesisHash;
  }
}

/**
 * Creates a new DecisionTrace instance.
 * @param options - Configuration options
 * @returns DecisionTrace instance
 */
export function createDecisionTrace(options: DecisionTraceOptions = {}): DecisionTrace {
  return new DefaultDecisionTrace(options);
}
