/**
 * OMEGA Book-Factory — C11 TESTS REWRITE_DOCTOR (BF-08).
 * Fautes injectées CONNUES (dont la couture verbatim du 60k), adversarial
 * (override éditorial vs dominance, manuscrit sans chapitres), property (déterminisme).
 */

import { describe, it, expect } from 'vitest';

import { importManuscript, detectCast } from '../src/doctor/manuscript-import.js';
import { detectBrokenStitches, buildRepairPlan } from '../src/doctor/repair-planner.js';
import { executeRepairs } from '../src/doctor/repair-executor.js';
import { runDoctor, runDoctorAudit } from '../src/doctor/doctor-orchestrator.js';

const pad = (s: string) => `${s} La mer montait lentement contre la digue noire du soir tombant.`;

function mkManuscript(): string {
  return [
    '## Chapitre 1',
    pad('Le gardien Thomas montait chaque soir au village de Kerlann. Thomas vérifiait la lampe. Marin regardait la mer grise.'),
    'Marin sort son couteau de sa poche rouillée. Le métal est froid, luisant. Elle l',
    pad('Le métal est froid, luisant. Marin ouvre la lame et force le battant sans bruit.'),
    '## Chapitre 2',
    pad('Le gardien Henri avait laissé un carnet au village de Kervec. Henri notait tout, disait-on. Marin lisait près du feu.'),
    pad('Le silence qui pesait. Le silence qui pesait. Le silence qui pesait. Le silence qui pesait revenait sans fin sur Kervec.'),
    '## Chapitre 3',
    pad('Marin retrouva le gardien Henri sur la jetée de Kervec. Henri souriait, le carnet ouvert, et le village de Kervec dormait.'),
    pad('Thomas restait un nom que personne au village ne prononçait plus depuis la tempête de novembre.'),
  ].join('\n\n');
}

describe('C11.1 import + casting', () => {
  it('INV-DOC-001 — format OMEGA détecté, 3 chapitres, cast trouve Marin/Thomas/Henri', () => {
    const r = importManuscript(mkManuscript());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.strategy).toBe('OMEGA_HEADINGS');
    expect(r.value.chapters.length).toBe(3);
    const names = r.value.castProposal.map((c) => c.name);
    expect(names).toContain('Marin');
    expect(names).toContain('Henri');
  });

  it('INV-DOC-002 — manuscrit SANS marqueurs → SIZE_FALLBACK, jamais d\'échec', () => {
    const flat = Array.from({ length: 30 }, (_, i) => pad(`Paragraphe ${i} sur la digue, encore et toujours la même mer grise et patiente.`)).join('\n\n');
    const r = importManuscript(flat, { fallbackTargetWords: 120 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.strategy).toBe('SIZE_FALLBACK');
    expect(r.value.chapters.length).toBeGreaterThan(1);
  });

  it('INV-DOC-003 — variantes proches détectées (Gaspar/Gaspard = candidates alias)', () => {
    const ch = [{ chapter: 1, title: 't', prose: 'Gaspard parla. Gaspard rit. Gaspard sortit. Gaspar revint vers Gaspar puis Gaspar.', words: 12 }];
    const cast = detectCast(ch, 3);
    const gaspard = cast.find((c) => c.name === 'Gaspard');
    expect(gaspard?.nearVariants).toContain('Gaspar');
  });

  it('ADV — manuscrit vide = erreur typée', () => {
    expect(importManuscript('').ok).toBe(false);
  });
});

describe('C11.2 planner', () => {
  it('INV-DOC-004 — la couture VERBATIM du 60k est détectée puis RÉPARÉE', async () => {
    const text = mkManuscript();
    const imp = importManuscript(text);
    expect(imp.ok).toBe(true);
    if (!imp.ok) return;
    const stitches = detectBrokenStitches(imp.value.chapters);
    expect(stitches.length).toBeGreaterThanOrEqual(1);
    expect(stitches[0]?.danglingFragment).toBe('l');

    const audit = runDoctorAudit(imp.value.chapters, ['Marin'], []);
    expect(audit.ok).toBe(true);
    if (!audit.ok) return;
    const plan = buildRepairPlan(audit.value, imp.value.chapters);
    const { repaired, applied } = await executeRepairs(text, plan);
    const stitchApplied = applied.find((a) => a.action.kind === 'FIX_BROKEN_STITCH');
    expect(stitchApplied?.applied).toBe(true);
    expect(repaired).not.toMatch(/luisant\. Elle l\s*\n/u);
    expect(repaired).toContain('Le métal est froid, luisant. Marin ouvre la lame');
  });

  it('INV-DOC-005 — dérive gardien détectée ; keep auto = dominant ; OVERRIDE éditorial inverse et le documente', () => {
    const imp = importManuscript(mkManuscript());
    if (!imp.ok) return;
    const audit = runDoctorAudit(imp.value.chapters, ['Marin'], []);
    expect(audit.ok).toBe(true);
    if (!audit.ok) return;
    const auto = buildRepairPlan(audit.value, imp.value.chapters);
    const unifyAuto = auto.actions.find((a) => a.kind === 'UNIFY_IDENTITY');
    expect(unifyAuto).toBeDefined();
    if (unifyAuto?.kind !== 'UNIFY_IDENTITY') return;
    expect(unifyAuto.keep).toBe('Henri'); // Henri×4 > Thomas×3 dans la fixture

    const overridden = buildRepairPlan(audit.value, imp.value.chapters, { identityKeep: new Map([['gardien', 'Thomas']]) });
    const unifyOver = overridden.actions.find((a) => a.kind === 'UNIFY_IDENTITY');
    if (unifyOver?.kind !== 'UNIFY_IDENTITY') return;
    expect(unifyOver.keep).toBe('Thomas');
    expect(unifyOver.evidence).toContain('OVERRIDE');
  });

  it('INV-DOC-006 — lieu double (Kerlann/Kervec) détecté via rôle GÉO « village »', () => {
    const imp = importManuscript(mkManuscript());
    if (!imp.ok) return;
    const audit = runDoctorAudit(imp.value.chapters, ['Marin'], []);
    if (!audit.ok) return;
    const geoDrift = audit.value.arc.identityDrifts.find((d) => d.role === 'village');
    expect(geoDrift).toBeDefined();
    const names = (geoDrift?.names ?? []).map((n) => n.name);
    expect(names).toContain('Kervec');
  });

  it('INV-DOC-007 — tics et signaux JAMAIS exécutés (SIGNAL_ONLY, applied=false)', async () => {
    const imp = importManuscript(mkManuscript());
    if (!imp.ok) return;
    const audit = runDoctorAudit(imp.value.chapters, ['Marin'], []);
    if (!audit.ok) return;
    const plan = buildRepairPlan(audit.value, imp.value.chapters);
    const { applied } = await executeRepairs(mkManuscript(), plan);
    for (const a of applied.filter((x) => x.action.cls === 'SIGNAL_ONLY')) {
      expect(a.applied).toBe(false);
    }
  });

  it('INV-DOC-008 — SURGICAL_LLM préparé mais NON exécuté sans port+flag (GO_B)', async () => {
    const boots = '## Chapitre 1\n\nSes bottes claquent sur le pont mouillé du chalutier gris. Elle avance pieds nus, la semelle restée accrochée à la porte de la cale.\n\n## Chapitre 2\n\nLa mer restait grise et patiente devant le port endormi de Kervec au matin.';
    const r = await runDoctor(boots);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const surgical = r.value.applied.filter((a) => a.action.kind === 'SURGICAL_REWRITE');
    expect(surgical.length).toBe(1);
    expect(surgical[0]?.applied).toBe(false); // préparé, jamais exécuté sans autorisation
    expect(r.value.plan.surgicalCount).toBe(1);
  });
});

describe('C11.3 orchestrateur E2E (synthétique)', () => {
  it('INV-DOC-009 — avant/après : la dérive d\'identité disparaît du re-audit', async () => {
    const r = await runDoctor(mkManuscript(), { protagonistTopK: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.auditBefore.identityDrifts).toBeGreaterThanOrEqual(1);
    const unify = r.value.applied.filter((a) => (a.action.kind === 'UNIFY_IDENTITY' || a.action.kind === 'UNIFY_LOCATION') && a.applied);
    expect(unify.length).toBeGreaterThanOrEqual(1);
    expect(r.value.auditAfter.identityDrifts).toBeLessThan(r.value.auditBefore.identityDrifts);
    expect(r.value.repairedProse).not.toBe(mkManuscript()); // V1 ≠ V0, V0 jamais mutée (entrée par valeur)
  });

  it('P-DOC-001 — déterminisme : deux runs Doctor = rapports identiques (JSON)', async () => {
    const a = JSON.stringify(await runDoctor(mkManuscript()));
    const b = JSON.stringify(await runDoctor(mkManuscript()));
    expect(a).toBe(b);
  });
});

describe('C11.4 NCR-C11-001 — métriques avant/après lisibles', () => {
  it('INV-DOC-010 — coutures dans le résumé + preuve ciblée avant/après', async () => {
    const r = await runDoctor(mkManuscript(), { protagonistTopK: 1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.auditBefore.brokenStitches).toBeGreaterThanOrEqual(1);
    expect(r.value.auditAfter.brokenStitches).toBe(0); // la couture réparée DISPARAÎT du résumé
    const stitchProof = r.value.targetedProof.find((p) => p.label.includes('couture'));
    expect(stitchProof?.before).toBe(1);
    expect(stitchProof?.after).toBe(0);
    const unifyProof = r.value.targetedProof.find((p) => p.label.includes('→'));
    expect(unifyProof).toBeDefined();
    expect(unifyProof?.after).toBe(0); // le nom remplacé n'existe plus
    expect(unifyProof?.before).toBeGreaterThan(0);
  });
});
