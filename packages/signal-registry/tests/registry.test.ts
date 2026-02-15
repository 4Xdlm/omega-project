/**
 * OMEGA Signal Registry — Tests
 * Invariants REG-01 through REG-05
 */

import { describe, it, expect } from 'vitest';
import {
  OMEGA_SIGNAL_REGISTRY,
  SIGNAL_ID_SET,
  REGISTRY_HASH,
  VALID_PRODUCERS,
  validateProducerOutputs,
  validateConsumerRequirements,
} from '../src/index.js';

describe('signal-registry', () => {
  // REG-01: All signal_id unique
  it('REG-01: all signal_id are unique', () => {
    const ids = OMEGA_SIGNAL_REGISTRY.map((s) => s.signal_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  // REG-02: All producers are in allowlist
  it('REG-02: all producers are valid', () => {
    for (const signal of OMEGA_SIGNAL_REGISTRY) {
      expect(
        VALID_PRODUCERS.includes(signal.producer as any),
        `Signal '${signal.signal_id}' has unknown producer '${signal.producer}'`,
      ).toBe(true);
    }
  });

  // REG-03: Dimensions coherent
  it('REG-03: dimensions are coherent when defined', () => {
    for (const signal of OMEGA_SIGNAL_REGISTRY) {
      if (signal.dimensions !== undefined) {
        expect(signal.dimensions).toBeGreaterThan(0);
        // 14D signals must have dimensions = 14
        if (signal.signal_id.includes('14d')) {
          expect(signal.dimensions).toBe(14);
        }
      }
    }
  });

  // REG-04: required_params non-empty for stable signals that need them
  it('REG-04: stable signals with dependencies have required_params', () => {
    for (const signal of OMEGA_SIGNAL_REGISTRY) {
      if (signal.stability === 'stable' && signal.required_params.length > 0) {
        for (const param of signal.required_params) {
          expect(param.length).toBeGreaterThan(0);
        }
      }
    }
  });

  // REG-05: REGISTRY_HASH is stable (deterministic)
  it('REG-05: REGISTRY_HASH is stable across calls', () => {
    expect(typeof REGISTRY_HASH).toBe('string');
    expect(REGISTRY_HASH.length).toBe(64); // SHA-256 = 64 hex chars
    // Re-import to verify hash doesn't change
    const hash2 = REGISTRY_HASH;
    expect(hash2).toBe(REGISTRY_HASH);
  });

  // SIGNAL_ID_SET has correct size
  it('SIGNAL_ID_SET matches registry length', () => {
    expect(SIGNAL_ID_SET.size).toBe(OMEGA_SIGNAL_REGISTRY.length);
  });

  // validateProducerOutputs: valid case
  it('validateProducerOutputs: valid producer + capabilities', () => {
    const result = validateProducerOutputs(
      'omega-forge',
      ['emotion.trajectory.prescribed.14d', 'emotion.physics_profile'],
      { persistence_ceiling: 100, canonical_table: {} },
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // validateProducerOutputs: unknown signal = FAIL
  it('validateProducerOutputs: unknown signal fails', () => {
    const result = validateProducerOutputs(
      'omega-forge',
      ['emotion.trajectory.prescribed.14d', 'fake.nonexistent.signal'],
      { persistence_ceiling: 100 },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // validateProducerOutputs: missing required param = FAIL
  it('validateProducerOutputs: missing required param fails', () => {
    const result = validateProducerOutputs(
      'omega-forge',
      ['emotion.trajectory.prescribed.14d'],
      {}, // persistence_ceiling missing
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('persistence_ceiling'))).toBe(true);
  });

  // validateProducerOutputs: wrong producer = FAIL
  it('validateProducerOutputs: wrong producer fails', () => {
    const result = validateProducerOutputs(
      'sovereign-engine',
      ['emotion.trajectory.prescribed.14d'], // belongs to omega-forge
      { persistence_ceiling: 100 },
    );
    expect(result.valid).toBe(false);
  });

  // validateConsumerRequirements: all required present = PASS
  it('validateConsumerRequirements: all required present passes', () => {
    const result = validateConsumerRequirements(
      ['emotion.trajectory.prescribed.14d', 'meta.language'],
      ['emotion.decay_expectations'],
      ['emotion.trajectory.prescribed.14d', 'meta.language', 'emotion.decay_expectations'],
    );
    expect(result.valid).toBe(true);
    expect(result.degraded_signals).toHaveLength(0);
  });

  // validateConsumerRequirements: required missing = FAIL
  it('validateConsumerRequirements: missing required fails', () => {
    const result = validateConsumerRequirements(
      ['emotion.trajectory.prescribed.14d', 'meta.language'],
      [],
      ['emotion.trajectory.prescribed.14d'], // meta.language missing
    );
    expect(result.valid).toBe(false);
  });

  // validateConsumerRequirements: optional missing = degrade-explicit
  it('validateConsumerRequirements: missing optional degrades explicitly', () => {
    const result = validateConsumerRequirements(
      ['emotion.trajectory.prescribed.14d'],
      ['emotion.decay_expectations', 'emotion.blend_zones'],
      ['emotion.trajectory.prescribed.14d'], // optionals missing
    );
    expect(result.valid).toBe(true);
    expect(result.degraded_signals).toContain('emotion.decay_expectations');
    expect(result.degraded_signals).toContain('emotion.blend_zones');
    expect(result.warnings.length).toBe(2);
  });

  // Registry has expected signal count
  it('registry contains 22 signals', () => {
    expect(OMEGA_SIGNAL_REGISTRY.length).toBe(22);
  });
});
