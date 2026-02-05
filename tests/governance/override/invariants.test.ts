/**
 * PHASE H — INVARIANTS TEST SUITE
 * Tests for all 6 invariants (INV-H-01 to INV-H-06).
 *
 * INV-H-01: 5 mandatory conditions (ALL required)
 * INV-H-02: Expiration enforced (max 90 days)
 * INV-H-03: Single approver required
 * INV-H-04: Hash chain maintained
 * INV-H-05: No cascade
 * INV-H-06: NON-ACTUATING (report only)
 */

import { describe, it, expect } from 'vitest';
import {
  validateOverrideConditions,
  computeOverrideHash,
  verifyOverrideHash,
  runOverridePipeline,
  OVERRIDE_MAX_DAYS,
  CONDITION_NAMES,
  type OverrideEvent,
  type OverridePipelineArgs
} from '../../../GOVERNANCE/override/index.js';
import { validateOVR001, validateOVR002, validateOVR005 } from '../../../GOVERNANCE/override/validators/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createValidOverride(overrides?: Partial<OverrideEvent>): OverrideEvent {
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
      alternatives_considered: ['Wait for next release', 'Partial fix'],
      why_alternatives_rejected: 'Production impact too high to wait'
    },
    approval: {
      approver: 'Francky',
      approver_role: 'Architect',
      approved_at: '2026-02-04T09:00:00.000Z',
      approval_method: 'signature'
    },
    validity: {
      effective_from: '2026-02-04T10:00:00.000Z',
      expires_at: '2026-02-11T10:00:00.000Z', // 7 days
      renewable: false,
      max_renewals: 0
    },
    manifest_ref: {
      tag: 'v1.0.0',
      manifest_sha256: 'a'.repeat(64)
    },
    log_chain_prev_hash: null
  };

  const withoutHash = { ...base, ...overrides };
  const hash = computeOverrideHash(withoutHash as Omit<OverrideEvent, 'override_hash'>);

  return {
    ...withoutHash,
    override_hash: hash
  } as OverrideEvent;
}

// ─────────────────────────────────────────────────────────────
// INV-H-01: 5 MANDATORY CONDITIONS
// ─────────────────────────────────────────────────────────────

describe('INV-H-01: 5 mandatory conditions (ALL required)', () => {
  it('validates all 5 conditions for valid override', () => {
    const override = createValidOverride();
    const result = validateOverrideConditions(override);

    expect(result.valid).toBe(true);
    expect(result.conditions).toHaveLength(5);
    expect(result.conditions.every(c => c.valid)).toBe(true);
  });

  it('condition 1: justification must have non-empty reason', () => {
    const override = createValidOverride({
      justification: {
        reason: '',
        impact_assessment: 'test',
        alternatives_considered: [],
        why_alternatives_rejected: 'test'
      }
    });
    // Recompute hash for modified content
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond1 = result.conditions.find(c => c.condition === 1);

    expect(cond1?.valid).toBe(false);
    expect(cond1?.error).toContain('empty');
  });

  it('condition 2: approval must have approver identity', () => {
    const override = createValidOverride({
      approval: {
        approver: '',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond2 = result.conditions.find(c => c.condition === 2);

    expect(cond2?.valid).toBe(false);
    expect(cond2?.error).toContain('missing');
  });

  it('condition 3: validity must have expiration date', () => {
    const override = createValidOverride({
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '',
        renewable: false,
        max_renewals: 0
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond3 = result.conditions.find(c => c.condition === 3);

    expect(cond3?.valid).toBe(false);
    expect(cond3?.error).toContain('missing');
  });

  it('condition 4: override_hash must be valid SHA256', () => {
    const override = createValidOverride();
    const withBadHash = { ...override, override_hash: 'invalid' };

    const result = validateOverrideConditions(withBadHash);
    const cond4 = result.conditions.find(c => c.condition === 4);

    expect(cond4?.valid).toBe(false);
    expect(cond4?.error).toContain('SHA256');
  });

  it('condition 5: manifest_ref must have tag and hash', () => {
    const override = createValidOverride({
      manifest_ref: {
        tag: '',
        manifest_sha256: 'a'.repeat(64)
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond5 = result.conditions.find(c => c.condition === 5);

    expect(cond5?.valid).toBe(false);
    expect(cond5?.error).toContain('tag');
  });

  it('all 5 condition names are defined', () => {
    expect(CONDITION_NAMES[1]).toBe('Justification written');
    expect(CONDITION_NAMES[2]).toBe('Human signature');
    expect(CONDITION_NAMES[3]).toBe('Expiration defined');
    expect(CONDITION_NAMES[4]).toBe('Hash calculated');
    expect(CONDITION_NAMES[5]).toBe('Manifest reference');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-H-02: EXPIRATION ENFORCED
// ─────────────────────────────────────────────────────────────

describe('INV-H-02: Expiration enforced (max 90 days)', () => {
  it('hotfix max 7 days', () => {
    expect(OVERRIDE_MAX_DAYS['hotfix']).toBe(7);
  });

  it('exception max 30 days', () => {
    expect(OVERRIDE_MAX_DAYS['exception']).toBe(30);
  });

  it('derogation max 90 days', () => {
    expect(OVERRIDE_MAX_DAYS['derogation']).toBe(90);
  });

  it('rejects hotfix longer than 7 days', () => {
    const override = createValidOverride({
      type: 'hotfix',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-02-15T10:00:00.000Z', // 11 days
        renewable: false,
        max_renewals: 0
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond3 = result.conditions.find(c => c.condition === 3);

    expect(cond3?.valid).toBe(false);
    expect(cond3?.error).toContain('exceeds maximum');
  });

  it('rejects exception longer than 30 days', () => {
    const override = createValidOverride({
      type: 'exception',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-04-04T10:00:00.000Z', // ~60 days
        renewable: false,
        max_renewals: 0
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const result = validateOverrideConditions(withHash);
    const cond3 = result.conditions.find(c => c.condition === 3);

    expect(cond3?.valid).toBe(false);
  });

  it('OVR-001 validates no perpetual override', () => {
    const override = createValidOverride();
    const violation = validateOVR001(override);

    expect(violation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INV-H-03: SINGLE APPROVER REQUIRED
// ─────────────────────────────────────────────────────────────

describe('INV-H-03: Single approver required', () => {
  it('accepts single approver', () => {
    const override = createValidOverride();
    const violation = validateOVR002(override);

    expect(violation).toBeNull();
  });

  it('rejects multiple approvers (comma-separated)', () => {
    const override = createValidOverride({
      approval: {
        approver: 'Francky, John',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const violation = validateOVR002(withHash);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('Multiple approvers');
  });

  it('rejects empty approver', () => {
    const override = createValidOverride({
      approval: {
        approver: '',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const violation = validateOVR002(withHash);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('No approver');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-H-04: HASH CHAIN MAINTAINED
// ─────────────────────────────────────────────────────────────

describe('INV-H-04: Hash chain maintained', () => {
  it('verifies valid override hash', () => {
    const override = createValidOverride();

    expect(verifyOverrideHash(override)).toBe(true);
  });

  it('detects tampered content (hash mismatch)', () => {
    const override = createValidOverride();
    // Tamper with content without updating hash
    const tampered = {
      ...override,
      justification: {
        ...override.justification,
        reason: 'Tampered reason'
      }
    };

    expect(verifyOverrideHash(tampered)).toBe(false);
  });

  it('report includes log_chain_prev_hash', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z',
      prevEventHash: 'prev_hash_abc123'
    };

    const report = runOverridePipeline(args);

    expect(report.log_chain_prev_hash).toBe('prev_hash_abc123');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-H-05: NO CASCADE
// ─────────────────────────────────────────────────────────────

describe('INV-H-05: No cascade (override cannot authorize override)', () => {
  it('accepts override targeting normal rule', () => {
    const override = createValidOverride();
    const violation = validateOVR005(override);

    expect(violation).toBeNull();
  });

  it('rejects override targeting another override', () => {
    const override = createValidOverride({
      scope: {
        target_rule: 'OVR-001',
        target_component: 'GOVERNANCE/override',
        target_verdict: 'INVALID'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const violation = validateOVR005(withHash);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('cascade');
  });

  it('rejects override targeting override component path', () => {
    const override = createValidOverride({
      scope: {
        target_rule: 'INV-TEST-001',
        target_component: 'governance/override/validators/cascade.ts',
        target_verdict: 'FAIL'
      }
    });
    const hash = computeOverrideHash(override);
    const withHash = { ...override, override_hash: hash };

    const violation = validateOVR005(withHash);

    expect(violation).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INV-H-06: NON-ACTUATING
// ─────────────────────────────────────────────────────────────

describe('INV-H-06: NON-ACTUATING (report only, no enforcement)', () => {
  it('report notes contain non-enforcement statement', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.notes).toContain('No automatic enforcement');
    expect(report.notes).toContain('human review');
  });

  it('report_type is override_report (not override_action)', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const report = runOverridePipeline(args);

    expect(report.report_type).toBe('override_report');
  });

  it('pipeline is pure function (no side effects)', () => {
    const override = createValidOverride();
    const args: OverridePipelineArgs = {
      overrides: [override],
      generatedAt: '2026-02-04T12:00:00.000Z'
    };

    const overridesCopy = JSON.stringify(args.overrides);

    runOverridePipeline(args);

    expect(JSON.stringify(args.overrides)).toBe(overridesCopy);
  });

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
});
