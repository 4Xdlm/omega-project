/**
 * PHASE H — PIPELINE TESTS
 * Tests for override validation pipeline.
 */

import { describe, it, expect } from 'vitest';
import {
  runOverridePipeline,
  validateSingleOverride,
  computeOverrideHash,
  GENERATOR,
  type OverrideEvent,
  type OverridePipelineArgs
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
// PIPELINE TESTS
// ─────────────────────────────────────────────────────────────

describe('runOverridePipeline', () => {
  it('generates report for single valid override', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.report_type).toBe('override_report');
    expect(report.schema_version).toBe('1.0.0');
    expect(report.overrides).toHaveLength(1);
  });

  it('validates all overrides in batch', () => {
    const override1 = createValidOverride({
      override_id: 'OVR_1',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const override2 = createValidOverride({
      override_id: 'OVR_2',
      timestamp: '2026-02-04T11:00:00.000Z'
    });

    const args: OverridePipelineArgs = {
      overrides: [override1, override2],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.overrides).toHaveLength(2);
    expect(report.validations).toHaveLength(2);
  });

  it('computes correct window', () => {
    const override1 = createValidOverride({
      override_id: 'OVR_1',
      timestamp: '2026-02-04T10:00:00.000Z'
    });
    const override2 = createValidOverride({
      override_id: 'OVR_2',
      timestamp: '2026-02-04T14:00:00.000Z'
    });

    const args: OverridePipelineArgs = {
      overrides: [override1, override2],
      generatedAt: '2026-02-04T15:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.window.from).toBe('2026-02-04T10:00:00.000Z');
    expect(report.window.to).toBe('2026-02-04T14:00:00.000Z');
    expect(report.window.overrides_count).toBe(2);
  });

  it('computes summary by type', () => {
    const hotfix = createValidOverride({
      override_id: 'OVR_1',
      type: 'hotfix'
    });
    const exception = createValidOverride({
      override_id: 'OVR_2',
      type: 'exception',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-03-04T10:00:00.000Z',
        renewable: false,
        max_renewals: 0
      }
    });

    const args: OverridePipelineArgs = {
      overrides: [hotfix, exception],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.summary.by_type.hotfix).toBe(1);
    expect(report.summary.by_type.exception).toBe(1);
    expect(report.summary.by_type.derogation).toBe(0);
    expect(report.summary.total_overrides).toBe(2);
  });

  it('detects rule violations', () => {
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

    expect(report.rule_violations.length).toBeGreaterThan(0);
    expect(report.rule_violations[0].rule).toBe('OVR-005');
  });

  it('includes generator info', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.generator).toBe(GENERATOR);
    expect(report.generated_at).toBe('2026-02-04T12:00:00.000Z');
  });

  it('maintains hash chain', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z',
      prevEventHash: 'prev_event_hash_123'
    };

    const report = runOverridePipeline(args);

    expect(report.log_chain_prev_hash).toBe('prev_event_hash_123');
  });

  it('generates unique report_id', () => {
    const override = createValidOverride();
    const args1: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };
    const args2: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:01:00.000Z'
    };

    const report1 = runOverridePipeline(args1);
    const report2 = runOverridePipeline(args2);

    expect(report1.report_id).not.toBe(report2.report_id);
  });

  it('handles empty overrides array', () => {
    const args: OverridePipelineArgs = {
      overrides: [],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.overrides).toHaveLength(0);
    expect(report.summary.total_overrides).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATE SINGLE OVERRIDE
// ─────────────────────────────────────────────────────────────

describe('validateSingleOverride', () => {
  it('validates single override', () => {
    const override = createValidOverride();

    const report = validateSingleOverride(override);

    expect(report.overrides).toHaveLength(1);
    expect(report.validations).toHaveLength(1);
  });

  it('returns valid for valid override', () => {
    const override = createValidOverride();

    const report = validateSingleOverride(override);

    expect(report.validations[0].validation.valid).toBe(true);
  });

  it('returns invalid for invalid override', () => {
    const override = createValidOverride({
      justification: {
        reason: '',
        impact_assessment: 'test',
        alternatives_considered: [],
        why_alternatives_rejected: 'test'
      }
    });
    // Recompute hash
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const report = validateSingleOverride(withHash);

    expect(report.validations[0].validation.valid).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// ESCALATION
// ─────────────────────────────────────────────────────────────

describe('pipeline/escalation', () => {
  it('requires escalation for invalid override', () => {
    const override = createValidOverride({
      justification: {
        reason: '',
        impact_assessment: 'test',
        alternatives_considered: [],
        why_alternatives_rejected: 'test'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const args: OverridePipelineArgs = {
      overrides: [withHash],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
  });

  it('requires escalation for rule violation', () => {
    const cascadeOverride = createValidOverride({
      scope: {
        target_rule: 'OVR-001',
        target_component: 'test',
        target_verdict: 'FAIL'
      }
    });

    const args: OverridePipelineArgs = {
      overrides: [cascadeOverride],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.escalation_required).toBe(true);
  });

  it('no escalation for all valid overrides', () => {
    const override = createValidOverride();

    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.escalation_required).toBe(false);
    expect(report.escalation_target).toBe('NONE');
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────

describe('pipeline/determinism', () => {
  it('same inputs produce same output', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report1 = runOverridePipeline(args);
    const report2 = runOverridePipeline(args);

    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });

  it('10 consecutive runs identical', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const firstJson = JSON.stringify(runOverridePipeline(args));

    for (let i = 0; i < 10; i++) {
      expect(JSON.stringify(runOverridePipeline(args))).toBe(firstJson);
    }
  });
});
