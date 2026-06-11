/**
 * OMEGA Book-Factory — REPETITION_SENSOR tests (BF-08, Phase 2). Source unique de
 * vérité : familles disjointes, normalisation /1000 mots, répétition exacte, et la
 * règle d'admissibilité « aucun axe ne monte » (INV-RS-03) qui empêche de déplacer
 * la moisissure d'un axe de tic à l'autre (preuve dry-run V3 : gestuel↓ / atmo↑).
 */

import { describe, expect, it } from 'vitest';

import {
  DEFAULT_FAMILIES,
  measureRepetition,
  patchAdmissible,
} from '../src/coherence/repetition-sensor.js';

describe('REPETITION_SENSOR — mesure unifiée', () => {
  it('mesure les 4 familles, normalisées /1000 mots', () => {
    const text = 'Yvon esquissa un sourire. Le silence pesait. Le silence durait. Il fit un pas vers elle.';
    const p = measureRepetition(text);
    expect(p.families.map((f) => f.family)).toContain('GESTURAL');
    expect(p.families.map((f) => f.family)).toContain('ATMOSPHERIC');
    const atmo = p.families.find((f) => f.family === 'ATMOSPHERIC');
    expect(atmo?.topCount).toBeGreaterThanOrEqual(2);
    expect(p.worstFamilyDensity).toBeGreaterThan(0);
  });

  it('compte la répétition EXACTE de phrase (≥3×)', () => {
    const s = 'Le mot tomba comme un couperet. ';
    const text = `Garcia parla. ${s}${s}${s}Yvon se tut.`;
    const p = measureRepetition(text, { exactRepeatMin: 3 });
    expect(p.exactRepeatCount).toBeGreaterThanOrEqual(1);
  });

  it('clean=false quand une famille dépasse le seuil', () => {
    const text = `${'le silence partout. '.repeat(10)}Fin.`;
    const p = measureRepetition(text, { densityThresholdPer1000w: 1.5 });
    expect(p.clean).toBe(false);
  });

  it('DEFAULT_FAMILIES couvre gestuel + atmosphérique + saturation + phrase', () => {
    const fams = DEFAULT_FAMILIES.map((f) => f.family);
    expect(new Set(fams)).toEqual(new Set(['GESTURAL', 'ATMOSPHERIC', 'SATURATION', 'PHRASE']));
  });
});

describe('REPETITION_SENSOR — admissibilité d’un patch (INV-RS-03)', () => {
  it('ADMISSIBLE — baisse le gestuel sans monter aucun autre axe', () => {
    const before = 'Yvon esquissa un sourire sans joie. Garcia attendait près du quai.';
    const after = 'Yvon referma le carnet sans un mot. Garcia attendait près du quai.';
    const r = patchAdmissible(before, after, 'GESTURAL');
    expect(r.admissible).toBe(true);
    expect(r.deltaScore).toBeLessThanOrEqual(0);
  });

  it('REFUSÉ — baisse le gestuel mais MONTE l’atmosphérique (déplace la moisissure)', () => {
    const before = 'Yvon esquissa un sourire sans joie. Garcia attendait.';
    const after = 'Le silence pesait, et le silence durait encore. Garcia attendait.';
    const r = patchAdmissible(before, after, 'GESTURAL');
    expect(r.admissible).toBe(false);
    expect(r.reasons.join(' ')).toContain('FAMILY_ROSE:ATMOSPHERIC');
  });

  it('REFUSÉ — la cible ne baisse pas', () => {
    const before = 'Garcia attendait près du quai, calme.';
    const after = 'Garcia patientait près du quai, calme.';
    const r = patchAdmissible(before, after, 'GESTURAL');
    expect(r.admissible).toBe(false);
    expect(r.reasons.join(' ')).toContain('TARGET_NOT_REDUCED');
  });
});
