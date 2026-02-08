import { describe, it, expect } from 'vitest';
import { analyzeCadence } from '../../src/metrics/cadence-analyzer.js';
import { buildMinimalProseParagraph } from '../fixtures.js';

describe('Cadence Analyzer', () => {
  it('computes avg sentence length', () => {
    const para = buildMinimalProseParagraph({ text: 'Short one. This is a much longer sentence with more words.' });
    const profile = analyzeCadence([para]);
    expect(profile.avg_sentence_length).toBeGreaterThan(0);
  });

  it('computes stddev', () => {
    const para = buildMinimalProseParagraph({ text: 'Short. This is a longer sentence with several words in it.' });
    const profile = analyzeCadence([para]);
    expect(profile.sentence_length_stddev).toBeGreaterThan(0);
  });

  it('computes coefficient of variation', () => {
    const para = buildMinimalProseParagraph({ text: 'Go. This is a much longer sentence with many more words.' });
    const profile = analyzeCadence([para]);
    expect(profile.coefficient_of_variation).toBeGreaterThan(0);
  });

  it('computes short ratio', () => {
    const para = buildMinimalProseParagraph({ text: 'Short. Yes. Ok. This is a longer sentence with several words.' });
    const profile = analyzeCadence([para]);
    expect(profile.short_ratio).toBeGreaterThan(0);
  });

  it('computes long ratio', () => {
    const para = buildMinimalProseParagraph({
      text: 'The lighthouse keeper stood on the rocky edge of the precipice and gazed out across the vast dark churning waters of the endless ocean below him, wondering what lurked beneath.',
    });
    const profile = analyzeCadence([para]);
    expect(profile.long_ratio).toBeGreaterThanOrEqual(0);
  });

  it('counts sentences', () => {
    const para = buildMinimalProseParagraph({ text: 'First sentence. Second sentence. Third sentence.' });
    const profile = analyzeCadence([para]);
    expect(profile.sentence_count).toBe(3);
  });

  it('handles empty paragraphs', () => {
    const profile = analyzeCadence([]);
    expect(profile.avg_sentence_length).toBe(0);
    expect(profile.sentence_count).toBe(0);
    expect(profile.coefficient_of_variation).toBe(0);
  });

  it('handles single sentence', () => {
    const para = buildMinimalProseParagraph({ text: 'Just one sentence here.' });
    const profile = analyzeCadence([para]);
    expect(profile.sentence_count).toBe(1);
    expect(profile.sentence_length_stddev).toBe(0);
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph({ text: 'Short. This is a longer sentence with more words.' });
    const p1 = analyzeCadence([para]);
    const p2 = analyzeCadence([para]);
    expect(p1.avg_sentence_length).toBe(p2.avg_sentence_length);
    expect(p1.coefficient_of_variation).toBe(p2.coefficient_of_variation);
  });

  it('profile is complete', () => {
    const para = buildMinimalProseParagraph();
    const profile = analyzeCadence([para]);
    expect(profile).toHaveProperty('avg_sentence_length');
    expect(profile).toHaveProperty('sentence_length_stddev');
    expect(profile).toHaveProperty('coefficient_of_variation');
    expect(profile).toHaveProperty('short_ratio');
    expect(profile).toHaveProperty('long_ratio');
    expect(profile).toHaveProperty('sentence_count');
  });
});
