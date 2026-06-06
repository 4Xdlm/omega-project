/**
 * C8 — MÉTIER : amorces variées (D2) + JudgePort gaté APPROVED + repeat inter-chapitres
 * + extension 60k (BB-02-aware).
 */
import { describe, expect, it } from 'vitest';

import { incipitDivergence, OPENING_DIRECTIVES } from '../../src/loop/incipit.js';
import { auditNoCoaching, CORE_PROFILES } from '../../src/loop/r6-core.js';
import { openJudgePort, runTournament, JUDGE_POINT_BONUS } from '../../src/loop/judge-port.js';
import type { JudgeProfile, PairwiseJudge } from '../../src/loop/judge-port.js';
import { crossChapterRepeat } from '../../src/loop/cross-chapter-repeat.js';
import { extendChapter, chaptersFor, MAX_SEGMENTS, CONTINUATION_DIRECTIVE } from '../../src/loop/chapter-extender.js';
import type { ChapterGenerator, GenRequest, GenResult } from '../../src/chapter-generator.js';
import type { Sha256Hex } from '../../src/identity/identity-types.js';

describe('C8.3 — Amorces variées + métrique d’incipit (D2)', () => {
  it('7 directives distinctes, une par profil, TOUTES propres FORBID-006', () => {
    const values = CORE_PROFILES.map((p) => OPENING_DIRECTIVES[p]);
    expect(new Set(values).size).toBe(7);
    for (const v of values) expect(auditNoCoaching(v)).toEqual([]);
  });

  it('métrique : incipits clonés ⇒ divergence ≈ 0 ; attaques distinctes ⇒ divergence élevée', () => {
    const clone = 'Le sel colle à la peau comme une fine pellicule de poussière métallique sur les avant-bras au matin gris du port endormi sous la pluie fine et le vent du large qui ne faiblit jamais vraiment ici';
    const low = incipitDivergence([clone, clone, `${clone} et pourtant`]);
    const high = incipitDivergence([
      clone,
      '« Tu n’aurais pas dû revenir », dit le vieux sans se retourner, les mains posées à plat sur le zinc du comptoir encore humide du torchon du soir, et la salle entière retint son souffle un instant.',
      'Quatre heures. Le môle était vide. Une mouette criait au-dessus des casiers empilés contre la cabane des pêcheurs, et la marée descendait en silence le long des piles vertes de la jetée du nord.',
    ]);
    expect(low).toBeLessThan(0.2);
    expect(high).toBeGreaterThan(0.8);
    expect(incipitDivergence(['seul'])).toBe(1);
  });
});

describe('C8.4 — JudgePort : gaté APPROVED par construction (EMP-19/FORBID-012)', () => {
  const base = { model: 'gemma4:31b', promptSha256: 'a'.repeat(64) as Sha256Hex, temperature: 0 };

  it('PROPOSED (les deux profils réels actuels) ⇒ REFUSÉ ; DISQUALIFIED/EXPIRED ⇒ REFUSÉ', () => {
    for (const status of ['PROPOSED', 'DISQUALIFIED', 'EXPIRED'] as const) {
      const r = openJudgePort({ ...base, status });
      expect(!r.ok && r.error.code === 'PROFILE_NOT_APPROVED').toBe(true);
    }
  });

  it('APPROVED sans approbateur ⇒ REFUSÉ ; APPROVED signé ⇒ OUVERT', () => {
    const noBy = openJudgePort({ ...base, status: 'APPROVED' } as JudgeProfile);
    expect(!noBy.ok && noBy.error.code === 'MISSING_APPROVER').toBe(true);
    const ok = openJudgePort({ ...base, status: 'APPROVED', approvedBy: 'Francky' });
    expect(ok.ok).toBe(true);
  });

  it('tournoi double-ordre : préférence CONCORDANTE marque, biais de position = tie (anti-biais par design)', async () => {
    // juge stub : préfère STRICTEMENT le texte le plus long, quel que soit l'ordre
    const lengthJudge: PairwiseJudge = { compare: async (a, b) => (a.length > b.length ? 'A' : b.length > a.length ? 'B' : 'TIE') };
    const r = await runTournament(lengthJudge, [
      { profile: 'canon-strict', prose: 'court' },
      { profile: 'sensoriel', prose: 'beaucoup plus long que court' },
      { profile: 'synthese', prose: 'moyen texte ici' },
    ]);
    expect(r.duels).toBe(3);
    expect(r.points.get('sensoriel')).toBe(2); // bat les deux, dans les deux ordres
    expect(r.points.get('canon-strict')).toBe(0);
    // juge BIAISÉ position (toujours A) ⇒ jamais concordant ⇒ zéro point partout
    const biased: PairwiseJudge = { compare: async () => 'A' };
    const rb = await runTournament(biased, [
      { profile: 'canon-strict', prose: 'x x x' },
      { profile: 'sensoriel', prose: 'y y y y' },
    ]);
    expect([...rb.points.values()].every((p) => p === 0)).toBe(true);
    expect(JUDGE_POINT_BONUS).toBeGreaterThan(0);
  });
});

describe('C8.5 — Repeat inter-chapitres (shadow)', () => {
  it('tic trans-chapitres détecté ; incipits clonés adjacents ⇒ divergence basse ; near-dup attrapé', () => {
    const tic = 'comme si la mer savait quelque chose';
    const chapters = [
      { chapter: 1, prose: `La digue était grise ${tic} de plus ce matin-là sous les nuages bas du large et la pluie fine.` },
      { chapter: 2, prose: `La digue était grise ${tic} encore une fois ce soir-là sous les nuages bas du large et la pluie fine.` },
      { chapter: 3, prose: `Un autre jour entier passa ${tic} toujours, et personne ne parla au village ni sur le port désert.` },
    ];
    const rep = crossChapterRepeat(chapters, { minChaptersForTic: 3, nearDupThreshold: 0.6 });
    expect(rep.topCrossTrigrams.some((t) => t.gram.includes('mer savait'))).toBe(true);
    const d2 = rep.incipitDivergenceAdjacent.find((x) => x.chapter === 2);
    expect(d2 !== undefined && d2.divergenceVsPrev < 0.5).toBe(true);
    expect(rep.nearDupSentencePairs.length).toBeGreaterThan(0);
  });
});

describe('C8.6 — Extension de chapitre (cap 60k, BB-02-aware)', () => {
  const seg = (n: number) => Array.from({ length: 200 }, (_, i) => `mot${n}_${i}`).join(' ');
  function gen(): ChapterGenerator {
    let k = 0;
    return {
      async generate(req: GenRequest): Promise<GenResult> {
        k += 1;
        expect(req.digest.startsWith(CONTINUATION_DIRECTIVE)).toBe(true); // consigne FIGÉE en tête
        expect(req.previousTail !== undefined && req.previousTail.length > 0).toBe(true); // traîne fournie
        const prose = seg(k);
        return { prose, words: 200, model: 'stub', ms: 0 };
      },
    };
  }
  const baseReq: GenRequest = { intent: { title: 't', premise: 'p', themes: [], core_emotion: 'tension', target_audience: 'a', message: 'm', target_word_count: 900 }, digest: 'ctx', spec: {} as never };

  it('étend par continuations bornées jusqu’à la cible ; consigne propre FORBID-006', async () => {
    const r = await extendChapter(seg(0), baseReq, gen(), 550, () => true);
    expect(r.segments.length).toBe(3); // 200 + 200 + 200 ≥ 550, ≤ MAX_SEGMENTS
    expect(r.totalWords).toBe(600);
    expect(r.coachingAudit).toEqual([]);
    expect(MAX_SEGMENTS).toBe(3);
  });

  it('BF-02 au segment : filet recall rouge ⇒ arrêt PROPRE (pas de chapitre semi-validé)', async () => {
    const r = await extendChapter(seg(0), baseReq, gen(), 1000, (s) => !s.startsWith('mot2')); // refuse le 2e segment généré
    expect(r.segments.length).toBe(2); // gagnant + 1 continuation acceptée, stop net
  });

  it('chaptersFor : information de plan honnête (60k à 600 w/chap ⇒ 100 chapitres)', () => {
    expect(chaptersFor(60_000, 600)).toBe(100);
    expect(chaptersFor(60_000, 1_500)).toBe(40); // avec extension ×2.5
  });
});
