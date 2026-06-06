/**
 * OMEGA Book-Factory — P1.D end-to-end dry-run (hors-LLM)
 *
 * The whole CALC backbone on a real 30-chapter plan with synthetic deltas. Proves the book loop
 * holds: every chapter passes the gate, the ch.2 clue pays off near the climax, a 3-carrier rumor
 * never contaminates the truth across the book, an injected contradiction is caught, and the run
 * is deterministic.
 */

import { describe, it, expect } from 'vitest';
import { planBook, type BookIntent } from '../src/book-planner.js';
import { runDryRun } from '../src/dry-run.js';

const intent: BookIntent = {
  title: 'Le Silence du Phare',
  premise: 'Le gardien du phare est retrouvé mort.',
  genre: 'thriller',
  core_question: 'Qui a éteint le phare ?',
  protagonist: { id: 'lena', name: 'Léna', role: 'enquêtrice' },
  cast: [{ id: 'erwan', name: 'Erwan', role: 'témoin' }],
  setting: 'Bretagne',
  tone: 'âpre',
  target_word_count: 60000,
  target_chapters: 30,
  pov: 'third_limited',
  tense: 'past',
  seeds: [
    { seed_id: 'lettre', desc: 'lettre cachée' },
    { seed_id: 'dette', desc: 'une dette' },
    { seed_id: 'naufrage', desc: 'un naufrage ancien' },
    { seed_id: 'identite', desc: 'identité cachée' },
  ],
};

describe('P1.D — end-to-end dry-run (30 chapters, hors-LLM)', () => {
  it('every chapter PASSES the inter-chapter gate (the book plan is internally coherent)', () => {
    const res = runDryRun(planBook(intent));
    expect(res.chapters).toBe(30);
    expect(res.allPassed).toBe(true);
  });

  it('PAYOFF — the clue planted in ch.2 actually BLOOMS near the climax', () => {
    const res = runDryRun(planBook(intent));
    expect(res.firstSeedId).toBe('lettre');
    expect(res.firstSeedBloomed).toBe(true);
    expect(res.centralSeedBloomed).toBe(true);
    // no payoff is left OVERDUE in the final Bible:
    expect(res.finalState.payoff_graph.every((p) => p.status === 'bloomed')).toBe(true);
  });

  it('ANTI-CONTAMINATION — a rumor carried by 3 characters never becomes the truth across the book', () => {
    const res = runDryRun(planBook(intent));
    expect(res.rumorCarriers).toBe(3);
    expect(res.truthCoupable).toBe('garcia'); // not 'le_maire', despite 3 carriers
  });

  it('GUARD — an injected contradiction on the assembled book is caught', () => {
    const res = runDryRun(planBook(intent));
    expect(res.injectedFaultVerdict.verdict).toBe('RETRY');
  });

  it('DETERMINISM — the whole run is reproducible (stable final state_hash)', () => {
    const plan = planBook(intent);
    expect(runDryRun(plan).finalState.state_hash).toBe(runDryRun(plan).finalState.state_hash);
    expect(runDryRun(plan).finalState.state_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
