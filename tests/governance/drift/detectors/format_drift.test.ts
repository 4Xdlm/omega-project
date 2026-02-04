/**
 * FORMAT DRIFT DETECTOR TESTS (D-F)
 * Phase E — Tests for structure/schema deviation detection
 *
 * Tests: detectFormatDrift pure function
 * Detector signature: (observations, baseline) => DriftResult | null
 */

import { describe, it, expect } from 'vitest';
import { detectFormatDrift } from '../../../../governance/drift/detectors/format_drift.js';
import type {
  ObservationSources,
  Baseline,
  RuntimeEvent,
  Snapshot
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

function makeValidEvent(id: string): RuntimeEvent {
  return {
    event_id: id,
    timestamp_utc: '2025-05-01T10:00:00Z',
    phase: 'D',
    build_ref: { commit: 'ce542f54', tag: 'v1.0' },
    operation: 'sentinel-judge',
    input_hash: 'abc123def456',
    output_hash: 'def456abc123',
    verdict: 'PASS'
  };
}

function makeValidSnapshot(id: string): Snapshot {
  return {
    snapshot_id: id,
    timestamp_utc: '2025-05-01T10:00:00Z',
    baseline_ref: 'baseline-001',
    last_event_id: 'EVT-001',
    events_count_total: 5,
    anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
    status: 'CLEAN'
  };
}

/**
 * Creates a malformed event missing specified fields.
 * Uses object manipulation to remove fields after creation,
 * then casts to RuntimeEvent to simulate corrupted data.
 */
function makeMalformedEvent(
  id: string,
  missingFields: string[]
): RuntimeEvent {
  const base: Record<string, unknown> = {
    event_id: id,
    timestamp_utc: '2025-05-01T10:00:00Z',
    phase: 'D',
    build_ref: { commit: 'ce542f54', tag: 'v1.0' },
    operation: 'sentinel-judge',
    input_hash: 'abc123def456',
    output_hash: 'def456abc123',
    verdict: 'PASS'
  };
  for (const field of missingFields) {
    delete base[field];
  }
  return base as unknown as RuntimeEvent;
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectFormatDrift', () => {
  it('detects missing fields in runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeMalformedEvent('EVT-001', ['input_hash', 'output_hash'])
      ]
    };

    const result = detectFormatDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-F');
    expect(result!.description).toContain('structural issues');
    expect(result!.evidence.length).toBeGreaterThan(0);
    // Evidence should reference the missing fields
    const evidenceStr = result!.evidence.join(',');
    expect(evidenceStr).toContain('missing_fields');
    expect(evidenceStr).toContain('input_hash');
    expect(evidenceStr).toContain('output_hash');
  });

  it('returns null for valid structure (all fields present)', () => {
    const obs: ObservationSources = {
      snapshots: [makeValidSnapshot('SNAP-001')],
      logEntries: [
        {
          event_id: 'LOG-001',
          timestamp_utc: '2025-05-01T10:00:00Z',
          verdict: 'PASS'
        }
      ],
      runtimeEvents: [
        makeValidEvent('EVT-001'),
        makeValidEvent('EVT-002')
      ]
    };

    const result = detectFormatDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('result type is D-F', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeMalformedEvent('EVT-001', ['verdict']),
        makeMalformedEvent('EVT-002', ['operation'])
      ]
    };

    const result = detectFormatDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-F');
    expect(result!.drift_id).toContain('D-F');
  });

  it('returns null for empty observations', () => {
    const result = detectFormatDrift(emptyObs(), TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('detects missing fields in snapshots', () => {
    // Create a snapshot missing required fields
    const malformedSnap: Record<string, unknown> = {
      snapshot_id: 'SNAP-BAD',
      timestamp_utc: '2025-05-01T10:00:00Z'
      // Missing: baseline_ref, last_event_id, events_count_total, anomalies, status
    };

    const obs: ObservationSources = {
      snapshots: [malformedSnap as unknown as Snapshot],
      logEntries: [],
      runtimeEvents: []
    };

    const result = detectFormatDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-F');
    const evidenceStr = result!.evidence.join(',');
    expect(evidenceStr).toContain('snapshot');
    expect(evidenceStr).toContain('missing_fields');
  });

  it('detects missing timestamp_utc in log entries', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [
        { event_id: 'LOG-BAD', timestamp_utc: '' } as unknown as import('../../../../governance/drift/types.js').GovernanceLogEntry
      ],
      runtimeEvents: []
    };

    const result = detectFormatDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-F');
    const evidenceStr = result!.evidence.join(',');
    expect(evidenceStr).toContain('missing_timestamp_utc');
  });
});
