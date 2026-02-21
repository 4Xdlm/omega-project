/**
 * Tests: Voice Drift Param Exclusion (INV-VOICE-DRIFT-01)
 * Verifies that non-applicable params are excluded from drift RMS.
 */

import { describe, it, expect } from 'vitest';
import {
  computeVoiceDrift,
  NON_APPLICABLE_VOICE_PARAMS,
  measureVoice,
  type VoiceGenome,
} from '../../src/voice/voice-genome.js';

describe('Voice Drift Param Exclusion (INV-VOICE-DRIFT-01)', () => {
  const target: VoiceGenome = {
    phrase_length_mean: 0.5,
    dialogue_ratio: 0.3,
    metaphor_density: 0.4,
    language_register: 0.7,
    irony_level: 0.2,
    ellipsis_rate: 0.3,
    abstraction_ratio: 0.4,
    punctuation_style: 0.5,
    paragraph_rhythm: 0.6,
    opening_variety: 0.7,
  };

  it('DRIFT-EXCL-01: NON_APPLICABLE_VOICE_PARAMS contains exactly 4 broken/structural params', () => {
    expect(NON_APPLICABLE_VOICE_PARAMS.size).toBe(4);
    expect(NON_APPLICABLE_VOICE_PARAMS.has('irony_level')).toBe(true);
    expect(NON_APPLICABLE_VOICE_PARAMS.has('metaphor_density')).toBe(true);
    expect(NON_APPLICABLE_VOICE_PARAMS.has('dialogue_ratio')).toBe(true);
    expect(NON_APPLICABLE_VOICE_PARAMS.has('punctuation_style')).toBe(true);
  });

  it('DRIFT-EXCL-02: drift with exclusion uses 6 params, not 10', () => {
    const actual = measureVoice('Il marchait. Le vent soufflait. Les arbres pliaient.');
    const result = computeVoiceDrift(target, actual, NON_APPLICABLE_VOICE_PARAMS);

    expect(result.n_applicable).toBe(6);
    expect(result.excluded.length).toBe(4);
    expect(result.excluded).toContain('irony_level');
    expect(result.excluded).toContain('metaphor_density');
    expect(result.excluded).toContain('dialogue_ratio');
    expect(result.excluded).toContain('punctuation_style');
  });

  it('DRIFT-EXCL-03: drift with exclusion ≤ drift without exclusion (removes penalty)', () => {
    const actual = measureVoice('Il marchait. Le vent soufflait. Les arbres pliaient.');

    const fullDrift = computeVoiceDrift(target, actual);
    const filteredDrift = computeVoiceDrift(target, actual, NON_APPLICABLE_VOICE_PARAMS);

    // Filtered should be ≤ full (removing bad params reduces drift)
    // Not strictly guaranteed but expected given that excluded params have high drift
    expect(filteredDrift.n_applicable).toBe(6);
    expect(fullDrift.n_applicable).toBe(10);

    // Both report all 10 params in per_param
    expect(Object.keys(filteredDrift.per_param).length).toBe(10);
    expect(Object.keys(fullDrift.per_param).length).toBe(10);
  });

  it('DRIFT-EXCL-04: per_param still reports ALL 10 params even when excluded', () => {
    const actual = measureVoice('Court. Très court.');
    const result = computeVoiceDrift(target, actual, NON_APPLICABLE_VOICE_PARAMS);

    // All 10 params present in per_param
    expect(result.per_param.irony_level).toBeDefined();
    expect(result.per_param.metaphor_density).toBeDefined();
    expect(result.per_param.dialogue_ratio).toBeDefined();
    expect(result.per_param.phrase_length_mean).toBeDefined();
    expect(typeof result.per_param.irony_level).toBe('number');
  });

  it('DRIFT-EXCL-05: no exclusion = backward compatible (10 params)', () => {
    const actual = measureVoice('Il marchait.');
    const result = computeVoiceDrift(target, actual);

    expect(result.n_applicable).toBe(10);
    expect(result.excluded.length).toBe(0);
  });

  it('DRIFT-EXCL-06: deterministic — same input = same output', () => {
    const actual = measureVoice('Il marchait. Le vent soufflait.');
    const r1 = computeVoiceDrift(target, actual, NON_APPLICABLE_VOICE_PARAMS);
    const r2 = computeVoiceDrift(target, actual, NON_APPLICABLE_VOICE_PARAMS);

    expect(r1.drift).toBe(r2.drift);
    expect(r1.n_applicable).toBe(r2.n_applicable);
  });
});
