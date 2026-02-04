/**
 * SEMANTIC DRIFT DETECTOR TESTS (D-S)
 * Phase E — Tests for verdict inconsistency detection
 *
 * Tests: detectSemanticDrift pure function
 * Detector signature: (observations, baseline) => DriftResult | null
 */

import { describe, it, expect } from 'vitest';
import { detectSemanticDrift } from '../../../../governance/drift/detectors/semantic_drift.js';
import type {
  ObservationSources,
  Baseline,
  RuntimeEvent,
  Snapshot,
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

function makeEvent(overrides: Partial<RuntimeEvent> & { event_id: string }): RuntimeEvent {
  return {
    timestamp_utc: '2025-05-01T10:00:00Z',
    phase: 'D',
    build_ref: { commit: 'ce542f54', tag: 'v1.0' },
    operation: 'sentinel-judge',
    input_hash: 'abc123',
    output_hash: 'def456',
    verdict: 'PASS',
    ...overrides
  };
}

function makeLogEntry(overrides: Partial<GovernanceLogEntry> = {}): GovernanceLogEntry {
  return {
    timestamp_utc: '2025-05-01T10:00:00Z',
    event_id: 'LOG-001',
    verdict: 'PASS',
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectSemanticDrift', () => {
  it('detects verdict inconsistency (PASS then FAIL)', () => {
    // Create events with PASS followed by multiple FAILs to meet persistence >= 2
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', verdict: 'PASS' }),
        makeEvent({ event_id: 'EVT-002', verdict: 'FAIL' }),
        makeEvent({ event_id: 'EVT-003', verdict: 'FAIL' })
      ]
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-S');
    expect(result!.description).toContain('verdict inconsistency');
    expect(result!.impact).toBe(5); // FAIL involved => impact 5
    expect(result!.evidence.length).toBeGreaterThan(0);
    expect(result!.baseline_value).toBe('PASS');
    expect(result!.observed_value).toContain('FAIL');
  });

  it('returns null when all verdicts are consistent', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', verdict: 'PASS' }),
        makeEvent({ event_id: 'EVT-002', verdict: 'PASS' }),
        makeEvent({ event_id: 'EVT-003', verdict: 'PASS' })
      ]
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('returns null for a single event (need >= 2 to compare)', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', verdict: 'PASS' })
      ]
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('result has correct type D-S', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', verdict: 'PASS' }),
        makeEvent({ event_id: 'EVT-002', verdict: 'DRIFT' }),
        makeEvent({ event_id: 'EVT-003', verdict: 'DRIFT' })
      ]
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-S');
    expect(result!.drift_id).toContain('D-S');
  });

  it('human_justification is present when score >= 2', () => {
    // Use FAIL verdicts for maximum impact (5) ensuring score >= 2
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', verdict: 'PASS' }),
        makeEvent({ event_id: 'EVT-002', verdict: 'FAIL' }),
        makeEvent({ event_id: 'EVT-003', verdict: 'FAIL' }),
        makeEvent({ event_id: 'EVT-004', verdict: 'FAIL' })
      ]
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    // With impact=5, confidence>=0.8, persistence>=2 => score >= 8 (well above 2)
    expect(result!.score).toBeGreaterThanOrEqual(2);
    expect(result!.human_justification).toBeTruthy();
    expect(result!.human_justification.length).toBeGreaterThan(0);
    expect(result!.human_justification).toContain('inconsistencies');
  });

  it('returns null for empty observations', () => {
    const result = detectSemanticDrift(emptyObs(), TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('detects inconsistency across log entries', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [
        makeLogEntry({ event_id: 'LOG-001', verdict: 'PASS' }),
        makeLogEntry({ event_id: 'LOG-002', verdict: 'FAIL' }),
        makeLogEntry({ event_id: 'LOG-003', verdict: 'FAIL' })
      ],
      runtimeEvents: []
    };

    const result = detectSemanticDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-S');
  });
});
