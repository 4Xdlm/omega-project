/**
 * C1 — AliasResolver : INV-CHAR-003/004/009 + pronoms + inconnus + fenêtres de validité.
 * Doctrine : le resolver NE DEVINE JAMAIS — toute incertitude est un résultat typé.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { DET, aliasInto, ch, mintInto } from './fixtures.js';

function twoPauls() {
  let s = mintInto(CharacterRegistry.empty(DET), 'paul-doc', 'Paul', 1);
  let reg = s.reg;
  const paulDoc = s.id;
  s = mintInto(reg, 'paul-pecheur', 'Paul', 1);
  return { reg: s.reg, paulDoc, paulPecheur: s.id };
}

describe('C1 AliasResolver — jamais de choix silencieux', () => {
  it('INV-CHAR-003 alias_collision_returns_ambiguous : deux Paul ⇒ AMBIGUOUS (candidats triés)', () => {
    const { reg, paulDoc, paulPecheur } = twoPauls();
    const r = reg.resolve('Paul', { chapter: ch(5) });
    expect(r.kind).toBe('AMBIGUOUS');
    if (r.kind === 'AMBIGUOUS') {
      expect(new Set(r.candidates)).toEqual(new Set([paulDoc, paulPecheur]));
      expect([...r.candidates]).toEqual([...r.candidates].sort((a, b) => String(a).localeCompare(String(b))));
    }
  });

  it('INV-CHAR-004 contexte EXPLICITE : inScene réduit à un seul ⇒ RESOLVED_UNIQUE(contextUsed)', () => {
    const { reg, paulDoc } = twoPauls();
    const r = reg.resolve('Paul', { chapter: ch(5), inScene: [paulDoc] });
    expect(r.kind === 'RESOLVED_UNIQUE' && r.id === paulDoc && r.contextUsed).toBe(true);
  });

  it('INV-CHAR-004 contexte insuffisant (les deux en scène) ⇒ AMBIGUOUS, jamais de score', () => {
    const { reg, paulDoc, paulPecheur } = twoPauls();
    const r = reg.resolve('Paul', { chapter: ch(5), inScene: [paulDoc, paulPecheur] });
    expect(r.kind).toBe('AMBIGUOUS');
  });

  it('INV-CHAR-009 resolution_carries_evidence : RESOLVED_UNIQUE porte l’aliasId (via)', () => {
    const { reg, id } = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna Marchetti', 1);
    const r = reg.resolve('Léna Marchetti', { chapter: ch(2) });
    expect(r.kind === 'RESOLVED_UNIQUE' && r.id === id && String(r.via).startsWith('alias_')).toBe(true);
  });

  it('pronom (liste fermée) ⇒ PRONOUN_UNRESOLVED — la coréférence n’est PAS du ressort de C1', () => {
    const { reg } = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
    expect(reg.resolve('elle', { chapter: ch(2) }).kind).toBe('PRONOUN_UNRESOLVED');
    expect(reg.resolve('Il', { chapter: ch(2) }).kind).toBe('PRONOUN_UNRESOLVED'); // casefold
  });

  it('surface inconnue ⇒ UNKNOWN_NEW_ENTITY (escalade en aval, jamais silence)', () => {
    const { reg } = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
    expect(reg.resolve('Gaspard', { chapter: ch(2) }).kind).toBe('UNKNOWN_NEW_ENTITY');
  });

  it('épithète partagée sans contexte ⇒ EPITHET_NEEDS_CONTEXT (signal dédié)', () => {
    let s = mintInto(CharacterRegistry.empty(DET), 'a', 'Anne', 1);
    let reg = aliasInto(s.reg, s.id, 'la veuve', 'epithet', { pos: 201 });
    const b = mintInto(reg, 'b', 'Berthe', 1);
    reg = aliasInto(b.reg, b.id, 'la veuve', 'epithet', { pos: 202 });
    expect(reg.resolve('la veuve', { chapter: ch(3) }).kind).toBe('EPITHET_NEEDS_CONTEXT');
  });

  it('fenêtres de validité : alias hors fenêtre = invisible au chapitre demandé', () => {
    const { reg, id } = mintInto(CharacterRegistry.empty(DET), 'x', 'Xavier', 1);
    const withCover = aliasInto(reg, id, 'M. Noir', 'cover_identity', { from: 5, to: 9 });
    expect(withCover.resolve('M. Noir', { chapter: ch(4) }).kind).toBe('UNKNOWN_NEW_ENTITY');
    expect(withCover.resolve('M. Noir', { chapter: ch(5) }).kind).toBe('RESOLVED_UNIQUE');
    expect(withCover.resolve('M. Noir', { chapter: ch(9) }).kind).toBe('UNKNOWN_NEW_ENTITY'); // validTo exclusif
  });

  it('normalisation : casse/espaces/NFC ne créent pas de fausses identités', () => {
    const { reg, id } = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna  Marchetti', 1);
    const r = reg.resolve('  léna marchetti ', { chapter: ch(2) });
    expect(r.kind === 'RESOLVED_UNIQUE' && r.id === id).toBe(true);
  });
});
