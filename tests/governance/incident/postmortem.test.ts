/**
 * PHASE J — POST-MORTEM GENERATOR TESTS
 * Tests post-mortem template generation and validation.
 */

import { describe, it, expect } from 'vitest';
import type { IncidentEvent, PostMortem, PreventiveAction } from '../../../GOVERNANCE/incident/types.js';
import { computeSLADeadline, validatePostMortem } from '../../../GOVERNANCE/incident/incident_utils.js';
import {
  generatePostMortem,
  generateBlameFreeStatement,
  createPostMortemTemplate,
  isPostMortemComplete,
  generateActionId,
  createPreventiveAction
} from '../../../GOVERNANCE/incident/postmortem_generator.js';

// ─────────────────────────────────────────────────────────────
// FIXTURES
// ─────────────────────────────────────────────────────────────

function createIncident(overrides: Partial<IncidentEvent> = {}): IncidentEvent {
  const detected = '2026-02-05T10:00:00.000Z';
  return {
    event_type: 'incident_event',
    schema_version: '1.0.0',
    event_id: 'EVT_001',
    incident_id: 'INC_MED_20260205_001',
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
      action: 'Incident detected',
      actor: 'monitoring'
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

// ─────────────────────────────────────────────────────────────
// generatePostMortem
// ─────────────────────────────────────────────────────────────

describe('generatePostMortem', () => {
  it('generates valid post-mortem from incident', () => {
    const incident = createIncident();
    const postmortem = generatePostMortem(incident, {
      author: 'Test Author',
      summary: 'Service degradation due to configuration drift.',
      rootCauseDescription: 'Configuration was not validated before deployment.',
      rootCauseCategory: 'configuration_error',
      contributingFactors: ['Lack of pre-deployment checks'],
      impactDescription: 'Service latency increased by 50%.',
      dataLoss: false,
      serviceDowntimeMinutes: 30,
      resolutionDescription: 'Reverted configuration and added validation.',
      resolutionType: 'fix',
      resolvedBy: 'ops-team',
      actions: [{
        action_id: 'ACTION_001',
        description: 'Add automated config validation',
        owner: 'ops-team',
        due_date: '2026-03-01',
        priority: 'high',
        status: 'pending'
      }],
      lessonsLearned: ['Need better pre-deployment validation']
    }, '2026-02-05T12:00:00.000Z');

    expect(postmortem.incident_id).toBe(incident.incident_id);
    expect(postmortem.author).toBe('Test Author');
    expect(postmortem.root_cause.category).toBe('configuration_error');
  });

  it('generates correct postmortem_id', () => {
    const incident = createIncident({ incident_id: 'INC_TEST_001' });
    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Summary',
      rootCauseDescription: 'Description',
      rootCauseCategory: 'code_defect',
      contributingFactors: ['Factor'],
      impactDescription: 'Impact',
      dataLoss: false,
      resolutionDescription: 'Resolution',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [],
      lessonsLearned: ['Lesson']
    }, '2026-02-05T12:00:00.000Z');

    expect(postmortem.postmortem_id).toBe('PM_INC_TEST_001');
  });

  it('includes incident timeline', () => {
    const incident = createIncident({
      timeline: [
        { timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' },
        { timestamp: '2026-02-05T10:05:00.000Z', action: 'Triaged', actor: 'engineer' }
      ]
    });

    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Summary',
      rootCauseDescription: 'Description',
      rootCauseCategory: 'code_defect',
      contributingFactors: [],
      impactDescription: 'Impact',
      dataLoss: false,
      resolutionDescription: 'Resolution',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [],
      lessonsLearned: []
    }, '2026-02-05T12:00:00.000Z');

    expect(postmortem.timeline).toHaveLength(2);
  });

  it('includes incident evidence_refs', () => {
    const incident = createIncident({
      evidence_refs: ['evidence/log1.json', 'evidence/log2.json']
    });

    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Summary',
      rootCauseDescription: 'Description',
      rootCauseCategory: 'code_defect',
      contributingFactors: [],
      impactDescription: 'Impact',
      dataLoss: false,
      resolutionDescription: 'Resolution',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [],
      lessonsLearned: []
    }, '2026-02-05T12:00:00.000Z');

    expect(postmortem.evidence_refs).toContain('evidence/log1.json');
    expect(postmortem.evidence_refs).toContain('evidence/log2.json');
  });

  it('generates blame-free statement automatically', () => {
    const incident = createIncident();
    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Summary',
      rootCauseDescription: 'Description',
      rootCauseCategory: 'code_defect',
      contributingFactors: [],
      impactDescription: 'Impact',
      dataLoss: false,
      resolutionDescription: 'Resolution',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [],
      lessonsLearned: []
    }, '2026-02-05T12:00:00.000Z');

    expect(postmortem.blame_free_statement).toContain('systemic');
    expect(postmortem.blame_free_statement).toContain(incident.incident_id);
  });

  it('passes validation', () => {
    const incident = createIncident();
    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Configuration drift caused service degradation.',
      rootCauseDescription: 'Configuration was not validated.',
      rootCauseCategory: 'configuration_error',
      contributingFactors: ['Lack of validation'],
      impactDescription: 'Service latency increased.',
      dataLoss: false,
      resolutionDescription: 'Reverted and validated configuration.',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [{
        action_id: 'A1',
        description: 'Add validation',
        owner: 'Team',
        due_date: '2026-03-01',
        priority: 'high',
        status: 'pending'
      }],
      lessonsLearned: ['Better validation needed']
    }, '2026-02-05T12:00:00.000Z');

    const result = validatePostMortem(postmortem);
    expect(result.valid).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// generateBlameFreeStatement
// ─────────────────────────────────────────────────────────────

describe('generateBlameFreeStatement', () => {
  it('includes incident_id', () => {
    const incident = createIncident({ incident_id: 'INC_TEST_123' });
    const statement = generateBlameFreeStatement(incident);

    expect(statement).toContain('INC_TEST_123');
  });

  it('mentions systemic improvements', () => {
    const incident = createIncident();
    const statement = generateBlameFreeStatement(incident);

    expect(statement).toContain('system');
  });

  it('mentions good faith', () => {
    const incident = createIncident();
    const statement = generateBlameFreeStatement(incident);

    expect(statement).toContain('good faith');
  });

  it('focuses on prevention', () => {
    const incident = createIncident();
    const statement = generateBlameFreeStatement(incident);

    expect(statement).toContain('prevent');
  });
});

// ─────────────────────────────────────────────────────────────
// createPostMortemTemplate
// ─────────────────────────────────────────────────────────────

describe('createPostMortemTemplate', () => {
  it('creates template with placeholder values', () => {
    const incident = createIncident();
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    expect(template.author).toContain('[REQUIRED');
    expect(template.summary).toContain('[REQUIRED');
    expect(template.root_cause.description).toContain('[REQUIRED');
  });

  it('includes incident timeline', () => {
    const incident = createIncident({
      timeline: [{ timestamp: '2026-02-05T10:00:00.000Z', action: 'Detected', actor: 'system' }]
    });
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    expect(template.timeline).toHaveLength(1);
    expect(template.timeline[0].action).toBe('Detected');
  });

  it('includes incident evidence', () => {
    const incident = createIncident({ evidence_refs: ['evidence/001.json'] });
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    expect(template.evidence_refs).toContain('evidence/001.json');
  });

  it('has auto-generated blame-free statement', () => {
    const incident = createIncident();
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    expect(template.blame_free_statement).not.toContain('[REQUIRED');
    expect(template.blame_free_statement).toContain(incident.incident_id);
  });

  it('includes required action placeholder', () => {
    const incident = createIncident();
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    expect(template.actions).toHaveLength(1);
    expect(template.actions[0].description).toContain('[REQUIRED');
  });
});

// ─────────────────────────────────────────────────────────────
// isPostMortemComplete
// ─────────────────────────────────────────────────────────────

describe('isPostMortemComplete', () => {
  it('returns incomplete for template', () => {
    const incident = createIncident();
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    const result = isPostMortemComplete(template);

    expect(result.complete).toBe(false);
    expect(result.missingFields.length).toBeGreaterThan(0);
  });

  it('identifies specific missing fields', () => {
    const incident = createIncident();
    const template = createPostMortemTemplate(incident, '2026-02-05T12:00:00.000Z');

    const result = isPostMortemComplete(template);

    expect(result.missingFields).toContain('author');
    expect(result.missingFields).toContain('summary');
    expect(result.missingFields).toContain('root_cause.description');
  });

  it('returns complete for valid postmortem', () => {
    const incident = createIncident();
    const postmortem = generatePostMortem(incident, {
      author: 'Author',
      summary: 'Summary',
      rootCauseDescription: 'Description',
      rootCauseCategory: 'code_defect',
      contributingFactors: ['Factor'],
      impactDescription: 'Impact',
      dataLoss: false,
      resolutionDescription: 'Resolution',
      resolutionType: 'fix',
      resolvedBy: 'Team',
      actions: [{
        action_id: 'A1',
        description: 'Action description',
        owner: 'Team',
        due_date: '2026-03-01',
        priority: 'high',
        status: 'pending'
      }],
      lessonsLearned: ['Lesson']
    }, '2026-02-05T12:00:00.000Z');

    const result = isPostMortemComplete(postmortem);

    expect(result.complete).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });
});

// ─────────────────────────────────────────────────────────────
// ACTION HELPERS
// ─────────────────────────────────────────────────────────────

describe('generateActionId', () => {
  it('generates ACTION_001 for index 0', () => {
    expect(generateActionId(0)).toBe('ACTION_001');
  });

  it('generates ACTION_010 for index 9', () => {
    expect(generateActionId(9)).toBe('ACTION_010');
  });

  it('generates ACTION_100 for index 99', () => {
    expect(generateActionId(99)).toBe('ACTION_100');
  });
});

describe('createPreventiveAction', () => {
  it('creates action with correct fields', () => {
    const action = createPreventiveAction(
      0,
      'Add monitoring',
      'ops-team',
      '2026-03-01',
      'high'
    );

    expect(action.action_id).toBe('ACTION_001');
    expect(action.description).toBe('Add monitoring');
    expect(action.owner).toBe('ops-team');
    expect(action.due_date).toBe('2026-03-01');
    expect(action.priority).toBe('high');
    expect(action.status).toBe('pending');
  });

  it('defaults priority to medium', () => {
    const action = createPreventiveAction(0, 'Task', 'team', '2026-03-01');

    expect(action.priority).toBe('medium');
  });

  it('always starts with pending status', () => {
    const action = createPreventiveAction(0, 'Task', 'team', '2026-03-01', 'low');

    expect(action.status).toBe('pending');
  });
});
