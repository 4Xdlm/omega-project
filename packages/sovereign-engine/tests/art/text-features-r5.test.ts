/**
 * OMEGA Text Features R5 — Unit Tests
 * Tests the F24-F38 TypeScript port against known properties.
 */

import { describe, it, expect } from 'vitest';
import { computeTextFeatures, splitSentences } from '../../src/scoring/text-features.js';

describe('splitSentences', () => {
  it('splits on sentence-ending punctuation', () => {
    const sents = splitSentences('Hello world. How are you? Fine! Thanks.');
    expect(sents.length).toBe(3); // 'Thanks.' is too short (<=5 chars)
  });

  it('returns empty for empty text', () => {
    expect(splitSentences('')).toEqual([]);
  });
});

describe('computeTextFeatures', () => {
  // Generate a synthetic text with known properties
  const syntheticText = Array.from({ length: 30 }, (_, i) => {
    const len = (i % 3 === 0) ? 'The old stone wall stood in silence under the dark light of the fading evening sky above the distant horizon.'
      : (i % 3 === 1) ? 'She walked. He ran. The door closed.'
      : 'Perhaps it seemed as though something like a cold shadow had appeared from behind the rough wooden earth beneath.';
    return len;
  }).join('\n\n');

  it('returns all expected feature keys', () => {
    const features = computeTextFeatures(syntheticText);
    const expectedKeys = [
      'f1_mean', 'f1a_rhythm_variance', 'f1_sentence_count',
      'f24e_contrast_score', 'f25g_description_score',
      'f26c_period_score', 'f27d_modal_score', 'f28d_sil_score',
      'f29d_ttr_score', 'f30d_ps_imp_ratio',
      'f33c_dot_comma_ratio', 'f34b_para_per_1000w',
      'f35c_hook_score', 'f36c_cliff_score', 'f38c_speed_score',
    ];
    for (const key of expectedKeys) {
      expect(features).toHaveProperty(key);
      expect(typeof features[key]).toBe('number');
    }
  });

  it('f1_mean reflects sentence length', () => {
    const shortText = 'Short. Very short. Tiny. Small. Brief. Quick.';
    const longText = 'This is a much longer sentence that contains many more words and goes on for quite a while. Another long sentence follows with elaborate descriptions and extended clauses that push the word count higher and higher.';
    const shortFeats = computeTextFeatures(shortText);
    const longFeats = computeTextFeatures(longText);
    expect(longFeats['f1_mean']).toBeGreaterThan(shortFeats['f1_mean']);
  });

  it('f25g detects sensory words', () => {
    const sensorless = 'The process was systematic and the results were consistent with expectations across all parameters.'.repeat(5);
    const sensory = 'The cold light cast shadows on the rough stone wall. A faint smell of smoke drifted through the silence. The bitter taste lingered.'.repeat(5);
    const f1 = computeTextFeatures(sensorless);
    const f2 = computeTextFeatures(sensory);
    expect(f2['f25b_sensory_coverage']).toBeGreaterThan(f1['f25b_sensory_coverage']);
  });

  it('f29 TTR detects lexical richness', () => {
    const repetitive = 'The cat sat on the mat. The cat sat on the mat. The cat sat on the mat. '.repeat(20);
    const varied = Array.from({ length: 20 }, (_, i) =>
      `Sentence ${i} introduces unique vocabulary word${i} and concept${i} alongside notion${i} and perspective${i}.`
    ).join(' ');
    const f1 = computeTextFeatures(repetitive);
    const f2 = computeTextFeatures(varied);
    expect(f2['f29b_ttr_window']).toBeGreaterThan(f1['f29b_ttr_window']);
  });

  it('f33c responds to punctuation ratio', () => {
    const dotHeavy = 'Short. Quick. Fast. Done. End. Stop. Now. Here. Go. Run.';
    const commaHeavy = 'One, two, three, four, five, six, seven, eight, nine, ten items listed here in total.';
    const f1 = computeTextFeatures(dotHeavy);
    const f2 = computeTextFeatures(commaHeavy);
    expect(f1['f33c_dot_comma_ratio']).toBeGreaterThan(f2['f33c_dot_comma_ratio']);
  });

  it('f34b responds to paragraph density', () => {
    const fewParas = 'First paragraph with many words and sentences. More content here. And even more. ' +
      'Still going on and on with more words to fill the space adequately for testing purposes.';
    const manyParas = 'First.\n\nSecond.\n\nThird.\n\nFourth.\n\nFifth.\n\nSixth.';
    const f1 = computeTextFeatures(fewParas);
    const f2 = computeTextFeatures(manyParas);
    expect(f2['f34b_para_per_1000w']).toBeGreaterThan(f1['f34b_para_per_1000w']);
  });

  it('f38c speed responds to short paragraphs', () => {
    const slow = 'This is a very long paragraph that goes on and on with many descriptive clauses and subordinate constructions that make the reading pace deliberately slow and contemplative, allowing the reader to absorb every nuance of meaning.';
    const fast = 'Bang.\n\nRun.\n\nNow.\n\nFast.\n\nGo.\n\nMove.\n\nQuick.\n\nDone.';
    const f1 = computeTextFeatures(slow);
    const f2 = computeTextFeatures(fast);
    expect(f2['f38c_speed_score']).toBeGreaterThan(f1['f38c_speed_score']);
  });

  it('all values are finite numbers', () => {
    const features = computeTextFeatures(syntheticText);
    for (const [key, val] of Object.entries(features)) {
      expect(Number.isFinite(val)).toBe(true);
    }
  });

  it('handles empty text gracefully', () => {
    const features = computeTextFeatures('');
    expect(features['f1_mean']).toBe(0);
    expect(features['f29d_ttr_score']).toBe(0);
  });
});
