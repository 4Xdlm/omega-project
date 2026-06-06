/** OMEGA — SAGA_CONTRACT + C15-gen tests (BF-08). */

import { describe, it, expect } from 'vitest';

import { buildSagaContract, checkContract, verifyContractSeal } from '../src/saga/saga-contract.js';
import type { SagaContract } from '../src/saga/saga-contract.js';
import { compileStyleDirectives, generateInStyle, STYLE_FLOOR_DEFAULT } from '../src/style/style-generation.js';
import type { StyleGenPort } from '../src/style/style-generation.js';
import { assertRights } from '../src/style/rights-gate.js';
import { extractStyleFingerprint } from '../src/style/style-extractor.js';

const INPUT = {
  sagaId: 'saga-phare',
  fromBookTitle: 'Le Silence du Phare',
  unpaidSeeds: [{ seed: 'registre', plantedChapter: 7 }, { seed: 'lettre', plantedChapter: 3 }],
  characterStates: [
    { name: 'Henri', vital: 'DEAD' as const, detail: 'gardien mort avant ch.1, jamais ressuscité' },
    { name: 'Léna', vital: 'ALIVE' as const, detail: 'protagoniste, vivante fin tome 1' },
  ],
  facts: [{ subject: 'naufrage', fact: 'le Ker-Vo a coulé moteur coupé, dix ans avant le tome 1' }],
};

describe('SAGA_CONTRACT (promesses inter-tomes, binding)', () => {
  it('INV-SAGA-001 — contrat construit, scellé, déterministe (×2 = même hash)', () => {
    const a = buildSagaContract(INPUT);
    const b = buildSagaContract(INPUT);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.contractHash).toBe(b.value.contractHash);
    expect(verifyContractSeal(a.value)).toBe(true);
    expect(a.value.promises.length).toBe(5); // 2 seeds + 2 états + 1 fait
  });

  it('INV-SAGA-002 — un MORT qui parle au tome suivant = DEAD_CHARACTER_ACTS avec evidence', () => {
    const c = buildSagaContract(INPUT);
    if (!c.ok) return;
    const tome2Violant = 'La taverne était pleine. « Le phare tiendra », dit Henri en posant son verre près du registre ouvert.';
    const r = checkContract(c.value, tome2Violant);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.violations.some((v) => v.kind === 'DEAD_CHARACTER_ACTS')).toBe(true);
    expect(r.value.violations[0]?.evidence).toContain('Henri');
    expect(r.value.seedsCarried).toContain('registre'); // la graine reportée EST présente
    expect(r.value.seedsStillUnpaid).toContain('lettre');
  });

  it('INV-SAGA-003 — tome 2 propre : zéro violation, mention du mort SANS le faire agir = OK', () => {
    const c = buildSagaContract(INPUT);
    if (!c.ok) return;
    const tome2Propre = 'Léna repensait à Henri, mort depuis dix ans maintenant. Elle rangea la lettre près du registre, et sortit sous la pluie.';
    const r = checkContract(c.value, tome2Propre);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.violations.length).toBe(0);
    expect([...r.value.seedsCarried].sort()).toEqual(['lettre', 'registre']);
  });

  it('INV-SAGA-004 — contrat ALTÉRÉ (sceau cassé) = vérification REFUSÉE', () => {
    const c = buildSagaContract(INPUT);
    if (!c.ok) return;
    const tampered: SagaContract = { ...c.value, fromBookTitle: 'Autre Livre' }; // altération post-scellement
    const r = checkContract(tampered, 'Texte quelconque.');
    expect(!r.ok && r.error.code === 'HASH_MISMATCH').toBe(true);
  });

  it('ADV — contrat vide = erreur typée', () => {
    expect(buildSagaContract({ sagaId: 's', fromBookTitle: 't', unpaidSeeds: [], characterStates: [], facts: [] }).ok).toBe(false);
  });
});

describe('C15-gen — génération stylisée (rights + conformité)', () => {
  const ticket = (() => {
    const t = assertRights('OWN_WORK', 'GENERATE_IN_STYLE');
    if (!t.ok) throw new Error('fixture');
    return t.value;
  })();
  const analysisTicket = (() => {
    const t = assertRights('OWN_WORK', 'ANALYZE_STYLE');
    if (!t.ok) throw new Error('fixture');
    return t.value;
  })();
  const LONG_TEXT = Array.from({ length: 30 }, () =>
    'La mémoire, qui revenait par vagues lentes chaque fois que la maison respirait, déposait dans la conscience une sédimentation de regrets inachevés et de tendresses suspendues, comme une marée patiente.',
  ).join(' ');

  it('INV-SGEN-001 — directives de FORME compilées, zéro coaching (FORBID-006 audité)', () => {
    const fp = extractStyleFingerprint(analysisTicket, LONG_TEXT);
    expect(fp.ok).toBe(true);
    if (!fp.ok) return;
    const d = compileStyleDirectives(fp.value);
    expect(d.ok).toBe(true);
    if (!d.ok) return;
    expect(d.value).toContain('Phrases longues'); // le style ample est traduit en FORME
    expect(/magnifique|sublime|excellent|qualité/iu.test(d.value)).toBe(false);
  });

  it('INV-SGEN-002 — ticket ANALYZE refusé pour générer (opération re-vérifiée au runtime)', async () => {
    const fp = extractStyleFingerprint(analysisTicket, LONG_TEXT);
    if (!fp.ok) return;
    const port: StyleGenPort = { generate: async () => 'x'.repeat(2000) };
    const r = await generateInStyle(analysisTicket, fp.value, port, 'brief');
    expect(!r.ok && r.error.code === 'WRONG_TICKET_OPERATION').toBe(true);
  });

  it('INV-SGEN-003 — conformité mesurée : port FIDÈLE ⇒ score haut ; port INFIDÈLE ⇒ below_style_floor', async () => {
    const fp = extractStyleFingerprint(analysisTicket, LONG_TEXT);
    if (!fp.ok) return;
    const faithful: StyleGenPort = { generate: async () => LONG_TEXT }; // reproduit le style cible
    const r1 = await generateInStyle(ticket, fp.value, faithful, 'brief');
    expect(r1.ok).toBe(true);
    if (!r1.ok) return;
    expect(r1.value.conformityScore).toBeGreaterThan(0.8);
    expect(r1.value.belowStyleFloor).toBe(false);

    const unfaithful: StyleGenPort = {
      generate: async () => Array.from({ length: 60 }, () => '« Va ! » cria-t-il. Court. Sec. Net. Vif ! Rien ?').join(' '),
    };
    const r2 = await generateInStyle(ticket, fp.value, unfaithful, 'brief');
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    expect(r2.value.conformityScore).toBeLessThan(r1.value.conformityScore);
    expect(r2.value.belowStyleFloor).toBe(r2.value.conformityScore < STYLE_FLOOR_DEFAULT); // flag honnête, jamais silencieux
  });

  it('ADV — port vide = erreur typée ; déterminisme du compilateur', async () => {
    const fp = extractStyleFingerprint(analysisTicket, LONG_TEXT);
    if (!fp.ok) return;
    const empty: StyleGenPort = { generate: async () => '  ' };
    const r = await generateInStyle(ticket, fp.value, empty, 'brief');
    expect(!r.ok && r.error.code === 'GENERATION_EMPTY').toBe(true);
    expect(JSON.stringify(compileStyleDirectives(fp.value))).toBe(JSON.stringify(compileStyleDirectives(fp.value)));
  });
});
