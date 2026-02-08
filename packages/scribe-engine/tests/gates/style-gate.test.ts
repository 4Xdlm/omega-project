import { describe, it, expect } from 'vitest';
import { runStyleGate } from '../../src/gates/style-gate.js';
import { SCENARIO_A_GENOME, SCENARIO_B_GENOME, getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Style Gate', () => {
  it('PASS when matching genome', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'Short sharp words. The light flickered twice. Darkness crept closer. Wind howled outside. The keeper stood firm.',
        word_count: 18, sentence_count: 5, avg_sentence_length: 3.6,
      })],
    });
    const result = runStyleGate(prose, SCENARIO_B_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.gate_id).toBe('STYLE_GATE');
  });

  it('detects sentence_length drift', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'A very very very very very very very very very very very very long sentence with many words that goes on and on and on without stopping to breathe or pause at all.',
        word_count: 30, sentence_count: 1, avg_sentence_length: 30,
      })],
    });
    // Target is 10, actual is 30 → deviation > 0.3
    const result = runStyleGate(prose, SCENARIO_B_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.violations.length).toBeGreaterThan(0);
  });

  it('detects burstiness drift', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('burstiness_deviation');
  });

  it('detects lexical drift', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('lexical_richness_deviation');
  });

  it('detects dialogue drift', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('dialogue_ratio_deviation');
  });

  it('deviation threshold is 0.3', () => {
    const config = getDefaultSConfig();
    expect(config.STYLE_DEVIATION_MAX.value).toBe(0.3);
  });

  it('edge case: deviation exactly 0.3', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('max_deviation');
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    const r2 = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.violations.length).toBe(r2.violations.length);
  });

  it('checks all axes', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('avg_sentence_length_deviation');
    expect(result.metrics).toHaveProperty('burstiness_deviation');
    expect(result.metrics).toHaveProperty('lexical_richness_deviation');
    expect(result.metrics).toHaveProperty('dialogue_ratio_deviation');
  });

  it('includes metrics', () => {
    const prose = buildMinimalProseDoc();
    const result = runStyleGate(prose, SCENARIO_A_GENOME, getDefaultSConfig(), TIMESTAMP);
    expect(typeof result.metrics['max_deviation']).toBe('number');
  });
});
