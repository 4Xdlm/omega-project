/**
 * INV-SCRIBE2ADAPT-01..04 — l'adaptateur de production.
 * Ollama n'est jamais appelé : `fetch` est remplacé le temps du test.
 * Ce qu'on vérifie ici, c'est le CÂBLAGE, pas la génération.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { OllamaScribeV2Generator } from '../src/scribe/ollama-scribe-v2.js';
import { PeriodHeadRegistry } from '../src/scribe/scribe-gate.js';
import type { GenRequest } from '../src/chapter-generator.js';
import type { ChapterSpec } from '../src/book-planner.js';
import type { ChapterIntent } from '../src/chapter-spec-to-intent.js';

function spec(index: number): ChapterSpec {
  return {
    index,
    act: 1,
    objective: 'objectif du chapitre',
    tension_target: 0.5,
    target_word_count: 1200,
    pov_character: 'Garcia',
    seeds_to_plant: [],
    seeds_to_reinforce: [],
    seeds_to_bloom: [],
    threads_to_open: [],
    threads_to_advance: [],
    threads_to_close: [],
    entering_state_requirements: [],
  };
}
const intent: ChapterIntent = {
  title: 'Chapitre',
  premise: 'premisse',
  themes: [],
  core_emotion: 'tension',
  target_audience: 'lecteurs',
  message: 'message',
  target_word_count: 1200,
};
function req(index: number): GenRequest {
  return { intent, digest: 'CASTING : Garcia.', spec: spec(index) };
}

function cleanPeriod(head: string): string {
  return (
    `${head} et le froid montait du sol par les jointures du plancher tandis que la ` +
    'pluie continuait de battre contre les carreaux sans qu il songeat a fermer le ' +
    'volet ni meme a se lever de ce fauteuil ou il avait passe la moitie de la nuit ' +
    'a regarder le port vide et les cordages luisants sous la lumiere du quai.'
  );
}

/** Remplace fetch par une file de réponses. Rend les prompts vus, pour inspection. */
function mockOllama(responses: readonly string[]): { prompts: string[]; calls: () => number } {
  const prompts: string[] = [];
  let i = 0;
  vi.stubGlobal('fetch', async (_url: string, init: { body: string }) => {
    const body = JSON.parse(init.body) as { messages: { role: string; content: string }[] };
    prompts.push(body.messages[1]?.content ?? '');
    const content = responses[Math.min(i, responses.length - 1)] ?? '';
    i += 1;
    return {
      ok: true,
      json: async () => ({ message: { content } }),
    } as unknown as Response;
  });
  return { prompts, calls: () => prompts.length };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('INV-SCRIBE2ADAPT-01 — les directives ne partent que si la scene les declare', () => {
  it("sans declaration, aucun bloc d'opportunite dans le prompt", async () => {
    const { prompts } = mockOllama([cleanPeriod('Une tete quelconque ici')]);
    const g = new OllamaScribeV2Generator({ candidates: 1 });
    await g.generate(req(3));
    expect(prompts[0]).not.toContain('STRUCTURE DE LA SCÈNE');
  });

  it("declaree, l'opportunite et les deux gardes partent", async () => {
    const { prompts } = mockOllama([cleanPeriod('Une tete quelconque ici')]);
    const g = new OllamaScribeV2Generator({ candidates: 1 });
    g.declareScene({ chapterIndex: 3, longTailOpportunity: true, antiTemplateGuards: true });
    await g.generate(req(3));
    expect(prompts[0]).toContain('STRUCTURE DE LA SCÈNE');
    expect(prompts[0]).toContain('OUVERTURE DE CETTE PÉRIODE');
    expect(prompts[0]).toContain('CONTENU DE CETTE PÉRIODE');
  });

  it("la declaration ne vaut que pour SON chapitre", async () => {
    const { prompts } = mockOllama([cleanPeriod('Une tete quelconque ici')]);
    const g = new OllamaScribeV2Generator({ candidates: 1 });
    g.declareScene({ chapterIndex: 3, longTailOpportunity: true, antiTemplateGuards: true });
    await g.generate(req(4));
    expect(prompts[0]).not.toContain('STRUCTURE DE LA SCÈNE');
  });
});

describe('INV-SCRIBE2ADAPT-02 — N candidats, pas un seul', () => {
  it('appelle le modele N fois par tentative', async () => {
    const m = mockOllama([cleanPeriod('Tete propre et neuve')]);
    const g = new OllamaScribeV2Generator({ candidates: 5 });
    await g.generate(req(1));
    expect(m.calls()).toBe(5);
  });

  it('un candidat vetote est ecarte au profit du suivant', async () => {
    mockOllama([
      `${cleanPeriod('Tete polluee ici')} Il partit during la nuit.`,
      cleanPeriod('Tete parfaitement propre ici'),
    ]);
    const g = new OllamaScribeV2Generator({ candidates: 2 });
    await g.generate(req(1));
    const log = g.admissionLogs()[0];
    expect(log?.vetoed[0]?.vetos[0]?.code).toBe('LANG_RESIDUAL');
    // La tete fait 4 TOKENS : une fixture de 3 mots absorberait le mot suivant.
    expect(log?.chosenHead).toBe('tete parfaitement propre ici');
  });
});

describe('INV-SCRIBE2ADAPT-03 — le registre vit a l echelle du LIVRE', () => {
  it('une tete servie au chapitre 1 est refusee au chapitre 2', async () => {
    mockOllama([cleanPeriod('Le vent tomba doucement')]);
    const g = new OllamaScribeV2Generator({ candidates: 1, maxAttempts: 1 });
    await g.generate(req(1));
    await g.generate(req(2));
    const logs = g.admissionLogs();
    expect(logs[0]?.chosenHead).toBe('le vent tomba doucement');
    expect(logs[1]?.repelledHeads).toBe(1);
    expect(logs[1]?.exhausted).toBe(true); // un seul candidat, deja servi
    expect(g.registry.size).toBe(1);
  });

  it('un registre externe peut etre partage entre generateurs', async () => {
    const shared = new PeriodHeadRegistry();
    shared.record('tete deja vue ailleurs');
    mockOllama([cleanPeriod('Tete deja vue ailleurs')]);
    const g = new OllamaScribeV2Generator({ candidates: 1, maxAttempts: 1, registry: shared });
    await g.generate(req(1));
    expect(g.admissionLogs()[0]?.repelledHeads).toBe(1);
  });
});

describe('INV-SCRIBE2ADAPT-04 — sortie conforme a ChapterGenerator', () => {
  it('rend prose, words, model et ms', async () => {
    // La fixture DOIT contenir une apostrophe droite, sinon le scellement n'a
    // rien a convertir et le test ne prouverait rien.
    mockOllama([`${cleanPeriod('Une tete tout propre')} L'homme n'a rien dit.`]);
    const g = new OllamaScribeV2Generator({ candidates: 1, model: 'gemma4:31b' });
    const r = await g.generate(req(1));
    expect(r.model).toBe('gemma4:31b');
    expect(r.words).toBeGreaterThan(50);
    expect(r.ms).toBeGreaterThanOrEqual(0);
    expect(r.prose).toContain('’'); // typographie scellee
  });

  it('le journal accumule un enregistrement par chapitre', async () => {
    mockOllama([cleanPeriod('Alpha beta gamma delta'), cleanPeriod('Epsilon zeta eta theta')]);
    const g = new OllamaScribeV2Generator({ candidates: 2 });
    await g.generate(req(1));
    await g.generate(req(2));
    expect(g.admissionLogs()).toHaveLength(2);
  });
});
