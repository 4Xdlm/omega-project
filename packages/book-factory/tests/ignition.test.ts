/** OMEGA — ALLUMAGE tests : P0-B buildCanonical E2E + NCR-005 résidus + quotas. */
import { describe, it, expect } from 'vitest';
import { buildCanonical } from '../src/c7/build-canonical.js';
import { scanSemanticResidue } from '../src/doctor/semantic-residue.js';
import { validateDramaticQuotas } from '../src/planner/dramatic-quotas.js';
import { AuthorDecisionLedger } from '../src/identity/author-seal.js';
import type { PlannedChapter } from '../src/planner/dramatic-quotas.js';

/* Mini-livre fixture : défauts CONNUS injectés (scaffold + couture + stem + quote). */
const MINI_V0 = `## Chapitre 1

— Acte 1 : progression vers la résolution. [synthese]

La pluie battait les vitres de Ker-Morvan. Garcia attendait près du feu mourant. Yvon ne répond pas tout de suite.

Il ne répond pas tout de suite. Ses mains tremblent sur la table en bois brut.

Léna posa la lettre cachetée devant lui sans un mot. Le silence dura longtemps. Elle peut voir

## Chapitre 2

« Qui l'a fait taire.

Garcia relut la lettre une dernière fois devant la fenêtre. La nuit tombait sur le port désert. Tout était dit.`;

describe('P0-B — buildCanonical E2E (fixture à défauts connus)', () => {
  it('E2E-001 — pipeline complet : tous résidus mécaniques/sémantiques à zéro + rapport typé', async () => {
    const r = await buildCanonical(MINI_V0);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const c = r.value.cleanliness;
    expect(c.SYNTAX_CLEAN).toBe(true);
    expect(c.SEAM_CLEAN).toBe(true);
    expect(c.SEMANTIC_CLEAN).toBe(true);
    expect(r.value.text).not.toContain('[synthese]');
    expect(r.value.text).not.toContain('Elle peut voir.');
    expect((r.value.text.match(/ne répond pas tout de suite/gu) ?? []).length).toBe(1);
    expect(r.value.finalHash.length).toBeGreaterThanOrEqual(16);
  });

  it('E2E-002 — sceau d’auteur : ancre INTACTE = build PASS ; ancre CASSÉE = UNRESOLVED_LOCK BUILD FAIL', async () => {
    const locks = new AuthorDecisionLedger();
    locks.seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'q', answer: 'a', anchorExcerpt: 'Garcia relut la lettre une dernière fois devant la fenêtre.' });
    const okBuild = await buildCanonical(MINI_V0, { authorLocks: locks });
    expect(okBuild.ok && okBuild.value.cleanliness.AUTHOR_LOCKS_INTACT).toBe(true);

    const locks2 = new AuthorDecisionLedger();
    locks2.seal({ kind: 'SPAN_LOCK', verdict: 'KEEP', question: 'q', answer: 'a', anchorExcerpt: 'Une phrase scellée qui ne figure plus dans le manuscrit.' });
    const koBuild = await buildCanonical(MINI_V0, { authorLocks: locks2 });
    expect(koBuild.ok).toBe(false);
    if (!koBuild.ok) expect(koBuild.error.code).toBe('UNRESOLVED_LOCK');
  });

  it('E2E-003 — déterminisme ×2 : même V0 ⇒ même hash', async () => {
    const a = await buildCanonical(MINI_V0);
    const b = await buildCanonical(MINI_V0);
    expect(a.ok && b.ok && a.value.finalHash === b.value.finalHash).toBe(true);
  });
});

describe('NCR-005 — résidus sémantiques (détecter, JAMAIS auto-corriger)', () => {
  it('RES-001 — preuve réelle « comme un lourd. » = BROKEN_COMPARISON → AUTHOR_REVIEW', () => {
    const r = scanSemanticResidue([{ chapter: 3, prose: 'Garcia resta assis un instant, le silence retombant sur lui comme un lourd. La pièce sentait le sel.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.brokenComparisons).toBe(1);
    expect(r.value.findings[0]?.disposition).toBe('AUTHOR_REVIEW_REQUIRED');
  });

  it('RES-002 — comparaison LÉGITIME (« comme un mur ») jamais signalée', () => {
    const r = scanSemanticResidue([{ chapter: 3, prose: 'Le silence retomba sur lui comme un mur. La pièce sentait le sel et la poussière froide.' }]);
    expect(r.ok && r.value.brokenComparisons === 0).toBe(true);
  });

  it('RES-003 — redite de FONCTION à distance (« petite cuisine » ré-installée) détectée ; adjacents ignorés', () => {
    const bloc = 'Elle pense à la maison, à la petite cuisine au carrelage fendu, aux assiettes ébréchées, au robinet qui goutte dans la nuit froide quand le vent souffle du large.';
    const autre = 'Garcia descendit le sentier de la falaise en surveillant les rochers noirs et luisants couverts de varech, attentif à chaque pas sur la pierre humide et glissante du matin.';
    const r = scanSemanticResidue([{ chapter: 1, prose: `${bloc}\n\n${autre}\n\n${bloc}` }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.functionalRedundancies).toBe(1);
    expect(r.value.findings[0]?.kind).toBe('FUNCTIONAL_REDUNDANCY');
  });
});

describe('QUOTAS dramatiques — gate de PLAN (prochain run)', () => {
  const plan = (fns: readonly string[]): readonly PlannedChapter[] => fns.map((fn, i) => ({ chapter: i + 1, act: i < fns.length / 2 ? 1 : 2, fn: fn as PlannedChapter['fn'] }));

  it('QUOTA-001 — le plan façon 88k (que des TRANSITION) est REFUSÉ avec violations explicites', () => {
    const r = validateDramaticQuotas(plan(['TRANSITION', 'TRANSITION', 'TRANSITION', 'TRANSITION', 'TRANSITION', 'TRANSITION', 'TRANSITION', 'TRANSITION']));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const codes = r.error.violations.map((v) => v.code);
    expect(codes).toContain('NO_REVELATION_IN_ACT');
    expect(codes).toContain('TRANSITION_RATIO_EXCEEDED');
    expect(codes).toContain('CONFRONTATION_GAP');
  });

  it('QUOTA-002 — un plan équilibré passe la gate', () => {
    const r = validateDramaticQuotas(plan(['SETUP', 'ACTION', 'CONFRONTATION', 'REVELATION', 'ACTION', 'CONFRONTATION', 'REVELATION', 'PAYOFF']));
    expect(r.ok).toBe(true);
  });
});
