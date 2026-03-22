/**
 * OMEGA R-8 Diagnostic Tests — Phase P1
 * Date: 2026-03-22
 * Role: Verify diagnostic module combines GB + classifier + normalizer correctly.
 */

import { describe, it, expect } from 'vitest';
import { diagnose, quickDiagnose } from '../../src/scoring/r8-diagnostic.js';

// A short but representative French literary passage (Flaubert style)
const FRENCH_LITERARY = `
Elle restait accoudée sur le bord de sa fenêtre, et elle lisait entre les
pots de géraniums la lettre de son amant. Une des feuilles tremblait au
vent léger du soir, et un rayon de soleil venait se poser obliquement
sur le papier, éclairant les mots d'amour qui semblaient palpiter comme
des êtres vivants. La campagne s'étendait au loin, avec ses prairies
vertes et ses bouquets d'arbres, tandis que la rivière coulait au fond
de la vallée dans un murmure doux et continu. Elle sentait monter en
elle une émotion qu'elle ne pouvait définir, quelque chose qui tenait
à la fois de la joie et de la tristesse, comme si le bonheur portait
en lui-même le germe de sa propre destruction. Les cloches de l'église
sonnèrent au loin, et le son se perdit lentement dans l'air du soir.
`;

// A short commercial-style passage
const COMMERCIAL_STYLE = `
He grabbed her arm. "We need to go. Now." She looked at him with wide eyes.
"What happened?" He didn't answer. They ran through the dark corridor.
The door slammed behind them. She could hear footsteps. Getting closer.
Her heart was pounding. He pulled out a gun. "Stay behind me." The
footsteps stopped. Silence. Then a voice from the darkness said something
that made her blood run cold.
`;

describe('R-8 Diagnostic Module (P1)', () => {
  it('diagnose returns all required fields', () => {
    const report = diagnose(FRENCH_LITERARY);

    expect(report.gb_score).toBeTypeOf('number');
    expect(report.tier).toMatch(/^[SABCD]$/);
    expect(report.type_composition).toBeDefined();
    expect(report.dominant_type).toBeTypeOf('string');
    expect(report.tipping_points).toBeInstanceOf(Array);
    expect(report.tk_master_count).toBeTypeOf('number');
    expect(report.tk_total).toBeTypeOf('number');
    expect(report.key_features).toBeInstanceOf(Array);
    expect(report.word_count).toBeGreaterThan(50);
  });

  it('type composition sums to 1.0 (+-0.01)', () => {
    const report = diagnose(FRENCH_LITERARY);
    const tc = report.type_composition;
    const sum = tc.narration + tc.description + tc.dialogue + tc.introspection + tc.action;
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
  });

  it('tipping points are evaluated', () => {
    const report = diagnose(FRENCH_LITERARY);
    expect(report.tk_total).toBeGreaterThan(0);
    expect(report.tk_master_count).toBeLessThanOrEqual(report.tk_total);
  });

  it('key features has 10 items', () => {
    const report = diagnose(FRENCH_LITERARY);
    expect(report.key_features).toHaveLength(10);
    for (const kf of report.key_features) {
      expect(kf.name).toBeTypeOf('string');
      expect(kf.value).toBeTypeOf('number');
      expect(kf.importance).toBeTypeOf('number');
    }
  });

  it('determinism: same text -> same report', () => {
    const r1 = diagnose(FRENCH_LITERARY);
    const r2 = diagnose(FRENCH_LITERARY);
    expect(r1.gb_score).toBe(r2.gb_score);
    expect(r1.tier).toBe(r2.tier);
    expect(r1.tk_master_count).toBe(r2.tk_master_count);
  });

  it('quickDiagnose returns minimal fields', () => {
    const quick = quickDiagnose(FRENCH_LITERARY);
    expect(quick.gb_score).toBeTypeOf('number');
    expect(quick.tier).toMatch(/^[SABCD]$/);
    expect(quick.tk_master_count).toBeTypeOf('number');
    expect(quick.dominant_type).toBeTypeOf('string');
  });

  it('both passages produce valid scores in [1, 6] range', () => {
    const literary = diagnose(FRENCH_LITERARY);
    const commercial = diagnose(COMMERCIAL_STYLE);
    // On ~100-word passages, GB scores are noisy (model calibrated for 500w+)
    // We verify both produce valid numeric scores, not relative ordering
    expect(literary.gb_score).toBeGreaterThan(1);
    expect(literary.gb_score).toBeLessThan(6);
    expect(commercial.gb_score).toBeGreaterThan(1);
    expect(commercial.gb_score).toBeLessThan(6);
  });
});
