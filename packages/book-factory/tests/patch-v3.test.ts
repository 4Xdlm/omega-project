/** OMEGA — EXÉCUTEUR PATCH V3 : prouve le FILET avant toute génération (mandat 3-IA).
 *  splice ciblé · ACCEPT candidate saine · REVERT auto (manuscrit bit-identique) sur
 *  guard REJECT et sur vitalité morte. Zéro LLM (candidates stub). */
import { describe, expect, it } from 'vitest';

import { applyPatch, spliceChapter } from '../src/c7/patch-v3.js';
import type { PatchContext } from '../src/c7/patch-v3.js';
import { AuthorDecisionLedger } from '../src/identity/author-seal.js';

const CH1_ORIG = 'La cale baignait dans une pénombre froide et humide. Garcia restait immobile contre la cloison rouillée. Léna fixait le hublot encrassé de sel, sans un mot. Le silence pesait, lourd, et l\'odeur de moisissure montait des planches. On entendait le clapot sourd de la mer contre la coque.';
const CH2 = 'Yvon poussa la porte du bureau. « Où étais-tu cette nuit ? » demanda-t-il à Garcia. Le vieil homme frappa la table, exigea une réponse nette. Dehors, la pluie cinglait les carreaux gris du petit matin.';
const CH3 = 'Léna courut sur le quai battu par le vent. Elle saisit la lettre et la déchira d\'un geste. La mer grondait, noire et froide. Garcia la rattrapa et lui cria de s\'arrêter là.';
const BASE = `## Chapitre 1\n\n${CH1_ORIG}\n\n## Chapitre 2\n\n${CH2}\n\n## Chapitre 3\n\n${CH3}\n`;

const CAND_VITAL = 'La cale baignait dans une pénombre froide. Garcia frappa soudain la cloison du poing. « Tu savais, pour le phare ! » accusa-t-il. Léna se dressa et lui fit face. Elle avoua enfin : c\'était elle qui avait coupé la lumière cette nuit-là. La vérité éclata dans l\'air humide et salé.';
const CAND_REMOVES_CAST = 'La cale était sombre et froide. Le vent soufflait par une fissure étroite. Quelqu\'un avait laissé une lampe allumée sur la caisse. Personne ne vint jamais. La nuit s\'étira, longue et salée.';
// Tic-free (sinon la garde TIC mord avant la vitalité sur de petits fixtures) :
const CAND_DEAD = 'Garcia se trouvait dans la cale. Léna occupait le coin gauche. Une caisse et une corde traînaient au sol. Le registre reposait sur la planche. Le passage donnait vers l\'avant. La porte demeurait close.';

function ledger(): AuthorDecisionLedger {
  const l = new AuthorDecisionLedger();
  l.seal({ kind: 'DECISION_LOCK', verdict: 'MARK_AS_CANON', question: 'q', answer: 'lecteur de genre zéro ventre mou', ruleText: 'STANDARD = lecteur de genre, zéro ventre mou' });
  return l;
}
const CTX: PatchContext = { cast: ['Garcia', 'Léna', 'Yvon'], deadCanon: ['Morvan'], build: { authorLocks: ledger() } };

describe('PATCH-V3 — splice ciblé (INV-PATCH-002)', () => {
  it('PV-001 — ne remplace QUE le chapitre cible, voisins intacts', () => {
    const r = spliceChapter(BASE, 1, 'NOUVELLE PROSE CH1.');
    expect(r).not.toBeNull();
    expect(r?.text).toContain('NOUVELLE PROSE CH1.');
    expect(r?.text).toContain(CH2); // ch.2 intact
    expect(r?.text).toContain(CH3); // ch.3 intact
    expect(r?.text).not.toContain('restait immobile'); // ancienne prose ch.1 partie
    expect(r?.originalProse).toContain('restait immobile');
  });
  it('PV-002 — chapitre absent ⇒ null', () => {
    expect(spliceChapter(BASE, 99, 'x')).toBeNull();
  });
});

describe('PATCH-V3 — applyPatch : ACCEPT / REVERT auto', () => {
  it('PV-003 — candidate saine (mover gagné + vitale) ⇒ ACCEPT + manuscrit changé', async () => {
    const { manuscript, report } = await applyPatch(BASE, { chapter: 1, candidate: CAND_VITAL, defect: 'mover', label: 'ch.1 mover' }, CTX);
    expect(report.accepted).toBe(true);
    expect(report.certifiedAfter).toBe(true);
    expect(report.guard?.verdict).toBe('ACCEPT');
    expect(report.hashAfter).not.toBe(report.hashBefore);
    expect(manuscript).toContain('frappa soudain la cloison');
  });

  it('PV-004 — candidate qui RETIRE un personnage ⇒ guard REJECT ⇒ REVERT (hash égal, INV-PATCH-001)', async () => {
    const { manuscript, report } = await applyPatch(BASE, { chapter: 1, candidate: CAND_REMOVES_CAST, defect: 'mover', label: 'ch.1 bad' }, CTX);
    expect(report.accepted).toBe(false);
    expect(report.reason).toContain('guardRegen REJECT');
    expect(report.hashAfter).toBe(report.hashBefore);
    expect(manuscript).toBe(BASE); // rollback bit-à-bit
  });

  it('PV-005 — candidate MORTE (vitalité) passe la garde mais ⇒ re-certif FAIL ⇒ REVERT', async () => {
    const { manuscript, report } = await applyPatch(BASE, { chapter: 1, candidate: CAND_DEAD, defect: 'soft_transition', label: 'ch.1 dead' }, CTX);
    expect(report.guard?.verdict).toBe('ACCEPT'); // la garde ne voit pas la mort dramatique
    expect(report.accepted).toBe(false);          // mais le gate vitalité, si
    expect(report.reason).toContain('re-certif FAIL');
    expect(report.vitalityViolationsAfter).toBeGreaterThan(0);
    expect(manuscript).toBe(BASE); // rollback
  });

  it('PV-006 — chapitre cible absent ⇒ REVERT propre', async () => {
    const { manuscript, report } = await applyPatch(BASE, { chapter: 42, candidate: CAND_VITAL, defect: 'mover', label: 'ch.42' }, CTX);
    expect(report.accepted).toBe(false);
    expect(manuscript).toBe(BASE);
  });
});
