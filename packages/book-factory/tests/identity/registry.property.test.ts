/**
 * C1 — PROPERTY-BASED (sans dépendance nouvelle : PRNG LCG seedé, déterministe).
 * Propriétés : ∀ journal valide généré — (1) replay ⇒ même stateHash ;
 * (2) les ids sont STABLES sous toute séquence de RENAME/STATUS ; (3) la surface de
 * naissance résout vers le même id. P4 : l'espace d'identité est LIÉ AU LIVRE —
 * frappes disjointes entre seeds ET un journal ne peut pas être rejoué sous la graine
 * d'un autre livre (anti-contamination inter-livres PAR CONSTRUCTION).
 * 50 journaux × ~12 événements, zéro aléa non reproductible.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry, buildMintEvents, mintCharacterId } from '../../src/identity/character-registry.js';
import type { CharacterId, IdentityDeterminism, IdentityEvent, Seed } from '../../src/identity/identity-types.js';
import { DET, ch, conf, ev, nonce, surf } from './fixtures.js';

/** LCG déterministe (Numerical Recipes) — même seed ⇒ même séquence, toujours. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const FIRST = ['Léna', 'Marc', 'Anne', 'Paul', 'Irina', 'Gaspard', 'Berthe', 'Hugo'] as const;
const LAST = ['Marchetti', 'Vasseur', 'Kerguelen', 'Noir', 'Squarcioni', 'Bréhat'] as const;

interface Gen {
  readonly events: readonly IdentityEvent[];
  readonly minted: readonly { readonly id: CharacterId; readonly birthSurface: string }[];
}

function genJournal(rnd: () => number, run: number): Gen {
  const events: IdentityEvent[] = [];
  const minted: { id: CharacterId; birthSurface: string }[] = [];
  const nMint = 2 + Math.floor(rnd() * 3); // 2..4 personnages
  for (let i = 0; i < nMint; i++) {
    // Noms VOLONTAIREMENT non uniques possibles entre runs — l'unicité vient du NONCE (BF-01).
    const name = `${FIRST[Math.floor(rnd() * FIRST.length)]} ${LAST[Math.floor(rnd() * LAST.length)]} ${run}-${i}`;
    const [mint, alias] = buildMintEvents(
      DET,
      { nonce: nonce(`r${run}-c${i}`), displayName: name, introducedAt: ch(1 + Math.floor(rnd() * 3)), createdBy: 'planner', evidence: ev(`E-${run}-${i}`) },
      surf(name),
      conf(0.9),
      events.length,
    );
    events.push(mint, alias);
    if (alias.kind === 'ALIAS') minted.push({ id: alias.alias.characterId, birthSurface: name });
  }
  const nOps = 4 + Math.floor(rnd() * 5); // 4..8 opérations
  for (let i = 0; i < nOps; i++) {
    const target = minted[Math.floor(rnd() * minted.length)];
    if (target === undefined) continue;
    const dice = rnd();
    if (dice < 0.5) {
      events.push({ kind: 'RENAME', id: target.id, newDisplayName: `Alias-${run}-${i}`, at: ch(5 + i), evidence: ev(`E-r-${i}`) });
    } else {
      const statuses = ['active', 'missing', 'unknown', 'dead'] as const;
      events.push({ kind: 'STATUS', id: target.id, status: statuses[Math.floor(rnd() * statuses.length)] ?? 'active', at: ch(5 + i), evidence: ev(`E-s-${i}`) });
    }
  }
  return { events, minted };
}

describe('C1 PROPERTY — replay, stabilité, résolution (50 journaux seedés)', () => {
  it('P1+P2+P3 : ∀ journal — replay ⇒ même hash ; ids stables ; surface de naissance fidèle', () => {
    for (let run = 0; run < 50; run++) {
      const { events, minted } = genJournal(lcg(0xC1 + run * 7919), run);

      const a = CharacterRegistry.fromJournal(DET, events);
      const b = CharacterRegistry.fromJournal(DET, events);
      if (!a.ok || !b.ok) throw new Error(`run ${run}: journal valide refusé`);

      // P1 — replay bit-à-bit
      expect(a.value.stateHash()).toBe(b.value.stateHash());

      for (const m of minted) {
        // P2 — l'id survit à TOUTES les opérations du run (INV-CHAR-001 généralisé)
        expect(a.value.character(m.id)?.id).toBe(m.id);
        // P3 — la surface de naissance résout vers le même id (noms suffixés run-i : uniques par run)
        const r = a.value.resolve(m.birthSurface, { chapter: ch(30) });
        expect(r.kind === 'RESOLVED_UNIQUE' && r.id === m.id).toBe(true);
      }
    }
  });

  it('P4 : l’espace d’identité est lié au LIVRE — frappes disjointes entre seeds', () => {
    const other: IdentityDeterminism = { mintSeed: 'AUTRE-LIVRE' as Seed };
    for (const n of ['hero-1', 'hero-2', 'r0-c0']) {
      expect(mintCharacterId(DET, nonce(n))).not.toBe(mintCharacterId(other, nonce(n)));
    }
  });

  it('P5 : un journal NE PEUT PAS être rejoué sous la graine d’un autre livre (anti-contamination)', () => {
    const { events } = genJournal(lcg(42), 999);
    const other: IdentityDeterminism = { mintSeed: 'AUTRE-LIVRE' as Seed };
    const replayed = CharacterRegistry.fromJournal(other, events);
    // Les ALIAS référencent des ids frappés sous la graine d'ORIGINE → rejet TYPÉ, jamais silencieux.
    expect(!replayed.ok && replayed.error.code === 'UNKNOWN_CHARACTER').toBe(true);
  });
});
