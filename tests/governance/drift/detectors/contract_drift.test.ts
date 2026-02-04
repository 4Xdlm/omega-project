/**
 * CONTRACT DRIFT DETECTOR TESTS (D-C)
 * Phase E — Tests for detectContractDrift
 *
 * Validates detection of baseline_ref mismatches in snapshots,
 * commit/tag mismatches in runtime events, and status inconsistencies.
 */

import { describe, it, expect } from 'vitest';
import { detectContractDrift } from '../../../../governance/drift/detectors/contract_drift.js';
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

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/contract_drift/detectContractDrift', () => {
  it('returns null for empty observations', () => {
    const result = detectContractDrift(emptyObs(), TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('returns null when all references match baseline', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001' }),
        makeSnapshot({ snapshot_id: 'SNAP-002' })
      ],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001' }),
        makeRuntimeEvent({ event_id: 'EVT-002' })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).toBeNull();
  });

  it('detects baseline_ref mismatch in snapshot', () => {
    const wrongHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: wrongHash
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-C');
    const hasBaselineEvidence = result!.evidence.some(e =>
      e.includes('baseline_ref_mismatch') && e.includes('SNAP-001')
    );
    expect(hasBaselineEvidence).toBe(true);
  });

  it('detects commit mismatch in runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({
          event_id: 'EVT-001',
          build_ref: { commit: 'deadbeef', tag: TEST_BASELINE.tag }
        })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-C');
    const hasCommitEvidence = result!.evidence.some(e =>
      e.includes('commit_mismatch') && e.includes('EVT-001')
    );
    expect(hasCommitEvidence).toBe(true);
  });

  it('detects tag mismatch in runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({
          event_id: 'EVT-001',
          build_ref: { commit: TEST_BASELINE.commit, tag: 'v99.0-wrong-tag' }
        })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-C');
    const hasTagEvidence = result!.evidence.some(e =>
      e.includes('tag_mismatch') && e.includes('EVT-001')
    );
    expect(hasTagEvidence).toBe(true);
  });

  it('returns result with type D-C', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'wrong-hash-value-that-does-not-match-baseline-sha256'
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-C');
  });

  it('detects DRIFT verdict as contract violation', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({ event_id: 'EVT-001', verdict: 'DRIFT' })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const hasDriftVerdictEvidence = result!.evidence.some(e =>
      e.includes('verdict=DRIFT') && e.includes('contract violation')
    );
    expect(hasDriftVerdictEvidence).toBe(true);
  });

  it('detects status inconsistency across snapshots', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({ snapshot_id: 'SNAP-001', status: 'ACTIVE' }),
        makeSnapshot({ snapshot_id: 'SNAP-002', status: 'DEGRADED' })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const hasStatusEvidence = result!.evidence.some(e =>
      e.includes('status_inconsistency')
    );
    expect(hasStatusEvidence).toBe(true);
  });

  it('sets higher impact (4) for baseline_ref mismatch', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.impact).toBe(4);
  });

  it('sets lower impact (3) when no baseline_ref mismatch', () => {
    // Only commit mismatch, no baseline_ref mismatch
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({
          event_id: 'EVT-001',
          build_ref: { commit: 'deadbeef', tag: TEST_BASELINE.tag }
        })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.impact).toBe(3);
  });

  it('aggregates issues from multiple sources', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'
        }),
        makeSnapshot({
          snapshot_id: 'SNAP-002',
          status: 'DEGRADED'
        })
      ],
      logEntries: [],
      runtimeEvents: [
        makeRuntimeEvent({
          event_id: 'EVT-001',
          build_ref: { commit: 'deadbeef', tag: 'v0.0-wrong' },
          verdict: 'DRIFT'
        })
      ]
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    // baseline_ref_mismatch(1) + commit_mismatch(1) + tag_mismatch(1) + verdict=DRIFT(1) + status_inconsistency(1) = 5
    expect(result!.evidence.length).toBe(5);
  });

  it('computes score as impact * confidence * persistence', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    const expectedScore = result!.impact * result!.confidence * result!.persistence;
    expect(result!.score).toBeCloseTo(expectedScore, 2);
  });

  it('sets baseline_value with commit and tag from baseline', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    expect(result!.baseline_value).toContain(TEST_BASELINE.commit);
    expect(result!.baseline_value).toContain(TEST_BASELINE.tag);
  });

  it('includes human_justification when score >= 2', () => {
    const obs: ObservationSources = {
      snapshots: [
        makeSnapshot({
          snapshot_id: 'SNAP-001',
          baseline_ref: 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
        })
      ],
      logEntries: [],
      runtimeEvents: []
    };
    const result = detectContractDrift(obs, TEST_BASELINE);
    expect(result).not.toBeNull();
    if (result!.score >= 2) {
      expect(result!.human_justification.length).toBeGreaterThan(0);
    }
  });
});
