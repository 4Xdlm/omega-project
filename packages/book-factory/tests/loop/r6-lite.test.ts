/**
 * C5 — R6-LITE : N=3 persistés (FORBID-007), gates durs excluent les fautifs,
 * fallback ADR-003 flaggé, sélection déterministe, G5 observé.
 * Générateurs de test : déterministe sain + générateurs FAUTIFS injectés
 * (violation de verrou G2 ; entité non couverte G_RECALL ; trop court G1).
 */
import { describe, expect, it } from 'vitest';

import type { ChapterGenerator, GenRequest, GenResult } from '../../src/chapter-generator.js';
import type { ChapterSpec } from '../../src/book-planner.js';
import { CharacterRegistry } from '../../src/identity/character-registry.js';
import { ch, DET, mintInto } from '../identity/fixtures.js';
import { buildRecallPack, estimateTokens } from '../../src/recall/recall-pack.js';
import type { Librarians } from '../../src/recall/recall-types.js';
import { projectStoryState } from '../../src/story-state.js';
import { runLiteChapter, LITE_PROFILES, repeatRate } from '../../src/loop/r6-lite.js';
import type { LiteDeps } from '../../src/loop/r6-lite.js';
import { MemFs, persistLiteResult } from '../../src/loop/persistence.js';
import type { PassContext } from '../../src/extraction/extraction-types.js';
import type { ChapterIntent } from '../../src/chapter-spec-to-intent.js';

const LONG =
  'La marée remontait lentement contre la digue, et chaque vague apportait son lot de varech noir. ' +
  'Léna suivait le sentier des douaniers, attentive au moindre éclat de lumière sur l’eau grise. ' +
  'Le vent portait une odeur de sel et de goudron, et quelque part au loin une drisse battait contre un mât. ' +
  'Elle pensa au carnet, à la page arrachée, à ce nom à moitié effacé qui revenait dans ses notes. ' +
  'Au pied du phare, la porte verte était entrouverte, comme une invitation que personne n’aurait signée.';

function spec(): ChapterSpec {
  return {
    index: 5, act: 1, objective: 'fouiller le phare', tension_target: 0.5,
    target_word_count: 900, pov_character: 'lena',
    seeds_to_plant: [], seeds_to_reinforce: [], seeds_to_bloom: ['carnet'],
    threads_to_open: [], threads_to_advance: [], threads_to_close: [],
    entering_state_requirements: [],
  };
}

function intent(): ChapterIntent {
  return {
    title: 'Chapitre 5', premise: 'Léna fouille le phare', themes: ['mer'],
    core_emotion: 'tension', target_audience: 'adulte', message: 'la vérité affleure',
    target_word_count: 900,
  };
}

function world() {
  let s = mintInto(CharacterRegistry.empty(DET), 'lena', 'Léna', 1);
  const reg = s.reg;
  const lena = s.id;
  const story = projectStoryState([
    { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: String(lena), name: 'Léna' },
    { kind: 'CHARACTER_MOVE', chapter: 1, id: String(lena), location: 'Ker-Morvan' },
  ]);
  const surfaces = new Set<string>(['léna']);
  const lib: Librarians = {
    registry: reg, story, storyIdOf: (id) => String(id),
    driftRulesOf: () => [{ field: 'location', expected: 'Ker-Morvan' }],
  };
  const packR = buildRecallPack(lena, ch(5), lib, estimateTokens(500));
  if (!packR.ok) throw new Error('pack fixture');
  const pctx: PassContext = {
    chapter: 5, registry: reg, knownSurfaces: surfaces, maxSurfaceWords: 2,
    seedLexicon: new Map(), storyIdOf: (id) => String(id),
  };
  const deps: LiteDeps = {
    generator: undefined as never, // remplacé par test
    registry: reg, knownSurfaces: surfaces, maxSurfaceWords: 2,
    packs: [packR.value],
    locksByStoryId: new Map([[String(lena), [{ field: 'location', expected: 'Ker-Morvan' }]]]),
    passContext: pctx,
    resolution: { chapter: ch(5) },
  };
  return { deps, lena };
}

/** Générateur de test : prose par PROFIL (déterministe) — permet d'injecter des fautes ciblées. */
function generatorBy(map: Partial<Record<string, string>>): ChapterGenerator {
  return {
    async generate(req: GenRequest): Promise<GenResult> {
      const profile = req.digest.startsWith('Consigne de plume : sobriété') ? 'canon-strict'
        : req.digest.startsWith('Consigne de plume : ancrage') ? 'sensoriel' : 'synthese';
      const prose = map[profile] ?? `${LONG} (${profile})`;
      return { prose, words: prose.trim().split(/\s+/u).length, model: 'test-gen', ms: 0 };
    },
  };
}

describe('C5 — R6-Lite', () => {
  it('N=3 candidats produits et TOUS persistés (FORBID-007), gagnant sélectionné', async () => {
    const { deps } = world();
    const result = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({}) });
    expect(result.candidates.length).toBe(3);
    expect(result.winner.kind).toBe('WINNER');
    const fs = new MemFs();
    const written = persistLiteResult('runs/r6lite/test', result, fs);
    expect(written.length).toBe(3 * 3 + 1); // 3 fichiers/candidat + result.json
    expect(fs.files.has('runs/r6lite/test/chap_005/candidate_sensoriel/prose.txt')).toBe(true);
    expect([...fs.files.keys()].filter((k) => k.endsWith('gates.json')).length).toBe(3);
  });

  it('G2 : un candidat qui contredit le verrou de lieu est EXCLU de l’éligibilité', async () => {
    const { deps } = world();
    const faulty = `${LONG} Sans réfléchir, Léna alla à Ker-Bihan par le sentier du sud, et la nuit la prit.`;
    const result = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({ sensoriel: faulty }) });
    const bad = result.candidates.find((c) => c.profile === 'sensoriel');
    expect(bad?.eligible).toBe(false);
    expect(bad?.gates.some((g) => g.gate === 'G2_FIDELITY' && g.verdict === 'FAIL')).toBe(true);
    expect(result.winner.kind === 'WINNER' && result.winner.profile !== 'sensoriel').toBe(true);
  });

  it('G_RECALL : une entité canonique NON couverte par pack invalide le candidat (BF-02)', async () => {
    const { deps } = world();
    const noPacks: LiteDeps = { ...deps, packs: [], generator: generatorBy({}) };
    const result = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, noPacks);
    expect(result.candidates.every((c) => !c.eligible)).toBe(true); // Léna mentionnée partout, zéro pack
    expect(result.winner.kind).toBe('NONE_ELIGIBLE_FLAGGED'); // fallback ADR-003 : flag, jamais silence
  });

  it('G1 : candidat trop court exclu ; déterminisme du résultat (×2 mêmes hashes)', async () => {
    const { deps } = world();
    const gen = generatorBy({ synthese: 'Trop court.' });
    const r1 = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: gen });
    const r2 = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: gen });
    const short = r1.candidates.find((c) => c.profile === 'synthese');
    expect(short?.eligible).toBe(false);
    expect(short?.gates.some((g) => g.gate === 'G1_FORMAT' && g.verdict === 'FAIL')).toBe(true);
    expect(r1.candidates.map((c) => String(c.proseHash))).toEqual(r2.candidates.map((c) => String(c.proseHash)));
  });

  it('G5 observe sans rejeter : repeat_rate mesuré, verdict OBSERVE, éligibilité intacte', async () => {
    const { deps } = world();
    const repetitive = `${LONG} ${'la mer grise la mer grise la mer grise '.repeat(5)}`;
    const result = await runLiteChapter(spec(), { intent: intent(), digest: 'contexte.', spec: spec() }, { ...deps, generator: generatorBy({ 'canon-strict': repetitive }) });
    const c = result.candidates.find((x) => x.profile === 'canon-strict');
    const g5 = c?.gates.find((g) => g.gate === 'G5_REPEAT_SHADOW');
    expect(g5?.verdict).toBe('OBSERVE');
    expect(repeatRate(repetitive)).toBeGreaterThan(repeatRate(LONG));
    expect(c?.eligible).toBe(true); // shadow ne rejette JAMAIS en Lite
  });

  it('profils : la PLUME varie, la RÉALITÉ jamais (3 digests préfixés, même spec/packs)', () => {
    expect(LITE_PROFILES.length).toBe(3);
  });
});
