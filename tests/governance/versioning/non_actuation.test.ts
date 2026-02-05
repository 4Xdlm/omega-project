/**
 * PHASE I — NON-ACTUATION TESTS
 * Proves that Phase I is NON-ACTUATING (report only, no enforcement).
 *
 * INV-I-10: NON-ACTUATING (report only)
 */

import { describe, it, expect } from 'vitest';
import {
  runVersionPipeline,
  type VersionContractEvent,
  type VersionPipelineArgs,
  type VersionReport
} from '../../../GOVERNANCE/versioning/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createValidVersionEvent(overrides?: Partial<VersionContractEvent>): VersionContractEvent {
  return {
    event_type: 'version_contract_event',
    schema_version: '1.0.0',
    event_id: 'VER_MIN_20260204_001',
    timestamp: '2026-02-04T10:00:00.000Z',
    version: {
      current: '1.1.0',
      previous: '1.0.0',
      bump_type: 'minor'
    },
    compatibility: {
      type: 'backward',
      backward_compatible: true,
      data_compatible: true,
      api_compatible: true,
      schema_compatible: true
    },
    breaking_changes: [],
    deprecations: [],
    migration_path: null,
    changelog_ref: 'CHANGELOG.md#110',
    log_chain_prev_hash: null,
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Report only, no enforcement', () => {
  it('report_type is version_report (not version_action)', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.report_type).toBe('version_report');
    expect(report.report_type).not.toContain('action');
  });

  it('notes contain non-enforcement statement', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.notes.toLowerCase()).toContain('no automatic');
    expect(report.notes.toLowerCase()).toContain('human');
  });

  it('report does not contain action_taken field', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);
    const reportObj = JSON.parse(JSON.stringify(report));

    expect(reportObj).not.toHaveProperty('action_taken');
    expect(reportObj).not.toHaveProperty('enforcement_action');
    expect(reportObj).not.toHaveProperty('blocked');
    expect(reportObj).not.toHaveProperty('rejected');
  });

  it('invalid event is reported but not blocked', () => {
    const invalidEvent = createValidVersionEvent({
      version: { current: 'invalid', previous: '1.0.0', bump_type: 'minor' }
    });

    const args: VersionPipelineArgs = {
      events: [invalidEvent],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    // Event is included in report
    expect(report.version_events).toHaveLength(1);
    // Validation shows invalid
    expect(report.validations[0].validation.valid).toBe(false);
    // But no blocking action
    const reportStr = JSON.stringify(report);
    expect(reportStr).not.toContain('"blocked":true');
    expect(reportStr).not.toContain('"action_taken"');
  });

  it('rule violation is reported but not enforced', () => {
    const event = createValidVersionEvent({
      changelog_ref: null // VER-005 violation
    });

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    // Violation is recorded
    expect(report.rule_violations.length).toBeGreaterThan(0);
    // But no enforcement
    expect(report).not.toHaveProperty('enforcement_action');
    expect(report).not.toHaveProperty('rejected');
  });

  it('escalation is flag only, not automatic notification', () => {
    const invalidEvent = createValidVersionEvent({
      version: { current: 'invalid', previous: '1.0.0', bump_type: 'minor' }
    });

    const args: VersionPipelineArgs = {
      events: [invalidEvent],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    // Escalation flag set
    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
    // But no notification sent
    expect(report).not.toHaveProperty('notification_sent');
    expect(report).not.toHaveProperty('email_sent');
  });
});

// ─────────────────────────────────────────────────────────────
// PURE FUNCTION PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Pure function (no side effects)', () => {
  it('input events not mutated', () => {
    const event = createValidVersionEvent();
    const eventCopy = JSON.stringify(event);

    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    runVersionPipeline(args);

    expect(JSON.stringify(event)).toBe(eventCopy);
  });

  it('args object not mutated', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      existingVersions: ['1.0.0'],
      generatedAt: '2026-02-04T12:00:00.000Z',
      prevEventHash: 'test'
    };

    const argsCopy = JSON.stringify(args);

    runVersionPipeline(args);

    expect(JSON.stringify(args)).toBe(argsCopy);
  });

  it('no global state modified', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    // Run multiple times
    for (let i = 0; i < 5; i++) {
      runVersionPipeline(args);
    }

    // If global state was modified, subsequent runs would differ
    const report1 = runVersionPipeline(args);
    const report2 = runVersionPipeline(args);

    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Deterministic output', () => {
  it('10 consecutive runs produce identical reports', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const firstReport = runVersionPipeline(args);
    const firstJson = JSON.stringify(firstReport);

    for (let i = 0; i < 10; i++) {
      const report = runVersionPipeline(args);
      expect(JSON.stringify(report)).toBe(firstJson);
    }
  });

  it('order of events preserved', () => {
    const event1 = createValidVersionEvent({
      event_id: 'VER_A',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const event2 = createValidVersionEvent({
      event_id: 'VER_B',
      timestamp: '2026-02-04T11:00:00.000Z'
    });

    const args: VersionPipelineArgs = {
      events: [event1, event2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.version_events[0].event_id).toBe('VER_A');
    expect(report.version_events[1].event_id).toBe('VER_B');
  });

  it('validation order matches event order', () => {
    const event1 = createValidVersionEvent({ event_id: 'VER_1' });
    const event2 = createValidVersionEvent({ event_id: 'VER_2' });

    const args: VersionPipelineArgs = {
      events: [event1, event2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    expect(report.validations[0].event_id).toBe('VER_1');
    expect(report.validations[1].event_id).toBe('VER_2');
  });
});

// ─────────────────────────────────────────────────────────────
// DATA-ONLY OUTPUT
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Data-only output', () => {
  it('report is fully JSON-serializable', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    // Should not throw
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as VersionReport;

    expect(parsed.report_type).toBe('version_report');
  });

  it('report contains no function values', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    function checkNoFunctions(obj: unknown, path: string = ''): void {
      if (typeof obj === 'function') {
        throw new Error(`Function found at ${path}`);
      }
      if (obj && typeof obj === 'object') {
        for (const [key, value] of Object.entries(obj)) {
          checkNoFunctions(value, `${path}.${key}`);
        }
      }
    }

    expect(() => checkNoFunctions(report)).not.toThrow();
  });

  it('report contains no Date objects', () => {
    const event = createValidVersionEvent();
    const args: VersionPipelineArgs = {
      events: [event],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runVersionPipeline(args);

    function checkNoDateObjects(obj: unknown, path: string = ''): void {
      if (obj instanceof Date) {
        throw new Error(`Date object found at ${path}`);
      }
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        for (const [key, value] of Object.entries(obj)) {
          checkNoDateObjects(value, `${path}.${key}`);
        }
      }
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => checkNoDateObjects(item, `${path}[${i}]`));
      }
    }

    expect(() => checkNoDateObjects(report)).not.toThrow();
  });
});
