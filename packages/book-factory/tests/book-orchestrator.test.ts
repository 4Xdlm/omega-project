/**
 * OMEGA Book-Factory — P2 book-orchestrator tests (hors-LLM, deterministic generator)
 *
 * Proves the book loop wires together: plan → continuity gate → ChapterSpec→Intent → context digest
 * → generator (prose) → story-state. Uses the DeterministicChapterGenerator so it is reproducible
 * and free. The real LLM path (OllamaChapterGenerator) is exercised separately by the demo script.
 */

import { describe, it, expect } from 'vitest';
import { planBook, type BookIntent } from '../src/book-planner.js';
import { generateBook } from '../src/book-orchestrator.js';
import { DeterministicChapterGenerator } from '../src/chapter-generator.js';
import { chapterSpecToIntent, tensionToEmotion } from '../src/chapter-spec-to-intent.js';

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

describe('P2 — book-orchestrator (loop with deterministic generator)', () => {
  it('ChapterSpec→Intent bridge maps the chapter into a genesis-planner Intent', () => {
    const plan = planBook(intent);
    const spec0 = plan.chapters[0]!;
    const ci = chapterSpecToIntent(spec0, intent);
    expect(ci.title).toContain('Chapitre 1');
    expect(ci.target_word_count).toBe(spec0.target_word_count);
    expect(ci.message).toBe(intent.core_question);
    expect(tensionToEmotion(1.0, 'thriller')).toBe('peur');
    expect(tensionToEmotion(0.1, 'thriller')).toBe('inquiétude sourde');
  });

  it('generates the first 6 chapters, all passing the gate, each with prose', async () => {
    const plan = planBook(intent);
    const res = await generateBook(plan, intent, new DeterministicChapterGenerator(), { maxChapters: 6 });
    expect(res.chapters_generated).toBe(6);
    expect(res.allPassed).toBe(true);
    expect(res.chapters.every((c) => c.prose.length > 0 && c.words > 0)).toBe(true);
    expect(res.manuscript).toContain('## Chapitre 1');
  });

  it('runs the full 30-chapter loop with every chapter passing the gate', async () => {
    const plan = planBook(intent);
    const res = await generateBook(plan, intent, new DeterministicChapterGenerator());
    expect(res.chapters_generated).toBe(30);
    expect(res.allPassed).toBe(true);
    // the cross-chapter payoff still holds at the orchestration level:
    expect(res.finalState.payoff_graph.every((p) => p.status === 'bloomed')).toBe(true);
  });

  it('is deterministic with the deterministic generator (stable final state_hash)', async () => {
    const plan = planBook(intent);
    const a = await generateBook(plan, intent, new DeterministicChapterGenerator(), { maxChapters: 10 });
    const b = await generateBook(plan, intent, new DeterministicChapterGenerator(), { maxChapters: 10 });
    expect(a.finalState.state_hash).toBe(b.finalState.state_hash);
  });
});
