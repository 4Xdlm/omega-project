/**
 * TOOLING DRIFT DETECTOR TESTS (D-TL)
 * Phase E — Tests for detectToolingDrift
 *
 * Validates detection of TOOLING_DRIFT verdicts in runtime events,
 * tooling_drift anomaly counts in snapshots, and log entry indicators.
 */

import { describe, it, expect } from 'vitest';
import { detectToolingDrift } from '../../../../governance/drift/detectors/tooling_drift.js';
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

function makeSnapshot(overrides: Partial<Snapshot> & { snapshot_id: string }): Snapshot {
  return {
    timestamp_utc: '2025-01-15T12:00:00Z',
    baseline_ref: TEST_BASELINE.sha256,
    last_event_id: 'EVT-001',
    events_count_total: 10,
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

describe('detectors/tooling_drift/detectToolingDrift', () => {
  it('returns null for empty observations', () => {
    const result = detectToolingDrift(emptyObs(), TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null when no tooling issues exist', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001' })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'EVT-001', verdict: 'PASS' })
      ],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-002', verdict: 'PASS' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('detects TOOLING_DRIFT verdict in runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-TL');
    const hasEventEvidence = result!.evidence.some(e =>
      e.includes('event:EVT-001') && e.includes('TOOLING_DRIFT')
    );
    expect(hasEventEvidence).toBe(true);
  });

  it('detects tooling_drift anomaly count in snapshots', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          anomalies: { tooling_drift: 3, product_drift: 0, incidents: 0 }
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-TL');
    const hasSnapshotEvidence = result!.evidence.some(e =>
      e.includes('snapshot:SNAP-001') && e.includes('tooling_drift=3')
    );
    expect(hasSnapshotEvidence).toBe(true);
  });

  it('detects TOOLING_DRIFT verdict in log entries', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [
        makeLogEntry({ event_id: 'LOG-001', verdict: 'TOOLING_DRIFT' })
      ],
      runtimeEvents: []
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-TL');
    const hasLogEvidence = result!.evidence.some(e =>
      e.includes('log:LOG-001') && e.includes('TOOLING_DRIFT')
    );
    expect(hasLogEvidence).toBe(true);
  });

  it('returns result with type D-TL', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-TL');
  });

  it('aggregates issues from multiple sources', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          anomalies: { tooling_drift: 2, product_drift: 0, incidents: 0 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'LOG-001', verdict: 'TOOLING_DRIFT' })
      ],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' }),
        makeRuntimeEvent({ event_id: 'EVT-002', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    // 2 runtime events + 1 snapshot + 1 log = 4 issues
    expect(result!.evidence.length).toBe(4);
  });

  it('does not trigger on non-tooling verdicts (FAIL, DRIFT, INCIDENT)', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          anomalies: { tooling_drift: 0, product_drift: 5, incidents: 2 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'LOG-001', verdict: 'FAIL' })
      ],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'FAIL' }),
        makeRuntimeEvent({ event_id: 'EVT-002', verdict: 'DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('sets impact to 1 for few issues, 2 for many (>5)', () => {
    // Few issues case
    const obsFew: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const resultFew = detectToolingDrift(obsFew, TEST_BASELINE);
    expect(resultFew).not.toBeNull();
    expect(resultFew!.impact).toBe(1);

    // Many issues case (>5)
    const obsMany: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          anomalies: { tooling_drift: 1, product_drift: 0, incidents: 0 }
        })
      ],
      logEntries: [
        makeLogEntry({ event_id: 'LOG-001', verdict: 'TOOLING_DRIFT' }),
        makeLogEntry({ event_id: 'LOG-002', verdict: 'TOOLING_DRIFT' })
      ],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' }),
        makeRuntimeEvent({ event_id: 'EVT-002', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const resultMany = detectToolingDrift(obsMany, TEST_BASELINE);
    expect(resultMany).not.toBeNull();
    expect(resultMany!.impact).toBe(2);
  });

  it('computes score as impact * confidence * persistence', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' }),
        makeRuntimeEvent({ event_id: 'EVT-002', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const expectedScore = result!.impact * result!.confidence * result!.persistence;
    expect(result!.score).toBeCloseTo(expectedScore, 2);
  });

  it('sets baseline_value and observed_value descriptively', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'TOOLING_DRIFT' })
      ]
    };
    const result = detectToolingDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.baseline_value).toBe('0 tooling issues');
    expect(result!.observed_value).toContain('tooling issues');
  });
});
