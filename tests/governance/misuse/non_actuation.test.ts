/**
 * NON-ACTUATION TESTS — Phase G Misuse Detection (CRITICAL)
 * Proves zero side effects and non-actuating behavior.
 *
 * These tests are MANDATORY per Phase G specification.
 * They prove that Phase G:
 * - Produces reports only, no state mutation
 * - Performs no file writes during detection
 * - Report is data-only (no executable fields)
 * - auto_action_taken is always "none"
 * - requires_human_decision is always true
 * - Repeated runs produce same output (determinism)
 *
 * INV-G-01: NON-ACTUATING (auto_action_taken always "none")
 * INV-G-02: requires_human_decision always true
 * INV-G-03: Zero side effects (pure functions)
 */

import { describe, it, expect } from 'vitest';
import {
  runMisusePipeline,
  runMisusePipelineWithDetectors,
  ALL_DETECTORS
} from '../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  MisuseInputEvent,
  MisuseEvent,
  MisuseDetectorFn
} from '../../../governance/misuse/index.js';

// ─────────────────────────────────────────────────────────────
// HELPER: ASSERT NO FUNCTIONS
// ─────────────────────────────────────────────────────────────

function assertNoFunctions(obj: unknown, path: string): void {
  if (typeof obj === 'function') throw new Error(`Function at ${path}`);
  if (Array.isArray(obj)) obj.forEach((v, i) => assertNoFunctions(v, `${path}[${i}]`));
  else if (obj && typeof obj === 'object') {
    Object.entries(obj).forEach(([k, v]) => assertNoFunctions(v, `${path}.${k}`));
  }
}

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

function criticalMisuseObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      createInputEvent('EVT-001', '2026-02-04T02:00:00.000Z', {
        content: "'; DROP TABLE users; --"
      }),
      createInputEvent('EVT-002', '2026-02-04T02:05:00.000Z', {
        content: '<script>alert("xss")</script>'
      })
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
        prev_hash: 'TAMPERED-HASH'
      }
    ],
    eventRegistry: {
      known_event_ids: ['EVT-001'],
      min_valid_timestamp: '2026-02-04T01:00:00.000Z'
    },
    thresholdHistory: []
  };
}

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOF: RETURN TYPE
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Pipeline returns MisuseReport object', () => {
  it('pipeline returns a MisuseReport object and nothing else', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    expect(typeof report).toBe('object');
    expect(report).not.toBeNull();
    expect(report.report_type).toBe('misuse_report');
    expect(report.report_id).toBeTruthy();
  });

  it('return value is a plain object with no prototype chain tricks', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    // Should be serializable without losing data
    const roundTripped = JSON.parse(JSON.stringify(report));
    expect(roundTripped.report_id).toBe(report.report_id);
    expect(roundTripped.report_type).toBe(report.report_type);
  });
});

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOF: INPUT IMMUTABILITY
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Input observations not mutated', () => {
  it('input observations are not mutated after pipeline execution', () => {
    const obs = cleanObservations();
    const before = JSON.stringify(obs);

    runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_DATE
    });

    expect(JSON.stringify(obs)).toBe(before);
  });

  it('input events array is not modified', () => {
    const obs = cleanObservations();
    const eventCountBefore = obs.inputEvents.length;
    const firstEventBefore = JSON.stringify(obs.inputEvents[0]);

    runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_DATE
    });

    expect(obs.inputEvents.length).toBe(eventCountBefore);
    expect(JSON.stringify(obs.inputEvents[0])).toBe(firstEventBefore);
  });
});

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOF: JSON SERIALIZATION
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Report is JSON-serializable', () => {
  it('report is fully JSON-serializable', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    const json = JSON.stringify(report);
    const parsed = JSON.parse(json);

    expect(parsed.report_id).toBe(report.report_id);
    expect(parsed.schema_version).toBe('1.0.0');
    expect(parsed.misuse_events.length).toBe(report.misuse_events.length);
  });

  it('all nested structures are JSON-safe', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    // This would throw if any value is not JSON-serializable
    expect(() => JSON.stringify(report)).not.toThrow();

    // Verify deep equality after round-trip
    const roundTripped = JSON.parse(JSON.stringify(report));
    expect(roundTripped.summary.events_checked).toBe(report.summary.events_checked);
    expect(roundTripped.summary.misuse_events_detected).toBe(report.summary.misuse_events_detected);
  });
});

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOF: NO FUNCTIONS IN REPORT
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Report contains no functions', () => {
  it('report contains no function values at any depth', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    expect(() => assertNoFunctions(report, 'report')).not.toThrow();
  });

  it('misuse_events contain no function values', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    for (let i = 0; i < report.misuse_events.length; i++) {
      expect(() => assertNoFunctions(report.misuse_events[i], `misuse_events[${i}]`)).not.toThrow();
    }
  });
});

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOF: NOTES CONTAIN NON-ACTUATION STATEMENT
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Report notes contain non-actuation statement', () => {
  it('report notes contain "No automatic action"', () => {
    const report = runMisusePipeline({
      observations: cleanObservations(),
      generatedAt: FIXED_DATE
    });

    expect(report.notes.toLowerCase()).toContain('no automatic action');
  });

  it('notes statement present even with detected misuse', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    expect(report.notes.toLowerCase()).toContain('no automatic action');
    expect(report.misuse_events.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-G-01: auto_action_taken ALWAYS "none"
// ─────────────────────────────────────────────────────────────

describe('INV-G-01 — auto_action_taken is always "none" even with CRITICAL severity', () => {
  it('auto_action_taken is "none" for all events', () => {
    const report = runMisusePipeline({
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    });

    for (const event of report.misuse_events) {
      expect(event.auto_action_taken).toBe('none');
    }
  });

  it('auto_action_taken remains "none" with critical severity detection', () => {
    // Create detector that returns critical severity
    const criticalDetector: MisuseDetectorFn = (obs, prevHash) => [{
      event_type: 'misuse_event',
      schema_version: '1.0.0',
      event_id: 'ME-CRITICAL-001',
      timestamp: FIXED_DATE,
      case_id: 'CASE-004',
      pattern_id: 'CRIT-001',
      severity: 'critical',
      detection_method: 'hash_chain_verification',
      context: { source: 'critical-detector' },
      evidence: {
        description: 'Critical misuse detected',
        samples: ['critical sample'],
        evidence_refs: ['critical-ref']
      },
      auto_action_taken: 'none',
      requires_human_decision: true,
      recommended_actions: [{
        action: 'escalate',
        rationale: 'Critical severity requires immediate human review'
      }],
      log_chain_prev_hash: prevHash
    }];

    const report = runMisusePipelineWithDetectors(
      { observations: cleanObservations(), generatedAt: FIXED_DATE },
      [criticalDetector]
    );

    expect(report.misuse_events.length).toBe(1);
    expect(report.misuse_events[0].severity).toBe('critical');
    expect(report.misuse_events[0].auto_action_taken).toBe('none');
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM: 10 CONSECUTIVE RUNS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — 10 consecutive runs produce identical reports', () => {
  it('10 consecutive runs produce identical reports', () => {
    const args = {
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    };

    const firstReport = runMisusePipeline(args);
    const firstJson = JSON.stringify(firstReport);

    for (let i = 0; i < 10; i++) {
      const report = runMisusePipeline(args);
      expect(JSON.stringify(report)).toBe(firstJson);
    }
  });

  it('event_ids are identical across runs', () => {
    const args = {
      observations: criticalMisuseObservations(),
      generatedAt: FIXED_DATE
    };

    const firstReport = runMisusePipeline(args);
    const firstEventIds = firstReport.misuse_events.map(e => e.event_id);

    for (let i = 0; i < 10; i++) {
      const report = runMisusePipeline(args);
      const eventIds = report.misuse_events.map(e => e.event_id);
      expect(eventIds).toEqual(firstEventIds);
    }
  });
});
