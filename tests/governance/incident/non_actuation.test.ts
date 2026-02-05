/**
 * PHASE J — NON-ACTUATION TESTS
 * Proves INV-J-10: NON-ACTUATING (report only).
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 * FINAL PHASE — EXCELLENCE ABSOLUE REQUISE
 */

import { describe, it, expect } from 'vitest';
import type { IncidentEvent, PostMortem, RollbackPlan } from '../../../GOVERNANCE/incident/types.js';
import { computeSLADeadline } from '../../../GOVERNANCE/incident/incident_utils.js';
import { buildIncidentReport, GENERATOR } from '../../../GOVERNANCE/incident/incident_report.js';
import {
  runIncidentPipeline,
  verifyPipelineDeterminism
} from '../../../GOVERNANCE/incident/incident_pipeline.js';

// ─────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────

function createIncident(overrides: Partial<IncidentEvent> = {}): IncidentEvent {
  const detected = '2026-02-05T10:00:00.000Z';
  return {
    event_type: 'incident_event',
    schema_version: '1.0.0',
    event_id: 'EVT_001',
    incident_id: 'INC_001',
    timestamp: '2026-02-05T10:05:00.000Z',
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
      timestamp: '2026-02-05T10:05:00.000Z',
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

function createPostMortem(incidentId: string): PostMortem {
  return {
    postmortem_id: `PM_${incidentId}`,
    incident_id: incidentId,
    created_at: '2026-02-05T12:00:00.000Z',
    author: 'Author',
    summary: 'Configuration drift caused service degradation.',
    timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }],
    root_cause: {
      description: 'Configuration drift in production environment.',
      category: 'configuration_error',
      contributing_factors: ['Lack of automated validation']
    },
    impact: { description: 'Service latency increased.', data_loss: false },
    resolution: {
      description: 'Reverted configuration and added validation.',
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

// ─────────────────────────────────────────────────────────────
// REPORT TYPE
// ─────────────────────────────────────────────────────────────

describe('Report type is incident_report (not action)', () => {
  it('report_type is incident_report', () => {
    const incident = createIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.report_type).toBe('incident_report');
  });

  it('report does not have action_type field', () => {
    const incident = createIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);

    expect((report as any).action_type).toBeUndefined();
  });

  it('pipeline result contains report not action', () => {
    const result = runIncidentPipeline({
      incidents: [createIncident()],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    expect(result.report.report_type).toBe('incident_report');
    expect((result.report as any).action_executed).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// NO BLOCKING/REJECTION FIELDS
// ─────────────────────────────────────────────────────────────

describe('No blocking or rejection fields', () => {
  it('no blocked field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).blocked).toBeUndefined();
  });

  it('no rejected field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).rejected).toBeUndefined();
  });

  it('no action_taken field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).action_taken).toBeUndefined();
  });

  it('no auto_action field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).auto_action).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// NOTES CONTAIN NON-ACTUATING STATEMENT
// ─────────────────────────────────────────────────────────────

describe('Notes contain NON-ACTUATING statement', () => {
  it('notes mention "No automatic actions"', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.notes).toContain('No automatic actions');
  });

  it('notes mention "NON-ACTUATING"', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.notes).toContain('NON-ACTUATING');
  });

  it('notes mention "human review only"', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.notes).toContain('human review');
  });

  it('notes mention INV-J-10', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.notes).toContain('INV-J-10');
  });
});

// ─────────────────────────────────────────────────────────────
// ESCALATION IS FLAG ONLY
// ─────────────────────────────────────────────────────────────

describe('Escalation is flag only (no automatic notification)', () => {
  it('escalation_required is a boolean', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect(typeof report.escalation_required).toBe('boolean');
  });

  it('escalation_target is a string (not a function)', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect(typeof report.escalation_target).toBe('string');
  });

  it('no notification_sent field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).notification_sent).toBeUndefined();
  });

  it('no email_sent field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).email_sent).toBeUndefined();
  });

  it('no alert_triggered field', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect((report as any).alert_triggered).toBeUndefined();
  });

  it('CRITICAL incident sets escalation_required true', () => {
    const report = buildIncidentReport(
      [createIncident({ severity: 'CRITICAL' })],
      [],
      [],
      '2026-02-05T12:00:00.000Z',
      null
    );

    expect(report.escalation_required).toBe(true);
    expect(report.escalation_target).toBe('ARCHITECTE');
  });
});

// ─────────────────────────────────────────────────────────────
// PURE FUNCTIONS / NO SIDE EFFECTS
// ─────────────────────────────────────────────────────────────

describe('Pure functions / no side effects', () => {
  it('calling buildIncidentReport multiple times produces same result', () => {
    const incidents = [createIncident()];
    const generatedAt = '2026-02-05T12:00:00.000Z';

    const report1 = buildIncidentReport(incidents, [], [], generatedAt, null);
    const report2 = buildIncidentReport(incidents, [], [], generatedAt, null);

    expect(JSON.stringify(report1)).toBe(JSON.stringify(report2));
  });

  it('input incidents are not modified', () => {
    const incident = createIncident();
    const originalJson = JSON.stringify(incident);

    buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(JSON.stringify(incident)).toBe(originalJson);
  });

  it('input postmortems are not modified', () => {
    const incident = createIncident();
    const postmortem = createPostMortem(incident.incident_id);
    const originalJson = JSON.stringify(postmortem);

    buildIncidentReport([incident], [postmortem], [], '2026-02-05T12:00:00.000Z', null);

    expect(JSON.stringify(postmortem)).toBe(originalJson);
  });
});

// ─────────────────────────────────────────────────────────────
// DETERMINISM OVER MULTIPLE RUNS
// ─────────────────────────────────────────────────────────────

describe('Determinism over multiple runs', () => {
  it('5 consecutive runs produce identical output', () => {
    const incident = createIncident();
    const args = {
      incidents: [incident],
      generatedAt: '2026-02-05T12:00:00.000Z'
    };

    const result = verifyPipelineDeterminism(args, 5);

    expect(result.deterministic).toBe(true);
    expect(result.hashes).toHaveLength(5);
    expect(new Set(result.hashes).size).toBe(1);
  });

  it('10 consecutive runs produce identical output', () => {
    const incidents = [
      createIncident({ incident_id: 'INC_001' }),
      createIncident({ incident_id: 'INC_002', severity: 'CRITICAL' })
    ];
    const postmortems = [createPostMortem('INC_001')];

    const args = {
      incidents,
      postmortems,
      generatedAt: '2026-02-05T12:00:00.000Z'
    };

    const result = verifyPipelineDeterminism(args, 10);

    expect(result.deterministic).toBe(true);
    expect(new Set(result.hashes).size).toBe(1);
  });

  it('different generatedAt produces different hash', () => {
    const incident = createIncident();

    const result1 = runIncidentPipeline({
      incidents: [incident],
      generatedAt: '2026-02-05T12:00:00.000Z'
    });

    const result2 = runIncidentPipeline({
      incidents: [incident],
      generatedAt: '2026-02-05T13:00:00.000Z'
    });

    expect(result1.report_hash).not.toBe(result2.report_hash);
  });
});

// ─────────────────────────────────────────────────────────────
// GENERATOR IDENTIFICATION
// ─────────────────────────────────────────────────────────────

describe('Generator identification', () => {
  it('report includes generator', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    expect(report.generator).toBe(GENERATOR);
  });

  it('generator is descriptive', () => {
    expect(GENERATOR).toContain('INCIDENT');
    expect(GENERATOR).toContain('v1.0');
  });
});

// ─────────────────────────────────────────────────────────────
// JSON SERIALIZABILITY
// ─────────────────────────────────────────────────────────────

describe('Report is JSON-serializable', () => {
  it('report can be serialized and deserialized', () => {
    const incident = createIncident();
    const postmortem = createPostMortem(incident.incident_id);
    const report = buildIncidentReport([incident], [postmortem], [], '2026-02-05T12:00:00.000Z', null);

    const serialized = JSON.stringify(report);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.report_type).toBe('incident_report');
    expect(deserialized.incidents).toHaveLength(1);
    expect(deserialized.postmortems).toHaveLength(1);
  });

  it('no circular references', () => {
    const incident = createIncident();
    const report = buildIncidentReport([incident], [], [], '2026-02-05T12:00:00.000Z', null);

    // This would throw if circular references exist
    expect(() => JSON.stringify(report)).not.toThrow();
  });

  it('no function values', () => {
    const report = buildIncidentReport([createIncident()], [], [], '2026-02-05T12:00:00.000Z', null);

    const findFunctions = (obj: any, path = ''): string[] => {
      const found: string[] = [];
      for (const key of Object.keys(obj)) {
        const value = obj[key];
        const currentPath = path ? `${path}.${key}` : key;
        if (typeof value === 'function') {
          found.push(currentPath);
        } else if (value && typeof value === 'object') {
          found.push(...findFunctions(value, currentPath));
        }
      }
      return found;
    };

    expect(findFunctions(report)).toHaveLength(0);
  });
});
