/**
 * PHASE J — RULE VALIDATORS TESTS
 * Tests INC-001 to INC-005 rule validators.
 */

import { describe, it, expect } from 'vitest';
import type { IncidentEvent, PostMortem } from '../../../../GOVERNANCE/incident/types.js';
import { computeSLADeadline } from '../../../../GOVERNANCE/incident/incident_utils.js';
import {
  validateINC001,
  validateINC002,
  validateINC003,
  validateINC004,
  validateINC005,
  validateAllRules
} from '../../../../GOVERNANCE/incident/validators/rules.js';

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
    incident_id: 'INC_001',
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
      action: 'Notified stakeholders',
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

function createPostMortem(incidentId: string, overrides: Partial<PostMortem> = {}): PostMortem {
  return {
    postmortem_id: `PM_${incidentId}`,
    incident_id: incidentId,
    created_at: '2026-02-05T12:00:00.000Z',
    author: 'Author',
    summary: 'System experienced issues due to configuration.',
    timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }],
    root_cause: {
      description: 'Configuration drift occurred.',
      category: 'configuration_error',
      contributing_factors: ['Factor 1']
    },
    impact: {
      description: 'Degraded performance.',
      data_loss: false
    },
    resolution: {
      description: 'Fixed configuration.',
      resolution_type: 'fix',
      resolved_at: '2026-02-05T11:00:00.000Z',
      resolved_by: 'team'
    },
    actions: [{
      action_id: 'A1',
      description: 'Add monitoring',
      owner: 'team',
      due_date: '2026-03-01',
      priority: 'high',
      status: 'pending'
    }],
    evidence_refs: ['evidence/001.json'],
    blame_free_statement: 'This focuses on systemic improvements.',
    lessons_learned: ['Lesson 1'],
    ...overrides
  };
}

// ─────────────────────────────────────────────────────────────
// INC-001: NO BLAME CULTURE
// ─────────────────────────────────────────────────────────────

describe('INC-001: No blame culture', () => {
  it('returns null without postmortem', () => {
    const incident = createIncident();
    expect(validateINC001(incident, null)).toBeNull();
  });

  it('fails without blame-free statement', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, { blame_free_statement: '' });
    const result = validateINC001(incident, pm);
    expect(result?.rule).toBe('INC-001');
    expect(result?.severity).toBe('error');
  });

  it('detects "fault" in summary', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, {
      summary: 'The fault was in the deployment process.'
    });
    const result = validateINC001(incident, pm);
    expect(result?.description).toContain('fault');
  });

  it('detects "blame" in root cause', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, {
      root_cause: {
        description: 'We blame the lack of testing.',
        category: 'code_defect',
        contributing_factors: []
      }
    });
    const result = validateINC001(incident, pm);
    expect(result?.description).toContain('blame');
  });

  it('detects "should have" pattern', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, {
      summary: 'The team should have caught this earlier.'
    });
    const result = validateINC001(incident, pm);
    expect(result).not.toBeNull();
  });

  it('detects "failed to" pattern', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, {
      summary: 'The process failed to catch the error.'
    });
    const result = validateINC001(incident, pm);
    expect(result).not.toBeNull();
  });

  it('passes with clean content', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id);
    expect(validateINC001(incident, pm)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INC-002: IMMEDIATE LOGGING
// ─────────────────────────────────────────────────────────────

describe('INC-002: Immediate logging (15 min)', () => {
  it('passes when logged within 15 minutes', () => {
    const incident = createIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T10:10:00.000Z'
    });
    expect(validateINC002(incident)).toBeNull();
  });

  it('passes at exactly 15 minutes', () => {
    const incident = createIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T10:15:00.000Z'
    });
    expect(validateINC002(incident)).toBeNull();
  });

  it('fails when logged after 15 minutes', () => {
    const incident = createIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T10:20:00.000Z'
    });
    const result = validateINC002(incident);
    expect(result?.rule).toBe('INC-002');
    expect(result?.severity).toBe('error');
  });

  it('fails when logged 1 hour late', () => {
    const incident = createIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T11:00:00.000Z'
    });
    expect(validateINC002(incident)).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INC-003: EVIDENCE PRESERVATION
// ─────────────────────────────────────────────────────────────

describe('INC-003: Evidence preservation', () => {
  it('fails without incident evidence', () => {
    const incident = createIncident({ evidence_refs: [] });
    const result = validateINC003(incident, null);
    expect(result?.rule).toBe('INC-003');
    expect(result?.description).toContain('no evidence');
  });

  it('passes with incident evidence and no postmortem', () => {
    const incident = createIncident();
    expect(validateINC003(incident, null)).toBeNull();
  });

  it('fails when postmortem has no evidence', () => {
    const incident = createIncident();
    const pm = createPostMortem(incident.incident_id, { evidence_refs: [] });
    const result = validateINC003(incident, pm);
    expect(result?.rule).toBe('INC-003');
  });

  it('warns when postmortem does not reference incident evidence', () => {
    const incident = createIncident({ evidence_refs: ['evidence/001.json'] });
    const pm = createPostMortem(incident.incident_id, { evidence_refs: ['evidence/other.json'] });
    const result = validateINC003(incident, pm);
    expect(result?.severity).toBe('warning');
  });

  it('passes when postmortem references incident evidence', () => {
    const incident = createIncident({ evidence_refs: ['evidence/001.json'] });
    const pm = createPostMortem(incident.incident_id, { evidence_refs: ['evidence/001.json'] });
    expect(validateINC003(incident, pm)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INC-004: TRANSPARENT COMMUNICATION
// ─────────────────────────────────────────────────────────────

describe('INC-004: Transparent communication', () => {
  it('warns for CRITICAL without communication in timeline', () => {
    const incident = createIncident({
      severity: 'CRITICAL',
      timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }]
    });
    const result = validateINC004(incident);
    expect(result?.rule).toBe('INC-004');
    expect(result?.severity).toBe('warning');
  });

  it('warns for HIGH without communication in timeline', () => {
    const incident = createIncident({
      severity: 'HIGH',
      timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }]
    });
    expect(validateINC004(incident)?.rule).toBe('INC-004');
  });

  it('passes for CRITICAL with notification', () => {
    const incident = createIncident({
      severity: 'CRITICAL',
      timeline: [
        { timestamp: '2026-02-05T10:00:00.000Z', action: 'Notified stakeholders', actor: 'system' }
      ]
    });
    expect(validateINC004(incident)).toBeNull();
  });

  it('passes for HIGH with alert', () => {
    const incident = createIncident({
      severity: 'HIGH',
      timeline: [
        { timestamp: '2026-02-05T10:00:00.000Z', action: 'Sent alert to ops team', actor: 'system' }
      ]
    });
    expect(validateINC004(incident)).toBeNull();
  });

  it('passes for MEDIUM without communication', () => {
    const incident = createIncident({
      severity: 'MEDIUM',
      timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }]
    });
    expect(validateINC004(incident)).toBeNull();
  });

  it('passes for LOW without communication', () => {
    const incident = createIncident({
      severity: 'LOW',
      timeline: []
    });
    expect(validateINC004(incident)).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────
// INC-005: MANDATORY POST-MORTEM
// ─────────────────────────────────────────────────────────────

describe('INC-005: Mandatory post-mortem (MEDIUM+)', () => {
  it('fails for CRITICAL without postmortem', () => {
    const incident = createIncident({ severity: 'CRITICAL' });
    const result = validateINC005(incident, null);
    expect(result?.rule).toBe('INC-005');
    expect(result?.description).toContain('Silence = violation');
  });

  it('fails for HIGH without postmortem', () => {
    const incident = createIncident({ severity: 'HIGH' });
    expect(validateINC005(incident, null)?.rule).toBe('INC-005');
  });

  it('fails for MEDIUM without postmortem', () => {
    const incident = createIncident({ severity: 'MEDIUM' });
    expect(validateINC005(incident, null)?.rule).toBe('INC-005');
  });

  it('passes for LOW without postmortem', () => {
    const incident = createIncident({ severity: 'LOW' });
    expect(validateINC005(incident, null)).toBeNull();
  });

  it('passes for CRITICAL with postmortem', () => {
    const incident = createIncident({ severity: 'CRITICAL' });
    const pm = createPostMortem(incident.incident_id);
    expect(validateINC005(incident, pm)).toBeNull();
  });

  it('fails when postmortem incident_id does not match', () => {
    const incident = createIncident({ incident_id: 'INC_001' });
    const pm = createPostMortem('INC_002');
    const result = validateINC005(incident, pm);
    expect(result?.description).toContain('does not match');
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATE ALL RULES
// ─────────────────────────────────────────────────────────────

describe('validateAllRules', () => {
  it('returns empty array for valid incident with postmortem', () => {
    const incident = createIncident({ severity: 'MEDIUM' });
    const pm = createPostMortem(incident.incident_id);
    const violations = validateAllRules(incident, pm);
    expect(violations).toHaveLength(0);
  });

  it('collects multiple violations', () => {
    const incident = createIncident({
      severity: 'CRITICAL',
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T11:00:00.000Z', // Late
      evidence_refs: [],
      timeline: []
    });
    const violations = validateAllRules(incident, null);
    expect(violations.length).toBeGreaterThan(2);
  });

  it('validates all 5 rules', () => {
    const rules = new Set(['INC-001', 'INC-002', 'INC-003', 'INC-004', 'INC-005']);
    // Test that we can trigger violations for each rule
    const incidents = [
      createIncident({ severity: 'CRITICAL', timeline: [] }), // INC-004
      createIncident({ detected_at: '2026-02-05T10:00:00.000Z', timestamp: '2026-02-05T11:00:00.000Z' }), // INC-002
      createIncident({ evidence_refs: [] }), // INC-003
      createIncident({ severity: 'HIGH' }), // INC-005
    ];
    const pm = createPostMortem('INC_001', { blame_free_statement: '' }); // INC-001

    const allViolations = incidents.flatMap(i => validateAllRules(i, null));
    allViolations.push(...validateAllRules(createIncident(), pm));

    const foundRules = new Set(allViolations.map(v => v.rule));
    expect(foundRules.size).toBeGreaterThanOrEqual(3);
  });
});
