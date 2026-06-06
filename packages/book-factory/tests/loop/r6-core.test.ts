/**
 * C6 — R6-CORE : N=7, préséance (durs vs observe), G3 diff câblé, G6 agrégateur vérité,
 * replay d'admission (INV-REPLAY-BOOK-001) + détection de falsification, FORBID-006.
 */
import { describe, expect, it } from 'vitest';

import type { ChapterGenerator, GenRequest, GenResult } from '../../src/chapter-generator.js';
import type { ChapterSpec } from '../../src/book-planner.js';
import type { ChapterIntent } from '../../src/chapter-spec-to-intent.js';
import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { ch, DET, mintInto } from '../identity/fixtures.js';
import { buildRecallPack, estimateTokens } from '../../src/recall/recall-pack.js';
import type { Librarians } from '../../src/recall/recall-types.js';
import { projectStoryState } from '../../src/story-state.js';
import type { PassContext } from '../../src/extraction/extraction-types.js';
import {
  auditNoCoaching,
  CORE_PROFILES,
  PRECEDENCE,
  replayAdmission,
  runCoreChapter,
} from '../../src/loop/r6-core.js';
import type { AdmissionRecord, CoreDeps } from '../../src/loop/r6-core.js';

const LONG =
  'La marée remontait lentement contre la digue, et chaque vague apportait son lot de varech noir. ' +
  'Léna suivait le sentier des douaniers, attentive au moindre éclat de lumière sur l’eau grise. ' +
  'Le vent portait une odeur de sel et de goudron, et une drisse battait quelque part contre un mât. ' +
  'Elle pensa au carnet, à la page arrachée, à ce nom à demi effacé qui revenait dans ses notes. ' +
  'Au pied du phare, la porte verte restait entrouverte sur un escalier qui sentait la pierre froide.';

function spec(): ChapterSpec {
  return {
    index: 7, act: 1, objective: 'le phare', tension_target: 0.6, target_word_count: 900,
    pov_character: 'lena', seeds_to_plant: [], seeds_to_reinforce: [], seeds_to_bloom: ['carnet'],
    threads_to_open: [], threads_to_advance: [], threads_to_close: [], entering_state_requirements: [],
  };
}
function intent(): ChapterIntent {
  return { title: 'Ch7', premise: 'fouille', themes: ['mer'], core_emotion: 'tension', target_audience: 'adulte', message: 'vérité', target_word_count: 900 };
}

function world() {
  let s = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
  const reg = s.reg;
  const lena = s.id;
  const realState = projectStoryState([
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna' },
    { kind: 'CHARACTER_MOVE', chapter: 1, id: String(lena), location: 'Ker-Morvan' },
  ]);
  const surfaces = new Set<string>(['léna']);
  const lib: Librarians = { registry: reg, story: realState, storyIdOf: (id) => String(id) };
  const packR = buildRecallPack(lena, ch(7), lib, estimateTokens(500));
  if (!packR.ok) throw new Error('pack fixture');
  const pctx: PassContext = {
    chapter: 7, registry: reg, knownSurfaces: surfaces, maxSurfaceWords: 2,
    seedLexicon: new Map(), storyIdOf: (id) => String(id),
  };
  const deps: CoreDeps = {
    generator: undefined as never,
    registry: reg, knownSurfaces: surfaces, maxSurfaceWords: 2,
    packs: [packR.value],
    locksByStoryId: new Map([[String(lena), [{ field: 'location', expected: 'Ker-Morvan' }]]]),
    passContext: pctx, resolution: { chapter: ch(7) },
    realState, weekdayByChapter: new Map([[7, 'mardi']]),
    epistemic: { actorKnows: () => false }, // personne ne « sait » rien — toute révélation = fuite
    mode: 'OFF',
  };
  return { deps, lena };
}

function generatorBy(map: Partial<Record<string, string>>): ChapterGenerator {
  return {
    async generate(req: GenRequest): Promise<GenResult> {
      const firstLine = req.digest.split('\n')[0] ?? '';
      const profile = CORE_PROFILES.find((p) => firstLine.includes(
        p === 'canon-strict' ? 'sobriété' : p === 'tension-interne' ? 'interne' : p === 'sensoriel' ? 'matières'
        : p === 'dialogue' ? 'répliques' : p === 'rythme-compresse' ? 'resserrée' : p === 'voix-seche' ? 'déclaratives' : 'équilibre',
      )) ?? 'synthese';
      const prose = map[profile] ?? `${LONG} (${profile})`;
      return { prose, words: prose.trim().split(/\s+/u).length, model: 'test-gen', ms: 0 };
    },
  };
}

describe('C6 — R6-Core', () => {
  it('N=7 candidats, gagnant éligible, mode enregistré, admissionHash posé', async () => {
    const { deps } = world();
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({}) });
    expect(rec.candidates.length).toBe(7);
    expect(rec.winner.kind).toBe('WINNER');
    expect(rec.mode).toBe('OFF');
    expect(String(rec.admissionHash).length).toBe(64);
  });

  it('G6 vérité : « Léna révéla que… » sans savoir ⇒ EPISTEMIC dur ⇒ candidat exclu', async () => {
    const { deps } = world();
    const leak = `${LONG} Alors Léna révéla que le notaire avait forgé la lettre du phare.`;
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({ dialogue: leak }) });
    const bad = rec.candidates.find((c) => c.profile === 'dialogue');
    expect(bad?.eligible).toBe(false);
    expect(bad?.gates.some((g) => g.gate === 'G6_SKEPTIC_AGG' && g.verdict === 'FAIL')).toBe(true);
    expect(rec.winner.kind === 'WINNER' && rec.winner.profile !== 'dialogue').toBe(true);
  });

  it('G6 temporel : « jeudi » contre calendrier mardi ⇒ TEMPORAL dur ⇒ exclu', async () => {
    const { deps } = world();
    const wrongDay = `${LONG} Ce jeudi-là, Léna nota l’heure dans la marge du carnet retrouvé.`;
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({ 'voix-seche': wrongDay }) });
    const bad = rec.candidates.find((c) => c.profile === 'voix-seche');
    expect(bad?.eligible).toBe(false);
  });

  it('G2 verrou : déplacement interdit extrait haute-conf ⇒ FAIL fidélité', async () => {
    const { deps } = world();
    const drift = `${LONG} Sans un mot, Léna alla à Ker-Bihan retrouver l’homme du môle.`;
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({ sensoriel: drift }) });
    const bad = rec.candidates.find((c) => c.profile === 'sensoriel');
    expect(bad?.gates.some((g) => g.gate === 'G2_FIDELITY' && g.verdict === 'FAIL')).toBe(true);
    expect(bad?.eligible).toBe(false);
  });

  it('préséance : ordre déclaré stable, durs avant advisory, G5 ne rejette jamais', async () => {
    expect(PRECEDENCE[0]).toBe('G3_CANON_DIFF');
    expect(PRECEDENCE[PRECEDENCE.length - 1]).toBe('G5_REPEAT_SHADOW');
    const { deps } = world();
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({}) });
    for (const c of rec.candidates) {
      const g5 = c.gates.find((g) => g.gate === 'G5_REPEAT_SHADOW');
      expect(g5?.verdict).toBe('OBSERVE');
    }
  });

  it('INV-REPLAY-BOOK-001 : replay ⇒ même gagnant + même hash ; falsification DÉTECTÉE', async () => {
    const { deps } = world();
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({}) });
    const replay = replayAdmission(rec);
    expect(replay.consistent).toBe(true);
    expect(replay.winner).toEqual(rec.winner);
    // falsification : on gonfle le score d'un candidat dans l'enregistrement
    const tampered: AdmissionRecord = {
      ...rec,
      candidates: rec.candidates.map((c, i) => (i === 0 ? { ...c, expScore: c.expScore + 10_000 } : c)),
    };
    expect(replayAdmission(tampered).consistent).toBe(false);
  });

  it('FORBID-006 : zéro vocabulaire de coaching esthétique dans TOUT ce que voit le générateur', async () => {
    const { deps } = world();
    const seen: string[] = [];
    const spyGen: ChapterGenerator = {
      async generate(req: GenRequest): Promise<GenResult> {
        seen.push(req.digest, req.intent.premise, req.intent.message);
        return { prose: LONG, words: LONG.split(/\s+/u).length, model: 'spy', ms: 0 };
      },
    };
    await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: spyGen });
    for (const text of seen) expect(auditNoCoaching(text)).toEqual([]);
  });

  it('fallback ADR-003 : aucun éligible ⇒ NONE_ELIGIBLE_FLAGGED (jamais de silence)', async () => {
    const { deps } = world();
    const rec = await runCoreChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, packs: [], generator: generatorBy({}) });
    expect(rec.winner.kind).toBe('NONE_ELIGIBLE_FLAGGED'); // Léna sans pack ⇒ tous INVALID
  });
});
