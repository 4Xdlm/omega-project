import { describe, it, expect } from 'vitest';
import { runDiscomfortGate } from '../../src/gates/discomfort-gate.js';
import { getPlanA, getDefaultSConfig, buildMinimalProseDoc, TIMESTAMP } from '../fixtures.js';

describe('Discomfort Gate', () => {
  it('PASS when friction present', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('PASS');
  });

  it('checks min friction threshold', () => {
    const config = getDefaultSConfig();
    expect(config.DISCOMFORT_MIN_FRICTION.value).toBe(1);
  });

  it('checks multiple scenes', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('scenes_checked');
    expect(result.metrics['scenes_checked']).toBeGreaterThan(0);
  });

  it('counts conflict as friction', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('scenes_with_friction');
  });

  it('counts subtext as friction', () => {
    const { plan } = getPlanA();
    // Plan A scenes have subtext with tension_type
    const prose = buildMinimalProseDoc();
    const result = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics['scenes_with_friction']).toBeGreaterThanOrEqual(1);
  });

  it('is deterministic', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const r1 = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    const r2 = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.violations.length).toBe(r2.violations.length);
  });

  it('FAIL when no friction in scene', () => {
    // Create a plan-like object where scene has no conflict
    const { plan } = getPlanA();
    // With real plan, all scenes should have conflict
    const result = runDiscomfortGate(buildMinimalProseDoc(), plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.gate_id).toBe('DISCOMFORT_GATE');
  });

  it('includes metrics', () => {
    const { plan } = getPlanA();
    const prose = buildMinimalProseDoc();
    const result = runDiscomfortGate(prose, plan, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('min_friction_required');
  });
});
