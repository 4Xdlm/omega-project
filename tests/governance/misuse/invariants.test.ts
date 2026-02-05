/**
 * INVARIANT TESTS -- Phase G Misuse Detection
 * One test per invariant (INV-G-01 through INV-G-06).
 *
 * These tests prove that the Phase G implementation satisfies
 * all non-negotiable invariants from the specification.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import {
  runMisusePipeline,
  runMisusePipelineWithDetectors,
  ALL_DETECTORS,
  CASE_SEVERITY_MAP,
  AUTO_ACTION_NONE,
  detectPromptInjection,
  detectThresholdGaming,
  detectOverrideAbuse,
  detectLogTampering,
  detectReplayAttack
} from '../../../governance/misuse/index.js';
import type {
  MisuseObservationSources,
  MisuseInputEvent,
  MisuseReport,
  MisuseDetectorFn
} from '../../../governance/misuse/index.js';

// ---------------------------------------------------------------------------
// TEST FIXTURES
// ---------------------------------------------------------------------------

const FIXED_TIMESTAMP = '2026-02-04T10:00:00.000Z';

/**
 * Creates a minimal observation source with clean input events.
 */
function createCleanObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_001',
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'test_source',
        run_id: 'RUN_001',
        inputs_hash: 'SHA256_CLEAN_001',
        payload: { data: 'normal input', value: 42 }
      },
      {
        event_id: 'EVT_002',
        timestamp: '2026-02-04T09:05:00.000Z',
        source: 'test_source',
        run_id: 'RUN_001',
        inputs_hash: 'SHA256_CLEAN_002',
        payload: { data: 'another normal input', count: 10 }
      }
    ]
  };
}

/**
 * Creates observation source with prompt injection attack.
 * CASE-001: Prompt Injection (severity: high)
 */
function createPromptInjectionObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_PI_001',
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'user_input',
        run_id: 'RUN_ATTACK_001',
        inputs_hash: 'SHA256_ATTACK_001',
        payload: { query: "'; DROP TABLE users; --", user: 'attacker' }
      }
    ]
  };
}

/**
 * Creates observation source with threshold gaming.
 * CASE-002: Threshold Gaming (severity: medium)
 */
function createThresholdGamingObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_TG_001',
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'api_gateway',
        run_id: 'RUN_TG_001',
        inputs_hash: 'SHA256_TG_001',
        payload: { score: 0.495 }
      }
    ],
    thresholdHistory: [
      { timestamp: '2026-02-04T08:55:00.000Z', value: 0.501, threshold: 0.5 },
      { timestamp: '2026-02-04T08:56:00.000Z', value: 0.499, threshold: 0.5 },
      { timestamp: '2026-02-04T08:57:00.000Z', value: 0.502, threshold: 0.5 },
      { timestamp: '2026-02-04T08:58:00.000Z', value: 0.498, threshold: 0.5 },
      { timestamp: '2026-02-04T08:59:00.000Z', value: 0.495, threshold: 0.5 }
    ]
  };
}

/**
 * Creates observation source with override abuse.
 * CASE-003: Override Abuse (severity: medium)
 */
function createOverrideAbuseObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_OA_001',
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'decision_engine',
        run_id: 'RUN_OA_001',
        inputs_hash: 'SHA256_OA_001',
        payload: { decision_id: 'DEC_001' }
      }
    ],
    decisionRecords: [
      { decision_id: 'DEC_001', timestamp: '2026-02-04T08:50:00.000Z', verdict: 'REJECT', was_overridden: true },
      { decision_id: 'DEC_002', timestamp: '2026-02-04T08:51:00.000Z', verdict: 'REJECT', was_overridden: true },
      { decision_id: 'DEC_003', timestamp: '2026-02-04T08:52:00.000Z', verdict: 'REJECT', was_overridden: true },
      { decision_id: 'DEC_004', timestamp: '2026-02-04T08:53:00.000Z', verdict: 'APPROVE', was_overridden: false }
    ],
    overrideRecords: [
      { override_id: 'OVR_001', timestamp: '2026-02-04T08:50:30.000Z', decision_id: 'DEC_001', approved_by: 'user_A', reason: 'Business need' },
      { override_id: 'OVR_002', timestamp: '2026-02-04T08:51:30.000Z', decision_id: 'DEC_002', approved_by: 'user_A', reason: 'Business need' },
      { override_id: 'OVR_003', timestamp: '2026-02-04T08:52:30.000Z', decision_id: 'DEC_003', approved_by: 'user_A', reason: 'Business need' }
    ]
  };
}

/**
 * Creates observation source with log tampering.
 * CASE-004: Log Tampering (severity: critical)
 */
function createLogTamperingObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_LT_001',
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'log_system',
        run_id: 'RUN_LT_001',
        inputs_hash: 'SHA256_LT_001',
        payload: { log_id: 'LOG_003' }
      }
    ],
    logChain: [
      { entry_id: 'LOG_001', timestamp: '2026-02-04T08:50:00.000Z', content_hash: 'HASH_A', prev_hash: null },
      { entry_id: 'LOG_002', timestamp: '2026-02-04T08:51:00.000Z', content_hash: 'HASH_B', prev_hash: 'HASH_A' },
      { entry_id: 'LOG_003', timestamp: '2026-02-04T08:52:00.000Z', content_hash: 'HASH_C', prev_hash: 'TAMPERED_HASH' } // Broken chain!
    ]
  };
}

/**
 * Creates observation source with replay attack.
 * CASE-005: Replay Attack (severity: high)
 */
function createReplayAttackObservations(): MisuseObservationSources {
  return {
    inputEvents: [
      {
        event_id: 'EVT_RA_001', // Duplicate ID!
        timestamp: '2026-02-04T09:00:00.000Z',
        source: 'api_gateway',
        run_id: 'RUN_RA_001',
        inputs_hash: 'SHA256_RA_001',
        payload: { action: 'transfer', amount: 1000 }
      }
    ],
    eventRegistry: {
      known_event_ids: ['EVT_RA_001', 'EVT_PREV_001', 'EVT_PREV_002'], // EVT_RA_001 already exists
      min_valid_timestamp: '2026-02-04T08:00:00.000Z'
    }
  };
}

// ---------------------------------------------------------------------------
// INV-G-01: NON-ACTUATING (auto_action_taken always "none")
// ---------------------------------------------------------------------------

describe('INV-G-01: NON-ACTUATING (auto_action_taken always "none")', () => {
  it('all misuse events have auto_action_taken = "none"', () => {
    // Use prompt injection which is guaranteed to trigger events
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.misuse_events.length).toBeGreaterThan(0);

    for (const event of report.misuse_events) {
      expect(event.auto_action_taken).toBe(AUTO_ACTION_NONE);
      expect(event.auto_action_taken).toBe('none');
    }
  });

  it('report contains no blocking/quarantine actions', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    const reportStr = JSON.stringify(report);

    // No automatic blocking actions
    expect(reportStr).not.toContain('"action":"block"');
    expect(reportStr).not.toContain('"action":"quarantine"');
    expect(reportStr).not.toContain('"action":"reject"');
    expect(reportStr).not.toContain('"action":"halt"');

    // All events use non-actuating action value
    for (const event of report.misuse_events) {
      expect(event.auto_action_taken).not.toBe('block');
      expect(event.auto_action_taken).not.toBe('quarantine');
      expect(event.auto_action_taken).not.toBe('reject');
    }
  });

  it('AutoAction type only allows "none" value', () => {
    // AUTO_ACTION_NONE is the only valid value
    expect(AUTO_ACTION_NONE).toBe('none');
  });
});

// ---------------------------------------------------------------------------
// INV-G-02: requires_human_decision always true
// ---------------------------------------------------------------------------

describe('INV-G-02: requires_human_decision always true', () => {
  it('all misuse events have requires_human_decision = true', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.misuse_events.length).toBeGreaterThan(0);

    for (const event of report.misuse_events) {
      expect(event.requires_human_decision).toBe(true);
    }
  });

  it('all detectors produce events with requires_human_decision = true', () => {
    const detectors: MisuseDetectorFn[] = [
      detectPromptInjection,
      detectThresholdGaming,
      detectOverrideAbuse,
      detectLogTampering,
      detectReplayAttack
    ];

    const testCases = [
      createPromptInjectionObservations(),
      createThresholdGamingObservations(),
      createOverrideAbuseObservations(),
      createLogTamperingObservations(),
      createReplayAttackObservations()
    ];

    for (let i = 0; i < detectors.length; i++) {
      const detector = detectors[i];
      const obs = testCases[i];
      const events = detector(obs, null);

      for (const event of events) {
        expect(event.requires_human_decision).toBe(true);
      }
    }
  });

  it('report notes indicate human decision required', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.notes.toLowerCase()).toContain('human');
    expect(report.notes.toLowerCase()).toContain('no automatic action');
  });
});

// ---------------------------------------------------------------------------
// INV-G-03: Zero side effects (pure functions)
// ---------------------------------------------------------------------------

describe('INV-G-03: Zero side effects (pure functions)', () => {
  it('pipeline does not mutate input observations', () => {
    const obs = createPromptInjectionObservations();
    const obsCopy = JSON.parse(JSON.stringify(obs));

    runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    // Input should be unchanged
    expect(JSON.stringify(obs)).toBe(JSON.stringify(obsCopy));
  });

  it('detectors are deterministic (same output for same input)', () => {
    const obs = createPromptInjectionObservations();

    const result1 = detectPromptInjection(obs, null);
    const result2 = detectPromptInjection(obs, null);

    expect(result1.length).toBe(result2.length);
    for (let i = 0; i < result1.length; i++) {
      expect(result1[i].case_id).toBe(result2[i].case_id);
      expect(result1[i].pattern_id).toBe(result2[i].pattern_id);
      expect(result1[i].severity).toBe(result2[i].severity);
      expect(result1[i].detection_method).toBe(result2[i].detection_method);
    }
  });

  it('10 consecutive runs produce identical reports', () => {
    const obs = createPromptInjectionObservations();
    const reports: MisuseReport[] = [];

    for (let i = 0; i < 10; i++) {
      const report = runMisusePipeline({
        observations: obs,
        generatedAt: FIXED_TIMESTAMP
      });
      reports.push(report);
    }

    // All reports should have same structure (ignoring report_id which includes hash)
    const firstReport = reports[0];
    for (let i = 1; i < 10; i++) {
      const report = reports[i];
      expect(report.misuse_events.length).toBe(firstReport.misuse_events.length);
      expect(report.summary.misuse_events_detected).toBe(firstReport.summary.misuse_events_detected);
      expect(report.summary.by_case).toEqual(firstReport.summary.by_case);
      expect(report.summary.by_severity).toEqual(firstReport.summary.by_severity);
      expect(report.escalation_required).toBe(firstReport.escalation_required);
    }
  });
});

// ---------------------------------------------------------------------------
// INV-G-04: Report is data-only
// ---------------------------------------------------------------------------

describe('INV-G-04: Report is data-only', () => {
  it('report is fully JSON-serializable', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    // Should not throw
    const serialized = JSON.stringify(report);
    const deserialized = JSON.parse(serialized);

    // Should be equal after round-trip
    expect(deserialized.report_id).toBe(report.report_id);
    expect(deserialized.report_type).toBe(report.report_type);
    expect(deserialized.misuse_events.length).toBe(report.misuse_events.length);
  });

  it('report contains no function values at any depth', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    // Recursive check for functions
    function checkNoFunctions(obj: unknown, path = ''): void {
      if (typeof obj === 'function') {
        throw new Error(`Function found at ${path}`);
      }
      if (obj === null || typeof obj !== 'object') {
        return;
      }
      if (Array.isArray(obj)) {
        for (let i = 0; i < obj.length; i++) {
          checkNoFunctions(obj[i], `${path}[${i}]`);
        }
      } else {
        for (const key of Object.keys(obj as Record<string, unknown>)) {
          checkNoFunctions((obj as Record<string, unknown>)[key], `${path}.${key}`);
        }
      }
    }

    expect(() => checkNoFunctions(report)).not.toThrow();
  });

  it('report notes contain non-actuation statement', () => {
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.notes.toLowerCase()).toContain('no automatic action');
  });
});

// ---------------------------------------------------------------------------
// INV-G-05: Severity matches ABUSE_CASES.md
// ---------------------------------------------------------------------------

describe('INV-G-05: Severity matches ABUSE_CASES.md', () => {
  it('CASE-001 (Prompt Injection) has severity "high"', () => {
    expect(CASE_SEVERITY_MAP['CASE-001']).toBe('high');

    const obs = createPromptInjectionObservations();
    const events = detectPromptInjection(obs, null);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.severity).toBe('high');
    }
  });

  it('CASE-002 (Threshold Gaming) has severity "medium"', () => {
    expect(CASE_SEVERITY_MAP['CASE-002']).toBe('medium');

    const obs = createThresholdGamingObservations();
    const events = detectThresholdGaming(obs, null);
    for (const event of events) {
      expect(event.severity).toBe('medium');
    }
  });

  it('CASE-003 (Override Abuse) has severity "medium"', () => {
    expect(CASE_SEVERITY_MAP['CASE-003']).toBe('medium');

    const obs = createOverrideAbuseObservations();
    const events = detectOverrideAbuse(obs, null);
    for (const event of events) {
      expect(event.severity).toBe('medium');
    }
  });

  it('CASE-004 (Log Tampering) has severity "critical"', () => {
    expect(CASE_SEVERITY_MAP['CASE-004']).toBe('critical');

    const obs = createLogTamperingObservations();
    const events = detectLogTampering(obs, null);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.severity).toBe('critical');
    }
  });

  it('CASE-005 (Replay Attack) has severity "high"', () => {
    expect(CASE_SEVERITY_MAP['CASE-005']).toBe('high');

    const obs = createReplayAttackObservations();
    const events = detectReplayAttack(obs, null);
    for (const event of events) {
      expect(event.severity).toBe('high');
    }
  });
});

// ---------------------------------------------------------------------------
// INV-G-06: Escalation required for CRITICAL/HIGH
// ---------------------------------------------------------------------------

describe('INV-G-06: Escalation required for CRITICAL/HIGH', () => {
  it('report with CRITICAL severity has escalation_required = true', () => {
    // Log tampering is CRITICAL
    const obs = createLogTamperingObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.summary.highest_severity).toBe('critical');
    expect(report.escalation_required).toBe(true);
  });

  it('report with HIGH severity has escalation_required = true', () => {
    // Prompt injection is HIGH
    const obs = createPromptInjectionObservations();
    const report = runMisusePipeline({
      observations: obs,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(report.summary.highest_severity).toBe('high');
    expect(report.escalation_required).toBe(true);
  });

  it('escalation_target is "ARCHITECTE" when required', () => {
    // Test with CRITICAL (log tampering)
    const obsCritical = createLogTamperingObservations();
    const reportCritical = runMisusePipeline({
      observations: obsCritical,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(reportCritical.escalation_required).toBe(true);
    expect(reportCritical.escalation_target).toBe('ARCHITECTE');

    // Test with HIGH (prompt injection)
    const obsHigh = createPromptInjectionObservations();
    const reportHigh = runMisusePipeline({
      observations: obsHigh,
      generatedAt: FIXED_TIMESTAMP
    });

    expect(reportHigh.escalation_required).toBe(true);
    expect(reportHigh.escalation_target).toBe('ARCHITECTE');
  });

  it('report with only MEDIUM severity does not require escalation', () => {
    // Use a mock detector that only produces MEDIUM severity events
    const mediumOnlyDetector: MisuseDetectorFn = (obs, _prevHash) => {
      if (obs.inputEvents.length === 0) return [];
      return [{
        event_type: 'misuse_event' as const,
        schema_version: '1.0.0' as const,
        event_id: 'MSE_002_20260204_001',
        timestamp: obs.inputEvents[0].timestamp,
        case_id: 'CASE-002' as const,
        pattern_id: 'TG-001',
        severity: 'medium' as const,
        detection_method: 'threshold_proximity' as const,
        context: { source: 'test' },
        evidence: {
          description: 'Test medium severity',
          samples: ['sample'],
          evidence_refs: ['ref']
        },
        auto_action_taken: 'none' as const,
        requires_human_decision: true as const,
        recommended_actions: [{ action: 'investigate' as const, rationale: 'Test' }],
        log_chain_prev_hash: null
      }];
    };

    const obs = createCleanObservations();
    const report = runMisusePipelineWithDetectors(
      { observations: obs, generatedAt: FIXED_TIMESTAMP },
      [mediumOnlyDetector]
    );

    expect(report.summary.highest_severity).toBe('medium');
    expect(report.escalation_required).toBe(false);
    expect(report.escalation_target).toBe('NONE');
  });
});
