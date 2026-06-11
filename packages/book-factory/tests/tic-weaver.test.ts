/**
 * OMEGA Book-Factory — TIC_WEAVER tests (BF-08). Les 7 fixtures du mandat
 * tribunal (Phase 1 WEAVER_INTEGRATION) : accepté / refusé-garde / zéro-répétition
 * créée / re-scan / rollback bit-identique / hash stable / no-op si rien autorisé.
 * Réutilise le tribunal scellé du seam-surgeon (guardPatch) via tic-weaver.
 */

import { describe, expect, it } from 'vitest';

import type { SurgeonWorldState } from '../src/doctor/seam-surgeon.js';
import {
  applyTicRepairPass,
  maxTicDensityPer1000w,
  operateTic,
  type TicOccurrence,
} from '../src/doctor/tic-weaver.js';

const LEX = ['esquissa un sourire', 'ne cilla pas'] as const;

function world(chapter: number): SurgeonWorldState {
  return {
    chapterId: chapter,
    sceneId: 's1',
    pov: 'THIRD',
    location: 'le bureau',
    timeState: '',
    activeCharacters: [],
    activeObjects: ['carnet', 'registre', 'dossier'],
    actionInProgress: '',
    recallPack: [],
    canonConstraints: [],
    forbiddenPlaces: [],
  };
}

function occ(p: Partial<TicOccurrence>): TicOccurrence {
  return {
    ticId: p.ticId ?? 'T1',
    chapter: p.chapter ?? 1,
    tic: p.tic ?? 'esquissa un sourire',
    anchorSentence: p.anchorSentence ?? '',
    proposedReplacement: p.proposedReplacement ?? '',
    familyTags: p.familyTags ?? [],
  };
}

describe('TIC_WEAVER — tribunal réutilisé du seam-surgeon', () => {
  it('1. APPLIED — tic remplacé, gardes vertes, densité de tic en baisse', () => {
    const text =
      'Yvon esquissa un sourire sans joie. Il se tenait près de la fenêtre. Garcia esquissa un sourire à son tour.';
    const o = occ({
      anchorSentence: 'Yvon esquissa un sourire sans joie.',
      proposedReplacement: 'Yvon referma le carnet d’un geste sec.',
      familyTags: ['carnet'],
    });
    const before = maxTicDensityPer1000w(text, LEX);
    const { text: out, result } = operateTic(text, o, world(1), LEX);
    expect(result.verdict).toBe('APPLIED');
    expect(out).not.toBe(text);
    expect(out).toContain('referma le carnet');
    expect(result.ticDensityAfter).toBeLessThan(before);
  });

  it('2. ESCALATE_GUARD — entité inventée rejetée par le tribunal (NEW_ENTITY)', () => {
    const text = 'Yvon ne cilla pas devant la menace. Le silence pesait sur la pièce.';
    const o = occ({
      tic: 'ne cilla pas',
      anchorSentence: 'Yvon ne cilla pas devant la menace.',
      proposedReplacement: 'Yvon rangea le dossier à Vladivostok.',
    });
    const { text: out, result } = operateTic(text, o, world(1), LEX);
    expect(result.verdict).toBe('ESCALATE_GUARD');
    expect(result.reasons.join(' ')).toContain('NEW_ENTITY');
    expect(out).toBe(text);
  });

  it('3. ZÉRO RÉPÉTITION CRÉÉE — la proposition clone le voisin (REPEAT_VS_LEFT)', () => {
    const text =
      'Il se tenait près de la fenêtre, silencieux. Yvon ne cilla pas devant la menace.';
    const o = occ({
      tic: 'ne cilla pas',
      anchorSentence: 'Yvon ne cilla pas devant la menace.',
      proposedReplacement: 'Il se tenait près de la fenêtre, silencieux.',
    });
    const { result } = operateTic(text, o, world(1), LEX);
    expect(result.verdict).toBe('ESCALATE_GUARD');
    expect(result.reasons.join(' ')).toMatch(/REPEAT_VS_(LEFT|RIGHT)/u);
  });

  it('4. ESCALATE_RESCAN — la densité de tic ne baisse pas (REVERT)', () => {
    const text = 'Yvon ne cilla pas devant Garcia. Le silence pesait.';
    const o = occ({
      tic: 'ne cilla pas',
      anchorSentence: 'Yvon ne cilla pas devant Garcia.',
      proposedReplacement: 'Garcia ne cilla pas non plus.',
    });
    const { text: out, result } = operateTic(text, o, world(1), LEX);
    expect(result.verdict).toBe('ESCALATE_RESCAN');
    expect(out).toBe(text);
  });

  it('5. ROLLBACK BIT-IDENTIQUE — un patch refusé laisse le texte strictement intact', () => {
    const text = 'Yvon ne cilla pas devant la menace. Le silence pesait sur la pièce.';
    const o = occ({
      tic: 'ne cilla pas',
      anchorSentence: 'Yvon ne cilla pas devant la menace.',
      proposedReplacement: 'Yvon rangea le dossier à Vladivostok.',
    });
    const { text: out } = operateTic(text, o, world(1), LEX);
    expect(out).toBe(text);
    expect(out.length).toBe(text.length);
  });

  it('6. HASH STABLE — même proposition ⇒ même patchHash (déterminisme)', () => {
    const text = 'Yvon esquissa un sourire sans joie. Il se tut.';
    const o = occ({
      anchorSentence: 'Yvon esquissa un sourire sans joie.',
      proposedReplacement: 'Yvon referma le carnet.',
    });
    const a = operateTic(text, o, world(1), LEX).result.patchHash;
    const b = operateTic(text, o, world(1), LEX).result.patchHash;
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('7. NO-OP — applyTicRepairPass sans occurrence ne change RIEN (opt-in OFF)', () => {
    const text = 'Yvon esquissa un sourire sans joie. Garcia ne cilla pas.';
    const { text: out, report } = applyTicRepairPass(text, [], world, LEX);
    expect(out).toBe(text);
    expect(report.applied).toBe(0);
    expect(report.densityBefore).toBe(report.densityAfter);
  });

  it('ANCRE non unique — ESCALATE_ANCHOR (leçon AP-9 « esquissa un sourire » ×9)', () => {
    const text = 'Il sourit. Il sourit. Yvon parla enfin.';
    const o = occ({ anchorSentence: 'Il sourit.', proposedReplacement: 'Il toussa.' });
    const { text: out, result } = operateTic(text, o, world(1), LEX);
    expect(result.verdict).toBe('ESCALATE_ANCHOR');
    expect(out).toBe(text);
  });

  it('INV-TW-02 ANTI-RÉGRESSION — PASS si le tic CIBLÉ baisse, même si un AUTRE tic du lexique reste dominant', () => {
    // « le gardien » ×3 domine ; on cible « ne cilla pas » ×1. L'ancien bug
    // (max-sur-lexique) aurait rejeté car le max ne bougeait pas. Le fix doit APPLIQUER.
    const lex = ['ne cilla pas', 'le gardien'] as const;
    const text = 'Le gardien veillait. Le gardien dormait. Le gardien partit. Yvon ne cilla pas devant lui.';
    const o = occ({
      tic: 'ne cilla pas',
      anchorSentence: 'Yvon ne cilla pas devant lui.',
      proposedReplacement: 'Yvon serra le poing.',
    });
    const { text: out, result } = operateTic(text, o, world(1), lex);
    expect(result.verdict).toBe('APPLIED');
    expect(out).not.toContain('ne cilla pas');
    expect((out.match(/le gardien/giu) ?? []).length).toBe(3); // l'autre tic n'est PAS touché
  });
});
