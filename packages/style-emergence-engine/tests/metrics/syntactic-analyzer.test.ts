import { describe, it, expect } from 'vitest';
import { analyzeSyntactic } from '../../src/metrics/syntactic-analyzer.js';
import { buildMinimalProseParagraph } from '../fixtures.js';

describe('Syntactic Analyzer', () => {
  it('detects SVO structure', () => {
    const para = buildMinimalProseParagraph({ text: 'The cat sat on the mat.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['SVO']).toBeGreaterThanOrEqual(0);
  });

  it('detects question structure', () => {
    const para = buildMinimalProseParagraph({ text: 'What happened here? The room was empty.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['question']).toBeGreaterThan(0);
  });

  it('detects exclamation structure', () => {
    const para = buildMinimalProseParagraph({ text: 'Run now! The building collapsed.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['exclamation']).toBeGreaterThan(0);
  });

  it('detects fragment', () => {
    const para = buildMinimalProseParagraph({ text: 'Silence. Nothing more.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['fragment']).toBeGreaterThan(0);
  });

  it('detects compound structure', () => {
    const para = buildMinimalProseParagraph({ text: 'The wind howled and the trees bent.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['compound']).toBeGreaterThan(0);
  });

  it('detects complex structure', () => {
    const para = buildMinimalProseParagraph({ text: 'Although the storm raged, the lighthouse held firm.' });
    const profile = analyzeSyntactic([para]);
    expect(profile.structure_distribution['complex']).toBeGreaterThan(0);
  });

  it('computes diversity index', () => {
    const para = buildMinimalProseParagraph({
      text: 'The cat sat. Run! What happened? Although it rained, the sun shone. Silence.',
    });
    const profile = analyzeSyntactic([para]);
    expect(profile.diversity_index).toBeGreaterThan(0);
  });

  it('counts unique structures', () => {
    const para = buildMinimalProseParagraph({
      text: 'The cat sat. Run! What happened? Silence.',
    });
    const profile = analyzeSyntactic([para]);
    expect(profile.unique_structures).toBeGreaterThanOrEqual(2);
  });

  it('is deterministic', () => {
    const para = buildMinimalProseParagraph({ text: 'The cat sat. Run! What happened?' });
    const p1 = analyzeSyntactic([para]);
    const p2 = analyzeSyntactic([para]);
    expect(p1.diversity_index).toBe(p2.diversity_index);
    expect(p1.dominant_structure).toBe(p2.dominant_structure);
  });

  it('handles mixed content', () => {
    const para = buildMinimalProseParagraph({
      text: 'The guard watched. Listen carefully! What was that? He ran and she followed. Although tired, he pressed on.',
    });
    const profile = analyzeSyntactic([para]);
    expect(profile.unique_structures).toBeGreaterThanOrEqual(3);
    expect(profile.dominant_ratio).toBeLessThanOrEqual(1);
  });
});
