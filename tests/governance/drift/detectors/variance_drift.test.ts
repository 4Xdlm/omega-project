/**
 * VARIANCE DRIFT DETECTOR TESTS (D-V)
 * Phase E — Tests for detectVarianceDrift
 *
 * Validates statistical dispersion detection, coefficient of variation
 * thresholds, and persistence requirements across snapshots.
 */

import { describe, it, expect } from 'vitest';
import { detectVarianceDrift } from '../../../../governance/drift/detectors/variance_drift.js';
import type {
  ObservationSources,
  Baseline,
  Snapshot,
  RuntimeEvent,
  GovernanceLogEntry
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

function makeSnapshot(overrides: Partial<Snapshot> & { snapshot_id: string; events_count_total: number }): Snapshot {
  return {
    timestamp_utc: '2025-01-15T12:00:00Z',
    baseline_ref: TEST_BASELINE.sha256,
    last_event_id: 'EVT-001',
    status: 'ACTIVE',
    anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
    ...overrides
  };
}

function makeRuntimeEvent(overrides: Partial<RuntimeEvent> & { event_id: string }): RuntimeEvent {
  return {
    timestamp_utc: '2025-01-15T12:00:00Z',
    phase: 'D',
    build_ref: { commit: TEST_BASELINE.commit, tag: TEST_BASELINE.tag },
    operation: 'test-operation',
    input_hash: 'abc123',
    output_hash: 'def456',
    verdict: 'PASS',
    ...overrides
  };
}

function makeLogEntry(overrides: Partial<GovernanceLogEntry> = {}): GovernanceLogEntry {
  return {
    timestamp_utc: '2025-01-15T12:00:00Z',
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/variance_drift/detectVarianceDrift', () => {
  it('returns null for empty observations', () => {
    const result = detectVarianceDrift(emptyObs(), TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null for fewer than 3 snapshots', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
        makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 100 })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null for stable event counts (low CV)', () => {
    // All counts identical => stddev=0 => CV=0 < 0.5 threshold
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
        makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 10 }),
        makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 10 })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('detects high variance in event counts (high CV)', () => {
    // [10, 100, 5] => mean=38.33, stddev=~42.7 => CV=~1.11 > 0.5
    // This triggers event_count CV issue
    // Need persistence >= 3 for D-V, so we need at least 3 issues
    // High CV + anomalies + verdict variance = 3 issues
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 1, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 1 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'FAIL' })
      ],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-V');
  });

  it('returns result with type D-V', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 1, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 1 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'FAIL' })
      ],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-V');
  });

  it('requires persistence >= 3 to trigger drift', () => {
    // Only 1 issue (high CV) => persistence=1 < persistenceMin(3) => null
    // No anomaly counts, no verdict variance
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
        makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 100 }),
        makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 5 })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    // Only 1 issue (event_count CV), persistence=1 < 3 => null
    expect(result).toBeNull();
  });

  it('detects anomaly count variance as an issue', () => {
    // Anomaly counts with mean > 0 contribute an issue
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 2, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 1 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'FAIL' })
      ],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const hasAnomalyEvidence = result!.evidence.some(e => e.includes('anomaly_count'));
    expect(hasAnomalyEvidence).toBe(true);
  });

  it('detects verdict variance from non-PASS runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 1, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 }
        })
      ],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'FAIL' })
      ]
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const hasVerdictEvidence = result!.evidence.some(e => e.includes('verdict_variance'));
    expect(hasVerdictEvidence).toBe(true);
  });

  it('computes score as impact * confidence * persistence', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 1, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 1 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'DRIFT' })
      ],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const expectedScore = result!.impact * result!.confidence * result!.persistence;
    expect(result!.score).toBeCloseTo(expectedScore, 2);
  });

  it('sets baseline_value and observed_value descriptively', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          events_count_total: 10,
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          events_count_total: 100,
          anomalies: { tooling_drift: 0, product_drift: 1, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-003',
          events_count_total: 5,
          anomalies: { tooling_drift: 0, product_drift: 0, incidents: 1 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'FAIL' })
      ],
      runtimeEvents: []
    };
    const result = detectVarianceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.baseline_value).toContain('stable');
    expect(result!.observed_value).toContain('variance anomalies');
  });
});
