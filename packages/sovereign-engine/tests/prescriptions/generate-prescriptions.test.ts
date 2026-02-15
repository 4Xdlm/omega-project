/**
 * Tests for prescriptions — Sprint 3.3
 * Invariant: PRESC-01 (même liste prescriptions → même delta → même hash)
 */

import { describe, it, expect } from 'vitest';
import { generatePrescriptions, buildPrescriptionsDelta } from '../../src/prescriptions/index.js';
import type { PhysicsAuditResult } from '../../src/oracle/physics-audit.js';
import type { Prescription } from '../../src/prescriptions/types.js';

describe('generatePrescriptions', () => {
  it('audit disabled → empty prescriptions', () => {
    const disabledAudit: PhysicsAuditResult = {
      audit_id: 'disabled',
      audit_hash: '',
      scene_id: 'test',
      timestamp: '',
      physics_score: 0,
      trajectory_analysis: {
        segment_count: 0,
        deviations: {
          average_cosine: 0,
          average_euclidean: 0,
          max_cosine: 0,
          max_euclidean: 0,
        },
      },
      dead_zones: [],
      forced_transitions: 0,
      feasibility_failures: 0,
      prescriptions: [],
    };

    const prescriptions = generatePrescriptions(disabledAudit, 5);

    expect(prescriptions).toEqual([]);
  });

  it('audit undefined → empty prescriptions', () => {
    const prescriptions = generatePrescriptions(undefined, 5);

    expect(prescriptions).toEqual([]);
  });

  it('top-K filtering — audit avec 10 prescriptions, topK=5', () => {
    const mockPrescriptions: Prescription[] = Array.from({ length: 10 }, (_, i) => ({
      prescription_id: `presc-${i}`,
      segment_index: i,
      severity: i % 3 === 0 ? 'critical' : i % 2 === 0 ? 'high' : 'medium',
      type: 'dead_zone',
      diagnosis: `Problem ${i}`,
      action: `Fix ${i}`,
      expected_gain: 50 + i,
    }));

    const audit: PhysicsAuditResult = {
      audit_id: 'audit-topk',
      audit_hash: '0'.repeat(64),
      scene_id: 'scene-topk',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 70.0,
      trajectory_analysis: {
        segment_count: 10,
        deviations: {
          average_cosine: 0.85,
          average_euclidean: 15.0,
          max_cosine: 0.90,
          max_euclidean: 25.0,
        },
      },
      dead_zones: [],
      forced_transitions: 0,
      feasibility_failures: 0,
      prescriptions: mockPrescriptions,
    };

    const prescriptions = generatePrescriptions(audit, 5);

    expect(prescriptions).toHaveLength(5);
    expect(prescriptions.length).toBeLessThanOrEqual(5);
  });

  it('severity sorting — critical > high > medium, then by expected_gain desc', () => {
    const mockPrescriptions: Prescription[] = [
      {
        prescription_id: 'p1',
        segment_index: 1,
        severity: 'medium',
        type: 'dead_zone',
        diagnosis: 'Medium issue',
        action: 'Fix medium',
        expected_gain: 80,
      },
      {
        prescription_id: 'p2',
        segment_index: 2,
        severity: 'critical',
        type: 'trajectory',
        diagnosis: 'Critical issue',
        action: 'Fix critical',
        expected_gain: 60,
      },
      {
        prescription_id: 'p3',
        segment_index: 3,
        severity: 'high',
        type: 'forced_transition',
        diagnosis: 'High issue',
        action: 'Fix high',
        expected_gain: 70,
      },
      {
        prescription_id: 'p4',
        segment_index: 4,
        severity: 'critical',
        type: 'feasibility',
        diagnosis: 'Critical issue 2',
        action: 'Fix critical 2',
        expected_gain: 90,
      },
    ];

    const audit: PhysicsAuditResult = {
      audit_id: 'audit-sort',
      audit_hash: '1'.repeat(64),
      scene_id: 'scene-sort',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 65.0,
      trajectory_analysis: {
        segment_count: 4,
        deviations: {
          average_cosine: 0.80,
          average_euclidean: 18.0,
          max_cosine: 0.85,
          max_euclidean: 28.0,
        },
      },
      dead_zones: [],
      forced_transitions: 0,
      feasibility_failures: 0,
      prescriptions: mockPrescriptions,
    };

    const prescriptions = generatePrescriptions(audit, 10);

    // Should be sorted: critical (p4 gain 90), critical (p2 gain 60), high (p3 gain 70), medium (p1 gain 80)
    expect(prescriptions[0].severity).toBe('critical');
    expect(prescriptions[0].expected_gain).toBe(90); // p4
    expect(prescriptions[1].severity).toBe('critical');
    expect(prescriptions[1].expected_gain).toBe(60); // p2
    expect(prescriptions[2].severity).toBe('high');
    expect(prescriptions[3].severity).toBe('medium');
  });
});

describe('buildPrescriptionsDelta', () => {
  it('empty prescriptions → enabled=false + stable hash', () => {
    const delta = buildPrescriptionsDelta([]);

    expect(delta.enabled).toBe(false);
    expect(delta.count).toBe(0);
    expect(delta.severity_histogram).toEqual({ critical: 0, high: 0, medium: 0 });
    expect(delta.delta_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('prescriptions présentes → enabled=true + correct histogram', () => {
    const prescriptions: Prescription[] = [
      {
        prescription_id: 'p1',
        segment_index: 1,
        severity: 'critical',
        type: 'dead_zone',
        diagnosis: 'Problem 1',
        action: 'Fix 1',
        expected_gain: 80,
      },
      {
        prescription_id: 'p2',
        segment_index: 2,
        severity: 'critical',
        type: 'trajectory',
        diagnosis: 'Problem 2',
        action: 'Fix 2',
        expected_gain: 85,
      },
      {
        prescription_id: 'p3',
        segment_index: 3,
        severity: 'high',
        type: 'forced_transition',
        diagnosis: 'Problem 3',
        action: 'Fix 3',
        expected_gain: 70,
      },
      {
        prescription_id: 'p4',
        segment_index: 4,
        severity: 'medium',
        type: 'feasibility',
        diagnosis: 'Problem 4',
        action: 'Fix 4',
        expected_gain: 60,
      },
    ];

    const delta = buildPrescriptionsDelta(prescriptions);

    expect(delta.enabled).toBe(true);
    expect(delta.count).toBe(4);
    expect(delta.severity_histogram).toEqual({ critical: 2, high: 1, medium: 1 });
    expect(delta.delta_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('deterministic hash — same prescriptions → same delta_hash [PRESC-01]', () => {
    const prescriptions: Prescription[] = [
      {
        prescription_id: 'p1',
        segment_index: 1,
        severity: 'critical',
        type: 'dead_zone',
        diagnosis: 'Test',
        action: 'Fix',
        expected_gain: 75,
      },
    ];

    const delta1 = buildPrescriptionsDelta(prescriptions);
    const delta2 = buildPrescriptionsDelta(prescriptions);

    expect(delta1.delta_hash).toBe(delta2.delta_hash);
    expect(delta1).toEqual(delta2);
  });
});
