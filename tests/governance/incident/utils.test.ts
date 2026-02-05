/**
 * PHASE J — UTILITY FUNCTION TESTS
 * Tests ID generation, SLA computation, and validation utilities.
 */

import { describe, it, expect } from 'vitest';
import type { IncidentEvent, PostMortem, RollbackPlan } from '../../../GOVERNANCE/incident/types.js';
import {
  generateIncidentEventId,
  generateIncidentId,
  generatePostMortemId,
  generateRollbackId,
  generateIncidentReportId,
  computeSLADeadline,
  checkSLACompliance,
  checkImmediateLogging,
  validateIncidentEvent,
  validatePostMortem,
  validateRollbackPlan,
  computeWindow,
  computeContentHash,
  requiresPostMortem
} from '../../../GOVERNANCE/incident/incident_utils.js';

// ─────────────────────────────────────────────────────────────
// ID GENERATION
// ─────────────────────────────────────────────────────────────

describe('ID generation', () => {
  describe('generateIncidentEventId', () => {
    it('generates correct format for CRITICAL', () => {
      const id = generateIncidentEventId('CRITICAL', new Date('2026-02-05'), 1);
      expect(id).toBe('INC_CRI_20260205_001');
    });

    it('generates correct format for HIGH', () => {
      const id = generateIncidentEventId('HIGH', new Date('2026-02-05'), 42);
      expect(id).toBe('INC_HIG_20260205_042');
    });

    it('generates correct format for MEDIUM', () => {
      const id = generateIncidentEventId('MEDIUM', new Date('2026-12-25'), 123);
      expect(id).toBe('INC_MED_20261225_123');
    });

    it('generates correct format for LOW', () => {
      const id = generateIncidentEventId('LOW', new Date('2026-01-01'), 1);
      expect(id).toBe('INC_LOW_20260101_001');
    });

    it('pads sequence numbers', () => {
      expect(generateIncidentEventId('MEDIUM', new Date('2026-01-01'), 1)).toContain('001');
      expect(generateIncidentEventId('MEDIUM', new Date('2026-01-01'), 10)).toContain('010');
      expect(generateIncidentEventId('MEDIUM', new Date('2026-01-01'), 100)).toContain('100');
    });
  });

  describe('generateIncidentId', () => {
    it('generates correct format', () => {
      const id = generateIncidentId(new Date('2026-02-05T10:30:45.000Z'), 'test-content');
      expect(id).toMatch(/^INCIDENT_20260205T103045Z_[a-f0-9]{8}$/);
    });

    it('produces different hashes for different content', () => {
      const date = new Date('2026-02-05T10:30:45.000Z');
      const id1 = generateIncidentId(date, 'content-a');
      const id2 = generateIncidentId(date, 'content-b');
      expect(id1).not.toBe(id2);
    });

    it('produces same ID for same inputs', () => {
      const date = new Date('2026-02-05T10:30:45.000Z');
      const id1 = generateIncidentId(date, 'content');
      const id2 = generateIncidentId(date, 'content');
      expect(id1).toBe(id2);
    });
  });

  describe('generatePostMortemId', () => {
    it('prefixes with PM_', () => {
      const id = generatePostMortemId('INC_MED_20260205_001');
      expect(id).toBe('PM_INC_MED_20260205_001');
    });
  });

  describe('generateRollbackId', () => {
    it('generates correct format', () => {
      const id = generateRollbackId('INC_MED_20260205_001', 1);
      expect(id).toBe('RB_INC_MED_20260205_001_001');
    });

    it('pads sequence numbers', () => {
      expect(generateRollbackId('INC_001', 5)).toContain('005');
      expect(generateRollbackId('INC_001', 50)).toContain('050');
    });
  });

  describe('generateIncidentReportId', () => {
    it('generates correct format', () => {
      const id = generateIncidentReportId(new Date('2026-02-05T12:00:00.000Z'), 'content');
      expect(id).toMatch(/^INC_REPORT_20260205T120000Z_[a-f0-9]{8}$/);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SLA COMPUTATION
// ─────────────────────────────────────────────────────────────

describe('SLA computation', () => {
  describe('computeSLADeadline', () => {
    it('adds 1 hour for CRITICAL', () => {
      const deadline = computeSLADeadline('2026-02-05T10:00:00.000Z', 'CRITICAL');
      expect(deadline).toBe('2026-02-05T11:00:00.000Z');
    });

    it('adds 4 hours for HIGH', () => {
      const deadline = computeSLADeadline('2026-02-05T10:00:00.000Z', 'HIGH');
      expect(deadline).toBe('2026-02-05T14:00:00.000Z');
    });

    it('adds 24 hours for MEDIUM', () => {
      const deadline = computeSLADeadline('2026-02-05T10:00:00.000Z', 'MEDIUM');
      expect(deadline).toBe('2026-02-06T10:00:00.000Z');
    });

    it('adds 72 hours for LOW', () => {
      const deadline = computeSLADeadline('2026-02-05T10:00:00.000Z', 'LOW');
      expect(deadline).toBe('2026-02-08T10:00:00.000Z');
    });
  });

  describe('checkSLACompliance', () => {
    it('returns true when resolved before deadline', () => {
      const detected = '2026-02-05T10:00:00.000Z';
      const resolved = '2026-02-05T10:30:00.000Z';
      expect(checkSLACompliance(detected, resolved, 'CRITICAL')).toBe(true);
    });

    it('returns true when resolved exactly at deadline', () => {
      const detected = '2026-02-05T10:00:00.000Z';
      const resolved = '2026-02-05T11:00:00.000Z';
      expect(checkSLACompliance(detected, resolved, 'CRITICAL')).toBe(true);
    });

    it('returns false when resolved after deadline', () => {
      const detected = '2026-02-05T10:00:00.000Z';
      const resolved = '2026-02-05T12:00:00.000Z';
      expect(checkSLACompliance(detected, resolved, 'CRITICAL')).toBe(false);
    });
  });

  describe('checkImmediateLogging', () => {
    it('returns true within 15 minutes', () => {
      expect(checkImmediateLogging(
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T10:10:00.000Z'
      )).toBe(true);
    });

    it('returns true at exactly 15 minutes', () => {
      expect(checkImmediateLogging(
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T10:15:00.000Z'
      )).toBe(true);
    });

    it('returns false after 15 minutes', () => {
      expect(checkImmediateLogging(
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T10:16:00.000Z'
      )).toBe(false);
    });

    it('returns false after 1 hour', () => {
      expect(checkImmediateLogging(
        '2026-02-05T10:00:00.000Z',
        '2026-02-05T11:00:00.000Z'
      )).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────────────────────

describe('validateIncidentEvent', () => {
  const createValidIncident = (overrides: Partial<IncidentEvent> = {}): IncidentEvent => {
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
        title: 'Title',
        description: 'Description',
        affected_components: ['service-a']
      },
      timeline: [],
      evidence_refs: ['evidence/001.json'],
      sla: {
        response_deadline: computeSLADeadline(detected, 'MEDIUM'),
        sla_met: true
      },
      log_chain_prev_hash: null,
      ...overrides
    };
  };

  it('validates correct incident', () => {
    const incident = createValidIncident();
    const result = validateIncidentEvent(incident);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails with wrong event_type', () => {
    const incident = createValidIncident({ event_type: 'wrong' as any });
    const result = validateIncidentEvent(incident);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('event_type'))).toBe(true);
  });

  it('fails with wrong schema_version', () => {
    const incident = createValidIncident({ schema_version: '2.0.0' as any });
    const result = validateIncidentEvent(incident);
    expect(result.valid).toBe(false);
  });

  it('fails with invalid severity', () => {
    const incident = createValidIncident({ severity: 'INVALID' as any });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-01'))).toBe(true);
  });

  it('fails with missing detected_at', () => {
    const incident = createValidIncident({ detected_at: '' });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-02'))).toBe(true);
  });

  it('fails with empty evidence_refs', () => {
    const incident = createValidIncident({ evidence_refs: [] });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-03'))).toBe(true);
  });

  it('fails with missing title', () => {
    const incident = createValidIncident({
      metadata: { title: '', description: 'desc', affected_components: [] }
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('title'))).toBe(true);
  });

  it('fails with missing SLA deadline', () => {
    const incident = createValidIncident({
      sla: { response_deadline: '', sla_met: null }
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INV-J-09'))).toBe(true);
  });

  it('fails with late logging', () => {
    const incident = createValidIncident({
      detected_at: '2026-02-05T10:00:00.000Z',
      timestamp: '2026-02-05T11:00:00.000Z'
    });
    const result = validateIncidentEvent(incident);
    expect(result.errors.some(e => e.includes('INC-002'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// WINDOW AND HASH COMPUTATION
// ─────────────────────────────────────────────────────────────

describe('computeWindow', () => {
  it('handles empty incidents', () => {
    const result = computeWindow([]);
    expect(result.incidents_count).toBe(0);
  });

  it('computes window from single incident', () => {
    const incidents: IncidentEvent[] = [{
      event_type: 'incident_event',
      schema_version: '1.0.0',
      event_id: 'E1',
      incident_id: 'I1',
      timestamp: '2026-02-05T10:00:00.000Z',
      detected_at: '2026-02-05T09:55:00.000Z',
      source: 'monitoring',
      severity: 'LOW',
      status: 'resolved',
      metadata: { title: 'T', description: 'D', affected_components: [] },
      timeline: [],
      evidence_refs: ['e1'],
      sla: { response_deadline: '', sla_met: null },
      log_chain_prev_hash: null
    }];

    const result = computeWindow(incidents);
    expect(result.from).toBe('2026-02-05T10:00:00.000Z');
    expect(result.to).toBe('2026-02-05T10:00:00.000Z');
    expect(result.incidents_count).toBe(1);
  });

  it('computes window from multiple incidents', () => {
    const incidents: IncidentEvent[] = [
      {
        event_type: 'incident_event',
        schema_version: '1.0.0',
        event_id: 'E1',
        incident_id: 'I1',
        timestamp: '2026-02-05T10:00:00.000Z',
        detected_at: '2026-02-05T09:55:00.000Z',
        source: 'monitoring',
        severity: 'LOW',
        status: 'resolved',
        metadata: { title: 'T', description: 'D', affected_components: [] },
        timeline: [],
        evidence_refs: ['e1'],
        sla: { response_deadline: '', sla_met: null },
        log_chain_prev_hash: null
      },
      {
        event_type: 'incident_event',
        schema_version: '1.0.0',
        event_id: 'E2',
        incident_id: 'I2',
        timestamp: '2026-02-05T12:00:00.000Z',
        detected_at: '2026-02-05T11:55:00.000Z',
        source: 'monitoring',
        severity: 'LOW',
        status: 'resolved',
        metadata: { title: 'T', description: 'D', affected_components: [] },
        timeline: [],
        evidence_refs: ['e2'],
        sla: { response_deadline: '', sla_met: null },
        log_chain_prev_hash: null
      }
    ];

    const result = computeWindow(incidents);
    expect(result.from).toBe('2026-02-05T10:00:00.000Z');
    expect(result.to).toBe('2026-02-05T12:00:00.000Z');
    expect(result.incidents_count).toBe(2);
  });
});

describe('computeContentHash', () => {
  it('produces SHA-256 hash', () => {
    const hash = computeContentHash('test content');
    expect(hash.length).toBe(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it('produces same hash for same content', () => {
    const hash1 = computeContentHash('content');
    const hash2 = computeContentHash('content');
    expect(hash1).toBe(hash2);
  });

  it('produces different hash for different content', () => {
    const hash1 = computeContentHash('content-a');
    const hash2 = computeContentHash('content-b');
    expect(hash1).not.toBe(hash2);
  });
});

describe('requiresPostMortem', () => {
  it('returns true for CRITICAL', () => {
    expect(requiresPostMortem('CRITICAL')).toBe(true);
  });

  it('returns true for HIGH', () => {
    expect(requiresPostMortem('HIGH')).toBe(true);
  });

  it('returns true for MEDIUM', () => {
    expect(requiresPostMortem('MEDIUM')).toBe(true);
  });

  it('returns false for LOW', () => {
    expect(requiresPostMortem('LOW')).toBe(false);
  });
});
