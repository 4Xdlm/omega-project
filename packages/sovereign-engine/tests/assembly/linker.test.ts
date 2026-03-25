/**
 * Tests: Linker (Agent Ciment)
 * DEC-20260325-001 Fractal Assembly
 *
 * Standard: NASA-Grade L4 / DO-178C Level A
 */

import { describe, it, expect } from 'vitest';
import { validateCement, assembleChapter } from '../../src/assembly/linker.js';

describe('Linker — validateCement', () => {
  const brickA = 'Elle posa sa tasse sur la table de chêne et regarda la mer par la fenêtre. Les vagues léchaient la grève.';
  const brickB = 'Henri courbé sur les rosiers maniait le sécateur avec précision. Chaque coup résonnait dans le jardin.';

  it('linker validates cement in 50-150 words range', () => {
    const cement = Array(80).fill('mot').join(' ') + '.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.words).toBeGreaterThanOrEqual(50);
    expect(result.words).toBeLessThanOrEqual(150);
    expect(result.valid).toBe(true);
  });

  it('linker rejects cement below 50 words', () => {
    const cement = 'Quelques mots seulement ici.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too short'))).toBe(true);
  });

  it('linker rejects cement above 150 words', () => {
    const cement = Array(160).fill('mot').join(' ') + '.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Too long'))).toBe(true);
  });

  it('linker detects repeated brick A content', () => {
    const cement = 'Transition ici. ' + brickA + ' Suite du texte avec des mots supplémentaires pour atteindre la longueur minimale requise de cinquante mots dans ce test unitaire.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.errors.some(e => e.includes('Repeats content from brick A'))).toBe(true);
  });

  it('linker detects repeated brick B content', () => {
    const cement = 'Transition ici. ' + brickB + ' Suite du texte avec des mots supplémentaires pour atteindre la longueur minimale requise de cinquante mots dans ce test unitaire.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.errors.some(e => e.includes('Repeats content from brick B'))).toBe(true);
  });

  it('linker detects mechanical transitions', () => {
    const cement = 'Puis il se leva et traversa la pièce. ' + Array(50).fill('mot').join(' ') + '.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.errors.some(e => e.includes('Mechanical transition'))).toBe(true);
  });

  it('linker accepts clean transition', () => {
    const cement = 'Le silence retomba sur la pièce comme une nappe froide. Les ombres du soir commençaient à ramper le long des murs écaillés et le vent marin portait jusqu\'à la fenêtre ces effluves salés qui rappelaient d\'autres automnes et d\'autres attentes. La lumière déclinante transformait les carreaux de faïence en miroirs dorés tandis que le parfum du thé continuait de monter par vagues tièdes dans la cuisine aux murs blanchis.';
    const result = validateCement(cement, brickA, brickB);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('Linker — assembleChapter', () => {
  it('assembles bricks and cements correctly', () => {
    const bricks = ['Brique un contenu.', 'Brique deux contenu.', 'Brique trois contenu.'];
    const cements = [
      { cement: 'Transition A vers B.', words: 4, hash: 'h1', api_calls: 1 },
      { cement: 'Transition B vers C.', words: 4, hash: 'h2', api_calls: 1 },
    ];

    const result = assembleChapter(bricks, cements);
    expect(result.brick_count).toBe(3);
    expect(result.cement_count).toBe(2);
    expect(result.chapter).toContain('Brique un');
    expect(result.chapter).toContain('Transition A vers B');
    expect(result.chapter).toContain('Brique deux');
    expect(result.chapter).toContain('Transition B vers C');
    expect(result.chapter).toContain('Brique trois');
  });

  it('throws on mismatched cement count', () => {
    expect(() => assembleChapter(['a', 'b'], [])).toThrow('Expected 1 cements, got 0');
  });

  it('throws on empty bricks', () => {
    expect(() => assembleChapter([], [])).toThrow('No bricks');
  });

  it('single brick needs zero cements', () => {
    const result = assembleChapter(['Seule brique.'], []);
    expect(result.brick_count).toBe(1);
    expect(result.cement_count).toBe(0);
    expect(result.chapter).toBe('Seule brique.');
  });
});
