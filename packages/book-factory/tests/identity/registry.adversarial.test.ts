/**
 * C1 — ADVERSARIAL : les 7 scénarios narratifs de l'ADR §8 (catalogue obligatoire).
 * Critère PASS ADR : aucun renommage ne casse l'identité ; aucune mention ambiguë
 * ne force une résolution silencieuse.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { DET, aliasInto, ch, ev, mintInto, nonce } from './fixtures.js';
import { asAliasSurface } from '../../src/identity/identity-types.js';

function s(raw: string) {
  const r = asAliasSurface(raw);
  if (!r.ok) throw new Error('surface invalide');
  return r.value;
}

describe('C1 ADVERSARIAL — les 7 scénarios ADR §8', () => {
  it('1. Marie devient « la Comtesse » : l’identité survit au renommage + nouvel alias', () => {
    const m = mintInto(CharacterRegistry.empty(DET), 'marie', 'Marie', 1);
    let reg = aliasInto(m.reg, m.id, 'la Comtesse', 'title', { from: 12 });
    const ren = reg.apply({ kind: 'RENAME', id: m.id, newDisplayName: 'la Comtesse', at: ch(12), evidence: ev('E') });
    if (!ren.ok) throw new Error(ren.error.code);
    reg = ren.value;
    const before = reg.resolve('Marie', { chapter: ch(5) });
    const after = reg.resolve('la Comtesse', { chapter: ch(13) });
    expect(before.kind === 'RESOLVED_UNIQUE' && before.id === m.id).toBe(true);
    expect(after.kind === 'RESOLVED_UNIQUE' && after.id === m.id).toBe(true); // MÊME id : rien n’est perdu
  });

  it('2. « la Comtesse » citée AVANT révélation : fenêtre de validité = pas d’anachronisme', () => {
    const m = mintInto(CharacterRegistry.empty(DET), 'marie', 'Marie', 1);
    const reg = aliasInto(m.reg, m.id, 'la Comtesse', 'title', { from: 12 });
    expect(reg.resolve('la Comtesse', { chapter: ch(8) }).kind).toBe('UNKNOWN_NEW_ENTITY'); // pas encore
    expect(reg.resolve('la Comtesse', { chapter: ch(12) }).kind).toBe('RESOLVED_UNIQUE');
  });

  it('3. Deux Paul : ambiguïté déclarée, jamais tranchée en silence', () => {
    let st = mintInto(CharacterRegistry.empty(DET), 'paul-1', 'Paul', 1);
    const st2 = mintInto(st.reg, 'paul-2', 'Paul', 2);
    const r = st2.reg.resolve('Paul', { chapter: ch(3) });
    expect(r.kind).toBe('AMBIGUOUS');
  });

  it('4. Faux nom (cover identity) : REVEAL lie sans fusionner, l’historique des deux survit', () => {
    let st = mintInto(CharacterRegistry.empty(DET), 'lenoir', 'M. Lenoir', 1);
    let reg = st.reg;
    const cover = st.id;
    st = mintInto(reg, 'vasseur', 'Antoine Vasseur', 1);
    reg = st.reg;
    const real = st.id;
    const rev = reg.apply({ kind: 'REVEAL', outerId: cover, innerId: real, at: ch(22), evidence: ev('E-rev') });
    if (!rev.ok) throw new Error(rev.error.code);
    reg = rev.value;
    expect(reg.trueIdentityOf(cover, ch(10))).toBe(cover); // avant ch.22 le lecteur-système ne « sait » pas
    expect(reg.trueIdentityOf(cover, ch(25))).toBe(real);
    expect(reg.aliasesOf(cover).length).toBeGreaterThan(0); // rien n’a été fusionné/perdu
    expect(reg.aliasesOf(real).length).toBeGreaterThan(0);
  });

  it('5. Surnom devenu public : alias nickname ajouté — les DEUX surfaces résolvent le même id', () => {
    const st = mintInto(CharacterRegistry.empty(DET), 'g', 'Gabriel', 1);
    const reg = aliasInto(st.reg, st.id, 'le Phare', 'nickname', { from: 7 });
    const byName = reg.resolve('Gabriel', { chapter: ch(9) });
    const byNick = reg.resolve('le Phare', { chapter: ch(9) });
    expect(byName.kind === 'RESOLVED_UNIQUE' && byNick.kind === 'RESOLVED_UNIQUE').toBe(true);
    if (byName.kind === 'RESOLVED_UNIQUE' && byNick.kind === 'RESOLVED_UNIQUE')
      expect(byName.id).toBe(byNick.id);
  });

  it('6. Pronom ambigu : JAMAIS résolu sans preuve (PRONOUN_UNRESOLVED systématique en C1)', () => {
    let st = mintInto(CharacterRegistry.empty(DET), 'a', 'Anne', 1);
    const st2 = mintInto(st.reg, 'b', 'Berthe', 1);
    expect(st2.reg.resolve('elle', { chapter: ch(4), inScene: [st2.id] }).kind).toBe('PRONOUN_UNRESOLVED');
  });

  it('7. « le maire » change de porteur : résolution datée correcte des deux côtés du transfert', () => {
    let st = mintInto(CharacterRegistry.empty(DET), 'albert', 'Albert', 1);
    let reg = st.reg;
    const albert = st.id;
    st = mintInto(reg, 'bernard', 'Bernard', 1);
    reg = aliasInto(st.reg, albert, 'le maire', 'title', { from: 1 });
    const t = reg.apply({ kind: 'TITLE_TRANSFER', surface: s('le maire'), fromId: albert, toId: st.id, at: ch(15), evidence: ev('E-t') });
    if (!t.ok) throw new Error(t.error.code);
    const r5 = t.value.resolve('le maire', { chapter: ch(5) });
    const r15 = t.value.resolve('le maire', { chapter: ch(15) });
    const r20 = t.value.resolve('le maire', { chapter: ch(20) });
    expect(r5.kind === 'RESOLVED_UNIQUE' && r5.id === albert).toBe(true);
    expect(r15.kind === 'RESOLVED_UNIQUE' && r15.id === st.id).toBe(true);
    expect(r20.kind === 'RESOLVED_UNIQUE' && r20.id === st.id).toBe(true);
  });

  it('garde-fou : MINT dupliqué (même nonce) rejeté — un personnage ne « renaît » jamais', () => {
    const st = mintInto(CharacterRegistry.empty(DET), 'marie', 'Marie', 1);
    const dup = st.reg.apply({
      kind: 'MINT', nonce: nonce('marie'), displayName: 'Marie-bis', introducedAt: ch(9),
      createdBy: 'extractor', evidence: ev('E-dup'),
    });
    expect(!dup.ok && dup.error.code === 'DUPLICATE_NONCE').toBe(true);
  });
});
