/** OMEGA — SEMANTIC GATE tests (NCR-SEMANTIC-TRUNCATION-003).
 *  Fixtures = les 7 preuves RÉELLES du refus ChatGPT, confirmées sur 7464c4bb.
 *  « Un point final ne répare pas une phrase amputée. Il la maquille. » */
import { describe, it, expect } from 'vitest';
import { seamSweep } from '../src/doctor/seam-sweep.js';
import { semanticGate, buildBookVocabulary, isCorpusTruncatedStem, isBookEndComplete } from '../src/doctor/semantic-gate.js';

describe('NCR-003 — troncatures SÉMANTIQUES (trous de sens, pas de ponctuation)', () => {
  it("INV-SEM-001 — preuve ch.1 « Elle peut voir » : segment terminal ouvert (3 mots) = COUPE, jamais de point", () => {
    const r = seamSweep([{ chapter: 1, prose: "Elle s'arrête à trois mètres du fauteuil. Elle peut voir" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).not.toContain('Elle peut voir.');
    expect(r.value.repairedText).toContain('du fauteuil.');
    expect(r.value.repairs.some((x) => x.action === 'CUT_TO_LAST_SENTENCE')).toBe(true);
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEM-002 — preuve « Léna ouvrit » : fragment ouvert court isolé = RETIRÉ tracé, jamais « Léna ouvrit. »", () => {
    const r = seamSweep([{ chapter: 3, prose: "Le couloir sentait la poussière humide.\n\nLéna ouvrit" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).not.toContain('Léna ouvrit.');
    expect(r.value.repairedText).not.toContain('Léna ouvrit');
    expect(r.value.repairs.some((x) => x.action === 'REMOVE_TRUNCATED_FRAGMENT')).toBe(true);
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEM-003 — preuve « — Tu parles de culp » : stem tronqué PROUVÉ PAR LE CORPUS (culp→culpabilité), retiré", () => {
    const prose = "La culpabilité le rongeait depuis des années. La culpabilité ne dort jamais.\n\n— Tu parles de culp";
    const vocab = buildBookVocabulary(prose);
    const r = seamSweep([{ chapter: 12, prose }], 0.6, [], vocab);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).not.toContain('culp.');
    expect(r.value.repairedText).not.toMatch(/culp(?!abilité)/u);
    expect(r.value.repairedText).toContain('La culpabilité le rongeait');
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('INV-SEM-004 — preuve « «. » : guillemet dégénéré = retiré tracé', () => {
    const r = semanticGate([{ chapter: 10, prose: 'Le silence dura longtemps.\n\n«.\n\nGarcia reprit son souffle et attendit.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === 'REMOVE_DEGENERATE_QUOTE')).toBe(true);
    expect(r.value.repairedText).not.toMatch(/«\s*\./u);
    expect(r.value.repairedText).toContain('Garcia reprit son souffle');
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEM-005 — preuve « « Qui l'a fait taire. » : citation TERMINÉE mais non fermée = » ajouté (typographie, zéro mot inventé)", () => {
    const r = semanticGate([{ chapter: 15, prose: "Il posa la question qui brûlait.\n\n« Qui l'a fait taire." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === 'CLOSE_QUOTE')).toBe(true);
    expect(r.value.repairedText).toContain("« Qui l'a fait taire. »");
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('INV-SEM-006 — preuve ch.50 : la fin du livre devient une réplique FERMÉE, plus une citation ouverte', () => {
    const last = '« Du naufrage », dit Yvon simplement. « Le navire de marchandises.';
    expect(isBookEndComplete(last)).toBe(false); // AVANT : citation ouverte = FAIL
    const r = semanticGate([{ chapter: 50, prose: `Garcia attendait sans bouger près de la fenêtre.\n\n${last}` }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const blocks = (r.value.repairedChapters[0]?.prose ?? '').split(/\n\n/u);
    const newLast = blocks[blocks.length - 1] ?? '';
    expect(newLast).toContain('« Le navire de marchandises. »');
    expect(isBookEndComplete(newLast)).toBe(true); // APRÈS : scène fermée = PASS
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('INV-SEM-007 — stem corpus : « culp » détecté, mots établis et noms propres JAMAIS', () => {
    const vocab = buildBookVocabulary('La culpabilité rongeait Garcia. La culpabilité encore. La nuit tombait sur le port. La nuit encore.');
    expect(isCorpusTruncatedStem('culp', vocab)).toBe(true);
    expect(isCorpusTruncatedStem('nuit', vocab)).toBe(false); // mot établi (freq 2)
    expect(isCorpusTruncatedStem('Garcia', vocab)).toBe(false); // nom propre, préfixe de rien
    expect(isCorpusTruncatedStem('port', vocab)).toBe(false);
  });

  it("INV-SEM-009 — faux positif RÉEL ch.37 : « dite » (participe hapax) JAMAIS flagué via « dites-moi » (composé)", () => {
    const prose = "« Dites-moi la vérité », lança Léna. « Dites-moi tout. »\n\n— Je ne veux pas la réponse, » mentit Garcia. « Je veux savoir pourquoi vous ne l'avez pas dite. »";
    const vocab = buildBookVocabulary(prose);
    expect(isCorpusTruncatedStem('dite', vocab)).toBe(false); // composés exclus de l'espace des préfixes
    const r = semanticGate([{ chapter: 37, prose }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairedText).toContain("vous ne l'avez pas dite"); // la phrase légitime est PRÉSERVÉE
  });

  it('INV-SEM-008 — déterminisme ×2 + texte propre = zéro finding zéro réparation', () => {
    const clean = [{ chapter: 1, prose: '« Une réplique complète. » Une phrase de narration nette.\n\nUn paragraphe final propre et fermé.' }];
    const a = semanticGate(clean);
    expect(a.ok && a.value.findings.length === 0 && a.value.repairs.length === 0).toBe(true);
    expect(JSON.stringify(semanticGate(clean))).toBe(JSON.stringify(semanticGate(clean)));
  });
});
