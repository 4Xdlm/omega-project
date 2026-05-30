import { describe, it, expect } from 'vitest';
import { loadIntentArtifact } from '../src/intent-artifact.js';

const validRaw = {
  intent: { title: 'T', premise: 'P', themes: [], core_emotion: 'joy', target_audience: 'a', message: 'm', target_word_count: 100 },
  canon: { entries: [] },
  constraints: { pov: 'first', tense: 'past', banned_words: [], banned_topics: [], max_dialogue_ratio: 0.5, min_sensory_anchors_per_scene: 1, max_scenes: 10, min_scenes: 1, forbidden_cliches: [] },
  genome: { target_burstiness: 0.7, target_lexical_richness: 0.8, target_avg_sentence_length: 15, target_dialogue_ratio: 0.1 },
  emotion: {},
};

describe('loadIntentArtifact -- fail-closed validation', () => {
  it('accepte un artefact complet et conserve les champs requis', () => {
    const a = loadIntentArtifact(validRaw);
    expect(a.constraints).toBeDefined();
    expect(a.genome).toBeDefined();
    expect(a.emotion).toBeDefined();
  });

  it('rejette un non-objet (null)', () => {
    expect(() => loadIntentArtifact(null)).toThrow(/not an object/);
  });

  it('rejette un non-objet (string)', () => {
    expect(() => loadIntentArtifact('nope')).toThrow(/not an object/);
  });

  for (const field of ['constraints', 'genome', 'emotion']) {
    it(`rejette l'absence du champ requis '${field}'`, () => {
      const broken = { ...validRaw } as Record<string, unknown>;
      delete broken[field];
      expect(() => loadIntentArtifact(broken)).toThrow(new RegExp(`required field '${field}'`));
    });
  }
});