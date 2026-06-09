/** OMEGA — LANG_PURITY : détecte le franglais SANS faux-positif sur les emprunts
 *  FR ni les homographes FR. Trou de gate fermé (résidus EN « clean » au V3). */
import { describe, expect, it } from 'vitest';

import { scanEnglishResiduals, isLangClean } from '../src/doctor/lang-purity.js';

describe('LANG_PURITY — résidus anglais', () => {
  it('LP-001 — flagge les vrais résidus anglais dans une prose FR', () => {
    const p = 'Elle avait porté during des années un poids ; il pliait carefully la lettre, when on parle de dettes tout would exploser.';
    const words = scanEnglishResiduals(p).map((r) => r.word.toLowerCase());
    for (const w of ['during', 'carefully', 'when', 'would']) expect(words).toContain(w);
  });

  it('LP-002 — n\'attrape PAS les emprunts FR ni les homographes FR (zéro faux-positif)', () => {
    // standing/parking = emprunts FR ; but/or/car/son/part/pour/pain/mine = mots FR ;
    // été/pénombre/différent = mots accentués FR.
    const fr = 'Yvon tenait à son standing et au parking. Mais le but, or il le savait, car la part de Léna, pour son pain, dans la pénombre, était différente cet été.';
    expect(scanEnglishResiduals(fr)).toHaveLength(0);
    expect(isLangClean(fr)).toBe(true);
  });

  it('LP-003 — isLangClean : vrai sur FR pur, faux avec un résidu', () => {
    expect(isLangClean('Il marcha dans la nuit froide et silencieuse.')).toBe(true);
    expect(isLangClean('Il marcha slowly dans la nuit.')).toBe(false);
  });

  it('LP-004 — contexte fourni pour chaque résidu (localisable)', () => {
    const r = scanEnglishResiduals('La vapeur montait, blending avec la lumière blafarde du matin.');
    expect(r).toHaveLength(1);
    expect(r[0]?.context).toContain('blending');
  });
});
