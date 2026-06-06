/**
 * C2 — RECALL BUS : scanner + pack/délestage + INV-RECALL-001..005 + adversarial BF-02.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { aliasInto, ch, DET, mintInto } from '../identity/fixtures.js';
import { scanMentions, normalizeText } from '../../src/recall/mention-scanner.js';
import { buildRecallPack, estimateTokens } from '../../src/recall/recall-pack.js';
import { enforceRecallOrInvalid } from '../../src/recall/recall-invariant.js';
import type { Librarians, TokenCount } from '../../src/recall/recall-types.js';
import { projectStoryState } from '../../src/story-state.js';
import type { NarrativeEvent } from '../../src/story-state.js';
import type { CharacterId } from '../../src/identity/identity-types.js';

/* ───────────────────────────── monde de test cohérent ────────────────────────────── */
function world() {
  let s = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna Marchetti', 1);
  let reg = s.reg;
  const lena = s.id;
  s = mintInto(reg, 'gaspard', 'Gaspard', 1);
  reg = aliasInto(s.reg, s.id, 'le gardien', 'title', { from: 1 });
  const gaspard = s.id;

  const events: NarrativeEvent[] = [
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna Marchetti' },
    { kind: 'CHARACTER_MOVE', chapter: 1, id: String(lena), location: 'Ker-Morvan' },
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(gaspard), name: 'Gaspard' },
    { kind: 'RELATIONSHIP', chapter: 2, from: String(lena), to: String(gaspard), type: 'méfiance', valence: -0.4 },
    { kind: 'THREAD_OPEN', chapter: 2, id: 'th-lettre', question: 'Qui a écrit la lettre cachée ?' },
    { kind: 'SEED_PLANT', chapter: 2, seed_id: 'seed-lettre', desc: 'la lettre cachée dans le phare', bloom_target_chapter: 24 },
    { kind: 'TIMELINE', chapter: 2, event: 'Léna découvre un carnet humide.' },
  ];
  const story = projectStoryState(events);
  const surfaces = new Set<string>(['léna marchetti', 'gaspard', 'le gardien']);
  const lib: Librarians = {
    registry: reg,
    story,
    storyIdOf: (id) => String(id),
    knownSubjectsOf: (id) => (id === lena ? ['affaire.carnet'] : []),
    driftRulesOf: (id) => (id === lena ? [{ field: 'role', expected: 'enquêtrice' }] : []),
  };
  return { reg, lena, gaspard, story, surfaces, lib };
}

const BUDGET = ((): TokenCount => estimateTokens(400))();

describe('C2 — MentionScanner (CALC pur, INV-RECALL-005)', () => {
  it('match le plus long d’abord : « Léna Marchetti » ne se découpe pas', () => {
    const { reg, surfaces, lena } = world();
    const ms = scanMentions('Au matin, Léna Marchetti grimpa au phare.', reg, surfaces, { chapter: ch(3) }, 3);
    const known = ms.filter((m) => m.kind === 'KNOWN');
    expect(known.length).toBe(1);
    const k = known[0];
    expect(k?.kind === 'KNOWN' && k.resolution.kind === 'RESOLVED_UNIQUE' && k.resolution.id === lena).toBe(true);
  });

  it('alias-titre détecté et résolu vers le MÊME id (marqueur derrière le nom)', () => {
    const { reg, surfaces, gaspard } = world();
    const ms = scanMentions('Elle interrogea le gardien sur la tempête.', reg, surfaces, { chapter: ch(3) }, 3);
    const k = ms.find((m) => m.kind === 'KNOWN');
    expect(k?.kind === 'KNOWN' && k.resolution.kind === 'RESOLVED_UNIQUE' && k.resolution.id === gaspard).toBe(true);
  });

  it('inconnu capitalisé hors début de phrase ⇒ UNKNOWN_CANDIDATE (jamais silence)', () => {
    const { reg, surfaces } = world();
    const ms = scanMentions('Elle croisa Armand Kerbrat près du môle.', reg, surfaces, { chapter: ch(3) }, 3);
    expect(ms.some((m) => m.kind === 'UNKNOWN_CANDIDATE' && m.surfaceRaw === 'armand kerbrat')).toBe(true);
  });

  it('déterminisme : même texte ⇒ mêmes mentions, mêmes offsets (×3)', () => {
    const { reg, surfaces } = world();
    const txt = 'Léna Marchetti parla. Puis Gaspard rit. Le gardien se tut.';
    const a = JSON.stringify(scanMentions(txt, reg, surfaces, { chapter: ch(3) }, 3));
    const b = JSON.stringify(scanMentions(txt, reg, surfaces, { chapter: ch(3) }, 3));
    const c = JSON.stringify(scanMentions(txt, reg, surfaces, { chapter: ch(3) }, 3));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });

  it('offsets pointent dans le texte normalisé (préfixe exact)', () => {
    const { reg, surfaces } = world();
    const txt = 'Au phare, Gaspard veillait.';
    const norm = String(normalizeText(txt));
    const k = scanMentions(txt, reg, surfaces, { chapter: ch(3) }, 3).find((m) => m.kind === 'KNOWN');
    expect(k !== undefined && norm.slice(k.offset, k.offset + 'gaspard'.length)).toBe('gaspard');
  });
});

describe('C2 — RecallPack (budget, critique jamais élagué, hashes)', () => {
  it('pack complet : facts/threads/dettes/verrous présents + sourceHashes (INV-RECALL-003)', () => {
    const { lib, lena } = world();
    const r = buildRecallPack(lena, ch(24), lib, BUDGET);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.facts?.location).toBe('Ker-Morvan');
      expect(r.value.openThreads.length).toBe(1);
      expect(r.value.debts.some((d) => d.seedId === 'seed-lettre' && d.bloomsNow)).toBe(true); // ch.24 = bloom
      expect(r.value.forbiddenDrifts).toEqual([{ field: 'role', expected: 'enquêtrice' }]);
      expect(r.value.sourceHashes.length).toBe(2);
      expect(String(r.value.packId).startsWith('rpack_')).toBe(true);
    }
  });

  it('délestage à seuil : budget serré ⇒ degraded[] tracé, dette bloomsNow CONSERVÉE (INV-RECALL-004)', () => {
    // Monde VOLONTAIREMENT riche : l'élagage doit avoir de la matière à élaguer.
    const base = world();
    const fatEvents: NarrativeEvent[] = [
      ...Array.from({ length: 6 }, (_, i): NarrativeEvent => ({
        kind: 'THREAD_OPEN', chapter: 3 + i, id: `th-x${i}`, question: `Question secondaire numéro ${i} sur la falaise et la marée ?`,
      })),
      ...Array.from({ length: 6 }, (_, i): NarrativeEvent => ({
        kind: 'TIMELINE', chapter: 22 + (i % 3), event: `Événement récent ${i} : la tempête forcit sur la côte nord.`,
      })),
    ];
    const fatStory = projectStoryState([
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(base.lena), name: 'Léna Marchetti' },
      { kind: 'CHARACTER_MOVE', chapter: 1, id: String(base.lena), location: 'Ker-Morvan' },
      { kind: 'SEED_PLANT', chapter: 2, seed_id: 'seed-lettre', desc: 'la lettre cachée dans le phare', bloom_target_chapter: 24 },
      ...fatEvents,
    ]);
    const fatLib: Librarians = { ...base.lib, story: fatStory };
    const full = buildRecallPack(base.lena, ch(24), fatLib, estimateTokens(10_000));
    if (!full.ok) throw new Error('pack plein attendu');
    const tight = estimateTokens(Math.ceil(Number(full.value.tokenCost) * 0.75 * 0.7)); // entre noyau et plein (marge anti-arrondi)
    const r = buildRecallPack(base.lena, ch(24), fatLib, tight);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.degraded).toContain('context_budget_exceeded');
      expect(r.value.debts.some((d) => d.bloomsNow)).toBe(true); // critique intouchée
      expect(r.value.forbiddenDrifts.length).toBe(1); // verrous intouchés
      expect(r.value.tokenCost).toBeLessThanOrEqual(tight);
      expect(r.value.openThreads.length).toBeLessThanOrEqual(3); // prune effectif
    }
  });

  it('noyau critique > budget ⇒ BUDGET_UNSATISFIABLE_CRITICAL (échec typé, jamais de pack mutilé)', () => {
    const { lib, lena } = world();
    const r = buildRecallPack(lena, ch(24), lib, estimateTokens(4));
    expect(!r.ok && r.error.code === 'BUDGET_UNSATISFIABLE_CRITICAL').toBe(true);
  });

  it('entité inconnue ⇒ UNKNOWN_ENTITY ; déterminisme du packId (même monde ⇒ même id)', () => {
    const { lib, lena } = world();
    const ghost = 'ent_deadbeef' as CharacterId;
    expect((() => { const r = buildRecallPack(ghost, ch(3), lib, BUDGET); return !r.ok && r.error.code; })()).toBe('UNKNOWN_ENTITY');
    const a = buildRecallPack(lena, ch(3), lib, BUDGET);
    const b = buildRecallPack(lena, ch(3), lib, BUDGET);
    expect(a.ok && b.ok && a.value.packId === b.value.packId).toBe(true);
  });
});

describe('C2 — INV-RECALL-001/002 : le gate BF-02 (double filet)', () => {
  it('mention canonique SANS pack ⇒ INVALID (la loi)', () => {
    const { reg, surfaces } = world();
    const rep = enforceRecallOrInvalid('Gaspard alluma la lampe.', [], reg, surfaces, { chapter: ch(3) }, 3);
    expect(rep.verdict).toBe('INVALID');
    expect(rep.violations.some((v) => v.kind === 'MENTION_WITHOUT_PACK')).toBe(true);
  });

  it('mention couverte par pack ⇒ PASS ; alias-titre couvert par le pack du MÊME id', () => {
    const { reg, surfaces, gaspard, lib } = world();
    const pack = buildRecallPack(gaspard, ch(3), lib, BUDGET);
    if (!pack.ok) throw new Error('pack attendu');
    const rep = enforceRecallOrInvalid('Le gardien alluma la lampe.', [pack.value], reg, surfaces, { chapter: ch(3) }, 3);
    expect(rep.verdict).toBe('PASS');
  });

  it('entité INVENTÉE par la prose (filet post-prose) ⇒ UNKNOWN_ENTITY_IN_PROSE rapporté, PASS non bloqué V1', () => {
    const { reg, surfaces, lena, lib } = world();
    const pack = buildRecallPack(lena, ch(3), lib, BUDGET);
    if (!pack.ok) throw new Error('pack attendu');
    const rep = enforceRecallOrInvalid(
      'Léna Marchetti salua Armand Kerbrat.',
      [pack.value], reg, surfaces, { chapter: ch(3) }, 3,
    );
    expect(rep.violations.some((v) => v.kind === 'UNKNOWN_ENTITY_IN_PROSE')).toBe(true);
    expect(rep.verdict).toBe('PASS'); // sévérité = décision C5/C6, signal JAMAIS perdu
  });

  it('ambiguïté (deux porteuses d’une épithète) ⇒ AMBIGUOUS_MENTION signalée, jamais résolue en silence', () => {
    let s = mintInto(CharacterRegistry.empty(DET), 'a', 'Anne', 1);
    let reg = aliasInto(s.reg, s.id, 'la veuve', 'epithet', { pos: 301 });
    const b = mintInto(reg, 'b', 'Berthe', 1);
    reg = aliasInto(b.reg, b.id, 'la veuve', 'epithet', { pos: 302 });
    const surfaces = new Set<string>(['anne', 'berthe', 'la veuve']);
    const rep = enforceRecallOrInvalid('Dans la cour, la veuve attendait.', [], reg, surfaces, { chapter: ch(3) }, 3);
    expect(rep.violations.some((v) => v.kind === 'AMBIGUOUS_MENTION' && v.candidates.length === 2)).toBe(true);
  });

  it('adversarial : texte sans aucune entité ⇒ PASS propre, zéro violation', () => {
    const { reg, surfaces } = world();
    const rep = enforceRecallOrInvalid('La pluie tombait sur la digue grise.', [], reg, surfaces, { chapter: ch(3) }, 3);
    expect(rep.verdict).toBe('PASS');
    expect(rep.violations.length).toBe(0);
  });
});
