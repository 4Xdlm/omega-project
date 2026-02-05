/**
 * PHASE H — NON-ACTUATION TESTS
 * Proves that Phase H is NON-ACTUATING (report only, no enforcement).
 *
 * INV-H-06: NON-ACTUATING (report only)
 */

import { describe, it, expect } from 'vitest';
import {
  runOverridePipeline,
  computeOverrideHash,
  type OverrideEvent,
  type OverridePipelineArgs,
  type OverrideReport
} from '../../../GOVERNANCE/override/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createValidOverride(overrides?: Partial<Omit<OverrideEvent, 'override_hash'>>): OverrideEvent {
  const base: Omit<OverrideEvent, 'override_hash'> = {
    event_type: 'override_event',
    schema_version: '1.0.0',
    event_id: 'OVR_HOT_20260204_001',
    timestamp: '2026-02-04T10:00:00.000Z',
    override_id: 'OVERRIDE_HOTFIX_20260204T100000Z_abc12345',
    type: 'hotfix',
    scope: {
      target_rule: 'INV-TEST-001',
      target_component: 'src/test/component.ts',
      target_verdict: 'FAIL'
    },
    justification: {
      reason: 'Critical production issue requires immediate hotfix deployment',
      impact_assessment: 'Low risk - isolated component',
      alternatives_considered: ['Wait for next release'],
      why_alternatives_rejected: 'Production impact too high'
    },
    approval: {
      approver: 'Francky',
      approver_role: 'Architect',
      approved_at: '2026-02-04T09:00:00.000Z',
      approval_method: 'signature'
    },
    validity: {
      effective_from: '2026-02-04T10:00:00.000Z',
      expires_at: '2026-02-11T10:00:00.000Z',
      renewable: false,
      max_renewals: 0
    },
    manifest_ref: {
      tag: 'v1.0.0',
      manifest_sha256: 'a'.repeat(64)
    },
    log_chain_prev_hash: null,
    ...overrides
  };

  const hash = computeOverrideHash(base);
  return { ...base, override_hash: hash };
}

// ─────────────────────────────────────────────────────────────
// NON-ACTUATION PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Report only, no enforcement', () => {
  it('report_type is override_report (not override_action)', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.report_type).toBe('override_report');
    expect(report.report_type).not.toContain('action');
  });

  it('notes contain non-enforcement statement', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.notes.toLowerCase()).toContain('no automatic');
    expect(report.notes.toLowerCase()).toContain('human');
  });

  it('report does not contain action_taken field', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);
    const reportObj = JSON.parse(JSON.stringify(report));

    expect(reportObj).not.toHaveProperty('action_taken');
    expect(reportObj).not.toHaveProperty('enforcement_action');
    expect(reportObj).not.toHaveProperty('blocked');
  });

  it('invalid override is reported but not blocked', () => {
    const invalidOverride = createValidOverride({
      justification: {
        reason: '',
        impact_assessment: 'test',
        alternatives_considered: [],
        why_alternatives_rejected: 'test'
      }
    });
    const hash = computeOverrideHash(invalidOverride);
    const withHash = { ...invalidOverride, override_hash: hash };

    const args: OverridePipelineArgs = {
      overrides: [withHash],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    // Override is included in report
    expect(report.overrides).toHaveLength(1);
    // Validation shows invalid
    expect(report.validations[0].validation.valid).toBe(false);
    // But no blocking action
    const reportStr = JSON.stringify(report);
    expect(reportStr).not.toContain('"blocked":true');
    expect(reportStr).not.toContain('"action_taken"');
  });

  it('rule violation is reported but not enforced', () => {
    const cascadeOverride = createValidOverride({
      scope: {
        target_rule: 'OVR-001',
        target_component: 'governance/override',
        target_verdict: 'FAIL'
      }
    });

    const args: OverridePipelineArgs = {
      overrides: [cascadeOverride],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    // Violation is recorded
    expect(report.rule_violations.length).toBeGreaterThan(0);
    // But no enforcement
    expect(report).not.toHaveProperty('enforcement_action');
    expect(report).not.toHaveProperty('rejected');
  });

  it('escalation is flag only, not automatic notification', () => {
    const invalidOverride = createValidOverride({
      justification: {
        reason: '',
        impact_assessment: 'test',
        alternatives_considered: [],
        why_alternatives_rejected: 'test'
      }
    });
    const hash = computeOverrideHash(invalidOverride);
    const withHash = { ...invalidOverride, override_hash: hash };

    const args: OverridePipelineArgs = {
      overrides: [withHash],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    // Escalation flag set
    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
    // But no notification sent (no notification_sent field)
    expect(report).not.toHaveProperty('notification_sent');
    expect(report).not.toHaveProperty('email_sent');
  });
});

// ─────────────────────────────────────────────────────────────
// PURE FUNCTION PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Pure function (no side effects)', () => {
  it('input overrides not mutated', () => {
    const override = createValidOverride();
    const overrideCopy = JSON.stringify(override);

    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    runOverridePipeline(args);

    expect(JSON.stringify(override)).toBe(overrideCopy);
  });

  it('args object not mutated', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      existingOverrides: [],
      generatedAt: '2026-02-04T12:00:00.000Z',
      prevEventHash: 'test'
    };

    const argsCopy = JSON.stringify(args);

    runOverridePipeline(args);

    expect(JSON.stringify(args)).toBe(argsCopy);
  });

  it('no global state modified', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    // Run multiple times
    for (let i = 0; i < 5; i++) {
      runOverridePipeline(args);
    }

    // If global state was modified, subsequent runs would differ
    const report1 = runOverridePipeline(args);
    const report2 = runOverridePipeline(args);

    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM PROOFS
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Deterministic output', () => {
  it('10 consecutive runs produce identical reports', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const firstReport = runOverridePipeline(args);
    const firstJson = JSON.stringify(firstReport);

    for (let i = 0; i < 10; i++) {
      const report = runOverridePipeline(args);
      expect(JSON.stringify(report)).toBe(firstJson);
    }
  });

  it('order of overrides preserved', () => {
    const override1 = createValidOverride({
      override_id: 'OVR_A',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const override2 = createValidOverride({
      override_id: 'OVR_B',
      timestamp: '2026-02-04T11:00:00.000Z'
    });

    const args: OverridePipelineArgs = {
      overrides: [override1, override2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.overrides[0].override_id).toBe('OVR_A');
    expect(report.overrides[1].override_id).toBe('OVR_B');
  });

  it('validation order matches override order', () => {
    const override1 = createValidOverride({ override_id: 'OVR_1' });
    const override2 = createValidOverride({ override_id: 'OVR_2' });

    const args: OverridePipelineArgs = {
      overrides: [override1, override2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.validations[0].override_id).toBe('OVR_1');
    expect(report.validations[1].override_id).toBe('OVR_2');
  });
});

// ─────────────────────────────────────────────────────────────
// DATA-ONLY OUTPUT
// ─────────────────────────────────────────────────────────────

describe('NON-ACTUATION — Data-only output', () => {
  it('report is fully JSON-serializable', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    // Should not throw
    const json = JSON.stringify(report);
    const parsed = JSON.parse(json) as OverrideReport;

    expect(parsed.report_type).toBe('override_report');
  });

  it('report contains no function values', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

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
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

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
