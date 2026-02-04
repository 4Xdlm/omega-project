/**
 * TEMPORAL DRIFT DETECTOR TESTS (D-T)
 * Phase E — Tests for anomalous time gap detection
 *
 * Tests: detectTemporalDrift pure function
 * Detector signature: (observations, baseline) => DriftResult | null
 */

import { describe, it, expect } from 'vitest';
import { detectTemporalDrift } from '../../../../governance/drift/detectors/temporal_drift.js';
import type {
  ObservationSources,
  Baseline,
  RuntimeEvent
} from '../../../../governance/drift/types.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

const TEST_BASELINE: Baseline = {
  sha256: '22b96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa09',
  commit: 'ce542f54',
  tag: 'v1.0-forensic-any-types',
  scope: 'PHASE_D_RUNTIME_GOVERNANCE'
};

function emptyObs(): ObservationSources {
  return { snapshots: [], logEntries: [], runtimeEvents: [] };
}

function makeEvent(id: string, timestamp: string): RuntimeEvent {
  return {
    event_id: id,
    timestamp_utc: timestamp,
    phase: 'D',
    build_ref: { commit: 'ce542f54', tag: 'v1.0' },
    operation: 'sentinel-judge',
    input_hash: 'abc123def456',
    output_hash: 'def456abc123',
    verdict: 'PASS'
  };
}

/**
 * Generates a sequence of events at regular intervals.
 * @param count - Number of events
 * @param intervalMs - Interval between events in milliseconds
 * @param startTime - Start timestamp (ISO string)
 */
function makeRegularEvents(
  count: number,
  intervalMs: number,
  startTime: string = '2025-05-01T10:00:00Z'
): RuntimeEvent[] {
  const startMs = Date.parse(startTime);
  return Array.from({ length: count }, (_, i) =>
    makeEvent(`EVT-${String(i + 1).padStart(3, '0')}`, new Date(startMs + i * intervalMs).toISOString())
  );
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectTemporalDrift', () => {
  it('detects anomalous time gaps', () => {
    // Need enough regular intervals so median stays low, then 3+ anomalous gaps at end
    // (persistence >= 3 required for D-T, threshold = 3x median)
    // 8 regular 10s intervals + 3 anomalous 300s gaps = 11 intervals from 12 events
    // Sorted intervals: [10k x 8, 300k x 3]. Median = 10k. Threshold = 30k. 300k > 30k.
    const baseTime = Date.parse('2025-05-01T10:00:00Z');
    const events: RuntimeEvent[] = [
      // Regular interval: 10 seconds apart (8 intervals)
      makeEvent('EVT-001', new Date(baseTime).toISOString()),
      makeEvent('EVT-002', new Date(baseTime + 10_000).toISOString()),
      makeEvent('EVT-003', new Date(baseTime + 20_000).toISOString()),
      makeEvent('EVT-004', new Date(baseTime + 30_000).toISOString()),
      makeEvent('EVT-005', new Date(baseTime + 40_000).toISOString()),
      makeEvent('EVT-006', new Date(baseTime + 50_000).toISOString()),
      makeEvent('EVT-007', new Date(baseTime + 60_000).toISOString()),
      makeEvent('EVT-008', new Date(baseTime + 70_000).toISOString()),
      makeEvent('EVT-009', new Date(baseTime + 80_000).toISOString()),
      // Anomalous gaps: 300s each (persistence >= 3 from end)
      makeEvent('EVT-010', new Date(baseTime + 380_000).toISOString()),
      makeEvent('EVT-011', new Date(baseTime + 680_000).toISOString()),
      makeEvent('EVT-012', new Date(baseTime + 980_000).toISOString())
    ];

    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: events
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-T');
    expect(result!.description).toContain('anomalous time gaps');
    expect(result!.evidence.length).toBeGreaterThan(0);
    expect(result!.score).toBeGreaterThan(0);
  });

  it('returns null for regular intervals', () => {
    // All events at exactly 60s intervals -- no anomalous gaps
    const events = makeRegularEvents(6, 60_000);

    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: events
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('returns null for fewer than 3 timestamps', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent('EVT-001', '2025-05-01T10:00:00Z'),
        makeEvent('EVT-002', '2025-05-01T10:01:00Z')
      ]
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('result type is D-T', () => {
    // Same structure as 'detects anomalous time gaps' test:
    // enough regular intervals so median stays at 10s, then 3 anomalous 300s gaps
    const baseTime = Date.parse('2025-05-01T10:00:00Z');
    const events: RuntimeEvent[] = [
      makeEvent('EVT-001', new Date(baseTime).toISOString()),
      makeEvent('EVT-002', new Date(baseTime + 10_000).toISOString()),
      makeEvent('EVT-003', new Date(baseTime + 20_000).toISOString()),
      makeEvent('EVT-004', new Date(baseTime + 30_000).toISOString()),
      makeEvent('EVT-005', new Date(baseTime + 40_000).toISOString()),
      makeEvent('EVT-006', new Date(baseTime + 50_000).toISOString()),
      makeEvent('EVT-007', new Date(baseTime + 60_000).toISOString()),
      makeEvent('EVT-008', new Date(baseTime + 70_000).toISOString()),
      makeEvent('EVT-009', new Date(baseTime + 80_000).toISOString()),
      // Anomalous gaps at end (persistence >= 3)
      makeEvent('EVT-010', new Date(baseTime + 380_000).toISOString()),
      makeEvent('EVT-011', new Date(baseTime + 680_000).toISOString()),
      makeEvent('EVT-012', new Date(baseTime + 980_000).toISOString())
    ];

    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: events
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-T');
    expect(result!.drift_id).toContain('D-T');
  });

  it('returns null for empty observations', () => {
    const result = detectTemporalDrift(emptyObs(), TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('returns null for single event', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent('EVT-001', '2025-05-01T10:00:00Z')
      ]
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('considers timestamps from all observation sources', () => {
    // Need enough regular intervals across all sources so median stays at 10s,
    // then 3 anomalous 300s gaps at the end from runtime events.
    // Total: 9 regular timestamps + 3 anomalous = 12 timestamps, 11 intervals
    // Sorted intervals: [10k x 8, 300k x 3]. Median = 10k. Threshold = 30k.
    const baseTime = Date.parse('2025-05-01T10:00:00Z');

    const obs: ObservationSources = {
      snapshots: [
        {
          snapshot_id: 'SNAP-001',
          timestamp_utc: new Date(baseTime).toISOString(),
          baseline_ref: 'baseline-001',
          last_event_id: 'EVT-001',
          events_count_total: 1,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
          status: 'CLEAN'
        },
        {
          snapshot_id: 'SNAP-002',
          timestamp_utc: new Date(baseTime + 10_000).toISOString(),
          baseline_ref: 'baseline-001',
          last_event_id: 'EVT-002',
          events_count_total: 2,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
          status: 'CLEAN'
        },
        {
          snapshot_id: 'SNAP-003',
          timestamp_utc: new Date(baseTime + 20_000).toISOString(),
          baseline_ref: 'baseline-001',
          last_event_id: 'EVT-003',
          events_count_total: 3,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
          status: 'CLEAN'
        }
      ],
      logEntries: [
        {
          event_id: 'LOG-001',
          timestamp_utc: new Date(baseTime + 30_000).toISOString()
        },
        {
          event_id: 'LOG-002',
          timestamp_utc: new Date(baseTime + 40_000).toISOString()
        },
        {
          event_id: 'LOG-003',
          timestamp_utc: new Date(baseTime + 50_000).toISOString()
        },
        {
          event_id: 'LOG-004',
          timestamp_utc: new Date(baseTime + 60_000).toISOString()
        },
        {
          event_id: 'LOG-005',
          timestamp_utc: new Date(baseTime + 70_000).toISOString()
        },
        {
          event_id: 'LOG-006',
          timestamp_utc: new Date(baseTime + 80_000).toISOString()
        }
      ],
      runtimeEvents: [
        // Anomalous gaps at the end (persistence >= 3)
        makeEvent('EVT-004', new Date(baseTime + 380_000).toISOString()),
        makeEvent('EVT-005', new Date(baseTime + 680_000).toISOString()),
        makeEvent('EVT-006', new Date(baseTime + 980_000).toISOString())
      ]
    };

    const result = detectTemporalDrift(obs, TEST_BASELINE);

    // The detector considers all timestamp sources
    // 12 timestamps, 11 intervals. Median = 10s. 3 anomalous gaps of 300s > threshold 30s.
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-T');
  });
});
