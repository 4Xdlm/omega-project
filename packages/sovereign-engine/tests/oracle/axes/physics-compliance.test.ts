/**
 * Tests for physics_compliance axis — Sprint 5 / Roadmap 3.4
 * Invariants: PC-01 to PC-04
 */

import { describe, it, expect } from 'vitest';
import { scorePhysicsCompliance } from '../../../src/oracle/axes/physics-compliance.js';
import type { PhysicsAuditResult } from '../../../src/oracle/physics-audit.js';
import { SOVEREIGN_CONFIG } from '../../../src/config.js';

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
    expect(result.weight).toBe(0); // INFORMATIF by default
  });

  it('PC-05: weight reads from config (default 0)', () => {
    const audit: PhysicsAuditResult = {
      audit_id: 'test-audit-003',
      prose_length: 600,
      paragraph_count: 4,
      actual_trajectory: [],
      physics_score: 85.0,
      trajectory_compliance: 90.0,
      law_compliance: 85.0,
      dead_zone_score: 80.0,
      forced_transition_score: 85.0,
      segments: [],
      audit_log: [],
    };

    const result = scorePhysicsCompliance(audit);
    expect(result.weight).toBe(SOVEREIGN_CONFIG.PHYSICS_COMPLIANCE_WEIGHT);
    expect(result.weight).toBe(0); // Default per config
  });

  it('PC-06: score reflects audit physics_score', () => {
    const audit: PhysicsAuditResult = {
      audit_id: 'test-audit-004',
      prose_length: 700,
      paragraph_count: 5,
      actual_trajectory: [],
      physics_score: 73.5,
      trajectory_compliance: 75.0,
      law_compliance: 70.0,
      dead_zone_score: 75.0,
      forced_transition_score: 74.0,
      segments: [],
      audit_log: [],
    };

    const result = scorePhysicsCompliance(audit);
    expect(result.score).toBe(73.5);
    expect(result.details).toContain('73.5');
  });
});
