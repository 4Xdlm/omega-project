/** OMEGA — SCEAU D'AUTEUR tests (CONCEPT-AUTHOR-SEAL-001, P0-A-bis). */
import { describe, it, expect } from 'vitest';
import { AuthorDecisionLedger, requestAuthorReview } from '../src/identity/author-seal.js';
import { operateSeam } from '../src/doctor/seam-surgeon.js';
import { makeWorld, GoodStubPort } from './seam-surgeon-goldset.js';

const BOOT = 'Elle avance pieds nus, la semelle de ses bottes restée accrochée à la porte.';

function ledgerWithBoot(): AuthorDecisionLedger {
  const l = new AuthorDecisionLedger();
  const r = l.seal({ kind: 'STYLE_LOCK', verdict: 'MARK_AS_STYLE', question: 'Image bottes ch.1 ?', answer: 'KEEP', chapter: 1, anchorExcerpt: BOOT });
  expect(r.ok).toBe(true);
  return l;
}

describe("SCEAU D'AUTEUR — quand l'auteur tranche, le canon scelle", () => {
  it('INV-AS-001/005 — le Surgeon range son bistouri devant un passage scellé (AUTHOR_LOCKED)', async () => {
    const locks = ledgerWithBoot();
    const r = await operateSeam(
      { seamId: 'x', seamKind: 'TRUNCATION', leftContext: `Elle lace ses bottes devant la porte. ${BOOT} Elle avance encore vers la`, rightContext: 'Garcia ferma la fenêtre.', world: makeWorld() },
      { llm: new GoodStubPort(), authorLocks: locks },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.action).toBe('KEEP_STYLED');
    expect(r.value.reason).toContain('AUTHOR_LOCKED');
    expect(r.value.replacementText).toBe(''); // ZÉRO modification
  });

  it('INV-AS-002 — ancre textuelle hashée, déterministe', () => {
    const a = new AuthorDecisionLedger().seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'q', answer: 'a', anchorExcerpt: BOOT, decidedAt: '2026-06-07' });
    const b = new AuthorDecisionLedger().seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'q', answer: 'a', anchorExcerpt: `  ${BOOT}  `, decidedAt: '2026-06-07' });
    expect(a.ok && b.ok && a.value.anchorHash === b.value.anchorHash && a.value.anchorHash !== null).toBe(true);
    const missing = new AuthorDecisionLedger().seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'q', answer: 'a' });
    expect(!missing.ok && missing.error.code === 'MISSING_ANCHOR').toBe(true);
  });

  it('INV-AS-003 — ancre cassée après rebuild = UNRESOLVED_LOCK (jamais silencieux)', () => {
    const locks = ledgerWithBoot();
    const ok1 = locks.verifyAnchors(`Du texte avant. ${BOOT} Du texte après.`);
    expect(ok1.broken.length).toBe(0);
    const ko = locks.verifyAnchors('Un manuscrit qui ne contient plus le passage scellé.');
    expect(ko.broken.length).toBe(1); // BLOQUANT pour buildCanonical
  });

  it("INV-AS-004 — dé-scellement = SUPERSÈDE append-only (l'histoire reste, rien n'est effacé)", () => {
    const locks = ledgerWithBoot();
    const first = locks.activeLocks()[0];
    expect(first).toBeDefined();
    if (first === undefined) return;
    const sup = locks.supersede(first.decisionId, { kind: 'SPAN_LOCK', verdict: 'REPAIR', question: 'Image bottes ch.1 ?', answer: 'REPAIR finalement', chapter: 1, anchorExcerpt: BOOT, decidedAt: '2026-06-08' }, "changement d'avis Architecte");
    expect(sup.ok).toBe(true);
    expect(locks.all().length).toBe(2); // append-only : les DEUX entrées existent
    const old = locks.all().find((d) => d.decisionId === first.decisionId);
    expect(old?.supersededBy).toBe(sup.ok ? sup.value.decisionId : '');
    expect(locks.activeLocks().length).toBe(1); // une seule active
  });

  it('INV-AS-006/007 — la machine ne dérange l’auteur que sur ESCALATE/divergence — jamais sur INFO', () => {
    expect(requestAuthorReview({ source: 'TRIBUNAL_DIVERGENCE', question: 'Bottes ch.1 ?' }).ok).toBe(true);
    // @ts-expect-error — source INFO interdite par le type ET par le runtime
    expect(requestAuthorReview({ source: 'INFO', question: 'spam ?' }).ok).toBe(false);
  });

  it('Round-trip JSON — le registre survit aux sessions (persistance opposable)', () => {
    const locks = ledgerWithBoot();
    const reloaded = AuthorDecisionLedger.fromJson(locks.toJson());
    expect(reloaded.activeLocks().length).toBe(1);
    expect(reloaded.findSpanLock(`avant ${BOOT} après`)).not.toBeNull();
  });
});
