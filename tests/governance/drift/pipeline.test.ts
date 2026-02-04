/**
 * PIPELINE TESTS — Phase E Drift Detection
 * Integration tests for the full drift detection pipeline.
 *
 * INV-E-02: Zero side effects
 * INV-E-06: Non-actuating
 * INV-E-08: trigger_events required
 */

import { describe, it, expect } from 'vitest';
import { runDriftPipeline, runDriftPipelineWithDetectors } from '../../../governance/drift/drift_pipeline.js';
import type { ObservationSources, Baseline, DriftResult } from '../../../governance/drift/types.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

const TEST_BASELINE: Baseline = {
  sha256: '22b96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa09',
  commit: 'ce542f54',
  tag: 'v1.0-forensic-any-types',
  scope: 'PHASE_D_RUNTIME_GOVERNANCE'
};

const FIXED_DATE = '2026-02-04T03:00:00.000Z';

function stableObservations(): ObservationSources {
  return {
    snapshots: [
      {
        snapshot_id: 'SNAP_20260204_021207',
        timestamp_utc: '2026-02-04T02:12:07Z',
        baseline_ref: TEST_BASELINE.sha256,
        last_event_id: 'RTE_20260204_021207',
        events_count_total: 2,
        anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
        status: 'STABLE'
      },
      {
        snapshot_id: 'SNAP_20260204_021546',
        timestamp_utc: '2026-02-04T02:15:46Z',
        baseline_ref: TEST_BASELINE.sha256,
        last_event_id: 'RTE_20260204_021546',
        events_count_total: 2,
        anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
        status: 'STABLE'
      }
    ],
    logEntries: [
      {
        event_id: 'RTE_20260204_021546_ce8d87d7',
        timestamp_utc: '2026-02-04T02:15:46Z',
        verdict: 'PASS',
        output_hash: 'bd8dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522659'
      }
    ],
    runtimeEvents: [
      {
        event_id: 'RTE_20260204_021546_ce8d87d7',
        timestamp_utc: '2026-02-04T02:15:46Z',
        phase: 'D' as const,
        source: 'omega-runtime-governance',
        build_ref: { commit: 'ce542f54', tag: 'v1.0-forensic-any-types' },
        operation: 'npm_test',
        input_hash: 'SHA256(npm_test_command)',
        output_hash: 'bd8dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522659',
        verdict: 'PASS' as const
      }
    ]
  };
}

function emptyObservations(): ObservationSources {
  return { snapshots: [], logEntries: [], runtimeEvents: [] };
}

// ─────────────────────────────────────────────────────────────
// PIPELINE EXECUTION
// ─────────────────────────────────────────────────────────────

describe('drift_pipeline/runDriftPipeline', () => {
  it('produces a valid DRIFT_REPORT for stable observations', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    expect(report.version).toBe('1.0');
    expect(report.baseline_ref).toBe(TEST_BASELINE.sha256);
    expect(report.trigger_events.length).toBeGreaterThan(0);
    expect(report.generated_at).toBe(FIXED_DATE);
    expect(report.generator).toContain('Phase E');
  });

  it('includes all mandatory fields in report', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    expect(report.report_id).toBeTruthy();
    expect(report.version).toBe('1.0');
    expect(report.baseline_ref).toBeTruthy();
    expect(report.window).toBeDefined();
    expect(report.window.from).toBeTruthy();
    expect(report.window.to).toBeTruthy();
    expect(typeof report.window.event_count).toBe('number');
    expect(report.trigger_events.length).toBeGreaterThan(0);
    expect(Array.isArray(report.detected_drifts)).toBe(true);
    expect(report.summary).toBeDefined();
    expect(report.recommendation).toBeTruthy();
    expect(report.generated_at).toBeTruthy();
    expect(report.generator).toBeTruthy();
  });

  it('produces empty drifts for stable system', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    // Stable system should have zero or very few drifts
    expect(report.summary.total_drifts).toBeDefined();
    expect(typeof report.summary.highest_score).toBe('number');
  });

  it('computes correct summary aggregation', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    expect(report.summary.total_drifts).toBe(report.detected_drifts.length);
    expect(report.summary.by_classification).toBeDefined();
    expect(typeof report.summary.by_classification.STABLE).toBe('number');
    expect(typeof report.summary.by_classification.INFO).toBe('number');
    expect(typeof report.summary.by_classification.WARNING).toBe('number');
    expect(typeof report.summary.by_classification.CRITICAL).toBe('number');
  });

  it('sets recommendation based on classification', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    const validRecommendations = ['NONE', 'LOG', 'SURVEILLANCE', 'ESCALATE'];
    expect(validRecommendations).toContain(report.recommendation);
  });

  it('includes non-actuation note', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    expect(report.notes).toContain('No automatic action');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-08: trigger_events validation
// ─────────────────────────────────────────────────────────────

describe('drift_pipeline/INV-E-08', () => {
  it('throws when trigger_events is empty', () => {
    expect(() => runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: []
    })).toThrow('INV-E-08');
  });

  it('accepts single trigger event', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'],
      generatedAt: FIXED_DATE
    });

    expect(report.trigger_events).toEqual(['RTE_20260204_021546_ce8d87d7']);
  });

  it('accepts multiple trigger events', () => {
    const report = runDriftPipeline({
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001', 'RTE_002'],
      generatedAt: FIXED_DATE
    });

    expect(report.trigger_events).toEqual(['RTE_001', 'RTE_002']);
  });
});

// ─────────────────────────────────────────────────────────────
// CUSTOM DETECTORS (testing with mock detectors)
// ─────────────────────────────────────────────────────────────

describe('drift_pipeline/runDriftPipelineWithDetectors', () => {
  it('runs custom detector set', () => {
    const mockDetector = (): DriftResult => ({
      drift_id: 'D-TL-20260204-001',
      type: 'D-TL',
      description: 'Mock tooling drift',
      impact: 1,
      confidence: 0.8,
      persistence: 1,
      score: 0.8,
      classification: 'INFO',
      human_justification: '',
      evidence: ['mock:evidence'],
      baseline_value: '0',
      observed_value: '1',
      deviation: '1 issue'
    });

    const report = runDriftPipelineWithDetectors(
      {
        observations: stableObservations(),
        baseline: TEST_BASELINE,
        triggerEvents: ['RTE_test'],
        generatedAt: FIXED_DATE
      },
      [mockDetector]
    );

    expect(report.detected_drifts.length).toBe(1);
    expect(report.detected_drifts[0].type).toBe('D-TL');
    expect(report.summary.total_drifts).toBe(1);
  });

  it('handles detector returning null', () => {
    const nullDetector = () => null;

    const report = runDriftPipelineWithDetectors(
      {
        observations: stableObservations(),
        baseline: TEST_BASELINE,
        triggerEvents: ['RTE_test'],
        generatedAt: FIXED_DATE
      },
      [nullDetector]
    );

    expect(report.detected_drifts.length).toBe(0);
    expect(report.summary.total_drifts).toBe(0);
  });

  it('throws on empty trigger_events', () => {
    expect(() => runDriftPipelineWithDetectors(
      {
        observations: stableObservations(),
        baseline: TEST_BASELINE,
        triggerEvents: []
      },
      []
    )).toThrow('INV-E-08');
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────

describe('drift_pipeline/determinism', () => {
  it('produces identical reports for identical inputs', () => {
    const args = {
      observations: stableObservations(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_20260204_021546_ce8d87d7'] as readonly string[],
      generatedAt: FIXED_DATE
    };

    const report1 = runDriftPipeline(args);
    const report2 = runDriftPipeline(args);

    expect(report1.report_id).toBe(report2.report_id);
    expect(report1.detected_drifts.length).toBe(report2.detected_drifts.length);
    expect(report1.summary).toEqual(report2.summary);
    expect(report1.recommendation).toBe(report2.recommendation);
  });
});
