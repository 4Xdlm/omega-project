/**
 * ART-13 — Voice Conformity / Consistency Tests
 * VOICE-ART13-01 to VOICE-ART13-06
 *
 * Complements VCONF-01..03 in tests/oracle/axes/voice-conformity.test.ts.
 * Tests scoreVoiceConsistency() in original and continuation modes.
 */
import { describe, it, expect } from 'vitest';
import {
  measureVoice,
  scoreVoiceConsistency,
} from '../../src/voice/voice-genome.js';

describe('ART-13: Voice Conformity / Consistency', () => {

  it('VOICE-ART13-01: consistent style → high score (original mode)', () => {
    // Prose with consistent style across paragraphs
    const prose = [
      'Il marchait. Le vent soufflait. Les arbres pliaient.',
      'Elle attendait. La pluie tombait. Le temps passait.',
      'Ils partirent. Le soleil perçait. La route brillait.',
    ].join('\n\n');

    const score = scoreVoiceConsistency(prose, 'original');
    expect(score).toBeGreaterThan(70);
  });

  it('VOICE-ART13-02: inconsistent style → lower score (original mode)', () => {
    const prose = [
      'Oui. Non. Là. Stop. Vite.',
      'La manifestation extraordinairement tumultueuse qui se déployait majestueusement dans les avenues parisiennes attirait inévitablement les regards des passants médusés par cette démonstration spectaculaire, telle une symphonie dissonante résonnant dans les méandres obscurs.',
      'Bon. Ok. Fini.',
    ].join('\n\n');

    const score = scoreVoiceConsistency(prose, 'original');
    expect(score).toBeLessThan(90);
  });

  it('VOICE-ART13-03: continuation without genome → throws Error', () => {
    expect(() => scoreVoiceConsistency(
      'Texte quelconque.', 'continuation'
      // No target_genome
    )).toThrow('target_genome');
  });

  it('VOICE-ART13-04: continuation with matching genome → high score', () => {
    const authorText = [
      'Il marchait. Le vent soufflait. Les arbres pliaient sous la bourrasque.',
      'Elle attendait. La pluie tombait. Le temps passait sans fin.',
      'Ils partirent ensemble. Le soleil perçait enfin. La route brillait.',
    ].join('\n\n');

    const genome = measureVoice(authorText);
    const score = scoreVoiceConsistency(authorText, 'continuation', genome);
    expect(score).toBeGreaterThan(90);
  });

  it('VOICE-ART13-05: score bounded [0, 100]', () => {
    const score = scoreVoiceConsistency('Court.', 'original');
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('VOICE-ART13-06: deterministic', () => {
    const prose = [
      'Il marchait. Elle parlait. Ils riaient.',
      'Le vent soufflait. La nuit tombait. Le silence régnait.',
      'Personne ne parlait. Tout était calme. Le temps passait.',
    ].join('\n\n');

    const s1 = scoreVoiceConsistency(prose, 'original');
    const s2 = scoreVoiceConsistency(prose, 'original');
    expect(s1).toBe(s2);
  });
});
