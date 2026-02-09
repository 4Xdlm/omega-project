/**
 * OMEGA Release — Rollback Tests
 * Phase G.0
 */

import { describe, it, expect } from 'vitest';
import { generateRollbackPlan, requiresDataMigration, formatRollbackPlan } from '../../src/policy/rollback.js';

describe('requiresDataMigration', () => {
  it('true for major version change', () => {
    expect(requiresDataMigration('2.0.0', '1.0.0')).toBe(true);
  });

  it('false for same major version', () => {
    expect(requiresDataMigration('1.1.0', '1.0.0')).toBe(false);
  });

  it('true for invalid versions', () => {
    expect(requiresDataMigration('invalid', 'also-invalid')).toBe(true);
  });
});

describe('generateRollbackPlan', () => {
  it('generates plan for valid rollback', () => {
    const plan = generateRollbackPlan('2.0.0', '1.0.0');
    expect(plan.fromVersion).toBe('2.0.0');
    expect(plan.toVersion).toBe('1.0.0');
    expect(plan.steps.length).toBeGreaterThan(0);
  });

  it('empty plan for upgrade (not rollback)', () => {
    const plan = generateRollbackPlan('1.0.0', '2.0.0');
    expect(plan.steps).toHaveLength(0);
  });

  it('includes data migration for major rollback', () => {
    const plan = generateRollbackPlan('2.0.0', '1.0.0');
    expect(plan.requiresDataMigration).toBe(true);
    const actions = plan.steps.map(s => s.action);
    expect(actions).toContain('MIGRATE');
  });

  it('no migration for minor rollback', () => {
    const plan = generateRollbackPlan('1.2.0', '1.1.0');
    expect(plan.requiresDataMigration).toBe(false);
    const actions = plan.steps.map(s => s.action);
    expect(actions).not.toContain('MIGRATE');
  });

  it('includes BACKUP, VERIFY steps', () => {
    const plan = generateRollbackPlan('1.1.0', '1.0.0');
    const actions = plan.steps.map(s => s.action);
    expect(actions).toContain('BACKUP');
    expect(actions).toContain('VERIFY');
  });

  it('has estimated downtime', () => {
    const plan = generateRollbackPlan('1.1.0', '1.0.0');
    expect(plan.estimatedDowntime).toBeTruthy();
  });

  it('handles invalid versions gracefully', () => {
    const plan = generateRollbackPlan('invalid', 'also-invalid');
    expect(plan.steps).toHaveLength(0);
  });
});

describe('formatRollbackPlan', () => {
  it('formats plan as text', () => {
    const plan = generateRollbackPlan('1.1.0', '1.0.0');
    const text = formatRollbackPlan(plan);
    expect(text).toContain('Rollback Plan');
    expect(text).toContain('1.1.0');
    expect(text).toContain('1.0.0');
  });
});
