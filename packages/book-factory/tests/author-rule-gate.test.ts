/** OMEGA — AUTHOR_RULE_GATE : preuve d'OPPOSABILITÉ (GO Francky « buildCanonical
 *  doit pouvoir échouer si Gemma viole les règles auteur »). Opposable, pas
 *  décoratif — MAIS honnête : seul DRAMATIC_VITALITY est gate dure (identité
 *  démotée ADVISORY après faux-positif prouvé sur le V3 ; co-occurrence≠coréférence). */
import { describe, expect, it } from 'vitest';

import { buildCanonical } from '../src/c7/build-canonical.js';
import { classifyRule, enforceAuthorRules } from '../src/c7/author-rule-gate.js';
import type { AuthorDecision } from '../src/identity/author-seal.js';
import { AuthorDecisionLedger } from '../src/identity/author-seal.js';

/** Décision-règle minimale (sans ancre = vraie « règle »). */
function rule(ruleText: string, answer = ''): AuthorDecision {
  return {
    decisionId: `auth_${ruleText.slice(0, 6)}`, kind: 'DECISION_LOCK', verdict: 'MARK_AS_CANON',
    question: 'q', answer, chapter: null, anchorHash: null, anchorExcerpt: null, ruleText,
    decidedBy: 'Francky', decidedAt: '2026-06-09', supersededBy: null, supersedeReason: null, sealHash: 'h',
  };
}

const DEAD = [
  { chapter: 1, prose: 'Le bureau se trouvait au fond du couloir. La table avait quatre pieds. Il y avait deux chaises et une étagère. Le calendrier datait de l\'année passée. La cour donnait sur la rue. Une autre porte menait au débarras. Le plafond restait bas. La salle servait de réserve administrative.' },
];
const VITAL = [
  { chapter: 1, prose: 'Garcia courut vers la porte. Il frappa le battant de toutes ses forces. « Tu mens ! » accusa Léna. Elle exigea la vérité sur-le-champ. Garcia avoua enfin : c\'était lui.' },
];
const DRIFT = [
  { chapter: 1, prose: 'Le gardien Thomas alluma la lampe. Le gardien Thomas verrouilla la porte. Thomas, le gardien, redescendit l\'escalier.' },
  { chapter: 2, prose: 'Le gardien Henri ouvrit le registre. Le gardien Henri ferma les yeux. Henri, le gardien, soupira devant la mer.' },
];

describe('ARG — classification des 7 règles (la classe la plus forte gagne)', () => {
  it('ARG-001 — S8 lecteur de genre ⇒ ENFORCEABLE/VITALITY', () => {
    const c = classifyRule(rule('STANDARD DE PRODUCTION = satisfaire le LECTEUR DE GENRE (engagement constant, zéro ventre mou).'));
    expect(c.enforcement).toBe('ENFORCEABLE');
    expect(c.checker).toBe('DRAMATIC_VITALITY');
  });
  it('ARG-002 — S7 identité ⇒ ENFORCEABLE/IDENTITY (repromu, détecteur coref-grade AP-2)', () => {
    const c = classifyRule(rule('Finale = 8/10 ; unification d\'identité (Henri/Thomas) PASS — zéro dérive perçue.'));
    expect(c.enforcement).toBe('ENFORCEABLE');
    expect(c.checker).toBe('IDENTITY_UNIFICATION');
  });
  it('ARG-003 — S4 atmosphère ⇒ ADVISORY ; S3 station ⇒ PROCESS ; S5 payoff ⇒ CONFIRMATION', () => {
    expect(classifyRule(rule('LOI ATMOSPHÈRE : seuil TRANSITION 0.45 = ADVISORY.')).enforcement).toBe('ADVISORY');
    expect(classifyRule(rule('STATION_FORMAT v2 obligatoire (chapitre, extrait, offset).')).enforcement).toBe('PROCESS');
    expect(classifyRule(rule('ch.46 = payoff validé (paiement réel ressenti).')).enforcement).toBe('CONFIRMATION');
  });
  it('ARG-004 — règle inconnue ⇒ ADVISORY par défaut (jamais gater l\'inconnu)', () => {
    expect(classifyRule(rule('blarg quux zzz')).enforcement).toBe('ADVISORY');
  });
});

describe('ARG — opposabilité (passed=false ⟺ règle ENFORCEABLE violée)', () => {
  const vitalityRule = rule('lecteur de genre, zéro ventre mou');
  const identityRule = rule('unification d\'identité Henri/Thomas, zéro butée');

  it('ARG-005 — chapitre mort (drama 0 + atmo basse + confort haut) ⇒ VIOLATION', () => {
    const r = enforceAuthorRules([vitalityRule], DEAD);
    expect(r.passed).toBe(false);
    expect(r.violations.some((v) => v.checker === 'DRAMATIC_VITALITY')).toBe(true);
  });
  it('ARG-006 — manuscrit vivant ⇒ PASS', () => {
    expect(enforceAuthorRules([vitalityRule], VITAL).passed).toBe(true);
  });
  it('ARG-007 — règle d\'identité (ENFORCEABLE coref-grade) : dérive apposée réelle ⇒ VIOLATION', () => {
    const r = enforceAuthorRules([identityRule], DRIFT);
    expect(r.passed).toBe(false);
    expect(r.violations.some((v) => v.checker === 'IDENTITY_UNIFICATION')).toBe(true);
  });
  it('ARG-008 — advisory/process/confirmation ne mettent JAMAIS passed à false (INV-ARG-002)', () => {
    const benign = [rule('seuil 0.45 advisory'), rule('STATION_FORMAT offset'), rule('Doctor invisible souverain')];
    expect(enforceAuthorRules(benign, DEAD).passed).toBe(true); // DEAD mort MAIS aucune règle vitality
  });
});

describe('ARG — câblage buildCanonical (le build ÉCHOUE réellement)', () => {
  const deadV0 = `## Chapitre 1\n\n${DEAD[0]?.prose ?? ''}\n\n## Chapitre 2\n\nLe registre reposait sur le comptoir. Les pages avaient jauni. Une étagère occupait le mur. Le carrelage paraissait usé. Les dossiers couvraient la table. Le couloir continuait vers l'arrière. Une porte donnait sur la remise. La salle demeurait vide.\n`;

  it('ARG-009 — enforceAuthorRules:true + chapitres morts + règle vitalité ⇒ BUILD FAIL AUTHOR_RULE_VIOLATION', async () => {
    const ledger = new AuthorDecisionLedger();
    ledger.seal({ kind: 'DECISION_LOCK', verdict: 'MARK_AS_CANON', question: 'q', answer: 'lecteur de genre zéro ventre mou', ruleText: 'STANDARD = lecteur de genre, zéro ventre mou' });
    const res = await buildCanonical(deadV0, { authorLocks: ledger, enforceAuthorRules: true });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error.code).toBe('AUTHOR_RULE_VIOLATION');
  });

  it('ARG-010 — MÊME manuscrit SANS le flag ⇒ pas de fail sur règle (opt-in prouvé)', async () => {
    const ledger = new AuthorDecisionLedger();
    ledger.seal({ kind: 'DECISION_LOCK', verdict: 'MARK_AS_CANON', question: 'q', answer: 'lecteur de genre', ruleText: 'STANDARD = lecteur de genre, zéro ventre mou' });
    const res = await buildCanonical(deadV0, { authorLocks: ledger }); // pas de enforceAuthorRules
    if (!res.ok) expect(res.error.code).not.toBe('AUTHOR_RULE_VIOLATION');
  });
});
