/** OMEGA — PE-1 SCANNERS ÉDITORIAUX (BF-08). */
import { describe, expect, it } from 'vitest';

import { chapterPolishRow, scanComfortSentences, scanDialogueMode, scanPassiveCharacters, scanRevelationConsequence } from '../src/polish/editorial-scanners.js';

describe('PE-1 — phrase de confort', () => {
  it('SC-001 — grappe de descriptions plates détectée comme run de confort', () => {
    const flat = 'La maison était grise. Le toit était bas. Les murs étaient froids. La porte était vieille. La nuit était calme.';
    const r = scanComfortSentences(flat, 4);
    expect(r.runs).toBeGreaterThanOrEqual(1);
    expect(r.comfortRatio).toBeGreaterThan(0.8);
  });
  it('SC-002 — prose avec verbes vivants / dialogue n\'est PAS du confort', () => {
    const live = '— Tu mens, cria Léna. Garcia recula. Il saisit le carnet et le jeta au feu.';
    expect(scanComfortSentences(live, 4).runs).toBe(0);
  });
});

describe('PE-1 — mode dialogue (info vs conflit)', () => {
  it('SC-003 — dialogue d\'enquête explicatif ⇒ ratio conflit bas', () => {
    const info = '— Je sais que tu étais là.\n— C\'est parce que j\'avais peur.\n— Voilà pourquoi je me tais.';
    const r = scanDialogueMode(info);
    expect(r.infodump).toBeGreaterThanOrEqual(2);
    expect(r.conflictRatio).toBeLessThan(0.5);
  });
  it('SC-004 — dialogue de conflit ⇒ ratio conflit haut', () => {
    const conf = '— Je t\'accuse, dit-il.\n— Tu mens !\n— Comment oses-tu ?';
    expect(scanDialogueMode(conf).conflictRatio).toBeGreaterThan(0.5);
  });
});

describe('PE-1 — personnage passif', () => {
  it('SC-005 — personnage seulement observé ⇒ passif ; personnage agissant ⇒ actif', () => {
    const prose = 'Garcia saisit la lampe et courut vers la cale. Léna était là, immobile, une ombre près du mur.';
    const passive = scanPassiveCharacters(prose, ['Garcia', 'Léna']);
    expect(passive).toContain('Léna');
    expect(passive).not.toContain('Garcia');
  });
});

describe('PE-1 — révélation sans conséquence', () => {
  it('SC-006 — révélation suivie d\'une décision ⇒ conséquence ; sinon non', () => {
    const chs = [
      { chapter: 7, prose: 'Il avoua enfin la vérité.' },
      { chapter: 8, prose: 'Léna décida de partir sur-le-champ. Elle saisit son manteau.' },
      { chapter: 12, prose: 'La vérité éclata.' },
      { chapter: 13, prose: 'La pluie tombait sur le port gris et vide, lente et froide.' },
    ];
    const r = scanRevelationConsequence(chs, [7, 12]);
    expect(r.find((x) => x.chapter === 7)?.hasConsequence).toBe(true);
    expect(r.find((x) => x.chapter === 12)?.hasConsequence).toBe(false);
  });
});

describe('PE-1 — synthèse priorisée + honnêteté', () => {
  it('SC-007 — signaux mécaniques détectés + axes œil-humain toujours listés (honnêteté)', () => {
    const ch = { chapter: 3, prose: 'La maison était grise. Le toit était bas. Les murs étaient froids. La porte était vieille. Yvon était là.' };
    const row = chapterPolishRow(ch, ['Yvon', 'Garcia']);
    expect(row.comfortRatio).toBeGreaterThan(0.8); // passage de confort détecté
    expect(row.passiveCharacters).toContain('Yvon'); // personnage passif détecté
    expect(['HIGH', 'MED', 'LOW']).toContain(row.polishPriority); // priorité dérivée valide
    expect(row.axesHumanEye.length).toBeGreaterThan(0); // jamais prétendre mesurer le souffle
  });
});
