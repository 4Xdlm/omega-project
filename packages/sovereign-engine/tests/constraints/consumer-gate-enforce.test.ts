import { describe, it, expect } from 'vitest';
import { validateConsumerRequirements } from '@omega/signal-registry';

describe('consumer-gate-enforce', () => {
  const REQUIRED = [
    'emotion.trajectory.prescribed.14d',
    'emotion.trajectory.prescribed.xyz',
  ];
  const OPTIONAL = [
    'emotion.physics_profile',
    'emotion.transition_map',
  ];

  it('PASS when all required present', () => {
    const r = validateConsumerRequirements(
      REQUIRED, OPTIONAL,
      ['emotion.trajectory.prescribed.14d', 'emotion.trajectory.prescribed.xyz', 'emotion.physics_profile'],
    );
    expect(r.valid).toBe(true);
  });

  it('FAIL when required missing', () => {
    const r = validateConsumerRequirements(
      REQUIRED, OPTIONAL,
      ['emotion.trajectory.prescribed.14d'], // xyz manquant
    );
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it('DEGRADE-EXPLICIT when optional missing', () => {
    const r = validateConsumerRequirements(
      REQUIRED, OPTIONAL,
      ['emotion.trajectory.prescribed.14d', 'emotion.trajectory.prescribed.xyz'],
    );
    expect(r.valid).toBe(true);
    expect(r.degraded_signals).toContain('emotion.physics_profile');
  });

  it('FAIL when unknown signal in required', () => {
    const r = validateConsumerRequirements(
      ['fake.nonexistent.signal'], [], ['fake.nonexistent.signal'],
    );
    expect(r.valid).toBe(false);
  });
});
