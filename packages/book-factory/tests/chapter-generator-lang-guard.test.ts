/**
 * N-GARDE — le generateur SIGNALE les mots-outils anglais restes dans la prose.
 *
 * Constate sur 105 sorties reelles (A0 + A3 + B0) : 9,5 % en contiennent au
 * moins un, soit ~5 chapitres par livre de 50. Le detecteur existait et
 * fonctionnait ; il n'etait jamais appele sur le chemin officiel.
 *
 * PISTE RETOUR LECTEUR n.1 : « Il resta ainsi, immobile, during un long moment »
 * ne se lit pas comme un anglicisme mais comme une anomalie — un mot manquant.
 */
import { describe, it, expect } from 'vitest';
import { scanEnglishResiduals } from '../src/doctor/lang-purity.js';

describe('N-GARDE — residus anglais reellement observes en production', () => {
  const OBSERVED: readonly { readonly sentence: string; readonly token: string }[] = [
    { sentence: 'Il resta ainsi, immobile, during un long moment, le regard perdu.', token: 'during' },
    { sentence: 'Il se contentait de la faire rouler between son index et son majeur.', token: 'between' },
    { sentence: "Reprendre contact avec les survivants ou with l'autorite du village.", token: 'with' },
    { sentence: 'Garcia savait que demain, when il sortirait de cette chambre, tout changerait.', token: 'when' },
    { sentence: 'Des silences achetes pour through les generations successives.', token: 'through' },
  ];

  for (const c of OBSERVED) {
    it(`detecte « ${c.token} » dans une phrase francaise par ailleurs correcte`, () => {
      const r = scanEnglishResiduals(c.sentence);
      expect(r.length).toBeGreaterThan(0);
      expect(r.map((x) => x.word.toLowerCase())).toContain(c.token);
    });
  }

  it('ne signale rien sur la version francaise corrigee', () => {
    const clean = [
      'Il resta ainsi, immobile, pendant un long moment, le regard perdu.',
      'Il se contentait de la faire rouler entre son index et son majeur.',
      "Reprendre contact avec les survivants ou avec l'autorite du village.",
      'Garcia savait que demain, quand il sortirait de cette chambre, tout changerait.',
      'Des silences achetes pour toutes les generations successives.',
    ].join(' ');
    expect(scanEnglishResiduals(clean)).toHaveLength(0);
  });

  it("n'attrape pas les emprunts francais legitimes", () => {
    const fr = 'Il gara la voiture sur le parking, consulta son planning, puis remit son smoking.';
    expect(scanEnglishResiduals(fr)).toHaveLength(0);
  });

  it('le rapport porte le mot, sa position et son contexte', () => {
    const r = scanEnglishResiduals('Il attendit during la nuit entiere.');
    expect(r[0]?.word.toLowerCase()).toBe('during');
    expect(r[0]?.index).toBeGreaterThan(0);
    expect(r[0]?.context.length).toBeGreaterThan(0);
  });
});
