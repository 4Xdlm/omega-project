/**
 * PHASE J — PIPELINE TESTS
 * Tests incident pipeline orchestration and determinism.
 */

import { describe, it, expect } from 'vitest';
import type { IncidentEvent, PostMortem, RollbackPlan } from '../../../GOVERNANCE/incident/types.js';
import { computeSLADeadline } from '../../../GOVERNANCE/incident/incident_utils.js';
import {
  runIncidentPipeline,
  validateIncidentWithContext,
  verifyPipelineDeterminism,
  requiresImmediateAttention,
  getIncidentsNeedingPostMortem,
  getRollbacksNeedingVerification,
  computeIncidentChainHash,
  type IncidentPipelineResult
} from '../../../GOVERNANCE/incident/incident_pipeline.js';

// ─────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────

function createIncident(overrides: Partial<IncidentEvent> = {}): IncidentEvent {
  const detected = '2026-02-05T10:00:00.000Z';
  const logged = '2026-02-05T10:05:00.000Z';
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
      description: 'Description',
      affected_components: ['service-a']
    },
    timeline: [{
      timestamp: logged,
      action: 'Notified team',
      actor: 'system'
    }],
    evidence_refs: ['evidence/001.json'],
    sla: {
      response_deadline: computeSLADeadline(detected, 'MEDIUM'),
      sla_met: true
    },
    log_chain_prev_hash: null,
    ...overrides
  };
}

function createPostMortem(incidentId: string): PostMortem {
  return {
    postmortem_id: `PM_${incidentId}`,
    incident_id: incidentId,
    created_at: '2026-02-05T12:00:00.000Z',
    author: 'Author',
    summary: 'System experienced configuration drift.',
    timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }],
    root_cause: {
      description: 'Configuration drift in production.',
      category: 'configuration_error',
      contributing_factors: ['Lack of automated validation']
    },
    impact: { description: 'Service latency increased.', data_loss: false },
    resolution: {
      description: 'Reverted configuration.',
      resolution_type: 'fix',
      resolved_at: '2026-02-05T11:00:00.000Z',
      resolved_by: 'team'
    },
    actions: [{
      action_id: 'A1',
      description: 'Add config validation',
      owner: 'team',
      due_date: '2026-03-01',
      priority: 'high',
      status: 'pending'
    }],
    evidence_refs: ['evidence/001.json'],
    blame_free_statement: 'Focus on systemic improvements.',
    lessons_learned: ['Better validation needed']
  };
}

function createRollback(incidentId: string): RollbackPlan {
  return {
    event_type: 'rollback_event',
    schema_version: '1.0.0',
    event_id: 'RB_EVT_001',
    timestamp: '2026-02-05T10:30:00.000Z',
    rollback_id: `RB_${incidentId}_001`,
    trigger: { incident_id: incidentId, incident_severity: 'HIGH', trigger_reason: 'Degradation' },
    current_state: { version: '1.2.0', commit: 'abc', manifest_sha256: 'h1' },
    target_state: {
      tag: 'SEALED_v1.1.0',
      version: '1.1.0',
      commit: 'def',
      manifest_sha256: 'h2',
      last_known_good: '2026-02-01T00:00:00.000Z'
    },
    verification: {
      target_was_stable: true,
      stability_evidence_ref: 'evidence/stability.json',
      tests_to_run_post_rollback: ['test:smoke']
    },
    human_decision: {
      approver: 'Francky',
      approver_role: 'ARCHITECTE',
      approved_at: '2026-02-05T10:25:00.000Z',
      rationale: 'Approved to restore service stability.'
    },
    execution: {
      planned_at: '2026-02-05T10:35:00.000Z',
      executed_at: '2026-02-05T10:40:00.000Z',
      status: 'completed',
      execution_log_ref: 'log.txt'
    },
    post_rollback: {
      verification_status: 'passed',
      verification_ref: 'evidence/v.json',
      services_restored: ['service-a']
    },
    evidence_refs: ['evidence/rb.json'],
    log_chain_prev_hash: null
  };
}

// ─────────────────────────────────────────────────────────────
// PIPELINE EXECUTION
// ─────────────────────────────────────────────────────────────

describe('runIncidentPipeline', () => {
  it('returns valid result with no incidents', () => {
    const result = runIncidentPipeline({
      incidents: [],
      postmortems: [],
      rollbackPlans: [],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.report.report_type).toBe('incident_report');
    expect(result.report.incidents).toHaveLength(0);
    expect(result.validation_summary.incidents_valid).toBe(0);
  });

  it('processes single valid incident', () => {
    const incident = createIncident();
    const postmortem = createPostMortem(incident.incident_id);

    const result = runIncidentPipeline({
      incidents: [incident],
      postmortems: [postmortem],
      rollbackPlans: [],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.validation_summary.incidents_valid).toBe(1);
    expect(result.validation_summary.incidents_invalid).toBe(0);
    expect(result.validation_summary.postmortems_valid).toBe(1);
  });

  it('processes multiple incidents', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001' }),
      createIncident({ incident_id: 'INC_002', severity: 'HIGH' }),
      createIncident({ incident_id: 'INC_003', severity: 'LOW' })
    ];

    const postmortems = [
      createPostMortem('INC_001'),
      createPostMortem('INC_002')
    ];

    const result = runIncidentPipeline({
      incidents,
      postmortems,
      rollbackPlans: [],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.report.incidents).toHaveLength(3);
    expect(result.report.postmortems).toHaveLength(2);
  });

  it('includes rollback validations', () => {
    const incident = createIncident({ severity: 'HIGH' });
    const rollback = createRollback(incident.incident_id);

    const result = runIncidentPipeline({
      incidents: [incident],
      postmortems: [],
      rollbackPlans: [rollback],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.validation_summary.rollbacks_valid).toBe(1);
    expect(result.report.rollback_plans).toHaveLength(1);
  });

  it('computes report hash', () => {
    const incident = createIncident();
    const result = runIncidentPipeline({
      incidents: [incident],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.report_hash).toBeTruthy();
    expect(result.report_hash.length).toBe(64); // SHA-256
  });

  it('preserves prev_event_hash in chain', () => {
    const incident = createIncident();
    const prevHash = 'abc123def456';

    const result = runIncidentPipeline({
      incidents: [incident],
      generatedAt: '2026-02-05T12:00:00.000Z',
      prevEventHash: prevHash
    });

    expect(result.report.log_chain_prev_hash).toBe(prevHash);
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM
// ─────────────────────────────────────────────────────────────

describe('Pipeline determinism', () => {
  it('produces identical output for identical input', () => {
    const incident = createIncident();
    const args = {
      incidents: [incident],
      generatedAt: '2026-02-05T12:00:00.000Z'
    };

    const result1 = runIncidentPipeline(args);
    const result2 = runIncidentPipeline(args);

    expect(result1.report_hash).toBe(result2.report_hash);
    expect(JSON.stringify(result1.report)).toBe(JSON.stringify(result2.report));
  });

  it('verifyPipelineDeterminism returns true for 5 runs', () => {
    const args = {
      incidents: [createIncident()],
      generatedAt: '2026-02-05T12:00:00.000Z'
    };

    const result = verifyPipelineDeterminism(args, 5);

    expect(result.deterministic).toBe(true);
    expect(result.hashes).toHaveLength(5);
    expect(new Set(result.hashes).size).toBe(1);
  });

  it('verifyPipelineDeterminism works with complex input', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001' }),
      createIncident({ incident_id: 'INC_002', severity: 'CRITICAL' })
    ];
    const postmortems = [createPostMortem('INC_001')];
    const rollbacks = [createRollback('INC_002')];

    const args = {
      incidents,
      postmortems,
      rollbackPlans: rollbacks,
      generatedAt: '2026-02-05T12:00:00.000Z'
    };

    const result = verifyPipelineDeterminism(args, 3);
    expect(result.deterministic).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// validateIncidentWithContext
// ─────────────────────────────────────────────────────────────

describe('validateIncidentWithContext', () => {
  it('validates valid incident with postmortem', () => {
    const incident = createIncident();
    const postmortem = createPostMortem(incident.incident_id);

    const result = validateIncidentWithContext(incident, postmortem, null);

    expect(result.valid).toBe(true);
    expect(result.incident_validation.valid).toBe(true);
    expect(result.postmortem_validation?.valid).toBe(true);
    expect(result.postmortem_missing).toBe(false);
  });

  it('detects missing postmortem for MEDIUM+', () => {
    const incident = createIncident({ severity: 'HIGH' });

    const result = validateIncidentWithContext(incident, null, null);

    expect(result.postmortem_required).toBe(true);
    expect(result.postmortem_missing).toBe(true);
    expect(result.valid).toBe(false);
  });

  it('allows missing postmortem for LOW', () => {
    const incident = createIncident({ severity: 'LOW' });

    const result = validateIncidentWithContext(incident, null, null);

    expect(result.postmortem_required).toBe(false);
    expect(result.postmortem_missing).toBe(false);
    expect(result.valid).toBe(true);
  });

  it('validates rollback if present', () => {
    const incident = createIncident();
    const rollback = createRollback(incident.incident_id);
    const postmortem = createPostMortem(incident.incident_id);

    const result = validateIncidentWithContext(incident, postmortem, rollback);

    expect(result.rollback_validation).not.toBeNull();
    expect(result.rollback_validation?.valid).toBe(true);
  });

  it('collects rule violations', () => {
    const incident = createIncident({
      severity: 'HIGH',
      evidence_refs: [] // Violates INC-003
    });

    const result = validateIncidentWithContext(incident, null, null);

    expect(result.rule_violations.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

describe('requiresImmediateAttention', () => {
  it('returns true for CRITICAL', () => {
    const incident = createIncident({ severity: 'CRITICAL' });
    expect(requiresImmediateAttention(incident)).toBe(true);
  });

  it('returns false for HIGH', () => {
    const incident = createIncident({ severity: 'HIGH' });
    expect(requiresImmediateAttention(incident)).toBe(false);
  });

  it('returns false for MEDIUM', () => {
    const incident = createIncident({ severity: 'MEDIUM' });
    expect(requiresImmediateAttention(incident)).toBe(false);
  });

  it('returns false for LOW', () => {
    const incident = createIncident({ severity: 'LOW' });
    expect(requiresImmediateAttention(incident)).toBe(false);
  });
});

describe('getIncidentsNeedingPostMortem', () => {
  it('returns MEDIUM+ incidents without postmortem', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001', severity: 'HIGH' }),
      createIncident({ incident_id: 'INC_002', severity: 'MEDIUM' }),
      createIncident({ incident_id: 'INC_003', severity: 'LOW' })
    ];
    const postmortems = [createPostMortem('INC_001')];

    const result = getIncidentsNeedingPostMortem(incidents, postmortems);

    expect(result).toHaveLength(1);
    expect(result[0].incident_id).toBe('INC_002');
  });

  it('returns empty for LOW incidents', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001', severity: 'LOW' }),
      createIncident({ incident_id: 'INC_002', severity: 'LOW' })
    ];

    const result = getIncidentsNeedingPostMortem(incidents, []);

    expect(result).toHaveLength(0);
  });

  it('returns all MEDIUM+ without postmortems', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001', severity: 'CRITICAL' }),
      createIncident({ incident_id: 'INC_002', severity: 'HIGH' }),
      createIncident({ incident_id: 'INC_003', severity: 'MEDIUM' })
    ];

    const result = getIncidentsNeedingPostMortem(incidents, []);

    expect(result).toHaveLength(3);
  });
});

describe('getRollbacksNeedingVerification', () => {
  it('returns completed rollbacks with pending verification', () => {
    const rollback1 = createRollback('INC_001');
    const rollback2: RollbackPlan = {
      ...createRollback('INC_002'),
      post_rollback: {
        verification_status: 'pending',
        verification_ref: null,
        services_restored: []
      }
    };

    const result = getRollbacksNeedingVerification([rollback1, rollback2]);

    expect(result).toHaveLength(1);
    expect(result[0].rollback_id).toContain('INC_002');
  });

  it('excludes planned rollbacks', () => {
    const rollback: RollbackPlan = {
      ...createRollback('INC_001'),
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
    };

    const result = getRollbacksNeedingVerification([rollback]);

    expect(result).toHaveLength(0);
  });
});

describe('computeIncidentChainHash', () => {
  it('produces consistent hash for same incidents', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001', timestamp: '2026-02-05T10:00:00.000Z' }),
      createIncident({ incident_id: 'INC_002', timestamp: '2026-02-05T11:00:00.000Z' })
    ];

    const hash1 = computeIncidentChainHash(incidents);
    const hash2 = computeIncidentChainHash(incidents);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it('sorts incidents by timestamp', () => {
    const incidents1 = [
      createIncident({ incident_id: 'INC_002', timestamp: '2026-02-05T11:00:00.000Z' }),
      createIncident({ incident_id: 'INC_001', timestamp: '2026-02-05T10:00:00.000Z' })
    ];
    const incidents2 = [
      createIncident({ incident_id: 'INC_001', timestamp: '2026-02-05T10:00:00.000Z' }),
      createIncident({ incident_id: 'INC_002', timestamp: '2026-02-05T11:00:00.000Z' })
    ];

    const hash1 = computeIncidentChainHash(incidents1);
    const hash2 = computeIncidentChainHash(incidents2);

    expect(hash1).toBe(hash2); // Order independent
  });

  it('produces different hash for different incidents', () => {
    const incidents1 = [createIncident({ incident_id: 'INC_001' })];
    const incidents2 = [createIncident({ incident_id: 'INC_002' })];

    expect(computeIncidentChainHash(incidents1)).not.toBe(computeIncidentChainHash(incidents2));
  });
});
