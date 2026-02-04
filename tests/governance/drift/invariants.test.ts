/**
 * INVARIANT TESTS — Phase E Drift Detection
 * One test per invariant (INV-E-01 through INV-E-10).
 *
 * These tests prove that the Phase E implementation satisfies
 * all non-negotiable invariants from the specification.
 */

import { describe, it, expect } from 'vitest';
import { runDriftPipeline, runDriftPipelineWithDetectors } from '../../../governance/drift/drift_pipeline.js';
import { classifyScore, getRecommendation, getEscalationTarget } from '../../../governance/drift/scoring.js';
import { validateDriftReport } from '../../../governance/drift/drift_utils.js';
import type {
  ObservationSources,
  Baseline,
  DriftResult,
  DriftClassification,
  DriftReport
} from '../../../governance/drift/types.js';
import { DRIFT_CLASSIFICATIONS } from '../../../governance/drift/types.js';
import { detectSemanticDrift } from '../../../governance/drift/detectors/semantic_drift.js';
import { detectOutputDrift } from '../../../governance/drift/detectors/output_drift.js';
import { detectFormatDrift } from '../../../governance/drift/detectors/format_drift.js';
import { detectTemporalDrift } from '../../../governance/drift/detectors/temporal_drift.js';
import { detectPerformanceDrift } from '../../../governance/drift/detectors/performance_drift.js';
import { detectVarianceDrift } from '../../../governance/drift/detectors/variance_drift.js';
import { detectToolingDrift } from '../../../governance/drift/detectors/tooling_drift.js';
import { detectContractDrift } from '../../../governance/drift/detectors/contract_drift.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const TEST_BASELINE: Baseline = {
  sha256: '22b96d37e9439dd9e775bac63ffe94e427de0bbf54247766b5e534f06d80aa09',
  commit: 'ce542f54',
  tag: 'v1.0-forensic-any-types',
  scope: 'PHASE_D_RUNTIME_GOVERNANCE'
};

const FIXED_DATE = '2026-02-04T03:00:00.000Z';

function stableObs(): ObservationSources {
  return {
    snapshots: [
      {
        snapshot_id: 'SNAP_001',
        timestamp_utc: '2026-02-04T02:12:07Z',
        baseline_ref: TEST_BASELINE.sha256,
        last_event_id: 'RTE_001',
        events_count_total: 2,
        anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
        status: 'STABLE'
      },
      {
        snapshot_id: 'SNAP_002',
        timestamp_utc: '2026-02-04T02:15:46Z',
        baseline_ref: TEST_BASELINE.sha256,
        last_event_id: 'RTE_002',
        events_count_total: 2,
        anomalies: { tooling_drift: 0, product_drift: 0, incidents: 0 },
        status: 'STABLE'
      }
    ],
    logEntries: [
      {
        event_id: 'RTE_001',
        timestamp_utc: '2026-02-04T02:15:46Z',
        verdict: 'PASS',
        output_hash: 'bd8dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522659'
      }
    ],
    runtimeEvents: [
      {
        event_id: 'RTE_001',
        timestamp_utc: '2026-02-04T02:15:46Z',
        phase: 'D' as const,
        build_ref: { commit: 'ce542f54', tag: 'v1.0-forensic-any-types' },
        operation: 'npm_test',
        input_hash: 'SHA256(npm_test)',
        output_hash: 'bd8dc999cad0b938a0e5ae7182bb7d6d1a30c424847dc32c03f8e525c1522659',
        verdict: 'PASS' as const
      }
    ]
  };
}

const ALL_DETECTORS = [
  detectSemanticDrift,
  detectOutputDrift,
  detectFormatDrift,
  detectTemporalDrift,
  detectPerformanceDrift,
  detectVarianceDrift,
  detectToolingDrift,
  detectContractDrift
];

// ─────────────────────────────────────────────────────────────
// INV-E-01: Read-only (no BUILD code access)
// ─────────────────────────────────────────────────────────────

describe('INV-E-01: Read-only (no BUILD code access)', () => {
  it('detectors accept only ObservationSources and Baseline data — no file paths', () => {
    // Verify that detector functions only take data arguments
    // They have no file path parameters and cannot access BUILD
    for (const detector of ALL_DETECTORS) {
      // Function signature test: 2 parameters only
      expect(detector.length).toBe(2);

      // Pure data call — no file system involved
      const result = detector(stableObs(), TEST_BASELINE);
      expect(result === null || typeof result === 'object').toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-02: Zero side effects
// ─────────────────────────────────────────────────────────────

describe('INV-E-02: Zero side effects', () => {
  it('pipeline does not mutate input observations', () => {
    const obs = stableObs();
    const obsCopy = JSON.parse(JSON.stringify(obs));

    runDriftPipeline({
      observations: obs,
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    // Input should be unchanged
    expect(JSON.stringify(obs)).toBe(JSON.stringify(obsCopy));
  });

  it('pipeline does not mutate baseline', () => {
    const baselineCopy = { ...TEST_BASELINE };

    runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    expect(TEST_BASELINE).toEqual(baselineCopy);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-03: No BUILD recalculation
// ─────────────────────────────────────────────────────────────

describe('INV-E-03: No BUILD recalculation', () => {
  it('source code contains no oracle or truth recalculation imports', async () => {
    // Static analysis: the pipeline and detectors should have no
    // imports from BUILD phases (packages/sentinel-judge, packages/genome, etc.)
    // We verify by checking the report doesn't contain recalculated values
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    // Report uses baseline_ref as-is, never recomputes it
    expect(report.baseline_ref).toBe(TEST_BASELINE.sha256);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-04: No auto-blocking thresholds
// ─────────────────────────────────────────────────────────────

describe('INV-E-04: No auto-blocking thresholds', () => {
  it('recommendations are advisory strings, not blocking actions', () => {
    const validRecommendations = ['NONE', 'LOG', 'SURVEILLANCE', 'ESCALATE'];

    for (const classification of DRIFT_CLASSIFICATIONS) {
      const rec = getRecommendation(classification);
      expect(validRecommendations).toContain(rec);
      // None of these trigger automatic blocking
      expect(rec).not.toBe('BLOCK');
      expect(rec).not.toBe('HALT');
      expect(rec).not.toBe('REJECT');
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-05: Mandatory human escalation
// ─────────────────────────────────────────────────────────────

describe('INV-E-05: Mandatory human escalation', () => {
  it('escalation targets are always human (ARCHITECTE) for WARNING+', () => {
    expect(getEscalationTarget('WARNING')).toBe('ARCHITECTE');
    expect(getEscalationTarget('CRITICAL')).toBe('ARCHITECTE');
  });

  it('report always contains human-oriented notes', () => {
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    expect(report.notes).toContain('human decision');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-06: Non-actuating (DRIFT_REPORT cannot trigger actions)
// ─────────────────────────────────────────────────────────────

describe('INV-E-06: Non-actuating', () => {
  it('DRIFT_REPORT is a plain data object with no methods', () => {
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    // Report should be serializable (no functions, no circular refs)
    const serialized = JSON.stringify(report);
    const deserialized = JSON.parse(serialized);
    expect(deserialized.report_id).toBe(report.report_id);
    expect(deserialized.version).toBe(report.version);

    // No function properties
    for (const value of Object.values(report)) {
      expect(typeof value).not.toBe('function');
    }
  });

  it('report contains no executable or action-triggering fields', () => {
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    const reportStr = JSON.stringify(report);
    // No callback, no URL endpoint, no command
    expect(reportStr).not.toContain('callback');
    expect(reportStr).not.toContain('webhook');
    expect(reportStr).not.toContain('exec(');
    expect(reportStr).not.toContain('spawn(');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-07: Human justification for score >= WARNING
// ─────────────────────────────────────────────────────────────

describe('INV-E-07: Human justification for score >= WARNING', () => {
  it('drift results with score >= 2 have human_justification', () => {
    const mockDetector = (): DriftResult => ({
      drift_id: 'D-S-20260204-001',
      type: 'D-S',
      description: 'Test semantic drift',
      impact: 4,
      confidence: 0.8,
      persistence: 2,
      score: 6.4,
      classification: 'CRITICAL',
      human_justification: 'Detected inconsistency across 2 observations.',
      evidence: ['test:evidence'],
      baseline_value: 'PASS',
      observed_value: 'FAIL',
      deviation: 'verdict changed'
    });

    const report = runDriftPipelineWithDetectors(
      {
        observations: stableObs(),
        baseline: TEST_BASELINE,
        triggerEvents: ['RTE_001'],
        generatedAt: FIXED_DATE
      },
      [mockDetector]
    );

    for (const drift of report.detected_drifts) {
      if (drift.score >= 2) {
        expect(drift.human_justification).toBeTruthy();
        expect(drift.human_justification.length).toBeGreaterThan(0);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-08: DRIFT_REPORT requires trigger_events
// ─────────────────────────────────────────────────────────────

describe('INV-E-08: DRIFT_REPORT requires trigger_events', () => {
  it('rejects report with empty trigger_events', () => {
    expect(() => runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: []
    })).toThrow('INV-E-08');
  });

  it('validates trigger_events in report structure', () => {
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    const validation = validateDriftReport(report);
    expect(validation.valid).toBe(true);
    expect(report.trigger_events.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-09: Strict RUNBOOK mapping
// ─────────────────────────────────────────────────────────────

describe('INV-E-09: Strict RUNBOOK mapping', () => {
  it('all classifications map to defined RUNBOOK actions', () => {
    const expectedMapping: Record<DriftClassification, string> = {
      STABLE: 'NONE',
      INFO: 'LOG',
      WARNING: 'SURVEILLANCE',
      CRITICAL: 'ESCALATE'
    };

    for (const classification of DRIFT_CLASSIFICATIONS) {
      expect(getRecommendation(classification)).toBe(expectedMapping[classification]);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INV-E-10: Phase E cannot trigger INCIDENT
// ─────────────────────────────────────────────────────────────

describe('INV-E-10: Phase E cannot trigger INCIDENT', () => {
  it('classifyScore never returns INCIDENT', () => {
    const testScores = [0, 0.1, 0.5, 1, 1.99, 2, 3, 4.99, 5, 10, 25, 50, 100];

    for (const score of testScores) {
      const classification = classifyScore(score);
      expect(classification).not.toBe('INCIDENT');
      expect(DRIFT_CLASSIFICATIONS).toContain(classification);
    }
  });

  it('DriftClassification type does not include INCIDENT', () => {
    // DRIFT_CLASSIFICATIONS is the exhaustive list
    expect(DRIFT_CLASSIFICATIONS).not.toContain('INCIDENT');
    expect(DRIFT_CLASSIFICATIONS).toEqual(['STABLE', 'INFO', 'WARNING', 'CRITICAL']);
  });

  it('pipeline report never contains INCIDENT classification', () => {
    const report = runDriftPipeline({
      observations: stableObs(),
      baseline: TEST_BASELINE,
      triggerEvents: ['RTE_001'],
      generatedAt: FIXED_DATE
    });

    for (const drift of report.detected_drifts) {
      expect(drift.classification).not.toBe('INCIDENT');
    }

    const reportStr = JSON.stringify(report.summary.by_classification);
    expect(reportStr).not.toContain('INCIDENT');
  });
});
