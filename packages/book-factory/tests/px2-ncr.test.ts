/**
 * OMEGA — NCR-PX2-001 : faux positif FLEXIONNEL du détecteur de stems.
 * Cas réel ch.39 EMP-16 : « Je parlerai si je disparais. » (hapax « disparais »,
 * préfixe de « disparaissent » ×5) — la gate coupait/refermait en boucle (no-op
 * masqué) et laissait un résidu PERMANENT sur une phrase saine.
 * M1 = exemption clitique sujet · M2 = un « » » nu n'est pas une phrase ·
 * M3 = silençage notarial par sceau d'auteur (l'autorité ne se re-questionne pas).
 */
import { describe, expect, it } from 'vitest';

import { buildCanonical } from '../src/c7/build-canonical.js';
import { buildBookVocabulary, endsInSubjectLicensedPosition, isCorpusTruncatedStem, semanticGate } from '../src/doctor/semantic-gate.js';
import { AuthorDecisionLedger } from '../src/identity/author-seal.js';

/* Corpus minimal : « disparaissent » ×2 (complétion du stem), « culpabilité » ×2. */
const VOCAB_TEXT = 'Ils disparaissent dans la brume du matin. Ils disparaissent encore ce soir. La culpabilité ronge Garcia depuis le naufrage. La culpabilité reste collée aux mains.';

describe('NCR-PX2-001 — M1 : position licenciée par clitique sujet (grammaire, pas lexique)', () => {
  const vocab = buildBookVocabulary(`${VOCAB_TEXT} disparais culp`);

  it('PX2-001 — morphologie brute vs position : « disparais » est hapax+préfixe MAIS licencié après « je »', () => {
    expect(isCorpusTruncatedStem('disparais', vocab)).toBe(true); // le piège morphologique existe bien
    expect(isCorpusTruncatedStem('culp', vocab)).toBe(true);
    expect(endsInSubjectLicensedPosition('Je parlerai si je disparais.')).toBe(true);
    expect(endsInSubjectLicensedPosition('Je parlerai si je disparais. »')).toBe(true);
    expect(endsInSubjectLicensedPosition("Il sourit quand j'apparais.")).toBe(true);
    expect(endsInSubjectLicensedPosition('Tu parles de culp.')).toBe(false);
    expect(endsInSubjectLicensedPosition('Le navire de marchandises.')).toBe(false);
  });

  it('PX2-002 — E2E : la phrase réelle du ch.39 traverse la gate INTACTE, résidu 0', () => {
    const ch = { chapter: 39, prose: `${VOCAB_TEXT}\n\n— « Je sais pour le naufrage. Le prix du sang ne s'efface pas avec le temps. Je parlerai si je disparais. »` };
    const r = semanticGate([ch]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).toContain('Je parlerai si je disparais. »');
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('PX2-003 — M2 : la famille VRAIE-POSITIVE (« de culp. ») reste excisée ET le dialogue refermé', () => {
    const ch = { chapter: 1, prose: `${VOCAB_TEXT}\n\n« Marie posa la lettre sur la table en bois sombre. Il parla de culp. »` };
    const r = semanticGate([ch]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).not.toContain('culp.');
    expect(r.value.repairedText).toContain('bois sombre. »'); // dialogue refermé après excision
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('PX2-004 — M3 : un résidu UNDECIDABLE couvert par SPAN_LOCK auteur est SILENCÉ par le notaire', async () => {
    // Mono-phrase >8 mots finissant sur stem vrai : ni coupable (keep vide), ni
    // retirable (>8 mots) ⇒ NONE_MANUAL_REVIEW ⇒ résidu permanent… sauf sceau.
    const sentence = 'Garcia parla longtemps de la vieille affaire du port et finit par murmurer culp.';
    const v0 = `## Chapitre 1\n\n${VOCAB_TEXT}\n\n${sentence}`;
    const noLock = await buildCanonical(v0);
    expect(noLock.ok).toBe(true);
    if (!noLock.ok) return;
    expect(noLock.value.cleanliness.detail.semanticResidual).toBeGreaterThan(0); // honnête sans sceau

    const locks = new AuthorDecisionLedger();
    locks.seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'culp. final — erreur volontaire ?', answer: 'KEEP — décision auteur (fixture NCR-PX2-001).', anchorExcerpt: sentence });
    const sealed = await buildCanonical(v0, { authorLocks: locks });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    expect(sealed.value.cleanliness.detail.lockSilencedResiduals).toBe(1);
    expect(sealed.value.cleanliness.detail.semanticResidual).toBe(0);
    expect(sealed.value.cleanliness.SEMANTIC_CLEAN).toBe(true);
    expect(sealed.value.text).toContain('murmurer culp.'); // le texte d'auteur n'est PAS touché
  });
});
