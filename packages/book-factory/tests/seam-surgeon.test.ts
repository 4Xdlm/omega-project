/** OMEGA — R6_SEAM_SURGEON tests (CONCEPT-SEAM-SURGEON-001).
 *  8 invariants INV-SS-001..008 + GOLD-SET 120 (exigence tribunal AVANT tout
 *  branchement production). « Le Scribe écrit. Le Weaver raccorde. Le Doctor
 *  contrôle. Le Canon juge. » */
import { describe, it, expect } from 'vitest';
import { operateSeam } from '../src/doctor/seam-surgeon.js';
import {
  buildGoldset, portFor, makeWorld,
  GoodStubPort, EvilInventPort, EvilLongPort, EvilPovPort, EvilPlacePort, EvilTimePort, EvilRepeatPort,
} from './seam-surgeon-goldset.js';

const TRUNC = (left: string, right = 'Garcia ferma la fenêtre.'): Parameters<typeof operateSeam>[0] => ({
  seamId: 'inv', seamKind: 'TRUNCATION', leftContext: left, rightContext: right, world: makeWorld(),
});

describe('R6_SEAM_SURGEON — invariants (le LLM propose, le tribunal mécanique tranche)', () => {
  it('INV-SS-000 — SANS état du monde : REFUSE(MISSING_WORLD_STATE), jamais d’opération aveugle', async () => {
    const r = await operateSeam({ seamId: 'x', seamKind: 'TRUNCATION', leftContext: 'Elle peut voir', rightContext: 'La nuit tombait.', world: null });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.code).toBe('MISSING_WORLD_STATE');
  });

  it('INV-SS-001 — le patch ne sort JAMAIS de la fenêtre gauche (changedSpan borné)', async () => {
    const c = TRUNC('La porte se referma sans bruit. Elle peut voir');
    const r = await operateSeam(c, { llm: new GoodStubPort() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.action).toBe('REPAIR');
    expect(r.value.changedSpan).toEqual({ start: 0, end: c.leftContext.length });
    expect(r.value.replacementText).toContain('La porte se referma sans bruit.'); // tête intacte
  });

  it('INV-SS-002 — entité INVENTÉE (« Margot ») ⇒ patch rejeté, ESCALATE', async () => {
    const r = await operateSeam(TRUNC('Le silence dura. Elle peut voir'), { llm: new EvilInventPort() });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('NEW_ENTITY:Margot')).toBe(true);
  });

  it('INV-SS-003 — entité touchée SANS RecallPack ⇒ ESCALATE (Bible obligatoire)', async () => {
    const world = makeWorld({ activeCharacters: ['Léna', 'Gaspard'], recallPack: [{ entity: 'Léna', fact: 'présente' }] });
    const r = await operateSeam({ seamId: 'x', seamKind: 'TRUNCATION', leftContext: 'Le vent reprit. Il chercha la', rightContext: 'La nuit tombait.', world },
      { llm: { rewriteSegment: async () => 'Le vent reprit. Gaspard saisit la lettre posée sur la table.' } });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('NO_RECALL_FOR:Gaspard')).toBe(true);
  });

  it('INV-SS-004 — bascule de POV (« je » en THIRD) ⇒ ESCALATE', async () => {
    const r = await operateSeam(TRUNC('La nuit tombait. Elle peut voir'), { llm: new EvilPovPort() });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('POV_SHIFT_JE')).toBe(true);
  });

  it('INV-SS-005 — lieu interdit (« Saint-Marc ») ⇒ ESCALATE', async () => {
    const r = await operateSeam(TRUNC('Personne ne répondit. Elle pensa encore à'), { llm: new EvilPlacePort() });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('PLACE_SHIFT:Saint-Marc')).toBe(true);
  });

  it('INV-SS-006 — saut temporel sans marqueur autorisé (« Le lendemain ») ⇒ ESCALATE', async () => {
    const r = await operateSeam(TRUNC('Rien ne bougeait. Elle peut voir'), { llm: new EvilTimePort() });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('TIME_JUMP_WITHOUT_MARKER')).toBe(true);
  });

  it('INV-SS-007 — patch répétant le bloc droit ⇒ ESCALATE (zéro répétition créée)', async () => {
    const right = 'Garcia sortit son carnet usé pour noter la date exacte.';
    const r = await operateSeam(TRUNC('La nuit tombait. Elle peut voir', right), { llm: new EvilRepeatPort('Garcia sortit son carnet usé pour noter la date exacte.') });
    expect(r.ok && r.value.action === 'ESCALATE' && r.value.reason.includes('REPEAT_VS_RIGHT')).toBe(true);
  });

  it('INV-SS-008 — patch borné (>150 mots) ⇒ ESCALATE + tout REPAIR est hashé et re-scanné', async () => {
    const long = await operateSeam(TRUNC('Le silence dura. Elle peut voir'), { llm: new EvilLongPort() });
    expect(long.ok && long.value.action === 'ESCALATE' && /PATCH_WORDS|PATCH_SENTENCES/u.test(long.value.reason)).toBe(true);
    const good = await operateSeam(TRUNC('Le silence dura. Elle peut voir'), { llm: new GoodStubPort() });
    expect(good.ok && good.value.action === 'REPAIR' && good.value.patchHash.length >= 16 && good.value.newFactsCreated === false).toBe(true);
  });

  it('CAS RÉEL OBLIGATOIRE (famille NCR-FOOTWEAR-004) — contradiction bottes WARN réparée par EXPLICITATION, re-scan physique propre', async () => {
    const left = 'Elle lace ses bottes devant la porte et souffle sur ses mains. Elle avance pieds nus dans le couloir froid';
    const r = await operateSeam({ seamId: 'footwear', seamKind: 'TRUNCATION', leftContext: left, rightContext: 'Garcia ferma la fenêtre.', world: makeWorld() }, { llm: new GoodStubPort() });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.action).toBe('REPAIR');
    expect(r.value.replacementText).toMatch(/retire ses bottes/u); // l'état du monde a guidé l'explicitation
  });
});

describe('R6_SEAM_SURGEON — GOLD-SET 120 (exigence tribunal avant branchement)', () => {
  it('FIXTURE-120 — triage exact sur les 6 catégories (120/120)', async () => {
    const gold = buildGoldset();
    expect(gold.length).toBe(120);
    const confusion = new Map<string, number>();
    const failures: string[] = [];
    for (const g of gold) {
      const r = await operateSeam(g.surgeonCase, { llm: portFor(g.port) });
      const got = r.ok ? r.value.action : 'REFUSE';
      confusion.set(`${g.expected}→${got}`, (confusion.get(`${g.expected}→${got}`) ?? 0) + 1);
      if (got !== g.expected) failures.push(`${g.id}: attendu ${g.expected}, obtenu ${got}${r.ok ? ` (${r.value.reason.slice(0, 80)})` : ''}`);
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });

  it('FIXTURE-120 — déterminisme : deux passes produisent les mêmes 120 verdicts', async () => {
    const gold = buildGoldset();
    const run = async (): Promise<string> => {
      const out: string[] = [];
      for (const g of gold) {
        const r = await operateSeam(g.surgeonCase, { llm: portFor(g.port) });
        out.push(r.ok ? `${g.id}:${r.value.action}:${r.value.patchHash}` : `${g.id}:REFUSE`);
      }
      return out.join('|');
    };
    expect(await run()).toBe(await run());
  });
});
