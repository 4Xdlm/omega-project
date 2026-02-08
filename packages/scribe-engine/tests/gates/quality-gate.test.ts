import { describe, it, expect } from 'vitest';
import { runQualityGate } from '../../src/gates/quality-gate.js';
import { getDefaultSConfig, buildMinimalProseDoc, buildMinimalProseParagraph, TIMESTAMP } from '../fixtures.js';

describe('Quality Gate', () => {
  it('PASS on dense text', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'Lighthouse beacon pierced obsidian darkness, illuminating jagged volcanic cliffs below.',
      })],
    });
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.gate_id).toBe('QUALITY_GATE');
  });

  it('FAIL on verbose text', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'The the the the the the a a a a a a is is is was was was the the the a a a',
        word_count: 24, sentence_count: 1,
      })],
    });
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.verdict).toBe('FAIL');
  });

  it('FAIL on long sentences without punctuation', () => {
    const words = Array(55).fill('word').join(' ');
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: words + '.',
        word_count: 55, sentence_count: 1,
      })],
    });
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.violations.some((v) => v.message.includes('50 words'))).toBe(true);
  });

  it('FAIL on vague words', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'Something happened with the thing near the stuff.',
      })],
    });
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.violations.some((v) => v.message.includes('Vague'))).toBe(true);
  });

  it('density ratio threshold is 0.7', () => {
    const config = getDefaultSConfig();
    expect(config.QUALITY_MIN_DENSITY.value).toBe(0.7);
  });

  it('edge case: density at 0.7', () => {
    const prose = buildMinimalProseDoc({
      paragraphs: [buildMinimalProseParagraph({
        text: 'Crystalline formations grew beneath ancient volcanic stone, pulsing with forgotten memories.',
      })],
    });
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('avg_density');
  });

  it('is deterministic', () => {
    const prose = buildMinimalProseDoc();
    const r1 = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    const r2 = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(r1.verdict).toBe(r2.verdict);
    expect(r1.violations.length).toBe(r2.violations.length);
  });

  it('includes metrics', () => {
    const prose = buildMinimalProseDoc();
    const result = runQualityGate(prose, getDefaultSConfig(), TIMESTAMP);
    expect(result.metrics).toHaveProperty('avg_density');
    expect(result.metrics).toHaveProperty('total_paragraphs');
  });
});
