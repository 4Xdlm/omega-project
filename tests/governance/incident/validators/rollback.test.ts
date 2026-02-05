/**
 * PHASE J — ROLLBACK VALIDATOR TESTS
 * Tests INV-J-06 (human decision) and INV-J-07 (target stability).
 */

import { describe, it, expect } from 'vitest';
import type { RollbackPlan } from '../../../../GOVERNANCE/incident/types.js';
import {
  validateRollback,
  isRollbackSafe,
  validateRollbackPostExecution
} from '../../../../GOVERNANCE/incident/validators/rollback.js';

// ─────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────

function createRollback(overrides: Partial<RollbackPlan> = {}): RollbackPlan {
  return {
    event_type: 'rollback_event',
    schema_version: '1.0.0',
    event_id: 'RB_EVT_001',
    timestamp: '2026-02-05T10:30:00.000Z',
    rollback_id: 'RB_INC_001_001',
    trigger: {
      incident_id: 'INC_001',
      incident_severity: 'HIGH',
      trigger_reason: 'Service degradation detected'
    },
    current_state: {
      version: '1.2.0',
      commit: 'abc123',
      manifest_sha256: 'hash_current'
    },
    target_state: {
      tag: 'SEALED_v1.1.0',
      version: '1.1.0',
      commit: 'def456',
      manifest_sha256: 'hash_target',
      last_known_good: '2026-02-01T00:00:00.000Z'
    },
    verification: {
      target_was_stable: true,
      stability_evidence_ref: 'evidence/stability.json',
      tests_to_run_post_rollback: ['test:integration', 'test:smoke']
    },
    human_decision: {
      approver: 'Francky',
      approver_role: 'ARCHITECTE',
      approved_at: '2026-02-05T10:25:00.000Z',
      rationale: 'Rollback approved to restore service stability and prevent user impact.'
    },
    execution: {
      planned_at: '2026-02-05T10:35:00.000Z',
      executed_at: '2026-02-05T10:40:00.000Z',
      status: 'completed',
      execution_log_ref: 'evidence/rollback_exec.log'
    },
    post_rollback: {
      verification_status: 'passed',
      verification_ref: 'evidence/verification.json',
      services_restored: ['service-a', 'service-b']
    },
    evidence_refs: ['evidence/rollback.json'],
    log_chain_prev_hash: null,
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// INV-J-06: HUMAN DECISION VALIDATION
// ─────────────────────────────────────────────────────────────

describe('INV-J-06: Human decision required', () => {
  describe('approver identity', () => {
    it('fails without approver', () => {
      const rollback = createRollback({
        human_decision: {
          approver: '',
          approver_role: 'ARCHITECTE',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: 'Valid rationale for rollback decision.'
        }
      });
      const result = validateRollback(rollback);
      expect(result.human_decision_valid).toBe(false);
      expect(result.errors.some(e => e.includes('INV-J-06'))).toBe(true);
    });

    it('fails with whitespace-only approver', () => {
      const rollback = createRollback({
        human_decision: {
          approver: '   ',
          approver_role: 'ARCHITECTE',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: 'Valid rationale for rollback decision.'
        }
      });
      expect(validateRollback(rollback).human_decision_valid).toBe(false);
    });
  });

  describe('approver role', () => {
    it('fails without approver role', () => {
      const rollback = createRollback({
        human_decision: {
          approver: 'Francky',
          approver_role: '',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: 'Valid rationale for rollback decision.'
        }
      });
      expect(validateRollback(rollback).human_decision_valid).toBe(false);
    });
  });

  describe('approval timestamp', () => {
    it('fails without approval timestamp', () => {
      const rollback = createRollback({
        human_decision: {
          approver: 'Francky',
          approver_role: 'ARCHITECTE',
          approved_at: '',
          rationale: 'Valid rationale for rollback decision.'
        }
      });
      expect(validateRollback(rollback).human_decision_valid).toBe(false);
    });
  });

  describe('rationale', () => {
    it('fails without rationale', () => {
      const rollback = createRollback({
        human_decision: {
          approver: 'Francky',
          approver_role: 'ARCHITECTE',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: ''
        }
      });
      expect(validateRollback(rollback).human_decision_valid).toBe(false);
    });

    it('fails with short rationale (< 20 chars)', () => {
      const rollback = createRollback({
        human_decision: {
          approver: 'Francky',
          approver_role: 'ARCHITECTE',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: 'Too short'
        }
      });
      const result = validateRollback(rollback);
      expect(result.human_decision_valid).toBe(false);
      expect(result.errors.some(e => e.includes('too short'))).toBe(true);
    });

    it('passes with exactly 20 char rationale', () => {
      const rollback = createRollback({
        human_decision: {
          approver: 'Francky',
          approver_role: 'ARCHITECTE',
          approved_at: '2026-02-05T10:25:00.000Z',
          rationale: '12345678901234567890' // 20 chars
        }
      });
      expect(validateRollback(rollback).human_decision_valid).toBe(true);
    });
  });

  it('passes with complete human decision', () => {
    const rollback = createRollback();
    const result = validateRollback(rollback);
    expect(result.human_decision_valid).toBe(true);
    expect(result.errors.filter(e => e.includes('INV-J-06'))).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-07: TARGET STABILITY VALIDATION
// ─────────────────────────────────────────────────────────────

describe('INV-J-07: Target must be verified stable', () => {
  describe('target_was_stable flag', () => {
    it('fails when target_was_stable is false', () => {
      const rollback = createRollback({
        verification: {
          target_was_stable: false,
          stability_evidence_ref: 'evidence/stability.json',
          tests_to_run_post_rollback: ['test:smoke']
        }
      });
      const result = validateRollback(rollback);
      expect(result.target_stable_valid).toBe(false);
      expect(result.errors.some(e => e.includes('INV-J-07'))).toBe(true);
    });
  });

  describe('stability evidence', () => {
    it('fails without stability evidence reference', () => {
      const rollback = createRollback({
        verification: {
          target_was_stable: true,
          stability_evidence_ref: '',
          tests_to_run_post_rollback: ['test:smoke']
        }
      });
      expect(validateRollback(rollback).target_stable_valid).toBe(false);
    });

    it('fails with whitespace-only evidence ref', () => {
      const rollback = createRollback({
        verification: {
          target_was_stable: true,
          stability_evidence_ref: '   ',
          tests_to_run_post_rollback: ['test:smoke']
        }
      });
      expect(validateRollback(rollback).target_stable_valid).toBe(false);
    });
  });

  describe('target state tag', () => {
    it('fails without target state tag', () => {
      const rollback = createRollback({
        target_state: {
          tag: '',
          version: '1.1.0',
          commit: 'def456',
          manifest_sha256: 'hash',
          last_known_good: '2026-02-01T00:00:00.000Z'
        }
      });
      expect(validateRollback(rollback).target_stable_valid).toBe(false);
    });
  });

  describe('last_known_good timestamp', () => {
    it('fails without last_known_good', () => {
      const rollback = createRollback({
        target_state: {
          tag: 'SEALED_v1.1.0',
          version: '1.1.0',
          commit: 'def456',
          manifest_sha256: 'hash',
          last_known_good: ''
        }
      });
      expect(validateRollback(rollback).target_stable_valid).toBe(false);
    });
  });

  describe('post-rollback tests', () => {
    it('fails without post-rollback tests', () => {
      const rollback = createRollback({
        verification: {
          target_was_stable: true,
          stability_evidence_ref: 'evidence/stability.json',
          tests_to_run_post_rollback: []
        }
      });
      const result = validateRollback(rollback);
      expect(result.target_stable_valid).toBe(false);
      expect(result.errors.some(e => e.includes('tests must be defined'))).toBe(true);
    });

    it('passes with at least one test', () => {
      const rollback = createRollback({
        verification: {
          target_was_stable: true,
          stability_evidence_ref: 'evidence/stability.json',
          tests_to_run_post_rollback: ['test:smoke']
        }
      });
      expect(validateRollback(rollback).target_stable_valid).toBe(true);
    });
  });

  it('passes with complete target stability', () => {
    const rollback = createRollback();
    expect(validateRollback(rollback).target_stable_valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// EXECUTION VALIDATION
// ─────────────────────────────────────────────────────────────

describe('Execution validation', () => {
  it('fails with invalid status', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: null,
        status: 'invalid' as any,
        execution_log_ref: null
      }
    });
    const result = validateRollback(rollback);
    expect(result.execution_valid).toBe(false);
  });

  it('fails without planned_at', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '',
        executed_at: null,
        status: 'planned',
        execution_log_ref: null
      }
    });
    expect(validateRollback(rollback).execution_valid).toBe(false);
  });

  it('fails when completed without executed_at', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: null,
        status: 'completed',
        execution_log_ref: 'log.txt'
      }
    });
    expect(validateRollback(rollback).execution_valid).toBe(false);
  });

  it('fails when failed without executed_at', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: null,
        status: 'failed',
        execution_log_ref: 'log.txt'
      }
    });
    expect(validateRollback(rollback).execution_valid).toBe(false);
  });

  it('fails when completed with pending verification', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: '2026-02-05T10:40:00.000Z',
        status: 'completed',
        execution_log_ref: 'log.txt'
      },
      post_rollback: {
        verification_status: 'pending',
        verification_ref: null,
        services_restored: []
      }
    });
    expect(validateRollback(rollback).execution_valid).toBe(false);
  });

  it('passes with valid planned status', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: null,
        status: 'planned',
        execution_log_ref: null
      },
      post_rollback: {
        verification_status: 'pending',
        verification_ref: null,
        services_restored: []
      }
    });
    expect(validateRollback(rollback).execution_valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// isRollbackSafe
// ─────────────────────────────────────────────────────────────

describe('isRollbackSafe', () => {
  it('returns safe for valid rollback', () => {
    const rollback = createRollback();
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it('unsafe without human approval', () => {
    const rollback = createRollback({
      human_decision: {
        approver: '',
        approver_role: '',
        approved_at: '',
        rationale: ''
      }
    });
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('No human approval');
  });

  it('unsafe when target not verified stable', () => {
    const rollback = createRollback({
      verification: {
        target_was_stable: false,
        stability_evidence_ref: 'evidence/stability.json',
        tests_to_run_post_rollback: ['test:smoke']
      }
    });
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Target not verified as stable');
  });

  it('unsafe without post-rollback tests', () => {
    const rollback = createRollback({
      verification: {
        target_was_stable: true,
        stability_evidence_ref: 'evidence/stability.json',
        tests_to_run_post_rollback: []
      }
    });
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('No post-rollback tests defined');
  });

  it('unsafe without triggering incident', () => {
    const rollback = createRollback({
      trigger: {
        incident_id: '',
        incident_severity: 'HIGH',
        trigger_reason: 'reason'
      }
    });
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('No triggering incident');
  });

  it('unsafe when versions are identical', () => {
    const rollback = createRollback({
      current_state: { version: '1.1.0', commit: 'abc', manifest_sha256: 'hash' },
      target_state: {
        tag: 'SEALED',
        version: '1.1.0',
        commit: 'def',
        manifest_sha256: 'hash2',
        last_known_good: '2026-02-01T00:00:00.000Z'
      }
    });
    const result = isRollbackSafe(rollback);
    expect(result.safe).toBe(false);
    expect(result.reasons).toContain('Current and target versions are identical');
  });
});

// ─────────────────────────────────────────────────────────────
// validateRollbackPostExecution
// ─────────────────────────────────────────────────────────────

describe('validateRollbackPostExecution', () => {
  it('fails when not completed', () => {
    const rollback = createRollback({
      execution: {
        planned_at: '2026-02-05T10:35:00.000Z',
        executed_at: null,
        status: 'in_progress',
        execution_log_ref: null
      }
    });
    const result = validateRollbackPostExecution(rollback);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Rollback is not completed');
  });

  it('fails when verification did not pass', () => {
    const rollback = createRollback({
      post_rollback: {
        verification_status: 'failed',
        verification_ref: 'evidence/verification.json',
        services_restored: ['service-a']
      }
    });
    const result = validateRollbackPostExecution(rollback);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('failed'))).toBe(true);
  });

  it('fails without verification reference', () => {
    const rollback = createRollback({
      post_rollback: {
        verification_status: 'passed',
        verification_ref: null,
        services_restored: ['service-a']
      }
    });
    const result = validateRollbackPostExecution(rollback);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('verification reference'))).toBe(true);
  });

  it('fails without services restored', () => {
    const rollback = createRollback({
      post_rollback: {
        verification_status: 'passed',
        verification_ref: 'evidence/verification.json',
        services_restored: []
      }
    });
    const result = validateRollbackPostExecution(rollback);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('No services marked'))).toBe(true);
  });

  it('passes for successful rollback', () => {
    const rollback = createRollback();
    const result = validateRollbackPostExecution(rollback);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
