/**
 * Tests for physics_compliance axis — Sprint 5 / Roadmap 3.4
 * Invariants: PC-01 to PC-04
 */

import { describe, it, expect } from 'vitest';
import { scorePhysicsCompliance } from '../../../src/oracle/axes/physics-compliance.js';
import type { PhysicsAuditResult } from '../../../src/oracle/physics-audit.js';

describe('scorePhysicsCompliance', () => {
  it('PC-01: audit undefined → neutral score 50, weight=0', () => {
    const result = scorePhysicsCompliance(undefined);

    expect(result.name).toBe('physics_compliance');
    expect(result.score).toBe(50);
    expect(result.weight).toBe(0);
    expect(result.method).toBe('CALC');
    expect(result.details).toContain('Physics audit disabled');
  });

  it('PC-02: audit disabled → neutral score 50, weight=0', () => {
    const auditDisabled: PhysicsAuditResult = {
      audit_id: 'disabled',
      prose_length: 0,
      paragraph_count: 0,
      actual_trajectory: [],
      physics_score: 50,
      trajectory_compliance: 0,
      law_compliance: 0,
      dead_zone_score: 0,
      forced_transition_score: 0,
      segments: [],
      audit_log: [],
    };

    const result = scorePhysicsCompliance(auditDisabled);

    expect(result.name).toBe('physics_compliance');
    expect(result.score).toBe(50);
    expect(result.weight).toBe(0);
    expect(result.method).toBe('CALC');
    expect(result.details).toContain('Physics audit disabled');
  });

  it('PC-03: audit with physics_score → wraps score, weight=0', () => {
    const auditActive: PhysicsAuditResult = {
      audit_id: 'test-audit-001',
      prose_length: 1200,
      paragraph_count: 8,
      actual_trajectory: [],
      physics_score: 78.5,
      trajectory_compliance: 85.0,
      law_compliance: 80.0,
      dead_zone_score: 75.0,
      forced_transition_score: 90.0,
      segments: [],
      audit_log: [],
    };

    const result = scorePhysicsCompliance(auditActive);

    expect(result.name).toBe('physics_compliance');
    expect(result.score).toBe(78.5);
    expect(result.weight).toBe(0);
    expect(result.method).toBe('CALC');
    expect(result.details).toContain('Physics score: 78.5');
    expect(result.details).toContain('informatif');
    expect(result.details).toContain('weight=0');
  });

  it('PC-04: structure validation — AxisScore format', () => {
    const audit: PhysicsAuditResult = {
      audit_id: 'test-audit-002',
      prose_length: 800,
      paragraph_count: 5,
      actual_trajectory: [],
      physics_score: 92.3,
      trajectory_compliance: 95.0,
      law_compliance: 90.0,
      dead_zone_score: 88.0,
      forced_transition_score: 96.0,
      segments: [],
      audit_log: [],
    };

    const result = scorePhysicsCompliance(audit);

    // Validate AxisScore structure
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('weight');
    expect(result).toHaveProperty('method');
    expect(result).toHaveProperty('details');

    // Validate types
    expect(typeof result.name).toBe('string');
    expect(typeof result.score).toBe('number');
    expect(typeof result.weight).toBe('number');
    expect(typeof result.method).toBe('string');
    expect(typeof result.details).toBe('string');

    // Validate ranges
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.weight).toBe(0); // INFORMATIF
  });
});
