/**
 * OMEGA — tests du découpeur de phrases canonique FR.
 * INV-SPLIT-FR. Chaque cas cite l'implémentation historique qu'il corrige.
 */
import { describe, it, expect } from 'vitest';
import { splitSentencesFr, countWordsFr, sentenceLengthsFr } from '../src/phonetic/sentence-splitter-fr.js';

describe('splitSentencesFr — cas où les implémentations historiques échouaient', () => {
  it('INV-SPLIT-FR-A1 : les points de suspension INTRA-phrastiques ne coupent pas (impl. A coupait)', () => {
    expect(splitSentencesFr('Elle hésita… puis elle sortit.')).toEqual(['Elle hésita… puis elle sortit.']);
    expect(sentenceLengthsFr('Elle hésita… puis elle sortit.')).toEqual([5]);
  });

  it('INV-SPLIT-FR-A2 : les points de suspension TERMINAUX coupent (suivis d\'une majuscule)', () => {
    expect(splitSentencesFr('Elle hésita… Puis elle sortit.')).toEqual(['Elle hésita…', 'Puis elle sortit.']);
  });

  it('INV-SPLIT-FR-A3 : l\'incise dialoguée reste soudée à sa réplique (impl. A l\'éclatait)', () => {
    expect(splitSentencesFr('Il partit. « Attends ! » cria-t-elle. Rien.'))
      .toEqual(['Il partit.', '« Attends ! » cria-t-elle.', 'Rien.']);
  });

  it('INV-SPLIT-FR-B1 : la ponctuation isolée n\'est pas un mot (impl. B comptait « : » et « — »)', () => {
    expect(countWordsFr('Il dit : — Non.')).toBe(3);
    expect(sentenceLengthsFr('Il dit : — Non. Elle répondit : — Si.')).toEqual([3, 3]);
  });

  it('INV-SPLIT-FR-B2 : un texte sans terminateur final rend quand même sa phrase', () => {
    expect(splitSentencesFr('Une phrase sans point final')).toEqual(['Une phrase sans point final']);
  });
});

describe('splitSentencesFr — abréviations françaises', () => {
  it('INV-SPLIT-FR-C1 : les civilités ne coupent pas', () => {
    expect(splitSentencesFr('M. Dupont entra. Il salua.')).toEqual(['M. Dupont entra.', 'Il salua.']);
    expect(splitSentencesFr('Mme Martin attendait.')).toEqual(['Mme Martin attendait.']);
  });

  it('INV-SPLIT-FR-C2 : « cf. » (jamais terminal) ne coupe pas', () => {
    expect(splitSentencesFr('cf. Dupont pour le détail.')).toEqual(['cf. Dupont pour le détail.']);
  });

  it('INV-SPLIT-FR-C2bis : « etc. » (souvent terminal) COUPE devant une majuscule', () => {
    expect(splitSentencesFr('Des armes, des dossiers, etc. Puis le silence.'))
      .toEqual(['Des armes, des dossiers, etc.', 'Puis le silence.']);
  });

  it('INV-SPLIT-FR-C3 : les initiales ne coupent pas', () => {
    expect(splitSentencesFr('J. K. Rowling écrivait.')).toEqual(['J. K. Rowling écrivait.']);
  });
});

describe('splitSentencesFr — invariants', () => {
  const CORPUS = [
    'Il partit. « Attends ! » cria-t-elle. Rien.',
    'Elle hésita… puis elle sortit. M. Dupont la suivit.',
    'Quoi ?! Vraiment ? Oui.',
    '',
    '   ',
    'Un.',
  ];

  it('INV-SPLIT-FR-01 : aucune phrase vide en sortie', () => {
    for (const t of CORPUS) for (const s of splitSentencesFr(t)) expect(s.trim().length).toBeGreaterThan(0);
  });

  it('INV-SPLIT-FR-02 : le découpage préserve tous les caractères non-espaces', () => {
    for (const t of CORPUS) {
      const strip = (s: string): string => s.replace(/\s+/gu, '');
      expect(strip(splitSentencesFr(t).join(''))).toBe(strip(t));
    }
  });

  it('INV-SPLIT-FR-04 : aucune longueur nulle', () => {
    for (const t of CORPUS) for (const n of sentenceLengthsFr(t)) expect(n).toBeGreaterThan(0);
  });

  it('déterminisme : deux appels donnent le même résultat', () => {
    for (const t of CORPUS) expect(splitSentencesFr(t)).toEqual(splitSentencesFr(t));
  });

  it('robustesse : texte vide et blancs seuls rendent une série vide', () => {
    expect(splitSentencesFr('')).toEqual([]);
    expect(splitSentencesFr('   \n\n  ')).toEqual([]);
    expect(sentenceLengthsFr('')).toEqual([]);
  });

  it('les terminateurs multiples ne créent pas de phrases vides', () => {
    expect(splitSentencesFr('Quoi ?! Vraiment ? Oui.')).toEqual(['Quoi ?!', 'Vraiment ?', 'Oui.']);
  });
});
