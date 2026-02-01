/**
 * OVERRIDE VALIDATION TESTS
 * ROADMAP B - Plan H
 *
 * Tests override event validation (5 mandatory conditions)
 */

import { describe, it, expect } from 'vitest';

interface OverrideEvent {
  override_id: string;
  justification?: string;
  approval?: {
    approver?: string;
    approved_at?: string;
  };
  validity?: {
    expires_at?: string;
  };
  override_hash?: string;
  manifest_ref?: {
    tag?: string;
    manifest_sha256?: string;
  };
}

// Validate the 5 mandatory conditions for an override
function validateOverride(override: OverrideEvent): { valid: boolean; violations: string[] } {
  const violations: string[] = [];

  // Condition 1: Justification écrite
  if (!override.justification || override.justification.trim() === '') {
    violations.push('Missing justification');
  }

  // Condition 2: Signature humaine (approver)
  if (!override.approval?.approver) {
    violations.push('Missing approver signature');
  }

  // Condition 3: Expiration définie
  if (!override.validity?.expires_at) {
    violations.push('Missing expiration date');
  }

  // Condition 4: Hash calculé
  if (!override.override_hash || !/^[A-Fa-f0-9]{64}$/.test(override.override_hash)) {
    violations.push('Missing or invalid override hash');
  }

  // Condition 5: Manifest reference
  if (!override.manifest_ref?.tag || !override.manifest_ref?.manifest_sha256) {
    violations.push('Missing manifest reference');
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

describe('Override Validation', () => {
  describe('5 mandatory conditions', () => {
    it('validates complete override', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Emergency hotfix for critical bug',
        approval: {
          approver: 'Francky (Architect)',
          approved_at: '2026-02-01T12:00:00Z'
        },
        validity: {
          expires_at: '2026-02-08T12:00:00Z'
        },
        override_hash: 'A'.repeat(64),
        manifest_ref: {
          tag: 'phase-c-sealed',
          manifest_sha256: 'B'.repeat(64)
        }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('rejects override without justification', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        approval: { approver: 'Test' },
        validity: { expires_at: '2026-02-08T12:00:00Z' },
        override_hash: 'A'.repeat(64),
        manifest_ref: { tag: 'test', manifest_sha256: 'B'.repeat(64) }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing justification');
    });

    it('rejects override without approver', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Test justification',
        validity: { expires_at: '2026-02-08T12:00:00Z' },
        override_hash: 'A'.repeat(64),
        manifest_ref: { tag: 'test', manifest_sha256: 'B'.repeat(64) }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing approver signature');
    });

    it('rejects override without expiration', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Test justification',
        approval: { approver: 'Test' },
        override_hash: 'A'.repeat(64),
        manifest_ref: { tag: 'test', manifest_sha256: 'B'.repeat(64) }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing expiration date');
    });

    it('rejects override without hash', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Test justification',
        approval: { approver: 'Test' },
        validity: { expires_at: '2026-02-08T12:00:00Z' },
        manifest_ref: { tag: 'test', manifest_sha256: 'B'.repeat(64) }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing or invalid override hash');
    });

    it('rejects override without manifest ref', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Test justification',
        approval: { approver: 'Test' },
        validity: { expires_at: '2026-02-08T12:00:00Z' },
        override_hash: 'A'.repeat(64)
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing manifest reference');
    });

    it('rejects override with invalid hash format', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001',
        justification: 'Test justification',
        approval: { approver: 'Test' },
        validity: { expires_at: '2026-02-08T12:00:00Z' },
        override_hash: 'not-a-valid-hash',
        manifest_ref: { tag: 'test', manifest_sha256: 'B'.repeat(64) }
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations).toContain('Missing or invalid override hash');
    });

    it('reports all violations at once', () => {
      const override: OverrideEvent = {
        override_id: 'ovr-001'
      };

      const result = validateOverride(override);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBe(5);
    });
  });
});
