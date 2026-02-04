/**
 * OUTPUT DRIFT DETECTOR TESTS (D-O)
 * Phase E — Tests for output hash divergence detection
 *
 * Tests: detectOutputDrift pure function
 * Detector signature: (observations, baseline) => DriftResult | null
 */

import { describe, it, expect } from 'vitest';
import { detectOutputDrift } from '../../../../governance/drift/detectors/output_drift.js';
import type {
  ObservationSources,
  Baseline,
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

function makeEvent(overrides: Partial<RuntimeEvent> & { event_id: string }): RuntimeEvent {
  return {
    timestamp_utc: '2025-05-01T10:00:00Z',
    phase: 'D',
    build_ref: { commit: 'ce542f54', tag: 'v1.0' },
    operation: 'sentinel-judge',
    input_hash: 'abc123def456',
    output_hash: 'aaa111bbb222ccc333ddd444eee555ff',
    verdict: 'PASS',
    ...overrides
  };
}

function makeLogEntry(overrides: Partial<GovernanceLogEntry> = {}): GovernanceLogEntry {
  return {
    timestamp_utc: '2025-05-01T10:00:00Z',
    event_id: 'LOG-001',
    output_hash: 'aaa111bbb222ccc333ddd444eee555ff',
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────

describe('detectors/detectOutputDrift', () => {
  it('detects output hash change', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({
          event_id: 'EVT-001',
          output_hash: 'aaa111bbb222ccc333ddd444eee555ff'
        }),
        makeEvent({
          event_id: 'EVT-002',
          output_hash: 'zzz999yyy888xxx777www666vvv555uu'
        })
      ]
    };

    const result = detectOutputDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-O');
    expect(result!.description).toContain('hash deviation');
    expect(result!.baseline_value).toBe('aaa111bbb222ccc333ddd444eee555ff');
    expect(result!.observed_value).toBe('zzz999yyy888xxx777www666vvv555uu');
    expect(result!.evidence.length).toBeGreaterThan(0);
  });

  it('returns null when all hashes match', () => {
    const consistentHash = 'aaa111bbb222ccc333ddd444eee555ff';
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({ event_id: 'EVT-001', output_hash: consistentHash }),
        makeEvent({ event_id: 'EVT-002', output_hash: consistentHash }),
        makeEvent({ event_id: 'EVT-003', output_hash: consistentHash })
      ]
    };

    const result = detectOutputDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('returns null for empty observations', () => {
    const result = detectOutputDrift(emptyObs(), TEST_BASELINE);

    expect(result).toBeNull();
  });

  it('result type is D-O', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [
        makeLogEntry({
          event_id: 'LOG-001',
          output_hash: 'hash_baseline_original_value_01'
        }),
        makeLogEntry({
          event_id: 'LOG-002',
          output_hash: 'hash_changed_different_value_02'
        })
      ],
      runtimeEvents: []
    };

    const result = detectOutputDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-O');
    expect(result!.drift_id).toContain('D-O');
  });

  it('detects drift across log entries and runtime events', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [
        makeLogEntry({
          event_id: 'LOG-001',
          output_hash: 'aaa111bbb222ccc333ddd444eee555ff'
        })
      ],
      runtimeEvents: [
        makeEvent({
          event_id: 'EVT-001',
          output_hash: 'different_hash_from_another_run_zz'
        })
      ]
    };

    const result = detectOutputDrift(obs, TEST_BASELINE);

    expect(result).not.toBeNull();
    expect(result!.type).toBe('D-O');
    expect(result!.score).toBeGreaterThan(0);
  });

  it('returns null when only a single hash exists', () => {
    const obs: ObservationSources = {
      snapshots: [],
      logEntries: [],
      runtimeEvents: [
        makeEvent({
          event_id: 'EVT-001',
          output_hash: 'single_hash_no_comparison_needed'
        })
      ]
    };

    const result = detectOutputDrift(obs, TEST_BASELINE);

    expect(result).toBeNull();
  });
});
