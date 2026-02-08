import { describe, it, expect } from 'vitest';
import { profileStyle } from '../../src/metrics/style-profiler.js';
import { buildMinimalProseParagraph, SCENARIO_A_GENOME, TIMESTAMP } from '../fixtures.js';

describe('Style Profiler', () => {
  it('creates complete profile', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(profile.profile_id).toBeTruthy();
    expect(profile.cadence).toBeTruthy();
    expect(profile.lexical).toBeTruthy();
    expect(profile.syntactic).toBeTruthy();
    expect(profile.density).toBeTruthy();
    expect(profile.coherence).toBeTruthy();
    expect(profile.genome_deviation).toBeTruthy();
  });

  it('has stable hash', () => {
    const para = buildMinimalProseParagraph();
    const p1 = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    const p2 = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(p1.profile_hash).toBe(p2.profile_hash);
  });

  it('computes genome deviation', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(profile.genome_deviation.max_deviation).toBeGreaterThanOrEqual(0);
    expect(profile.genome_deviation.avg_deviation).toBeGreaterThanOrEqual(0);
  });

  it('checks all deviation axes', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(typeof profile.genome_deviation.burstiness_delta).toBe('number');
    expect(typeof profile.genome_deviation.lexical_richness_delta).toBe('number');
    expect(typeof profile.genome_deviation.sentence_length_delta).toBe('number');
    expect(typeof profile.genome_deviation.dialogue_ratio_delta).toBe('number');
    expect(typeof profile.genome_deviation.description_density_delta).toBe('number');
  });

  it('detects within tolerance', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP, 10);
    expect(profile.genome_deviation.all_within_tolerance).toBe(true);
  });

  it('detects out of tolerance', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP, 0.001);
    expect(profile.genome_deviation.all_within_tolerance).toBe(false);
  });

  it('handles minimal input', () => {
    const para = buildMinimalProseParagraph({ text: 'One.' });
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(profile.profile_id).toBeTruthy();
  });

  it('handles empty', () => {
    const profile = profileStyle([], SCENARIO_A_GENOME, TIMESTAMP);
    expect(profile.cadence.sentence_count).toBe(0);
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph();
    const p1 = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    const p2 = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(p1.profile_id).toBe(p2.profile_id);
    expect(p1.profile_hash).toBe(p2.profile_hash);
  });

  it('includes timestamp', () => {
    const para = buildMinimalProseParagraph();
    const profile = profileStyle([para], SCENARIO_A_GENOME, TIMESTAMP);
    expect(profile.timestamp_deterministic).toBe(TIMESTAMP);
  });
});
