/**
 * Tests: Temporal Contract (Sprint 16.1)
 * Invariant: ART-TEMP-01
 */

import { describe, it, expect } from 'vitest';
import {
  validateTemporalContract,
  createDefaultTemporalContract,
  type TemporalContract,
} from '../../src/temporal/temporal-contract.js';

describe('TemporalContract (ART-TEMP-01)', () => {
  it('TEMP-01: default contract is valid', () => {
    const contract = createDefaultTemporalContract(1000);

    expect(contract.version).toBe('1.0');
    expect(contract.key_moments.length).toBe(3);
    expect(contract.compression_zones.length).toBe(2);
    expect(contract.total_word_target).toBe(1000);

    const validation = validateTemporalContract(contract);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('TEMP-02: invalid contract — word budget > 80%', () => {
    const contract: TemporalContract = {
      version: '1.0',
      total_word_target: 1000,
      key_moments: [
        { moment_id: 'km1', label: 'a', position_pct: 25, word_budget_pct: 50, emotion_peak: false, pacing: 'dilated' },
        { moment_id: 'km2', label: 'b', position_pct: 75, word_budget_pct: 40, emotion_peak: false, pacing: 'dilated' },
      ],
      compression_zones: [],
      foreshadowing_hooks: [],
    };

    const validation = validateTemporalContract(contract);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('80%'))).toBe(true);
  });

  it('TEMP-03: invalid contract — foreshadowing plant >= resolve', () => {
    const contract: TemporalContract = {
      version: '1.0',
      total_word_target: 1000,
      key_moments: [
        { moment_id: 'km1', label: 'a', position_pct: 50, word_budget_pct: 20, emotion_peak: true, pacing: 'dilated' },
      ],
      compression_zones: [],
      foreshadowing_hooks: [
        { hook_id: 'fh1', plant_position_pct: 80, resolve_position_pct: 20, emotion_planted: 'peur', emotion_resolved: 'terreur', motif: 'ombre' },
      ],
    };

    const validation = validateTemporalContract(contract);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.includes('plant >= resolve'))).toBe(true);
  });

  it('TEMP-04: invalid contract — no key moments', () => {
    const contract: TemporalContract = {
      version: '1.0',
      total_word_target: 500,
      key_moments: [],
      compression_zones: [],
      foreshadowing_hooks: [],
    };

    const validation = validateTemporalContract(contract);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some(e => e.toLowerCase().includes('at least 1'))).toBe(true);
  });
});
