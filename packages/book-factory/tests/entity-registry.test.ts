/** OMEGA — REGISTRE D'ENTITÉS TYPÉ UNIQUE tests (P0-A, GO tribunal 2/2). */
import { describe, it, expect } from 'vitest';
import { EntityRegistry, verifyManuscriptIdentities, assertCastingTotal } from '../src/identity/entity-registry.js';

function seeded(): EntityRegistry {
  const reg = new EntityRegistry('test-seed-20260607');
  expect(reg.mint({ kind: 'CHARACTER', canonical: 'Léna', aliases: ['Marchetti'] }).ok).toBe(true);
  expect(reg.mint({ kind: 'CHARACTER', canonical: 'Garcia' }).ok).toBe(true);
  expect(reg.mint({ kind: 'PLACE', canonical: 'Ker-Morvan' }).ok).toBe(true);
  expect(reg.mint({ kind: 'EVENT', canonical: 'naufrage' }).ok).toBe(true);
  expect(reg.mint({ kind: 'OBJECT', canonical: 'lettre' }).ok).toBe(true);
  return reg;
}

describe('P0-A — EntityRegistry (UNE source, des projections)', () => {
  it('INV-REG-001 — mint DÉTERMINISTE (même seed = mêmes ids) + préfixes typés', () => {
    const a = new EntityRegistry('s1').mint({ kind: 'PLACE', canonical: 'Ker-Morvan' });
    const b = new EntityRegistry('s1').mint({ kind: 'PLACE', canonical: 'Ker-Morvan' });
    expect(a.ok && b.ok && a.value.entityId === b.value.entityId).toBe(true);
    if (a.ok) expect(a.value.entityId.startsWith('loc_kermorvan_')).toBe(true);
  });

  it('INV-REG-002 — une surface = UN id (loi anti-Thomas/Henri) : doublon REFUSÉ', () => {
    const reg = seeded();
    const dup = reg.mint({ kind: 'CHARACTER', canonical: 'Marchetti' }); // alias déjà tenu par Léna
    expect(dup.ok).toBe(false);
    if (!dup.ok) expect(dup.error.code).toBe('DUPLICATE_SURFACE');
  });

  it('INV-REG-003 — resolve par canonique ET alias, insensible aux espaces/NFC', () => {
    const reg = seeded();
    expect(reg.resolve('Marchetti')?.canonical).toBe('Léna');
    expect(reg.resolve(' Ker-Morvan ')?.kind).toBe('PLACE');
    expect(reg.resolve('Dubois')).toBeNull(); // jamais minté
  });

  it('INV-REG-004 — IDENTITY_UNDEFINED : la mention non mintée (« Dubois ») lève une erreur système, jamais silencieuse', () => {
    const reg = seeded();
    const chapters = [{ chapter: 1, prose: 'Garcia interrogea Dubois devant Ker-Morvan. Dubois ne répondit rien.' }];
    const v = verifyManuscriptIdentities(chapters, reg);
    expect(v.ok).toBe(true);
    if (!v.ok) return;
    expect(v.value.undefinedMentions.some((u) => u.name === 'Dubois' && u.code === 'IDENTITY_UNDEFINED' && u.count === 2)).toBe(true);
    const gate = assertCastingTotal(chapters, reg);
    expect(gate.ok).toBe(false); // la gate Studio BLOQUE l'écriture
  });

  it('INV-REG-005 — casting TOTAL : tout minté ⇒ gate ouverte', () => {
    const reg = seeded();
    expect(reg.mint({ kind: 'CHARACTER', canonical: 'Dubois' }).ok).toBe(true);
    const chapters = [{ chapter: 1, prose: 'Garcia interrogea Dubois devant Ker-Morvan. La lettre attendait.' }];
    expect(assertCastingTotal(chapters, reg).ok).toBe(true);
  });
});
