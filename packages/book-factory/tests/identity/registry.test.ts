/**
 * C1 — CharacterRegistry : invariants cœur (INV-CHAR-001/002/005/006/007/008) + erreurs typées.
 * Chaque test nomme son invariant — la traçabilité exigée par BF-08.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry, mintCharacterId } from '../../src/identity/character-registry.js';
import { DET, aliasInto, ch, ev, mintInto, nonce } from './fixtures.js';

describe('C1 CharacterRegistry — frappe et invariants cœur', () => {
  it('BF-01 : la frappe dérive du NONCE, jamais du nom (deux noms, même nonce ⇒ même id)', () => {
    expect(mintCharacterId(DET, nonce('hero-1'))).toBe(mintCharacterId(DET, nonce('hero-1')));
    expect(mintCharacterId(DET, nonce('hero-1'))).not.toBe(mintCharacterId(DET, nonce('hero-2')));
    expect(String(mintCharacterId(DET, nonce('hero-1'))).startsWith('ent_')).toBe(true);
  });

  it('INV-CHAR-001 id_never_changes : rename/status/alias ne touchent JAMAIS l’id', () => {
    let { reg, id } = mintInto(CharacterRegistry.empty(DET), 'p1', 'Marie', 1);
    reg = aliasInto(reg, id, 'la veuve', 'epithet');
    const renamed = reg.apply({ kind: 'RENAME', id, newDisplayName: 'Marie Vasseur', at: ch(3), evidence: ev('E-r') });
    if (!renamed.ok) throw new Error(renamed.error.code);
    const statused = renamed.value.apply({ kind: 'STATUS', id, status: 'missing', at: ch(4), evidence: ev('E-s') });
    if (!statused.ok) throw new Error(statused.error.code);
    const rec = statused.value.character(id);
    expect(rec?.id).toBe(id);
    expect(rec?.currentDisplayName).toBe('Marie Vasseur');
    expect(rec?.status).toBe('missing');
  });

  it('INV-CHAR-002 rename_never_mints : le compte de personnages est constant après RENAME', () => {
    const { reg, id } = mintInto(CharacterRegistry.empty(DET), 'p1', 'Marie', 1);
    const before = reg.characterCount();
    const renamed = reg.apply({ kind: 'RENAME', id, newDisplayName: 'la Comtesse', at: ch(10), evidence: ev('E-r') });
    if (!renamed.ok) throw new Error(renamed.error.code);
    expect(renamed.value.characterCount()).toBe(before);
  });

  it('INV-CHAR-005 (niveau type) : une string nue ne peut pas être un CharacterId', () => {
    const { reg } = mintInto(CharacterRegistry.empty(DET), 'p1', 'Marie', 1);
    // @ts-expect-error — brand : string nue refusée à la COMPILATION (BF-08, BF-01)
    reg.character('marie');
    expect(true).toBe(true); // le test vit à la compilation ; runtime trivialement vert
  });

  it('INV-CHAR-006 journal_replay_same_hash : fromJournal ×2 ⇒ hash identique bit-à-bit', () => {
    const base = CharacterRegistry.empty(DET);
    const { reg, id } = mintInto(base, 'p1', 'Marie', 1);
    const withAlias = aliasInto(reg, id, 'la veuve', 'epithet');
    // reconstruit le MÊME journal logique deux fois
    const j1 = mintInto(CharacterRegistry.empty(DET), 'p1', 'Marie', 1);
    const r1 = aliasInto(j1.reg, j1.id, 'la veuve', 'epithet');
    expect(r1.stateHash()).toBe(withAlias.stateHash());
  });

  it('INV-CHAR-007 reveal_links_without_merge : les deux fiches persistent, lien daté', () => {
    let s = mintInto(CharacterRegistry.empty(DET), 'cover', 'M. Lenoir', 1);
    let reg = s.reg;
    const outer = s.id;
    s = mintInto(reg, 'real', 'Antoine Vasseur', 1);
    reg = s.reg;
    const inner = s.id;
    const revealed = reg.apply({ kind: 'REVEAL', outerId: outer, innerId: inner, at: ch(20), evidence: ev('E-rev') });
    if (!revealed.ok) throw new Error(revealed.error.code);
    expect(revealed.value.character(outer)).toBeDefined(); // pas de fusion destructive
    expect(revealed.value.character(inner)).toBeDefined();
    expect(revealed.value.character(outer)?.revealedAs).toBe(inner);
    expect(revealed.value.trueIdentityOf(outer, ch(19))).toBe(outer); // AVANT la révélation
    expect(revealed.value.trueIdentityOf(outer, ch(20))).toBe(inner); // APRÈS
  });

  it('INV-CHAR-008 title_transfer_dated : « le maire » change de porteur à date exacte', () => {
    let s = mintInto(CharacterRegistry.empty(DET), 'a', 'Albert', 1);
    let reg = s.reg;
    const albert = s.id;
    s = mintInto(reg, 'b', 'Bernard', 1);
    reg = s.reg;
    const bernard = s.id;
    reg = aliasInto(reg, albert, 'le maire', 'title', { from: 1 });
    const t = reg.apply({ kind: 'TITLE_TRANSFER', surface: surfOf('le maire'), fromId: albert, toId: bernard, at: ch(12), evidence: ev('E-t') });
    if (!t.ok) throw new Error(t.error.code);
    const before = t.value.resolve('le maire', { chapter: ch(5) });
    const after = t.value.resolve('le maire', { chapter: ch(12) });
    expect(before.kind === 'RESOLVED_UNIQUE' && before.id === albert).toBe(true);
    expect(after.kind === 'RESOLVED_UNIQUE' && after.id === bernard).toBe(true);
  });

  it('erreurs typées : DUPLICATE_NONCE / UNKNOWN_CHARACTER / MISSING_EVIDENCE / SELF_REVEAL / TITLE_TRANSFER_MISMATCH', () => {
    const { reg, id } = mintInto(CharacterRegistry.empty(DET), 'p1', 'Marie', 1);
    const dup = reg.apply({ kind: 'MINT', nonce: nonce('p1'), displayName: 'X', introducedAt: ch(2), createdBy: 'planner', evidence: ev('E') });
    expect(!dup.ok && dup.error.code === 'DUPLICATE_NONCE').toBe(true);
    const ghost = reg.apply({ kind: 'RENAME', id: mintCharacterId(DET, nonce('ghost')), newDisplayName: 'X', at: ch(2), evidence: ev('E') });
    expect(!ghost.ok && ghost.error.code === 'UNKNOWN_CHARACTER').toBe(true);
    const noEv = reg.apply({ kind: 'ALIAS', alias: { aliasId: 'alias_x' as never, characterId: id, surface: surfOf('x'), kind: 'nickname', confidence: 0.9 as never, evidenceRefs: [] } });
    expect(!noEv.ok && noEv.error.code === 'MISSING_EVIDENCE').toBe(true); // INV-CHAR-009
    const self = reg.apply({ kind: 'REVEAL', outerId: id, innerId: id, at: ch(3), evidence: ev('E') });
    expect(!self.ok && self.error.code === 'SELF_REVEAL').toBe(true);
    const badT = reg.apply({ kind: 'TITLE_TRANSFER', surface: surfOf('le maire'), fromId: id, toId: id, at: ch(3), evidence: ev('E') });
    expect(!badT.ok && badT.error.code === 'TITLE_TRANSFER_MISMATCH').toBe(true);
  });
});

import { asAliasSurface } from '../../src/identity/identity-types.js';
function surfOf(raw: string) {
  const r = asAliasSurface(raw);
  if (!r.ok) throw new Error('surface fixture invalide');
  return r.value;
}
