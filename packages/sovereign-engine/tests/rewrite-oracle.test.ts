/**
 * V2.3-A P4 — REWRITE_ORACLE (Option D). Tests CI déterministes (zéro qwen).
 * Vérifie : math composite pure, garde anti-NaN, jeu d'axes EXCLUANT tension_14d,
 * et isolation statique (le module ne lit pas target_14d / n'importe pas tension-14d).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  computeRewriteComposite,
  REWRITE_ORACLE_AXES,
} from '../src/oracle/rewrite-oracle.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, '..', 'src', 'oracle', 'rewrite-oracle.ts');

describe('REWRITE_ORACLE_AXES', () => {
  it('contient exactement les 7 axes valides', () => {
    expect([...REWRITE_ORACLE_AXES]).toEqual([
      'RCI', 'SII', 'IFI', 'AAI', 'emotion_coherence', 'interiority', 'impact',
    ]);
  });
  it('EXCLUT tension_14d (axe couplé au 14d dormant)', () => {
    expect((REWRITE_ORACLE_AXES as readonly string[])).not.toContain('tension_14d');
  });
});

describe('computeRewriteComposite', () => {
  it('moyenne et min sur un jeu connu', () => {
    const axes = { RCI: 80, SII: 70, IFI: 90, AAI: 60, emotion_coherence: 75, interiority: 85, impact: 65 };
    const { composite, min_axis } = computeRewriteComposite(axes);
    const expectedMean = (80 + 70 + 90 + 60 + 75 + 85 + 65) / 7;
    expect(composite).toBeCloseTo(expectedMean, 6);
    expect(min_axis).toBe(60);
  });
  it('jeu vide -> 0/0 (pas de NaN)', () => {
    expect(computeRewriteComposite({})).toEqual({ composite: 0, min_axis: 0 });
  });
  it('lève si un axe est non-fini (NaN/Inf) — refus de produire un score corrompu', () => {
    expect(() => computeRewriteComposite({ RCI: 80, SII: Number.NaN })).toThrow(/non-fini/);
    expect(() => computeRewriteComposite({ RCI: Infinity })).toThrow(/non-fini/);
  });
});

describe('isolation statique anti-14d (FORBID-CANON-GARAGE-001)', () => {
  const src = readFileSync(SRC, 'utf8');
  it("n'importe pas le scoreur tension-14d", () => {
    const importLines = src.split('\n').filter((l) => /^\s*import\b/.test(l));
    expect(importLines.some((l) => /tension-14d/.test(l))).toBe(false);
  });
  it('ne lit jamais target_14d (hors commentaires)', () => {
    const code = src
      .replace(/\/\*[\s\S]*?\*\//g, '') // blocs /* */
      .replace(/(^|[^:])\/\/.*$/gm, '$1'); // lignes // (préserve les :// d'URLs)
    expect(/target_14d/.test(code)).toBe(false);
  });
});
