/**
 * PIPELINE TESTS — Phase G Misuse Detection
 * Integration tests for the full misuse detection pipeline.
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure functions)
 */

import { describe, it, expect } from 'vitest';
import {
  runMisusePipeline,
  runMisusePipelineWithDetectors,
  ALL_DETECTORS,
  GENERATOR
} from '../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  MisuseInputEvent,
  MisuseDetectorFn,
  MisuseEvent,
  MisuseCaseCode
} from '../../../governance/misuse/index.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

const FIXED_DATE = '2026-02-04T03:00:00.000Z';

function createInputEvent(
  id: string,
  timestamp: string,
  payload: Record<string, unknown> = {}
): MisuseInputEvent {
  return {
    event_id: id,
    timestamp,
    source: 'test-source',
    run_id: 'run-001',
    inputs_hash: 'hash-' + id,
    payload
  };
}

function cleanObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      createInputEvent('EVT-001', '2026-02-04T02:00:00.000Z', { content: 'normal input' }),
      createInputEvent('EVT-002', '2026-02-04T02:05:00.000Z', { content: 'another normal input' })
    ],
    overrideRecords: [],
    decisionRecords: [],
    logChain: [
      {
        entry_id: 'LOG-001',
        timestamp: '2026-02-04T02:00:00.000Z',
        content_hash: 'hash-a',
        prev_hash: null
      },
      {
        entry_id: 'LOG-002',
        timestamp: '2026-02-04T02:05:00.000Z',
        content_hash: 'hash-b',
        prev_hash: 'hash-a'
      }
    ],
    eventRegistry: {
      known_event_ids: ['EVT-001', 'EVT-002'],
      min_valid_timestamp: '2026-02-04T01:00:00.000Z'
    },
    thresholdHistory: []
  };
}

function misuseObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      createInputEvent('EVT-001', '2026-02-04T02:00:00.000Z', {
        content: "'; DROP TABLE users; --"
      }),
      createInputEvent('EVT-002', '2026-02-04T02:05:00.000Z', {
        content: '<script>alert("xss")</script>'
      }),
      createInputEvent('EVT-003', '2026-02-04T02:10:00.000Z', {
        content: 'normal input'
      })
    ],
    overrideRecords: [
      {
        override_id: 'OVR-001',
        timestamp: '2026-02-04T02:01:00.000Z',
        decision_id: 'DEC-001',
        approved_by: 'user-a',
        reason: 'Test override'
      }
    ],
    decisionRecords: [
      {
        decision_id: 'DEC-001',
        timestamp: '2026-02-04T02:00:30.000Z',
        verdict: 'REJECT',
        was_overridden: true
      }
    ],
    logChain: [
      {
        entry_id: 'LOG-001',
        timestamp: '2026-02-04T02:00:00.000Z',
        content_hash: 'hash-a',
        prev_hash: null
      },
      {
        entry_id: 'LOG-002',
        timestamp: '2026-02-04T02:05:00.000Z',
        content_hash: 'hash-b',
        prev_hash: 'BROKEN-HASH'
      }
    ],
    eventRegistry: {
      known_event_ids: ['EVT-001', 'EVT-002'],
      min_valid_timestamp: '2026-02-04T01:00:00.000Z'
    },
    thresholdHistory: [
      { timestamp: '2026-02-04T02:00:00.000Z', value: 0.49, threshold: 0.5 },
      { timestamp: '2026-02-04T02:01:00.000Z', value: 0.495, threshold: 0.5 },
      { timestamp: '2026-02-04T02:02:00.000Z', value: 0.499, threshold: 0.5 }
    ]
  };
}

// ─────────────────────────────────────────────────────────────
// PIPELINE PRODUCES VALID MISUSE_REPORT
// ─────────────────────────────────────────────────────────────

describe('misuse_pipeline/runMisusePipeline', () => {
  it('produces a valid MISUSE_REPORT for clean observations', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    expect(report.report_type).toBe('misuse_report');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.report_id).toBeTruthy();
    expect(report.timestamp).toBe(FIXED_DATE);
  });

  it('produces a valid MISUSE_REPORT for misuse observations', () => {
    const report = runMisusePipeline({
      observations: misuseObservations(),
      generatedAt: FIXED_DATE
    });

    expect(report.report_type).toBe('misuse_report');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.misuse_events.length).toBeGreaterThan(0);
  });

  it('includes all mandatory fields in report', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    // Required fields per MisuseReport interface
    expect(report.report_type).toBe('misuse_report');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.report_id).toBeTruthy();
    expect(report.timestamp).toBeTruthy();
    expect(report.window).toBeDefined();
    expect(report.window.from).toBeTruthy();
    expect(report.window.to).toBeTruthy();
    expect(typeof report.window.events_count).toBe('number');
    expect(Array.isArray(report.misuse_events)).toBe(true);
    expect(report.summary).toBeDefined();
    expect(typeof report.escalation_required).toBe('boolean');
    expect(report.escalation_target).toBeTruthy();
    expect(typeof report.notes).toBe('string');
    expect(report.generated_at).toBeTruthy();
    expect(report.generator).toBeTruthy();
    expect(report.log_chain_prev_hash === null || typeof report.log_chain_prev_hash === 'string').toBe(true);
  });

  it('uses GENERATOR identifier', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    expect(report.generator).toBe(GENERATOR);
    expect(report.generator).toContain('Phase G');
  });

  it('computes correct summary counts', () => {
    const report = runMisusePipeline({
      observations: misuseObservations(),
      generatedAt: FIXED_DATE
    });

    // Summary must match actual event counts
    expect(report.summary.misuse_events_detected).toBe(report.misuse_events.length);
    expect(report.summary.events_checked).toBe(misuseObservations().inputEvents.length);

    // by_case and by_severity totals must equal total events
    const caseTotal = Object.values(report.summary.by_case).reduce((a, b) => a + b, 0);
    const severityTotal = Object.values(report.summary.by_severity).reduce((a, b) => a + b, 0);

    expect(caseTotal).toBe(report.misuse_events.length);
    expect(severityTotal).toBe(report.misuse_events.length);
  });

  it('runs all 5 detectors', () => {
    // ALL_DETECTORS should contain exactly 5 detectors
    expect(ALL_DETECTORS.length).toBe(5);

    const report = runMisusePipeline({
      observations: misuseObservations(),
      generatedAt: FIXED_DATE
    });

    // Verify the pipeline covers all case codes
    const detectedCaseCodes = new Set(report.misuse_events.map(e => e.case_id));
    const allCaseCodes: MisuseCaseCode[] = ['CASE-001', 'CASE-002', 'CASE-003', 'CASE-004', 'CASE-005'];

    // At least some detectors should fire on misuse observations
    expect(report.misuse_events.length).toBeGreaterThan(0);

    // All case codes in report should be valid
    for (const caseCode of detectedCaseCodes) {
      expect(allCaseCodes).toContain(caseCode);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// CUSTOM DETECTORS
// ─────────────────────────────────────────────────────────────

describe('misuse_pipeline/runMisusePipelineWithDetectors', () => {
  it('allows custom detectors', () => {
    const mockDetector: MisuseDetectorFn = (observations, prevHash) => {
      return [{
        event_type: 'misuse_event',
        schema_version: '1.0.0',
        event_id: 'ME-MOCK-001',
        timestamp: FIXED_DATE,
        case_id: 'CASE-001',
        pattern_id: 'MOCK-001',
        severity: 'medium',
        detection_method: 'regex_pattern_match',
        context: {
          source: 'mock-detector',
          run_id: 'mock-run'
        },
        evidence: {
          description: 'Mock detection',
          samples: ['sample'],
          evidence_refs: ['ref']
        },
        auto_action_taken: 'none',
        requires_human_decision: true,
        recommended_actions: [{
          action: 'investigate',
          rationale: 'Mock rationale'
        }],
        log_chain_prev_hash: prevHash
      }];
    };

    const report = runMisusePipelineWithDetectors(
      {
        observations: cleanObservations(),
        generatedAt: FIXED_DATE
      },
      [mockDetector]
    );

    expect(report.misuse_events.length).toBe(1);
    expect(report.misuse_events[0].event_id).toBe('ME-MOCK-001');
    expect(report.summary.misuse_events_detected).toBe(1);
  });

  it('handles detector returning empty array', () => {
    const emptyDetector: MisuseDetectorFn = () => [];

    const report = runMisusePipelineWithDetectors(
      {
        observations: cleanObservations(),
        generatedAt: FIXED_DATE
      },
      [emptyDetector]
    );

    expect(report.misuse_events.length).toBe(0);
    expect(report.summary.misuse_events_detected).toBe(0);
  });

  it('chains multiple custom detectors', () => {
    const detector1: MisuseDetectorFn = (obs, prevHash) => [{
      event_type: 'misuse_event',
      schema_version: '1.0.0',
      event_id: 'ME-D1-001',
      timestamp: FIXED_DATE,
      case_id: 'CASE-001',
      pattern_id: 'D1-001',
      severity: 'low',
      detection_method: 'regex_pattern_match',
      context: { source: 'detector1' },
      evidence: { description: 'D1', samples: [], evidence_refs: [] },
      auto_action_taken: 'none',
      requires_human_decision: true,
      recommended_actions: [],
      log_chain_prev_hash: prevHash
    }];

    const detector2: MisuseDetectorFn = (obs, prevHash) => [{
      event_type: 'misuse_event',
      schema_version: '1.0.0',
      event_id: 'ME-D2-001',
      timestamp: FIXED_DATE,
      case_id: 'CASE-002',
      pattern_id: 'D2-001',
      severity: 'high',
      detection_method: 'anomaly_scoring',
      context: { source: 'detector2' },
      evidence: { description: 'D2', samples: [], evidence_refs: [] },
      auto_action_taken: 'none',
      requires_human_decision: true,
      recommended_actions: [],
      log_chain_prev_hash: prevHash
    }];

    const report = runMisusePipelineWithDetectors(
      {
        observations: cleanObservations(),
        generatedAt: FIXED_DATE
      },
      [detector1, detector2]
    );

    expect(report.misuse_events.length).toBe(2);
    expect(report.summary.by_case['CASE-001']).toBe(1);
    expect(report.summary.by_case['CASE-002']).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────

describe('misuse_pipeline/determinism', () => {
  it('identical inputs produce identical outputs', () => {
    const args = {
      observations: misuseObservations(),
      generatedAt: FIXED_DATE
    };

    const report1 = runMisusePipeline(args);
    const report2 = runMisusePipeline(args);

    expect(report1.report_id).toBe(report2.report_id);
    expect(report1.misuse_events.length).toBe(report2.misuse_events.length);
    expect(JSON.stringify(report1.summary)).toBe(JSON.stringify(report2.summary));
    expect(report1.escalation_required).toBe(report2.escalation_required);
  });

  it('report_id is deterministic for same inputs', () => {
    const args = {
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    };

    const ids = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const report = runMisusePipeline(args);
      ids.add(report.report_id);
    }

    // All runs produce the same report_id
    expect(ids.size).toBe(1);
  });

  it('event order is deterministic', () => {
    const args = {
      observations: misuseObservations(),
      generatedAt: FIXED_DATE
    };

    const report1 = runMisusePipeline(args);
    const report2 = runMisusePipeline(args);

    for (let i = 0; i < report1.misuse_events.length; i++) {
      expect(report1.misuse_events[i].event_id).toBe(report2.misuse_events[i].event_id);
      expect(report1.misuse_events[i].case_id).toBe(report2.misuse_events[i].case_id);
    }
  });
});
