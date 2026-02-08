import { describe, it, expect } from 'vitest';
import { analyzeLexical } from '../../src/metrics/lexical-analyzer.js';
import { buildMinimalProseParagraph } from '../fixtures.js';

describe('Lexical Analyzer', () => {
  it('computes TTR', () => {
    const para = buildMinimalProseParagraph({ text: 'The cat sat on the mat. The cat slept.' });
    const profile = analyzeLexical([para]);
    expect(profile.type_token_ratio).toBeGreaterThan(0);
    expect(profile.type_token_ratio).toBeLessThanOrEqual(1);
  });

  it('computes hapax legomena ratio', () => {
    const para = buildMinimalProseParagraph({ text: 'Unique ephemeral diaphanous words appear here. Common the the the.' });
    const profile = analyzeLexical([para]);
    expect(profile.hapax_legomena_ratio).toBeGreaterThan(0);
  });

  it('computes rare word ratio', () => {
    const para = buildMinimalProseParagraph({ text: 'The precipice loomed. Iridescent crystalline formations dotted the cavern.' });
    const profile = analyzeLexical([para]);
    expect(profile.rare_word_ratio).toBeGreaterThan(0);
  });

  it('detects consecutive rare words', () => {
    const para = buildMinimalProseParagraph({ text: 'Ephemeral diaphanous iridescent crystalline formations appeared.' });
    const profile = analyzeLexical([para]);
    expect(profile.consecutive_rare_count).toBeGreaterThanOrEqual(2);
  });

  it('computes avg word length', () => {
    const para = buildMinimalProseParagraph({ text: 'Go to bed.' });
    const profile = analyzeLexical([para]);
    expect(profile.avg_word_length).toBeGreaterThan(0);
  });

  it('computes vocabulary size', () => {
    const para = buildMinimalProseParagraph({ text: 'One two three four five six seven eight nine ten.' });
    const profile = analyzeLexical([para]);
    expect(profile.vocabulary_size).toBeGreaterThan(0);
  });

  it('handles empty', () => {
    const profile = analyzeLexical([]);
    expect(profile.type_token_ratio).toBe(0);
    expect(profile.vocabulary_size).toBe(0);
  });

  it('handles single word', () => {
    const para = buildMinimalProseParagraph({ text: 'Hello' });
    const profile = analyzeLexical([para]);
    expect(profile.vocabulary_size).toBe(1);
    expect(profile.type_token_ratio).toBe(1);
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph();
    const p1 = analyzeLexical([para]);
    const p2 = analyzeLexical([para]);
    expect(p1.type_token_ratio).toBe(p2.type_token_ratio);
    expect(p1.rare_word_ratio).toBe(p2.rare_word_ratio);
  });

  it('detects edge case — all common words', () => {
    const para = buildMinimalProseParagraph({ text: 'The the the the the the the.' });
    const profile = analyzeLexical([para]);
    expect(profile.rare_word_ratio).toBe(0);
  });
});
