/**
 * PERFORMANCE DRIFT DETECTOR TESTS (D-P)
 * Phase E — Tests for detectPerformanceDrift
 *
 * Validates event count deviation detection, persistence thresholds,
 * and anomaly spike handling across snapshots.
 */

import { describe, it, expect } from 'vitest';
import { detectPerformanceDrift } from '../../../../governance/drift/detectors/performance_drift.js';
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

function makeObs(snapshots: Snapshot[]): ObservationSources {
  return { snapshots, logEntries: [], runtimeEvents: [] };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/performance_drift/detectPerformanceDrift', () => {
  it('returns null for empty observations', () => {
    const result = detectPerformanceDrift(emptyObs(), TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null for fewer than 2 snapshots', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null when event counts are stable across snapshots', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 11 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('detects event count deviation exceeding 20% threshold', () => {
    // Baseline count = 10, third snapshot = 30 => 200% change => well above 20%
    // persistence: snapshots[2] deviates (200%), snapshots[1] does not (0%) => persistence=1
    // But we need persistence >= 2, so let's make two consecutive deviations
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 30 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 30 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-P');
    expect(result!.evidence.length).toBeGreaterThan(0);
  });

  it('returns result with type D-P', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 30 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 30 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-P');
  });

  it('requires persistence >= 2 to trigger drift', () => {
    // Only 2 snapshots: baseline=10, second=30 => deviation exists
    // persistence counts backwards from end: snapshots[1] deviates => persistence=1
    // persistenceMin for D-P is 2, so should return null
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 30 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    // persistence=1 < persistenceMin(2) => null
    expect(result).toBeNull();
  });

  it('detects drift when persistence meets threshold of 2', () => {
    // 3 snapshots: baseline=10, then two consecutive deviating snapshots
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 25 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 30 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.persistence).toBeGreaterThanOrEqual(2);
  });

  it('includes evidence strings for event count deviations', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 50 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 40 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const hasCountEvidence = result!.evidence.some(e => e.includes('event_count_drift'));
    expect(hasCountEvidence).toBe(true);
  });

  it('detects anomaly spikes in snapshots and increases impact', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({
        snapshot_id: 'SNAP-002',
        events_count_total: 30,
        anomalies: { tooling_drift: 2, product_drift: 0, incidents: 0 }
      }),
      makeSnapshot({
        snapshot_id: 'SNAP-003',
        events_count_total: 30,
        anomalies: { tooling_drift: 1, product_drift: 1, incidents: 0 }
      })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    // With anomalies, impact should be 4
    expect(result!.impact).toBe(4);
    const hasAnomalyEvidence = result!.evidence.some(e => e.includes('anomaly_spike'));
    expect(hasAnomalyEvidence).toBe(true);
  });

  it('returns null when baseline count is zero', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 0 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 20 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('sets baseline_value and observed_value from event counts', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 50 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 50 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.baseline_value).toBe('10');
    expect(result!.observed_value).toBe('50');
  });

  it('computes score as impact * confidence * persistence', () => {
    const obs = makeObs([
      makeSnapshot({ snapshot_id: 'SNAP-001', events_count_total: 10 }),
      makeSnapshot({ snapshot_id: 'SNAP-002', events_count_total: 50 }),
      makeSnapshot({ snapshot_id: 'SNAP-003', events_count_total: 50 })
    ]);
    const result = detectPerformanceDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const expectedScore = result!.impact * result!.confidence * result!.persistence;
    expect(result!.score).toBeCloseTo(expectedScore, 2);
  });
});
