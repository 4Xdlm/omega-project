/**
 * OMEGA Book-Factory — P1.A story-state (Bible as projection) tests
 *
 * Proves: (a) the Bible is reconstructed purely from the event log; (b) replay is deterministic
 * (same events → same state_hash); (c) "dead stays dead"; (d) the cross-chapter payoff_graph
 * marks OVERDUE; (e) bloom resolves a seed; (f) threads open/close. 100% deterministic, hors-LLM.
 */

import { describe, it, expect } from 'vitest';
import { projectStoryState, StoryStateLog, type NarrativeEvent } from '../src/story-state.js';
import { BookCanonAdapter } from '../src/book-canon-adapter.js';

const script: NarrativeEvent[] = [
  { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: 'paul', name: 'Paul' },
  { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: 'irina', name: 'Irina' },
  { kind: 'CHARACTER_MOVE', chapter: 1, id: 'paul', location: 'manoir' },
  { kind: 'PLACE_STATE', chapter: 1, id: 'manoir', name: 'Le Manoir', state: 'intact' },
  { kind: 'THREAD_OPEN', chapter: 1, id: 'who-killed', question: 'Qui a tué le notaire ?' },
  { kind: 'SEED_PLANT', chapter: 2, seed_id: 'lettre', desc: 'lettre cachée', bloom_target_chapter: 25 },
  { kind: 'RELATIONSHIP', chapter: 3, from: 'paul', to: 'irina', type: 'méfiance', valence: -0.4 },
  { kind: 'PLACE_STATE', chapter: 5, id: 'manoir', name: 'Le Manoir', state: 'incendié' },
  { kind: 'CHARACTER_STATUS', chapter: 6, id: 'irina', status: 'dead' },
  { kind: 'TIMELINE', chapter: 6, event: "Mort d'Irina" },
];

describe('P1.A — story-state (Bible = pure projection of the event log)', () => {
  it('reconstructs the Bible purely from the event log', () => {
    const s = projectStoryState(script);
    expect(s.chapters_done).toBe(6);
    const paul = s.characters.find((c) => c.id === 'paul');
    expect(paul?.location).toBe('manoir');
    expect(paul?.relationships).toContainEqual({ to: 'irina', type: 'méfiance', valence: -0.4 });
    expect(s.places.find((p) => p.id === 'manoir')?.state).toBe('incendié'); // world change ch5
    expect(s.threads.find((t) => t.id === 'who-killed')?.status).toBe('open');
    expect(s.timeline).toHaveLength(1);
  });

  it('replay is DETERMINISTIC — same events → same state_hash', () => {
    const h1 = projectStoryState(script).state_hash;
    const h2 = projectStoryState([...script]).state_hash;
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
  });

  it('crash-safe — snapshot then replay yields the identical state_hash', () => {
    const log = new StoryStateLog();
    log.appendAll(script);
    const snap = log.snapshot();
    const replayed = projectStoryState(snap.events);
    expect(replayed.state_hash).toBe(snap.state_hash);
  });

  it('"dead stays dead" — a revive-after-death is ignored and flagged', () => {
    const s = projectStoryState([
      ...script,
      { kind: 'CHARACTER_STATUS', chapter: 8, id: 'irina', status: 'alive' }, // illegal revive
    ]);
    expect(s.characters.find((c) => c.id === 'irina')?.status).toBe('dead');
    expect(s.violations.some((v) => v.kind === 'REVIVE_AFTER_DEATH')).toBe(true);
  });

  it('payoff_graph — a seed planted ch.2 with target ch.25, still unbloomed at ch.6, is OVERDUE only once its target passes', () => {
    const atCh6 = projectStoryState(script);
    expect(atCh6.payoff_graph.find((p) => p.seed_id === 'lettre')?.status).toBe('planted'); // target 25 not passed
    const later = projectStoryState([...script, { kind: 'TIMELINE', chapter: 26, event: 'fin' }]);
    expect(later.payoff_graph.find((p) => p.seed_id === 'lettre')?.status).toBe('OVERDUE'); // ch26 > 25, never bloomed
  });

  it('payoff_graph — blooming the seed at its target chapter resolves it (no OVERDUE)', () => {
    const s = projectStoryState([...script, { kind: 'SEED_BLOOM', chapter: 25, seed_id: 'lettre' }, { kind: 'TIMELINE', chapter: 26, event: 'fin' }]);
    expect(s.payoff_graph.find((p) => p.seed_id === 'lettre')?.status).toBe('bloomed');
  });

  it('threads — open then close becomes resolved with the closing chapter', () => {
    const s = projectStoryState([...script, { kind: 'THREAD_CLOSE', chapter: 30, id: 'who-killed' }]);
    const t = s.threads.find((x) => x.id === 'who-killed');
    expect(t?.status).toBe('resolved');
    expect(t?.resolved_chapter).toBe(30);
  });

  it('bridge — character knowledge is delegated to the proven epistemic adapter (no duplication)', () => {
    const adapter = new BookCanonAdapter();
    adapter.recordTruth('killer', 'identity', 'garcia');
    adapter.recordBelief('paul', 'killer', 'identity', 'irina'); // wrong guess
    const log = new StoryStateLog();
    expect(log.characterKnows(adapter, 'paul', 'killer', 'identity')).toBe(false);
    adapter.recordRevelation('paul', 'killer', 'identity', 'garcia', [{ type: 'human', path: 'aveu', description: 'aveu signé' }]);
    expect(log.characterKnows(adapter, 'paul', 'killer', 'identity')).toBe(true);
  });
});
