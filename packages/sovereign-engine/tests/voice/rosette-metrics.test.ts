/**
 * Tests: Rosette Metrics (U-ROSETTE-01)
 * INV-ROSETTE-01: F32 shadow — pas d'impact score
 * Calibration: Pierre de Rosette v2.1 (2026-03-07)
 */

import { describe, it, expect } from 'vitest';
import {
  measureRosette,
  ROSETTE_TARGETS,
  type RosetteMetrics,
} from '../../src/voice/voice-genome.js';

// ─── Prose de test ────────────────────────────────────────────────────────────

const PROSE_CAMUS_LIKE = `
Aujourd'hui, maman est morte. Ou peut-être hier, je ne sais pas.
J'ai reçu un télégramme de l'asile. Il disait : Mère décédée. Enterrement demain. Sentiments distingués.
Cela ne veut rien dire. C'était peut-être hier.

L'asile de vieillards est à Marengo, à quatre-vingts kilomètres d'Alger.
Je prendrai l'autobus à deux heures et j'arriverai dans l'après-midi.
Ainsi, je pourrai veiller et je rentrerai demain soir.
Rien. J'ai demandé deux jours de congé à mon patron.
`.trim();

const PROSE_PROUST_LIKE = `
Longtemps, je me suis couché de bonne heure, pensant sans cesse à ce que je savais de l'enfance passée là-bas, dans cette maison que je n'avais pas revue depuis si longtemps, et dont le souvenir, même affaibli, gardait encore quelque chose de la chaleur particulière des premières années.
Quand un homme dort, il tient en cercle autour de lui le fil des heures, l'ordre des années et des mondes, et il consulte d'instinct, en s'éveillant, la ligne qu'il lisait, quand il savait qu'il était temps de dormir.
`.trim();

const PROSE_EMPTY = '';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('RosetteMetrics (U-ROSETTE-01 / INV-ROSETTE-01)', () => {

  it('ROSETTE-01: measureRosette() retourne 5 champs pour prose non vide', () => {
    const r = measureRosette(PROSE_CAMUS_LIKE);

    expect(r).toHaveProperty('f31_participes_presents');
    expect(r).toHaveProperty('f32_imbrication_fractale');
    expect(r).toHaveProperty('f33_coeff_parenthetiques');
    expect(r).toHaveProperty('position_expansion');
    expect(r).toHaveProperty('position_imbrication');
  });

  it('ROSETTE-02: prose vide → retourne 5 zéros (fail-closed)', () => {
    const r = measureRosette(PROSE_EMPTY);

    expect(r.f31_participes_presents).toBe(0);
    expect(r.f32_imbrication_fractale).toBe(0);
    expect(r.f33_coeff_parenthetiques).toBe(0);
    expect(r.position_expansion).toBe(0);
    expect(r.position_imbrication).toBe(0);
  });

  it('ROSETTE-03: F32 ∈ [0, 1] pour toute prose', () => {
    const proses = [PROSE_CAMUS_LIKE, PROSE_PROUST_LIKE, PROSE_EMPTY, 'Une phrase.'];
    for (const p of proses) {
      const r = measureRosette(p);
      expect(r.f32_imbrication_fractale).toBeGreaterThanOrEqual(0);
      expect(r.f32_imbrication_fractale).toBeLessThanOrEqual(1);
    }
  });

  it('ROSETTE-04: position_expansion ∈ [0, 1] pour toute prose', () => {
    const proses = [PROSE_CAMUS_LIKE, PROSE_PROUST_LIKE, 'Vite.'];
    for (const p of proses) {
      const r = measureRosette(p);
      expect(r.position_expansion).toBeGreaterThanOrEqual(0);
      expect(r.position_expansion).toBeLessThanOrEqual(1);
    }
  });

  it('ROSETTE-05: prose style Proust → F32 plus élevé que prose style Camus', () => {
    const rCamus = measureRosette(PROSE_CAMUS_LIKE);
    const rProust = measureRosette(PROSE_PROUST_LIKE);

    // Proust doit avoir plus de subordonnées imbriquées que Camus
    expect(rProust.f32_imbrication_fractale).toBeGreaterThan(rCamus.f32_imbrication_fractale);
  });

  it('ROSETTE-06: prose style Proust → position_expansion plus élevée que Camus', () => {
    const rCamus = measureRosette(PROSE_CAMUS_LIKE);
    const rProust = measureRosette(PROSE_PROUST_LIKE);

    // Proust = phrases plus longues → expansion plus haute
    expect(rProust.position_expansion).toBeGreaterThan(rCamus.position_expansion);
  });

  it('ROSETTE-07: position_imbrication === f32_imbrication_fractale (invariant)', () => {
    const r = measureRosette(PROSE_CAMUS_LIKE);
    expect(r.position_imbrication).toBe(r.f32_imbrication_fractale);

    const r2 = measureRosette(PROSE_PROUST_LIKE);
    expect(r2.position_imbrication).toBe(r2.f32_imbrication_fractale);
  });

  it('ROSETTE-08: ROSETTE_TARGETS a les bonnes bornes Camus (0.15, 0.12)', () => {
    expect(ROSETTE_TARGETS.position_expansion_max).toBe(0.15);
    expect(ROSETTE_TARGETS.position_imbrication_max).toBe(0.12);
    expect(ROSETTE_TARGETS.f31_target_min).toBe(0.8);
    expect(ROSETTE_TARGETS.f31_target_max).toBe(1.6);
    expect(ROSETTE_TARGETS.f33_target_min).toBe(0.15);
    expect(ROSETTE_TARGETS.f33_target_max).toBe(0.35);
  });

  it('ROSETTE-09: prose Camus-like → position 2D ≤ (0.25, 0.35) [zone Camus-adjacent]', () => {
    const r = measureRosette(PROSE_CAMUS_LIKE);
    // La prose Camus doit rester proche de l'origine (courts + peu imbriqués)
    expect(r.position_expansion).toBeLessThan(0.25);
    expect(r.f32_imbrication_fractale).toBeLessThan(0.35);
  });

  it('ROSETTE-10: F31 ≥ 0 pour toute prose (pas de valeur négative)', () => {
    const r = measureRosette(PROSE_CAMUS_LIKE);
    expect(r.f31_participes_presents).toBeGreaterThanOrEqual(0);
  });

});
