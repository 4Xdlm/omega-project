/**
 * OMEGA Book-Factory — P1.C continuity-oracle tests
 *
 * A clean chapter PASSes; every injected fault is caught (RETRY): chrono regression, a dead
 * character acting, an information leak (revealing without knowing), a bloom without a planted
 * seed, and an overdue payoff. 100% deterministic, hors-LLM.
 */

import { describe, it, expect } from 'vitest';
import { projectStoryState, type NarrativeEvent } from '../src/story-state.js';
import { checkContinuity, type ChapterDelta } from '../src/continuity-oracle.js';
import { BookCanonAdapter } from '../src/book-canon-adapter.js';

const baseScript: NarrativeEvent[] = [
  { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: 'paul', name: 'Paul' },
  { kind: 'CHARACTER_INTRODUCE', chapter: 1, id: 'irina', name: 'Irina' },
  { kind: 'SEED_PLANT', chapter: 2, seed_id: 'lettre', desc: 'lettre', bloom_target_chapter: 10 },
  { kind: 'CHARACTER_STATUS', chapter: 6, id: 'irina', status: 'dead' },
];

describe('P1.C — continuity-oracle (inter-chapter gate)', () => {
  it('PASS — a clean, advancing chapter', () => {
    const current = projectStoryState(baseScript);
    const delta: ChapterDelta = { chapter: 7, events: [{ kind: 'CHARACTER_MOVE', chapter: 7, id: 'paul', location: 'port' }] };
    const v = checkContinuity(current, delta);
    expect(v.verdict).toBe('PASS');
    expect(v.reasons).toHaveLength(0);
  });

  it('RETRY CHRONO — a chapter that does not advance time', () => {
    const current = projectStoryState(baseScript); // chapters_done = 6
    const delta: ChapterDelta = { chapter: 6, events: [{ kind: 'TIMELINE', chapter: 6, event: 'x' }] };
    const v = checkContinuity(current, delta);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('CHRONO'))).toBe(true);
  });

  it('RETRY DEAD_ACTS — a dead character acts', () => {
    const current = projectStoryState(baseScript); // Irina dead at ch6
    const delta: ChapterDelta = { chapter: 7, events: [{ kind: 'CHARACTER_MOVE', chapter: 7, id: 'irina', location: 'cave' }] };
    const v = checkContinuity(current, delta);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('DEAD_ACTS'))).toBe(true);
  });

  it('RETRY REVIVE — a dead character is revived', () => {
    const current = projectStoryState(baseScript);
    const delta: ChapterDelta = { chapter: 7, events: [{ kind: 'CHARACTER_STATUS', chapter: 7, id: 'irina', status: 'alive' }] };
    const v = checkContinuity(current, delta);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('REVIVE'))).toBe(true);
  });

  it('RETRY LEAK — a character reveals a claim they do not know', () => {
    const current = projectStoryState(baseScript);
    const adapter = new BookCanonAdapter();
    adapter.recordTruth('killer', 'identity', 'garcia');
    adapter.recordBelief('paul', 'killer', 'identity', 'irina'); // Paul does NOT know the truth
    const delta: ChapterDelta = {
      chapter: 7, events: [],
      reveals: [{ character: 'paul', subject: 'killer', predicate: 'identity' }],
    };
    const v = checkContinuity(current, delta, undefined, adapter);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('LEAK'))).toBe(true);
  });

  it('PASS LEAK — a character reveals a claim they DO know (justified)', () => {
    const current = projectStoryState(baseScript);
    const adapter = new BookCanonAdapter();
    adapter.recordTruth('killer', 'identity', 'garcia');
    adapter.recordRevelation('paul', 'killer', 'identity', 'garcia', [{ type: 'human', path: 'aveu', description: 'aveu' }]);
    const delta: ChapterDelta = {
      chapter: 7, events: [],
      reveals: [{ character: 'paul', subject: 'killer', predicate: 'identity' }],
    };
    expect(checkContinuity(current, delta, undefined, adapter).verdict).toBe('PASS');
  });

  it('RETRY REQUIREMENT — a bloom of a seed that was never planted', () => {
    const current = projectStoryState(baseScript); // only "lettre" is planted
    const spec = { index: 7, act: 2, objective: '', tension_target: 0.5, target_word_count: 2000, pov_character: 'paul',
      seeds_to_plant: [], seeds_to_reinforce: [], seeds_to_bloom: ['fantome'],
      threads_to_open: [], threads_to_advance: [], threads_to_close: [], entering_state_requirements: [] };
    const delta: ChapterDelta = { chapter: 7, events: [{ kind: 'SEED_BLOOM', chapter: 7, seed_id: 'fantome' }] };
    const v = checkContinuity(current, delta, spec);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('REQUIREMENT'))).toBe(true);
  });

  it('RETRY OVERDUE — a planted seed whose bloom target has passed without blooming', () => {
    const current = projectStoryState(baseScript); // "lettre" target ch10, not bloomed
    const delta: ChapterDelta = { chapter: 12, events: [{ kind: 'TIMELINE', chapter: 12, event: 'late' }] };
    const v = checkContinuity(current, delta);
    expect(v.verdict).toBe('RETRY');
    expect(v.reasons.some((r) => r.startsWith('OVERDUE'))).toBe(true);
  });
});
