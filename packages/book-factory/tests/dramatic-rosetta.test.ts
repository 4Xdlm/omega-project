/** OMEGA — S0 Rosetta dramatique (BF-08) : grille + mesureur de marqueurs. */
import { describe, expect, it } from 'vitest';

import { DRAMATIC_GRID, UNMEASURABLE_FUNCTIONS, directivesFor } from '../src/rosetta/dramatic-grid.js';
import { isSuccess, measureCollateral, measureMarkers } from '../src/rosetta/dramatic-markers.js';

describe('S0 — grille de directives', () => {
  it('GRID-001 — 4 fonctions × 4 variantes = 16, exactement A/B/C/D par fonction', () => {
    expect(DRAMATIC_GRID.length).toBe(16);
    for (const fn of ['REVELATION', 'CONFRONTATION', 'ACTION', 'TRANSITION'] as const) {
      expect(directivesFor(fn).map((d) => d.variant)).toEqual(['A', 'B', 'C', 'D']);
    }
  });

  it('GRID-002 — D est toujours la plus structurée (la plus longue) de sa fonction', () => {
    for (const fn of ['REVELATION', 'CONFRONTATION', 'ACTION'] as const) {
      const ds = directivesFor(fn);
      const dLen = ds.find((d) => d.variant === 'D')?.text.length ?? 0;
      expect(dLen).toBe(Math.max(...ds.map((d) => d.text.length)));
    }
  });

  it('GRID-003 — aucune directive ne contient de coaching interdit (Mode C / musée)', () => {
    const forbidden = /\b(ressens|sois plus|améliore|plus beau|plus nerveux)\b/iu;
    for (const d of DRAMATIC_GRID) expect(forbidden.test(d.text)).toBe(false);
  });

  it('GRID-004 — DECISION et REVERSAL sont consignées UNMEASURABLE (jamais calibrées à l\'aveugle)', () => {
    const names = UNMEASURABLE_FUNCTIONS.map((u) => u.fn);
    expect(names).toContain('DECISION');
    expect(names).toContain('REVERSAL');
    expect(DRAMATIC_GRID.some((d) => (d.fn as string) === 'DECISION')).toBe(false);
  });
});

describe('S0 — mesureur de marqueurs (SSOT arc-coherence)', () => {
  it('MARK-001 — prose à aveux ⇒ argmax REVELATION', () => {
    const p = 'Garcia hésita longtemps. Puis il avoua. Léna comprit que tout était faux, et la vérité éclata entre eux comme une vitre brisée.';
    const m = measureMarkers(p);
    expect(m.revelationHits).toBeGreaterThanOrEqual(2);
    expect(m.argmax).toBe('REVELATION');
    expect(isSuccess(m, 'REVELATION')).toBe(true);
  });

  it('MARK-002 — affrontement EN DIALOGUE ⇒ argmax CONFRONTATION', () => {
    const p = '— Tu m\'accuses ?\n— Je t\'accuse, oui.\n— Alors je te défie.\nElle exigea des comptes. Il menaça de partir. Le ton montait.';
    const m = measureMarkers(p);
    expect(m.confrontHits).toBeGreaterThanOrEqual(2);
    expect(m.dialogueRatio).toBeGreaterThan(0.3);
    expect(m.argmax).toBe('CONFRONTATION');
  });

  it('MARK-003 — verbes d\'action enchaînés ⇒ argmax ACTION', () => {
    const p = 'Il bondit. Il courut vers la porte, saisit la barre, frappa le panneau qui se brisa. Une ombre jaillit. Il se jeta de côté.';
    expect(measureMarkers(p).argmax).toBe('ACTION');
  });

  it('MARK-004 — passage calme sans marqueur ⇒ argmax TRANSITION (défaut)', () => {
    const p = 'Le matin passa lentement. Il marcha le long du quai, regarda les bateaux, puis rentra. La journée s\'écoula sans rien dire.';
    expect(measureMarkers(p).argmax).toBe('TRANSITION');
  });

  it('MARK-005 — collatéral : tics et répétition de trigrammes détectés', () => {
    const ticky = `${'le gardien regardait la mer. '.repeat(6)}`;
    const c = measureCollateral(ticky);
    expect(c.maxTicPer1000w).toBeGreaterThan(1.5);
    expect(c.trigramRepeatRate).toBeGreaterThan(0);
  });
});
