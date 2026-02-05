/**
 * PHASE H — RULES VALIDATOR TESTS
 * Tests for all 5 OVR rules (OVR-001 to OVR-005).
 */

import { describe, it, expect } from 'vitest';
import {
  validateOVR001,
  validateOVR002,
  validateOVR003,
  validateOVR004,
  validateOVR005,
  validateAllRules
} from '../../../../GOVERNANCE/override/validators/index.js';
import {
  computeOverrideHash,
  type OverrideEvent
} from '../../../../GOVERNANCE/override/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createBaseOverride(overrides?: Partial<Omit<OverrideEvent, 'override_hash'>>): OverrideEvent {
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
// OVR-001: NO PERPETUAL OVERRIDE
// ─────────────────────────────────────────────────────────────

describe('OVR-001: No perpetual override', () => {
  it('accepts hotfix within 7 days', () => {
    const override = createBaseOverride();
    const violation = validateOVR001(override);

    expect(violation).toBeNull();
  });

  it('accepts exception within 30 days', () => {
    const override = createBaseOverride({
      type: 'exception',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-03-04T10:00:00.000Z',
        renewable: false,
        max_renewals: 0
      }
    });

    const violation = validateOVR001(override);

    expect(violation).toBeNull();
  });

  it('accepts derogation within 90 days', () => {
    const override = createBaseOverride({
      type: 'derogation',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-05-04T10:00:00.000Z',
        renewable: false,
        max_renewals: 0
      }
    });

    const violation = validateOVR001(override);

    expect(violation).toBeNull();
  });

  it('rejects hotfix exceeding 7 days', () => {
    const override = createBaseOverride({
      type: 'hotfix',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2026-02-15T10:00:00.000Z',
        renewable: false,
        max_renewals: 0
      }
    });

    const violation = validateOVR001(override);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('OVR-001');
    expect(violation?.description).toContain('exceeds maximum');
  });

  it('rejects any override exceeding 90 days', () => {
    const override = createBaseOverride({
      type: 'derogation',
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '2027-02-04T10:00:00.000Z', // 1 year
        renewable: false,
        max_renewals: 0
      }
    });

    const violation = validateOVR001(override);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('90 days');
  });

  it('rejects missing expiration date', () => {
    const override = createBaseOverride({
      validity: {
        effective_from: '2026-02-04T10:00:00.000Z',
        expires_at: '',
        renewable: false,
        max_renewals: 0
      }
    });

    const violation = validateOVR001(override);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('perpetual');
  });
});

// ─────────────────────────────────────────────────────────────
// OVR-002: SINGLE APPROVER
// ─────────────────────────────────────────────────────────────

describe('OVR-002: Single approver', () => {
  it('accepts single approver', () => {
    const override = createBaseOverride();
    const violation = validateOVR002(override);

    expect(violation).toBeNull();
  });

  it('rejects comma-separated multiple approvers', () => {
    const override = createBaseOverride({
      approval: {
        approver: 'Francky, John',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });

    const violation = validateOVR002(override);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('OVR-002');
    expect(violation?.description).toContain('Multiple');
  });

  it('rejects semicolon-separated multiple approvers', () => {
    const override = createBaseOverride({
      approval: {
        approver: 'Francky; John',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });

    const violation = validateOVR002(override);

    expect(violation).not.toBeNull();
  });

  it('rejects empty approver', () => {
    const override = createBaseOverride({
      approval: {
        approver: '',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      }
    });

    const violation = validateOVR002(override);

    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('No approver');
  });
});

// ─────────────────────────────────────────────────────────────
// OVR-003: AUDIT TRAIL
// ─────────────────────────────────────────────────────────────

describe('OVR-003: Audit trail', () => {
  it('accepts override with hash', () => {
    const override = createBaseOverride();
    const violation = validateOVR003(override);

    expect(violation).toBeNull();
  });

  it('rejects override without hash', () => {
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
        reason: 'Critical production issue',
        impact_assessment: 'Low risk',
        alternatives_considered: [],
        why_alternatives_rejected: 'N/A'
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
      log_chain_prev_hash: null
    };

    const override = { ...base, override_hash: '' } as OverrideEvent;
    const violation = validateOVR003(override);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('OVR-003');
    expect(violation?.description).toContain('audit trail');
  });
});

// ─────────────────────────────────────────────────────────────
// OVR-004: REVIEW BEFORE RENEWAL
// ─────────────────────────────────────────────────────────────

describe('OVR-004: Review before renewal', () => {
  it('accepts first override (no existing)', () => {
    const override = createBaseOverride();
    const violation = validateOVR004(override, []);

    expect(violation).toBeNull();
  });

  it('accepts renewal with different justification', () => {
    const existing = createBaseOverride({
      override_id: 'OVERRIDE_1',
      justification: {
        reason: 'Original reason for override',
        impact_assessment: 'Low risk',
        alternatives_considered: [],
        why_alternatives_rejected: 'N/A'
      }
    });

    const renewal = createBaseOverride({
      override_id: 'OVERRIDE_2',
      justification: {
        reason: 'New reason for renewal with updated context',
        impact_assessment: 'Still low risk',
        alternatives_considered: ['Fixed issue'],
        why_alternatives_rejected: 'Fix not ready yet'
      }
    });

    const violation = validateOVR004(renewal, [existing]);

    expect(violation).toBeNull();
  });

  it('rejects renewal with same justification', () => {
    const existing = createBaseOverride({
      override_id: 'OVERRIDE_1',
      justification: {
        reason: 'Critical production issue requires immediate hotfix deployment',
        impact_assessment: 'Low risk',
        alternatives_considered: [],
        why_alternatives_rejected: 'N/A'
      }
    });

    const renewal = createBaseOverride({
      override_id: 'OVERRIDE_2',
      justification: {
        reason: 'Critical production issue requires immediate hotfix deployment',
        impact_assessment: 'Low risk',
        alternatives_considered: [],
        why_alternatives_rejected: 'N/A'
      }
    });

    const violation = validateOVR004(renewal, [existing]);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('OVR-004');
    expect(violation?.description).toContain('new justification');
  });

  it('ignores overrides for different scope', () => {
    const existing = createBaseOverride({
      override_id: 'OVERRIDE_1',
      scope: {
        target_rule: 'OTHER-RULE',
        target_component: 'other/component.ts',
        target_verdict: 'FAIL'
      }
    });

    const override = createBaseOverride({
      override_id: 'OVERRIDE_2'
    });

    const violation = validateOVR004(override, [existing]);

    expect(violation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// OVR-005: NO CASCADE
// ─────────────────────────────────────────────────────────────

describe('OVR-005: No cascade', () => {
  it('accepts override targeting normal rule', () => {
    const override = createBaseOverride();
    const violation = validateOVR005(override);

    expect(violation).toBeNull();
  });

  it('rejects override targeting OVR rule', () => {
    const override = createBaseOverride({
      scope: {
        target_rule: 'OVR-001',
        target_component: 'governance/override',
        target_verdict: 'INVALID'
      }
    });

    const violation = validateOVR005(override);

    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('OVR-005');
    expect(violation?.description).toContain('cascade');
  });

  it('rejects override targeting OVERRIDE component', () => {
    const override = createBaseOverride({
      scope: {
        target_rule: 'INV-TEST',
        target_component: 'GOVERNANCE/override/types.ts',
        target_verdict: 'FAIL'
      }
    });

    const violation = validateOVR005(override);

    expect(violation).not.toBeNull();
  });

  it('rejects override targeting override verdict', () => {
    const override = createBaseOverride({
      scope: {
        target_rule: 'INV-TEST',
        target_component: 'src/test.ts',
        target_verdict: 'OVR_INVALID'
      }
    });

    const violation = validateOVR005(override);

    expect(violation).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATE ALL RULES
// ─────────────────────────────────────────────────────────────

describe('validateAllRules', () => {
  it('returns empty array for valid override', () => {
    const override = createBaseOverride();
    const violations = validateAllRules(override);

    expect(violations).toHaveLength(0);
  });

  it('returns multiple violations for invalid override', () => {
    const override = createBaseOverride({
      approval: {
        approver: '',
        approver_role: 'Architect',
        approved_at: '2026-02-04T09:00:00.000Z',
        approval_method: 'signature'
      },
      scope: {
        target_rule: 'OVR-001',
        target_component: 'src/test.ts',
        target_verdict: 'FAIL'
      }
    });

    // Override hash intentionally empty for OVR-003 violation
    const noHash = { ...override, override_hash: '' } as OverrideEvent;
    const violations = validateAllRules(noHash);

    expect(violations.length).toBeGreaterThanOrEqual(2);
    expect(violations.some(v => v.rule === 'OVR-002')).toBe(true);
    expect(violations.some(v => v.rule === 'OVR-005')).toBe(true);
  });
});
