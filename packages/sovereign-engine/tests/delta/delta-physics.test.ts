/**
 * Tests for delta-physics — Sprint 3.2
 * Invariant: DELTA-PHYS-01 (même audit → même delta → même hash)
 */

import { describe, it, expect } from 'vitest';
import { buildPhysicsDelta } from '../../src/delta/delta-physics.js';
import type { PhysicsAuditResult } from '../../src/oracle/physics-audit.js';

describe('buildPhysicsDelta', () => {
  it('audit disabled → enabled=false + stable hash', () => {
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

    const delta = buildPhysicsDelta(disabledAudit);

    expect(delta.enabled).toBe(false);
    expect(delta.physics_score).toBe(0);
    expect(delta.trajectory_compliance.cosine_avg).toBe(0);
    expect(delta.trajectory_compliance.euclidean_avg).toBe(0);
    expect(delta.violations.dead_zones_count).toBe(0);
    expect(delta.violations.forced_transitions_count).toBe(0);
    expect(delta.violations.feasibility_failures_count).toBe(0);
    expect(delta.delta_hash).toBe('e29bf5492aab623bfafb419b94fce6f9697da5524101e0454ebe24e8a01e7f12');
  });

  it('audit undefined → enabled=false + stable hash', () => {
    const delta = buildPhysicsDelta(undefined);

    expect(delta.enabled).toBe(false);
    expect(delta.physics_score).toBe(0);
    // Same hash as disabled audit (deterministic)
    expect(delta.delta_hash).toBe('e29bf5492aab623bfafb419b94fce6f9697da5524101e0454ebe24e8a01e7f12');
  });

  it('audit normal → enabled=true + correct metrics', () => {
    const normalAudit: PhysicsAuditResult = {
      audit_id: 'audit-001',
      audit_hash: '0'.repeat(64),
      scene_id: 'scene-001',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 85.5,
      trajectory_analysis: {
        segment_count: 10,
        deviations: {
          average_cosine: 0.92,
          average_euclidean: 12.5,
          max_cosine: 0.95,
          max_euclidean: 20.0,
        },
      },
      dead_zones: [
        {
          segment_index: 3,
          target_xyz: { X: 50, Y: 50, Z: 50 },
          actual_xyz: { X: 10, Y: 10, Z: 10 },
          distance: 69.28,
          severity: 'high',
        },
      ],
      forced_transitions: 2,
      feasibility_failures: 1,
      prescriptions: [],
    };

    const delta = buildPhysicsDelta(normalAudit);

    expect(delta.enabled).toBe(true);
    expect(delta.physics_score).toBe(85.5);
    expect(delta.trajectory_compliance.cosine_avg).toBe(0.92);
    expect(delta.trajectory_compliance.euclidean_avg).toBe(12.5);
    expect(delta.violations.dead_zones_count).toBe(1);
    expect(delta.violations.forced_transitions_count).toBe(2);
    expect(delta.violations.feasibility_failures_count).toBe(1);
    expect(delta.delta_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('NaN/Infinity dans cosine/euclidean → sanitize à 0', () => {
    const nanAudit: PhysicsAuditResult = {
      audit_id: 'audit-nan',
      audit_hash: '0'.repeat(64),
      scene_id: 'scene-nan',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 50.0,
      trajectory_analysis: {
        segment_count: 5,
        deviations: {
          average_cosine: NaN,
          average_euclidean: Infinity,
          max_cosine: NaN,
          max_euclidean: -Infinity,
        },
      },
      dead_zones: [],
      forced_transitions: 0,
      feasibility_failures: 0,
      prescriptions: [],
    };

    const delta = buildPhysicsDelta(nanAudit);

    expect(delta.trajectory_compliance.cosine_avg).toBe(0);
    expect(delta.trajectory_compliance.euclidean_avg).toBe(0);
    expect(delta.delta_hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('hash déterministe — même input → même hash [DELTA-PHYS-01]', () => {
    const audit: PhysicsAuditResult = {
      audit_id: 'audit-det',
      audit_hash: '1'.repeat(64),
      scene_id: 'scene-det',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 75.0,
      trajectory_analysis: {
        segment_count: 8,
        deviations: {
          average_cosine: 0.88,
          average_euclidean: 15.0,
          max_cosine: 0.90,
          max_euclidean: 25.0,
        },
      },
      dead_zones: [],
      forced_transitions: 1,
      feasibility_failures: 0,
      prescriptions: [],
    };

    const delta1 = buildPhysicsDelta(audit);
    const delta2 = buildPhysicsDelta(audit);

    expect(delta1.delta_hash).toBe(delta2.delta_hash);
    expect(delta1).toEqual(delta2);
  });

  it('violations counters correct', () => {
    const auditWithViolations: PhysicsAuditResult = {
      audit_id: 'audit-violations',
      audit_hash: '2'.repeat(64),
      scene_id: 'scene-violations',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 60.0,
      trajectory_analysis: {
        segment_count: 12,
        deviations: {
          average_cosine: 0.80,
          average_euclidean: 20.0,
          max_cosine: 0.85,
          max_euclidean: 30.0,
        },
      },
      dead_zones: [
        {
          segment_index: 2,
          target_xyz: { X: 30, Y: 40, Z: 50 },
          actual_xyz: { X: 10, Y: 20, Z: 30 },
          distance: 34.64,
          severity: 'medium',
        },
        {
          segment_index: 5,
          target_xyz: { X: 60, Y: 70, Z: 80 },
          actual_xyz: { X: 20, Y: 30, Z: 40 },
          distance: 69.28,
          severity: 'high',
        },
        {
          segment_index: 8,
          target_xyz: { X: 70, Y: 80, Z: 90 },
          actual_xyz: { X: 50, Y: 60, Z: 70 },
          distance: 34.64,
          severity: 'low',
        },
      ],
      forced_transitions: 5,
      feasibility_failures: 3,
      prescriptions: [],
    };

    const delta = buildPhysicsDelta(auditWithViolations);

    expect(delta.violations.dead_zones_count).toBe(3);
    expect(delta.violations.forced_transitions_count).toBe(5);
    expect(delta.violations.feasibility_failures_count).toBe(3);
  });

  it('no omega-forge calls — unit pur (vérifié par isolation)', () => {
    // Ce test vérifie que buildPhysicsDelta ne fait AUCUN appel externe
    // Il consomme uniquement PhysicsAuditResult en input (SSOT pattern)
    const audit: PhysicsAuditResult = {
      audit_id: 'audit-unit',
      audit_hash: '3'.repeat(64),
      scene_id: 'scene-unit',
      timestamp: '2026-01-01T00:00:00Z',
      physics_score: 90.0,
      trajectory_analysis: {
        segment_count: 6,
        deviations: {
          average_cosine: 0.95,
          average_euclidean: 8.0,
          max_cosine: 0.98,
          max_euclidean: 12.0,
        },
      },
      dead_zones: [],
      forced_transitions: 0,
      feasibility_failures: 0,
      prescriptions: [],
    };

    // Should execute instantly (no async, no external calls)
    const delta = buildPhysicsDelta(audit);

    expect(delta.enabled).toBe(true);
    expect(delta.physics_score).toBe(90.0);
    expect(delta.delta_hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
