/** OMEGA — SEAM SWEEP tests (NCR-SEAM-GLOBAL-002). Fixtures = les cas RÉELS du tribunal. */
import { describe, it, expect } from 'vitest';
import { seamSweep } from '../src/doctor/seam-sweep.js';

describe('NCR-SEAM-GLOBAL-002 — détecteurs GÉNÉRALISÉS (définitions, pas listes)', () => {
  it('INV-SEAM-001 — cas réel « — Yvon ! s » : fragment pendu détecté ET réparé (coupe)', () => {
    const r = seamSweep([{ chapter: 2, prose: 'Garcia se retourna vers la porte battante. — Yvon ! s\n\nLe lendemain, la pluie avait cessé sur le port.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.findings.some((f) => f.kind === 'DANGLING_FRAGMENT')).toBe(true);
    expect(r.value.repairedText).not.toMatch(/!\s+s\b/u);
    expect(r.value.repairedText).toContain('— Yvon !'); // la coupe garde la phrase complète
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('INV-SEAM-002 — cas réel « Il / Il ne répond pas » : reprise QUASI-dup (Jaccard) détectée, orpheline retirée', () => {
    const r = seamSweep([{ chapter: 7, prose: 'Garcia attendait près du feu mourant. Yvon ne répond pas tout de suite.\n\nIl ne répond pas tout de suite. Ses mains tremblent sur la table en bois brut.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.findings.some((f) => f.kind === 'NEAR_DUP_RESUME')).toBe(true);
    const occurrences = (r.value.repairedText.match(/ne répond pas tout de suite/gu) ?? []).length;
    expect(occurrences).toBe(1); // l'orpheline est partie, la version qui PORTE la suite reste
    expect(r.value.repairedText).toContain('Ses mains tremblent');
    expect(r.value.residualFindings.length).toBe(0);
  });

  it('INV-SEAM-003 — fins courtes LÉGITIMES jamais signalées (pas de faux positifs sur « non. », « là. », dialogue !)', () => {
    const r = seamSweep([{ chapter: 1, prose: 'Elle répondit non.\n\n— Viens là !\n\nLa mer était basse. Tout dormait sous le sel et le feu.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.findings.length).toBe(0);
  });

  it('INV-SEAM-004 — troncature LONGUE finissant sur mot de continuation = NONE_MANUAL_REVIEW (jamais de suppression silencieuse ni invention)', () => {
    // Finit sur « avant de » (préposition) : troncature grammaticale prouvée, 18
    // mots, sans virgule ni phrase interne → non complétable sans INVENTION.
    const r = seamSweep([{ chapter: 3, prose: 'Il marcha longtemps le long du quai désert en repensant à tout ce que Garcia lui avait dit avant de\n\nLa suite normale arrive ici, complète et propre.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === 'NONE_MANUAL_REVIEW')).toBe(true);
    expect(r.value.repairedText).toContain('Garcia lui avait dit avant de'); // PRÉSERVÉ pour revue
  });

  it('INV-SEAM-005 — déterminisme ×2 + texte propre = zéro finding zéro réparation', () => {
    const clean = [{ chapter: 1, prose: 'Première phrase complète. Deuxième phrase aussi.\n\nUn nouveau paragraphe propre commence ici et finit bien.' }];
    const a = seamSweep(clean);
    expect(a.ok && a.value.findings.length === 0 && a.value.repairs.length === 0).toBe(true);
    expect(JSON.stringify(seamSweep(clean))).toBe(JSON.stringify(seamSweep(clean)));
  });

  it('INV-SEAM-006 — FAUX-DÉPART (cas réel « Yvon hocha lentement la ») : supprimé car le bloc suivant le reprend', () => {
    const r = seamSweep([{ chapter: 5, prose: 'Yvon hocha lentement la\n\nYvon hocha lentement la tête, un mouvement si infime que Léna faillit ne pas le voir.' }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === 'REMOVE_FALSE_START')).toBe(true);
    expect((r.value.repairedText.match(/Yvon hocha lentement la/gu) ?? []).length).toBe(1);
    expect(r.value.repairedText).toContain('tête, un mouvement');
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEAM-007 — interruption de dialogue STYLISEE (reprise « — … ») = AUCUN defaut", () => {
    const r = seamSweep([{ chapter: 7, prose: "— On attend que la verite nous force a\n\n— …la verite nous force a bouger, termina Gaspard.\n\nLa phrase flottait dans la penombre." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === "STYLED_DIALOGUE_OK")).toBe(true);
    expect(r.value.repairedText).toContain("— On attend que la verite nous force a");
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEAM-008 — incise terminale complete (« dit-il ») = point ajoute, jamais coupee", () => {
    const r = seamSweep([{ chapter: 7, prose: "Le vent se leva.\n\n— On part, dit-il" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === "ADD_TERMINAL_PERIOD")).toBe(true);
    expect(r.value.repairedText).toContain("— On part, dit-il.");
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEAM-009 — fragment court tronque (« ouvrit les ») sans phrase a sauver = retire trace", () => {
    const r = seamSweep([{ chapter: 9, prose: "Le silence retomba sur la piece.\n\nGarcia ouvrit les" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === "REMOVE_TRUNCATED_FRAGMENT")).toBe(true);
    expect(r.value.repairedText).not.toContain("Garcia ouvrit les");
    expect(r.value.repairedText).toContain("Le silence retomba sur la piece.");
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEAM-010 — cas réels V0 : phrase complete sans point (« …de sa poche ») = point ajoute, contenu garde", () => {
    const r = seamSweep([{ chapter: 43, prose: "Le feu crepitait.\n\nYvon sortit un petit carnet de sa poche" }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === "ADD_TERMINAL_PERIOD")).toBe(true);
    expect(r.value.repairedText).toContain("Yvon sortit un petit carnet de sa poche.");
    expect(r.value.residualFindings.length).toBe(0);
  });

  it("INV-SEAM-011 — cas reel V0 : faux positif markdown « *Une dette de sang.* » jamais signale", () => {
    const r = seamSweep([{ chapter: 11, prose: "Il relut la lettre.\n\n*Une dette de sang.*\n\nLe vent se leva sur le port endormi." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.findings.length).toBe(0); // la decoration markdown n'est pas une troncature
  });

  it("INV-SEAM-012 — cas reel V0 : virgule terminale sur proposition complete (« …de mentir, ») = point", () => {
    const r = seamSweep([{ chapter: 45, prose: "Garcia haussa la voix.\n\n— La mairie, et le village entier, ont decide de mentir,\n\nUn silence suivit ces mots." }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.repairs.some((x) => x.action === "ADD_TERMINAL_PERIOD")).toBe(true);
    expect(r.value.repairedText).toContain("ont decide de mentir.");
    expect(r.value.residualFindings.length).toBe(0);
  });

});