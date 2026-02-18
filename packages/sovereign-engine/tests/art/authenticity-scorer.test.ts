/**
 * ART-11 — Authenticity Scorer Tests
 * AUTH-01 to AUTH-06
 *
 * Tests computeIASmellScore() (pure CALC) and IA_SMELL_PATTERNS.
 * All tests are deterministic (no LLM calls).
 */
import { describe, it, expect } from 'vitest';
import { computeIASmellScore, IA_SMELL_PATTERNS } from '../../src/authenticity/ia-smell-patterns.js';

describe('ART-11: Authenticity Scorer', () => {

  it('AUTH-01: text with IA patterns → low score [ART-AUTH-01]', () => {
    // Texte artificiellement IA : transitions parfaites, sur-adjectivation,
    // structure symétrique, pas de rupture, sagesse générique
    const iaText = [
      'Cependant, le soleil illuminait magnifiquement la vallée verdoyante.',
      'De plus, les oiseaux chantaient harmonieusement dans les arbres majestueux.',
      'Par ailleurs, la rivière scintillante serpentait gracieusement à travers la plaine.',
      'Néanmoins, une ombre mystérieuse planait silencieusement sur le paysage.',
      'En outre, les fleurs colorées embaumaient délicieusement l\'atmosphère printanière.',
      'Par conséquent, le voyageur émerveillé contemplait admirativement ce spectacle.',
      'Ainsi, la nature resplendissante offrait généreusement ses trésors inestimables.',
      'De ce fait, la vie est une chose profonde et riche de sens.',
      'En effet, dans ce monde, il faut comprendre la beauté incomparable.',
      'En somme, il comprit que cette expérience transformerait définitivement sa vision.',
    ].join('\n\n');

    const result = computeIASmellScore(iaText);
    expect(result.pattern_hits.length).toBeGreaterThanOrEqual(3);
    expect(result.score).toBeLessThan(80);
  });

  it('AUTH-02: human literary text → high score', () => {
    const humanText = [
      "La porte. Il la poussa. Rien.",
      "À l'intérieur, l'odeur — cette odeur de poussière et de vieux bois qu'on n'oublie pas.",
      "Ses chaussures crissaient. Il avança quand même.",
      "Sur la table, une tasse. Du café froid, peut-être. Ou du thé. Qui sait.",
      "— T'es là ? lança-t-il dans le noir.",
      "Pas de réponse. Évidemment.",
      "Il s'assit. La chaise grinça comme elle avait toujours grincé.",
    ].join('\n');

    const result = computeIASmellScore(humanText);
    expect(result.score).toBeGreaterThan(60);
  });

  it('AUTH-03: score is deterministic [ART-AUTH-02]', () => {
    const text = 'Le vent soufflait. Les arbres pliaient. Il marchait sans but. La pluie tombait.';
    const s1 = computeIASmellScore(text);
    const s2 = computeIASmellScore(text);

    expect(s1.score).toBe(s2.score);
    expect(s1.pattern_hits).toEqual(s2.pattern_hits);
    expect(s1.details).toEqual(s2.details);
  });

  it('AUTH-04: 15 patterns defined', () => {
    expect(IA_SMELL_PATTERNS.length).toBe(15);

    // Each pattern has required fields
    for (const pattern of IA_SMELL_PATTERNS) {
      expect(pattern.id).toBeDefined();
      expect(typeof pattern.id).toBe('string');
      expect(pattern.name).toBeDefined();
      expect(typeof pattern.detect).toBe('function');
      expect(pattern.weight).toBeGreaterThan(0);
    }
  });

  it('AUTH-05: score bounded [0, 100]', () => {
    const s1 = computeIASmellScore('Texte court.');
    const s2 = computeIASmellScore('A'.repeat(5000));

    expect(s1.score).toBeGreaterThanOrEqual(0);
    expect(s1.score).toBeLessThanOrEqual(100);
    expect(s2.score).toBeGreaterThanOrEqual(0);
    expect(s2.score).toBeLessThanOrEqual(100);
  });

  it('AUTH-06: empty text → score 100 (no patterns detectable)', () => {
    const result = computeIASmellScore('');
    expect(result.score).toBe(100);
    expect(result.pattern_hits).toHaveLength(0);
  });
});
