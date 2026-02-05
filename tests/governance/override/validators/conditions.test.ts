/**
 * PHASE H — CONDITIONS VALIDATOR TESTS
 * Tests for all 5 condition validators.
 */

import { describe, it, expect } from 'vitest';
import {
  validateCondition1,
  validateCondition2,
  validateCondition3,
  validateCondition4,
  validateCondition5,
  computeOverrideHash,
  type OverrideEvent
} from '../../../../GOVERNANCE/override/index.js';

// ─────────────────────────────────────────────────────────────
// TEST HELPERS
// ─────────────────────────────────────────────────────────────

function createBaseOverride(): Omit<OverrideEvent, 'override_hash'> {
  return {
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
      reason: 'Critical production issue requires immediate hotfix',
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
    log_chain_prev_hash: null
  };
}

function createOverrideWithHash(base: Omit<OverrideEvent, 'override_hash'>): OverrideEvent {
  const hash = computeOverrideHash(base);
  return { ...base, override_hash: hash };
}

// ─────────────────────────────────────────────────────────────
// CONDITION 1: JUSTIFICATION WRITTEN
// ─────────────────────────────────────────────────────────────

describe('Condition 1: Justification written', () => {
  it('validates non-empty reason', () => {
    const base = createBaseOverride();
    const override = createOverrideWithHash(base);

    const result = validateCondition1(override);

    expect(result.valid).toBe(true);
    expect(result.condition).toBe(1);
    expect(result.name).toBe('Justification written');
  });

  it('rejects empty reason', () => {
    const base = createBaseOverride();
    base.justification = { ...base.justification, reason: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition1(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects whitespace-only reason', () => {
    const base = createBaseOverride();
    base.justification = { ...base.justification, reason: '   ' };
    const override = createOverrideWithHash(base);

    const result = validateCondition1(override);

    expect(result.valid).toBe(false);
  });

  it('rejects reason shorter than 10 characters', () => {
    const base = createBaseOverride();
    base.justification = { ...base.justification, reason: 'Short' };
    const override = createOverrideWithHash(base);

    const result = validateCondition1(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('too short');
  });

  it('accepts reason with exactly 10 characters', () => {
    const base = createBaseOverride();
    base.justification = { ...base.justification, reason: '0123456789' };
    const override = createOverrideWithHash(base);

    const result = validateCondition1(override);

    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// CONDITION 2: HUMAN SIGNATURE
// ─────────────────────────────────────────────────────────────

describe('Condition 2: Human signature', () => {
  it('validates complete approval', () => {
    const base = createBaseOverride();
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(true);
    expect(result.condition).toBe(2);
    expect(result.name).toBe('Human signature');
  });

  it('rejects empty approver', () => {
    const base = createBaseOverride();
    base.approval = { ...base.approval, approver: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing');
  });

  it('rejects empty approver_role', () => {
    const base = createBaseOverride();
    base.approval = { ...base.approval, approver_role: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('role');
  });

  it('rejects empty approved_at', () => {
    const base = createBaseOverride();
    base.approval = { ...base.approval, approved_at: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('timestamp');
  });

  it('validates email approval method', () => {
    const base = createBaseOverride();
    base.approval = { ...base.approval, approval_method: 'email' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(true);
  });

  it('validates meeting approval method', () => {
    const base = createBaseOverride();
    base.approval = { ...base.approval, approval_method: 'meeting' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(true);
  });

  it('rejects invalid approval method', () => {
    const base = createBaseOverride();
    // @ts-expect-error Testing invalid value
    base.approval = { ...base.approval, approval_method: 'phone' };
    const override = createOverrideWithHash(base);

    const result = validateCondition2(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid approval method');
  });
});

// ─────────────────────────────────────────────────────────────
// CONDITION 3: EXPIRATION DEFINED
// ─────────────────────────────────────────────────────────────

describe('Condition 3: Expiration defined', () => {
  it('validates valid expiration for hotfix (7 days)', () => {
    const base = createBaseOverride();
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(true);
    expect(result.condition).toBe(3);
  });

  it('validates valid expiration for exception (30 days)', () => {
    const base = createBaseOverride();
    base.type = 'exception';
    base.validity = {
      effective_from: '2026-02-04T10:00:00.000Z',
      expires_at: '2026-03-04T10:00:00.000Z',
      renewable: false,
      max_renewals: 0
    };
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(true);
  });

  it('validates valid expiration for derogation (90 days)', () => {
    const base = createBaseOverride();
    base.type = 'derogation';
    base.validity = {
      effective_from: '2026-02-04T10:00:00.000Z',
      expires_at: '2026-05-04T10:00:00.000Z',
      renewable: false,
      max_renewals: 0
    };
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(true);
  });

  it('rejects empty effective_from', () => {
    const base = createBaseOverride();
    base.validity = { ...base.validity, effective_from: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Effective from');
  });

  it('rejects empty expires_at', () => {
    const base = createBaseOverride();
    base.validity = { ...base.validity, expires_at: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Expiration');
  });

  it('rejects expiration before effective date', () => {
    const base = createBaseOverride();
    base.validity = {
      effective_from: '2026-02-11T10:00:00.000Z',
      expires_at: '2026-02-04T10:00:00.000Z',
      renewable: false,
      max_renewals: 0
    };
    const override = createOverrideWithHash(base);

    const result = validateCondition3(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('after effective');
  });
});

// ─────────────────────────────────────────────────────────────
// CONDITION 4: HASH CALCULATED
// ─────────────────────────────────────────────────────────────

describe('Condition 4: Hash calculated', () => {
  it('validates correct hash', () => {
    const base = createBaseOverride();
    const override = createOverrideWithHash(base);

    const result = validateCondition4(override);

    expect(result.valid).toBe(true);
    expect(result.condition).toBe(4);
  });

  it('rejects empty hash', () => {
    const base = createBaseOverride();
    const override = { ...base, override_hash: '' } as OverrideEvent;

    const result = validateCondition4(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('missing');
  });

  it('rejects invalid hash format (not 64 hex chars)', () => {
    const base = createBaseOverride();
    const override = { ...base, override_hash: 'invalid123' } as OverrideEvent;

    const result = validateCondition4(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('SHA256');
  });

  it('rejects hash that does not match content', () => {
    const base = createBaseOverride();
    const override = { ...base, override_hash: 'a'.repeat(64) } as OverrideEvent;

    const result = validateCondition4(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('does not match');
  });
});

// ─────────────────────────────────────────────────────────────
// CONDITION 5: MANIFEST REFERENCE
// ─────────────────────────────────────────────────────────────

describe('Condition 5: Manifest reference', () => {
  it('validates complete manifest_ref', () => {
    const base = createBaseOverride();
    const override = createOverrideWithHash(base);

    const result = validateCondition5(override);

    expect(result.valid).toBe(true);
    expect(result.condition).toBe(5);
  });

  it('rejects empty tag', () => {
    const base = createBaseOverride();
    base.manifest_ref = { tag: '', manifest_sha256: 'a'.repeat(64) };
    const override = createOverrideWithHash(base);

    const result = validateCondition5(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('tag');
  });

  it('rejects empty manifest_sha256', () => {
    const base = createBaseOverride();
    base.manifest_ref = { tag: 'v1.0.0', manifest_sha256: '' };
    const override = createOverrideWithHash(base);

    const result = validateCondition5(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('SHA256');
  });

  it('rejects invalid manifest_sha256 format', () => {
    const base = createBaseOverride();
    base.manifest_ref = { tag: 'v1.0.0', manifest_sha256: 'invalid' };
    const override = createOverrideWithHash(base);

    const result = validateCondition5(override);

    expect(result.valid).toBe(false);
    expect(result.error).toContain('not valid format');
  });

  it('accepts uppercase SHA256', () => {
    const base = createBaseOverride();
    base.manifest_ref = { tag: 'v1.0.0', manifest_sha256: 'A'.repeat(64) };
    const override = createOverrideWithHash(base);

    const result = validateCondition5(override);

    expect(result.valid).toBe(true);
  });
});
