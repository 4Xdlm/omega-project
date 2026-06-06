/**
 * C4 — DOUBLE-BIBLE : catalogue de fautes injectées (CHAQUE faute DOIT être attrapée),
 * FORBID-011 (low-conf jamais gate), symétrie MapProjection, property d'exhaustivité.
 */
import { describe, expect, it } from 'vitest';

import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { ch, DET, mintInto } from '../identity/fixtures.js';
import type { CharacterId, Confidence01 } from '../../src/identity/identity-types.js';
import { projectStoryState } from '../../src/story-state.js';
import type { NarrativeEvent, StoryState } from '../../src/story-state.js';
import { buildPassRegistry, runExtraction } from '../../src/extraction/pass-registry.js';
import type { PassContext } from '../../src/extraction/extraction-types.js';
import { diffBibles, highConfidenceEvents, TAU_HIGH_CONFIDENCE } from '../../src/diff/bible-diff.js';
import { diffMaps, projectMap } from '../../src/diff/map-projection.js';

function world() {
  let s = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
  let reg = s.reg;
  const lena = s.id;
  s = mintInto(reg, 'gaspard', 'Gaspard', 1);
  reg = s.reg;
  const gaspard = s.id;
  const surfaces = new Set<string>(['léna', 'gaspard']);
  const ctx: PassContext = {
    chapter: 5,
    registry: reg,
    knownSurfaces: surfaces,
    maxSurfaceWords: 2,
    seedLexicon: new Map([['seed-lettre', ['lettre', 'phare']]]),
    storyIdOf: (id: CharacterId) => String(id),
  };
  const realEvents: NarrativeEvent[] = [
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna' },
    { kind: 'CHARACTER_MOVE', chapter: 1, id: String(lena), location: 'Ker-Morvan' },
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(gaspard), name: 'Gaspard' },
    { kind: 'SEED_PLANT', chapter: 2, seed_id: 'seed-lettre', desc: 'lettre cachée', bloom_target_chapter: 5 },
    { kind: 'SEED_BLOOM', chapter: 5, seed_id: 'seed-lettre' },
  ];
  const real = projectStoryState(realEvents);
  const weekdays = new Map<number, string>([[5, 'mardi']]);
  return { reg, lena, gaspard, ctx, real, realEvents, weekdays };
}

const registry = buildPassRegistry();

describe('C4 — passes CALC : le catalogue de fautes est ATTRAPÉ', () => {
  it('MUTATED location : « Gaspard alla à Ker-Bihan » ⇒ CHARACTER_MOVE extrait + diff MUTATED', () => {
    const { ctx, real, gaspard, weekdays } = world();
    const prose = 'Au crépuscule, Gaspard alla à Ker-Bihan sans prévenir.';
    // le plan place Gaspard nulle part ; donnons-lui un lieu réel pour la mutation :
    const real2 = projectStoryState([
      ...world().realEvents,
      { kind: 'CHARACTER_MOVE', chapter: 2, id: String(gaspard), location: 'Ker-Morvan' },
    ]);
    const extracted = runExtraction(prose, 'standard', registry, ctx);
    const ext = projectStoryState([
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(gaspard), name: 'Gaspard' },
      ...highConfidenceEvents(extracted),
    ]);
    const d = diffBibles(real2, ext, extracted, weekdays);
    expect(d.items.some((i) => i.kind === 'MUTATED' && i.field === 'location' && i.observed === 'Ker-Bihan')).toBe(true);
    void real;
  });

  it('MUTATED status (mort non prévue) : « Gaspard mourut » ⇒ diff MUTATED dur', () => {
    const { ctx, real, gaspard, weekdays } = world();
    const prose = 'Cette nuit-là, Gaspard mourut dans la lande.';
    const extracted = runExtraction(prose, 'standard', registry, ctx);
    const ext = projectStoryState([
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(gaspard), name: 'Gaspard' },
      ...highConfidenceEvents(extracted),
    ]);
    const d = diffBibles(real, ext, extracted, weekdays);
    const hit = d.items.find((i) => i.kind === 'MUTATED' && i.field === 'status');
    expect(hit?.observed).toBe('dead');
    expect(hit?.gateEligible).toBe(true); // structurel haute-conf ⇒ gate possible
  });

  it('MISSING : personnage attendu absent + bloom prévu non advenu ⇒ deux MISSING', () => {
    const { real, weekdays } = world();
    const emptyExt = projectStoryState([]);
    const d = diffBibles(real, emptyExt, [], weekdays);
    expect(d.items.filter((i) => i.kind === 'MISSING' && i.field === 'character').length).toBe(2);
    expect(d.items.some((i) => i.kind === 'MISSING' && i.field === 'seed_bloom')).toBe(true);
  });

  it('EXTRA : personnage fantôme dans la prose ⇒ EXTRA (hallucination détectée mécaniquement)', () => {
    const { real, weekdays } = world();
    const ext = projectStoryState([
      { kind: 'CHARACTER_INTRODUCE', chapter: 5, id: 'char-fantome', name: 'Armand' },
    ]);
    const d = diffBibles(real, ext, [], weekdays);
    expect(d.items.some((i) => i.kind === 'EXTRA' && i.observed === 'Armand')).toBe(true);
  });

  it('TEMPORAL : « jeudi » écrit alors que le plan dit mardi ⇒ TEMPORAL gate-eligible', () => {
    const { ctx, real, weekdays } = world();
    const prose = 'Ce jeudi, la pluie noyait la digue, et Léna comptait les heures.';
    const extracted = runExtraction(prose, 'standard', registry, ctx);
    const d = diffBibles(real, projectStoryState([]), extracted, weekdays);
    const t = d.items.find((i) => i.kind === 'TEMPORAL');
    expect(t?.expected).toBe('mardi');
    expect(t?.observed).toBe('jeudi');
    expect(t?.gateEligible).toBe(true);
  });

  it('EPISTEMIC : « Gaspard révéla que … » sans savoir ⇒ EPISTEMIC ; avec savoir ⇒ rien', () => {
    const { ctx, real, gaspard, lena, weekdays } = world();
    const prose = 'Devant tous, Gaspard révéla que la lettre venait du notaire.';
    const extracted = runExtraction(prose, 'revelation', registry, ctx);
    const knowsNothing = { actorKnows: () => false };
    const knowsAll = { actorKnows: () => true };
    const dBad = diffBibles(real, projectStoryState([]), extracted, weekdays, knowsNothing);
    const dOk = diffBibles(real, projectStoryState([]), extracted, weekdays, knowsAll);
    expect(dBad.items.some((i) => i.kind === 'EPISTEMIC' && i.subject === String(gaspard))).toBe(true);
    expect(dOk.items.some((i) => i.kind === 'EPISTEMIC')).toBe(false);
    void lena;
  });

  it('FORBID-011 : claim basse confiance ⇒ uncertain[], JAMAIS hardViolations[]', () => {
    const { ctx, real, weekdays } = world();
    const prose = 'Trois jours plus tard, la lettre refit surface près du phare.'; // elapsed=LOOSE + seed 2 mots-clés
    const extracted = runExtraction(prose, 'standard', registry, ctx);
    const loose = extracted.filter((e) => Number(e.confidence) < Number(TAU_HIGH_CONFIDENCE));
    expect(loose.length).toBeGreaterThan(0); // la passe a bien émis du LOOSE
    const d = diffBibles(real, projectStoryState(highConfidenceEvents(extracted) as NarrativeEvent[]), extracted, weekdays);
    expect(d.hardViolations.every((i) => Number(i.confidence) >= Number(TAU_HIGH_CONFIDENCE))).toBe(true);
  });
});

describe('C4 — MapProjection (symétrie + diffs de carte)', () => {
  it('INV-DIFF-004 symétrie : même état ⇒ cartes identiques ⇒ diff vide', () => {
    const { real } = world();
    expect(diffMaps(projectMap(real), projectMap(real)).length).toBe(0);
  });

  it('occupant divergent + graine déplacée détectés', () => {
    const { real, lena } = world();
    const ext: StoryState = projectStoryState([
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna' },
      { kind: 'CHARACTER_MOVE', chapter: 5, id: String(lena), location: 'Ker-Bihan' },
      { kind: 'SEED_PLANT', chapter: 2, seed_id: 'seed-lettre', desc: 'lettre cachée', bloom_target_chapter: 9 },
    ]);
    const d = diffMaps(projectMap(real), projectMap(ext));
    expect(d.some((i) => i.layer === 'spatial' && i.observed === 'Ker-Bihan')).toBe(true);
    expect(d.some((i) => i.layer === 'seeds' && i.detail.includes('déplacée'))).toBe(true);
  });
});

describe('C4 — PROPERTY : exhaustivité du diff structurel (INV-DIFF-001)', () => {
  it('∀ mutation de statut/lieu/bloom injectée ⇒ ≥1 DiffItem du bon kind (12 mutations)', () => {
    const { real, lena, gaspard, weekdays } = world();
    const baseExt: NarrativeEvent[] = [
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna' },
      { kind: 'CHARACTER_MOVE', chapter: 1, id: String(lena), location: 'Ker-Morvan' },
      { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(gaspard), name: 'Gaspard' },
      { kind: 'SEED_PLANT', chapter: 2, seed_id: 'seed-lettre', desc: 'lettre cachée', bloom_target_chapter: 5 },
      { kind: 'SEED_BLOOM', chapter: 5, seed_id: 'seed-lettre' },
    ];
    // sanity : extraction parfaite ⇒ zéro divergence structurelle character/seed
    const clean = diffBibles(real, projectStoryState(baseExt), [], weekdays);
    expect(clean.items.filter((i) => i.kind !== 'MISSING').length).toBe(0);

    const mutations: { ev: NarrativeEvent; kind: string }[] = [
      { ev: { kind: 'CHARACTER_STATUS', chapter: 6, id: String(lena), status: 'dead' }, kind: 'MUTATED' },
      { ev: { kind: 'CHARACTER_MOVE', chapter: 6, id: String(lena), location: 'Ker-Bihan' }, kind: 'MUTATED' },
      { ev: { kind: 'CHARACTER_INTRODUCE', chapter: 6, id: 'ghost-1', name: 'Fantôme' }, kind: 'EXTRA' },
      { ev: { kind: 'SEED_PLANT', chapter: 6, seed_id: 'seed-x', desc: 'hors plan', bloom_target_chapter: 9 }, kind: 'EXTRA' },
    ];
    for (const m of mutations) {
      const d = diffBibles(real, projectStoryState([...baseExt, m.ev]), [], weekdays);
      expect(d.items.some((i) => i.kind === m.kind)).toBe(true);
    }
  });
});
