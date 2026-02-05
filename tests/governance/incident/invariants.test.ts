/**
 * PHASE J — INVARIANT TESTS
 * Tests all 10 invariants (INV-J-01 to INV-J-10)
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * FINAL PHASE — EXCELLENCE ABSOLUE REQUISE
 */

import { describe, it, expect } from 'vitest';
import type {
  IncidentEvent,
  PostMortem,
  RollbackPlan
} from '../../../GOVERNANCE/incident/types.js';
import {
  INCIDENT_SEVERITIES,
  INCIDENT_STATUSES,
  INCIDENT_SOURCES,
  ROOT_CAUSE_CATEGORIES,
  RESOLUTION_TYPES
} from '../../../GOVERNANCE/incident/types.js';
import {
  validateIncidentEvent,
  validatePostMortem,
  validateRollbackPlan,
  requiresPostMortem,
  checkImmediateLogging,
  computeSLADeadline
} from '../../../GOVERNANCE/incident/incident_utils.js';
import {
  validateINC001,
  validateINC002,
  validateINC003,
  validateINC004,
  validateINC005,
  validateAllRules
} from '../../../GOVERNANCE/incident/validators/rules.js';
import {
  validateRollback,
  isRollbackSafe
} from '../../../GOVERNANCE/incident/validators/rollback.js';
import {
  runIncidentPipeline,
  verifyPipelineDeterminism
} from '../../../GOVERNANCE/incident/incident_pipeline.js';
import { buildIncidentReport } from '../../../GOVERNANCE/incident/incident_report.js';

// ─────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────

function createValidIncident(overrides: Partial<IncidentEvent> = {}): IncidentEvent {
  const detected = '2026-02-05T10:00:00.000Z';
  const logged = '2026-02-05T10:05:00.000Z'; // Within 15 min
  return {
    event_type: 'incident_event',
    schema_version: '1.0.0',
    event_id: 'EVT_001',
    incident_id: 'INC_MED_20260205_001',
    timestamp: logged,
    detected_at: detected,
    source: 'monitoring',
    severity: 'MEDIUM',
    status: 'resolved',
    metadata: {
      title: 'Test Incident',
      description: 'Test incident description',
      affected_components: ['service-a']
    },
    timeline: [{
      timestamp: logged,
      action: 'Incident detected',
      actor: 'monitoring-system'
    }],
    evidence_refs: ['evidence/log_001.json'],
    sla: {
      response_deadline: computeSLADeadline(detected, 'MEDIUM'),
      sla_met: true
    },
    log_chain_prev_hash: null,
    ...overrides
  };
}

function createValidPostMortem(incidentId: string, overrides: Partial<PostMortem> = {}): PostMortem {
  return {
    postmortem_id: `PM_${incidentId}`,
    incident_id: incidentId,
    created_at: '2026-02-05T12:00:00.000Z',
    author: 'Test Author',
    summary: 'System experienced degradation due to configuration change.',
    timeline: [{
      timestamp: '2026-02-05T10:00:00.000Z',
      action: 'Detected',
      actor: 'monitoring'
    }],
    root_cause: {
      description: 'Configuration drift caused service degradation.',
      category: 'configuration_error',
      contributing_factors: ['Lack of automated config validation']
    },
    impact: {
      description: 'Service latency increased by 50%.',
      data_loss: false,
      service_downtime_minutes: 30
    },
    resolution: {
      description: 'Reverted configuration and added validation.',
      resolution_type: 'fix',
      resolved_at: '2026-02-05T11:00:00.000Z',
      resolved_by: 'ops-team'
    },
    actions: [{
      action_id: 'ACTION_001',
      description: 'Add automated config validation',
      owner: 'ops-team',
      due_date: '2026-03-01',
      priority: 'high',
      status: 'pending'
    }],
    evidence_refs: ['evidence/log_001.json'],
    blame_free_statement: 'This analysis focuses on systemic improvements.',
    lessons_learned: ['Need better config validation'],
    ...overrides
  };
}

function createValidRollback(incidentId: string, overrides: Partial<RollbackPlan> = {}): RollbackPlan {
  return {
    event_type: 'rollback_event',
    schema_version: '1.0.0',
    event_id: 'RB_EVT_001',
    timestamp: '2026-02-05T10:30:00.000Z',
    rollback_id: `RB_${incidentId}_001`,
    trigger: {
      incident_id: incidentId,
      incident_severity: 'MEDIUM',
      trigger_reason: 'Service degradation'
    },
    current_state: {
      version: '1.2.0',
      commit: 'abc123',
      manifest_sha256: 'hash123'
    },
    target_state: {
      tag: 'SEALED_v1.1.0',
      version: '1.1.0',
      commit: 'def456',
      manifest_sha256: 'hash456',
      last_known_good: '2026-02-01T00:00:00.000Z'
    },
    verification: {
      target_was_stable: true,
      stability_evidence_ref: 'evidence/stability_001.json',
      tests_to_run_post_rollback: ['test:integration', 'test:smoke']
    },
    human_decision: {
      approver: 'Francky',
      approver_role: 'ARCHITECTE',
      approved_at: '2026-02-05T10:25:00.000Z',
      rationale: 'Rollback approved to restore service stability and user experience.'
    },
    execution: {
      planned_at: '2026-02-05T10:35:00.000Z',
      executed_at: '2026-02-05T10:40:00.000Z',
      status: 'completed',
      execution_log_ref: 'evidence/rollback_001.log'
    },
    post_rollback: {
      verification_status: 'passed',
      verification_ref: 'evidence/verification_001.json',
      services_restored: ['service-a']
    },
    evidence_refs: ['evidence/rollback_001.json'],
    log_chain_prev_hash: null,
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// INV-J-01: INCIDENT CLASSIFICATION VALID
// ─────────────────────────────────────────────────────────────

describe('INV-J-01: Incident classification valid', () => {
  it('accepts all valid severity levels', () => {
    for (const severity of INCIDENT_SEVERITIES) {
      const incident = createValidIncident({ severity });
      const result = validateIncidentEvent(incident);
      expect(result.errors.filter(e => e.includes('INV-J-01'))).toHaveLength(0);
    }
  });

  it('rejects invalid severity', () => {
    const incident = createValidIncident({
      severity: 'INVALID' as any
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-01'))).toBe(true);
  });

  it('validates all status values', () => {
    for (const status of INCIDENT_STATUSES) {
      const incident = createValidIncident({ status });
      const result = validateIncidentEvent(incident);
      expect(result.errors.filter(e => e.includes('Invalid status'))).toHaveLength(0);
    }
  });

  it('validates all source values', () => {
    for (const source of INCIDENT_SOURCES) {
      const incident = createValidIncident({ source });
      const result = validateIncidentEvent(incident);
      expect(result.errors.filter(e => e.includes('Invalid source'))).toHaveLength(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-02: TIMESTAMP REQUIRED (WITHIN 15 MIN)
// ─────────────────────────────────────────────────────────────

describe('INV-J-02: Timestamp required (within 15 min)', () => {
  it('accepts logging within 15 minutes', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const logged = '2026-02-05T10:14:00.000Z'; // 14 min
    expect(checkImmediateLogging(detected, logged)).toBe(true);
  });

  it('rejects logging after 15 minutes', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const logged = '2026-02-05T10:20:00.000Z'; // 20 min
    expect(checkImmediateLogging(detected, logged)).toBe(false);
  });

  it('validates INC-002 rule for late logging', () => {
    const incident = createValidIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T10:30:00.000Z' // 30 min late
    });
    const violation = validateINC002(incident);
    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('INC-002');
  });

  it('requires detected_at timestamp', () => {
    const incident = createValidIncident({
      detected_at: ''
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-02'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-03: EVIDENCE PRESERVATION
// ─────────────────────────────────────────────────────────────

describe('INV-J-03: Evidence preservation', () => {
  it('requires at least one evidence reference', () => {
    const incident = createValidIncident({
      evidence_refs: []
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-03'))).toBe(true);
  });

  it('validates INC-003 for missing incident evidence', () => {
    const incident = createValidIncident({ evidence_refs: [] });
    const violation = validateINC003(incident, null);
    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('INC-003');
  });

  it('validates INC-003 for missing postmortem evidence', () => {
    const incident = createValidIncident();
    const postmortem = createValidPostMortem(incident.incident_id, {
      evidence_refs: []
    });
    const violation = validateINC003(incident, postmortem);
    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('INC-003');
  });

  it('passes when evidence is preserved', () => {
    const incident = createValidIncident();
    const postmortem = createValidPostMortem(incident.incident_id);
    const violation = validateINC003(incident, postmortem);
    expect(violation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-04: MANDATORY POST-MORTEM FOR MEDIUM+
// ─────────────────────────────────────────────────────────────

describe('INV-J-04: Mandatory post-mortem for MEDIUM+', () => {
  it('requires post-mortem for CRITICAL', () => {
    expect(requiresPostMortem('CRITICAL')).toBe(true);
  });

  it('requires post-mortem for HIGH', () => {
    expect(requiresPostMortem('HIGH')).toBe(true);
  });

  it('requires post-mortem for MEDIUM', () => {
    expect(requiresPostMortem('MEDIUM')).toBe(true);
  });

  it('does not require post-mortem for LOW', () => {
    expect(requiresPostMortem('LOW')).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-05: SILENCE = VIOLATION
// ─────────────────────────────────────────────────────────────

describe('INV-J-05: Silence = violation', () => {
  it('violates INC-005 when MEDIUM+ has no postmortem', () => {
    const incident = createValidIncident({ severity: 'HIGH' });
    const violation = validateINC005(incident, null);
    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('INC-005');
    expect(violation?.description).toContain('Silence = violation');
  });

  it('passes when MEDIUM+ has postmortem', () => {
    const incident = createValidIncident({ severity: 'HIGH' });
    const postmortem = createValidPostMortem(incident.incident_id);
    const violation = validateINC005(incident, postmortem);
    expect(violation).toBeNull();
  });

  it('passes for LOW without postmortem', () => {
    const incident = createValidIncident({ severity: 'LOW' });
    const violation = validateINC005(incident, null);
    expect(violation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-06: ROLLBACK REQUIRES HUMAN DECISION
// ─────────────────────────────────────────────────────────────

describe('INV-J-06: Rollback requires human decision', () => {
  it('requires approver identity', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      human_decision: {
        approver: '',
        approver_role: 'ARCHITECTE',
        approved_at: '2026-02-05T10:25:00.000Z',
        rationale: 'Valid rationale for rollback approval decision.'
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-06'))).toBe(true);
  });

  it('requires approval timestamp', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      human_decision: {
        approver: 'Francky',
        approver_role: 'ARCHITECTE',
        approved_at: '',
        rationale: 'Valid rationale for rollback approval decision.'
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-06'))).toBe(true);
  });

  it('requires documented rationale', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      human_decision: {
        approver: 'Francky',
        approver_role: 'ARCHITECTE',
        approved_at: '2026-02-05T10:25:00.000Z',
        rationale: ''
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-06'))).toBe(true);
  });

  it('requires meaningful rationale (min 20 chars)', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      human_decision: {
        approver: 'Francky',
        approver_role: 'ARCHITECTE',
        approved_at: '2026-02-05T10:25:00.000Z',
        rationale: 'Too short'
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-06'))).toBe(true);
  });

  it('passes with complete human decision', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id);
    const result = validateRollback(rollback);
    expect(result.human_decision_valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-07: ROLLBACK TARGET MUST BE VERIFIED STABLE
// ─────────────────────────────────────────────────────────────

describe('INV-J-07: Rollback target must be verified stable', () => {
  it('requires target_was_stable to be true', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      verification: {
        target_was_stable: false,
        stability_evidence_ref: 'evidence/stability.json',
        tests_to_run_post_rollback: ['test:smoke']
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-07'))).toBe(true);
  });

  it('requires stability evidence reference', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      verification: {
        target_was_stable: true,
        stability_evidence_ref: '',
        tests_to_run_post_rollback: ['test:smoke']
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-07'))).toBe(true);
  });

  it('requires post-rollback tests', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      verification: {
        target_was_stable: true,
        stability_evidence_ref: 'evidence/stability.json',
        tests_to_run_post_rollback: []
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-07'))).toBe(true);
  });

  it('requires target state tag', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id, {
      target_state: {
        tag: '',
        version: '1.1.0',
        commit: 'def456',
        manifest_sha256: 'hash456',
        last_known_good: '2026-02-01T00:00:00.000Z'
      }
    });
    const result = validateRollback(rollback);
    expect(result.errors.some(e => e.includes('INV-J-07'))).toBe(true);
  });

  it('passes with verified stable target', () => {
    const incident = createValidIncident();
    const rollback = createValidRollback(incident.incident_id);
    const result = validateRollback(rollback);
    expect(result.target_stable_valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-08: NO BLAME IN POST-MORTEM
// ─────────────────────────────────────────────────────────────

describe('INV-J-08: No blame in post-mortem', () => {
  it('requires blame-free statement', () => {
    const postmortem = createValidPostMortem('INC_001', {
      blame_free_statement: ''
    });
    const result = validatePostMortem(postmortem);
    expect(result.errors.some(e => e.includes('INV-J-08'))).toBe(true);
  });

  it('validates INC-001 for missing blame-free statement', () => {
    const incident = createValidIncident();
    const postmortem = createValidPostMortem(incident.incident_id, {
      blame_free_statement: ''
    });
    const violation = validateINC001(incident, postmortem);
    expect(violation).not.toBeNull();
    expect(violation?.rule).toBe('INC-001');
  });

  it('detects blame language in summary', () => {
    const incident = createValidIncident();
    const postmortem = createValidPostMortem(incident.incident_id, {
      summary: 'The operator was at fault for this incident.'
    });
    const violation = validateINC001(incident, postmortem);
    expect(violation).not.toBeNull();
    expect(violation?.description).toContain('blame language');
  });

  it('passes with proper blame-free content', () => {
    const incident = createValidIncident();
    const postmortem = createValidPostMortem(incident.incident_id);
    const violation = validateINC001(incident, postmortem);
    expect(violation).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-09: SLA COMPLIANCE TRACKED
// ─────────────────────────────────────────────────────────────

describe('INV-J-09: SLA compliance tracked', () => {
  it('requires SLA response deadline', () => {
    const incident = createValidIncident({
      sla: {
        response_deadline: '',
        sla_met: null
      }
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-09'))).toBe(true);
  });

  it('computes correct SLA deadline for CRITICAL (1h)', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const deadline = computeSLADeadline(detected, 'CRITICAL');
    expect(deadline).toBe('2026-02-05T11:00:00.000Z');
  });

  it('computes correct SLA deadline for HIGH (4h)', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const deadline = computeSLADeadline(detected, 'HIGH');
    expect(deadline).toBe('2026-02-05T14:00:00.000Z');
  });

  it('computes correct SLA deadline for MEDIUM (24h)', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const deadline = computeSLADeadline(detected, 'MEDIUM');
    expect(deadline).toBe('2026-02-06T10:00:00.000Z');
  });

  it('computes correct SLA deadline for LOW (72h)', () => {
    const detected = '2026-02-05T10:00:00.000Z';
    const deadline = computeSLADeadline(detected, 'LOW');
    expect(deadline).toBe('2026-02-08T10:00:00.000Z');
  });
});

// ─────────────────────────────────────────────────────────────
// INV-J-10: NON-ACTUATING (REPORT ONLY)
// ─────────────────────────────────────────────────────────────

describe('INV-J-10: NON-ACTUATING (report only)', () => {
  it('report_type is incident_report not action', () => {
    const incident = createValidIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);
    expect(report.report_type).toBe('incident_report');
    expect((report as any).action_type).toBeUndefined();
  });

  it('report has no blocked or rejected fields', () => {
    const incident = createValidIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);
    expect((report as any).blocked).toBeUndefined();
    expect((report as any).rejected).toBeUndefined();
    expect((report as any).action_taken).toBeUndefined();
  });

  it('notes contain NON-ACTUATING statement', () => {
    const incident = createValidIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);
    expect(report.notes).toContain('No automatic actions taken');
    expect(report.notes).toContain('NON-ACTUATING');
  });

  it('escalation is flag only', () => {
    const incident = createValidIncident({ severity: 'CRITICAL' });
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);
    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
    // No notification_sent or action_executed
    expect((report as any).notification_sent).toBeUndefined();
    expect((report as any).action_executed).toBeUndefined();
  });

  it('pipeline is deterministic', () => {
    const incident = createValidIncident();
    const args = {
      incidents: [incident],
      postmortems: [],
      rollbackPlans: [],
      generatedAt: '2026-02-05T12:00:00.000Z',
      prevEventHash: null
    };
    const result = verifyPipelineDeterminism(args, 5);
    expect(result.deterministic).toBe(true);
    expect(new Set(result.hashes).size).toBe(1);
  });
});
