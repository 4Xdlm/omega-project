/**
 * @fileoverview SENTINEL implementation - read-only verdict observer.
 * @module @omega/decision-engine/sentinel/sentinel
 *
 * INVARIANTS:
 * - INV-SENTINEL-01: Read-only (never modifies verdicts)
 * - INV-SENTINEL-02: Timestamp precision (±1ms)
 * - INV-SENTINEL-03: Hash preservation (original → event)
 * - INV-SENTINEL-04: Performance <10ms per verdict
 */

import type {
  BuildVerdict,
  RuntimeEvent,
  RuntimeSnapshot,
  SentinelStats,
} from '../types/index.js';
import type { Sentinel, SentinelOptions, ObservationRecord } from './types.js';
import {
  generateEventId,
  computeEventHash,
  isValidBuildVerdict,
  computeLatency,
  deepFreeze,
} from './utils.js';

/**
 * Default Sentinel implementation.
 * Observes build verdicts and generates runtime events.
 */
export class DefaultSentinel implements Sentinel {
  private readonly clock: () => number;
  private readonly idGenerator: () => string;
  private readonly observations: ObservationRecord[] = [];
  private totalLatency = 0;
  private maxLatency = 0;
  private readonly sourceCount: Map<string, number> = new Map();
  private readonly verdictCount: Map<string, number> = new Map();

  constructor(options: SentinelOptions = {}) {
    this.clock = options.clock ?? (() => Date.now());
    this.idGenerator = options.idGenerator ?? (() => generateEventId('evt', this.clock));
  }

  /**
   * Observes a build verdict and generates a runtime event.
   * INV-SENTINEL-01: Creates new event without modifying verdict.
   * INV-SENTINEL-02: Records precise timestamp.
   * INV-SENTINEL-03: Preserves original hash.
   * INV-SENTINEL-04: Must complete in <10ms.
   */
  observeVerdict(verdict: BuildVerdict): RuntimeEvent {
    const observedAt = this.clock();

    // Validate verdict structure
    if (!isValidBuildVerdict(verdict)) {
      throw new Error('Invalid build verdict structure');
    }

    // Generate event ID
    const eventId = this.idGenerator();

    // Compute latency
    const latency = computeLatency(verdict.timestamp, observedAt);

    // Create event without hash first
    const eventWithoutHash = {
      id: eventId,
      timestamp: observedAt,
      type: 'VERDICT_OBSERVED' as const,
      verdict: deepFreeze({ ...verdict }), // INV-SENTINEL-01: Copy, don't modify
      metadata: {
        observedAt,
        hash: '', // Placeholder
      },
    };

    // Compute event hash
    const eventHash = computeEventHash(eventWithoutHash);

    // Create final immutable event
    const event: RuntimeEvent = deepFreeze({
      ...eventWithoutHash,
      metadata: {
        observedAt,
        hash: eventHash,
      },
    });

    // Record observation
    const record: ObservationRecord = {
      event,
      latencyMs: latency,
    };
    this.observations.push(record);

    // Update statistics
    this.totalLatency += latency;
    if (latency > this.maxLatency) {
      this.maxLatency = latency;
    }

    this.sourceCount.set(
      verdict.source,
      (this.sourceCount.get(verdict.source) ?? 0) + 1
    );
    this.verdictCount.set(
      verdict.verdict,
      (this.verdictCount.get(verdict.verdict) ?? 0) + 1
    );

    return event;
  }

  /**
   * Gets current state snapshot.
   */
  getSnapshot(): RuntimeSnapshot {
    const lastObservation = this.observations[this.observations.length - 1];

    return deepFreeze({
      totalEvents: this.observations.length,
      lastEventId: lastObservation?.event.id ?? null,
      lastEventTimestamp: lastObservation?.event.timestamp ?? null,
      snapshotTimestamp: this.clock(),
    });
  }

  /**
   * Gets observation statistics.
   */
  getStats(): SentinelStats {
    const bySource: Record<string, number> = {};
    for (const [key, value] of this.sourceCount) {
      bySource[key] = value;
    }

    const byVerdict: Record<string, number> = {};
    for (const [key, value] of this.verdictCount) {
      byVerdict[key] = value;
    }

    const avgLatency = this.observations.length > 0
      ? this.totalLatency / this.observations.length
      : 0;

    return deepFreeze({
      totalObserved: this.observations.length,
      bySource,
      byVerdict,
      avgLatencyMs: avgLatency,
      maxLatencyMs: this.maxLatency,
    });
  }

  /**
   * Resets the sentinel state.
   */
  reset(): void {
    this.observations.length = 0;
    this.totalLatency = 0;
    this.maxLatency = 0;
    this.sourceCount.clear();
    this.verdictCount.clear();
  }

  /**
   * Gets all observation records (for testing).
   */
  getObservations(): readonly ObservationRecord[] {
    return this.observations;
  }
}

/**
 * Creates a new Sentinel instance.
 * @param options - Configuration options
 * @returns Sentinel instance
 */
export function createSentinel(options: SentinelOptions = {}): Sentinel {
  return new DefaultSentinel(options);
}
