/**
 * OMEGA Book-Factory — P1.B book-planner tests
 *
 * Proves the macro planner is deterministic and structurally sound:
 * (a) plan_hash stable; (b) words sum to the exact target; (c) every seed planted is harvested
 * (no orphan); (d) pacing rises to a single climax (global max) then falls; (e) the central seed
 * blooms AT the climax; (f) chapter count = target. 100% deterministic, hors-LLM.
 */

import { describe, it, expect } from 'vitest';
import { planBook, type BookIntent } from '../src/book-planner.js';

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

describe('P1.B — book-planner (deterministic macro plan)', () => {
  it('is DETERMINISTIC — same intent → same plan_hash', () => {
    expect(planBook(intent).plan_hash).toBe(planBook(intent).plan_hash);
    expect(planBook(intent).plan_hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces exactly the target number of chapters', () => {
    expect(planBook(intent).chapters).toHaveLength(30);
  });

  it('word budget sums to the EXACT target', () => {
    const plan = planBook(intent);
    const sum = plan.chapters.reduce((a, c) => a + c.target_word_count, 0);
    expect(sum).toBe(60000);
    expect(plan.total_target_words).toBe(60000);
    expect(plan.chapters.every((c) => c.target_word_count > 0)).toBe(true);
  });

  it('NO ORPHAN — every scheduled seed is both planted and bloomed in some chapter', () => {
    const plan = planBook(intent);
    expect(plan.seed_schedule.length).toBe(4);
    for (const e of plan.seed_schedule) {
      expect(plan.chapters.some((c) => c.seeds_to_plant.includes(e.seed_id))).toBe(true);
      expect(plan.chapters.some((c) => c.seeds_to_bloom.includes(e.seed_id))).toBe(true);
      expect(e.planted_chapter).toBeLessThan(e.reinforced_chapter);
      expect(e.reinforced_chapter).toBeLessThan(e.bloom_target_chapter);
    }
  });

  it('pacing RISES to a single climax (global max = 1.0) then FALLS', () => {
    const plan = planBook(intent);
    const peak = Math.max(...plan.pacing_curve);
    expect(peak).toBe(1);
    const peakIdx = plan.pacing_curve.indexOf(peak);
    expect(peakIdx + 1).toBeGreaterThanOrEqual(Math.round(0.75 * 30)); // climax is in Act III
    expect(plan.pacing_curve[0]).toBeLessThan(peak); // rises from a low start
    expect(plan.pacing_curve[plan.pacing_curve.length - 1]).toBeLessThan(peak); // falls after
  });

  it('the CENTRAL seed (last scheduled) pays off AT the climax', () => {
    const plan = planBook(intent);
    const peakIdx = plan.pacing_curve.indexOf(Math.max(...plan.pacing_curve));
    const central = plan.seed_schedule[plan.seed_schedule.length - 1];
    expect(central?.bloom_target_chapter).toBe(peakIdx + 1);
  });

  it('every chapter is well-formed (objective, single POV, act in 1..3)', () => {
    const plan = planBook(intent);
    for (const c of plan.chapters) {
      expect(c.objective.length).toBeGreaterThan(0);
      expect(c.pov_character).toBe('lena');
      expect(c.act).toBeGreaterThanOrEqual(1);
      expect(c.act).toBeLessThanOrEqual(3);
    }
  });

  it('falls back to a central mystery seed when no seeds are provided', () => {
    const bare: BookIntent = { ...intent, seeds: undefined };
    const plan = planBook(bare);
    expect(plan.seed_schedule).toHaveLength(1);
    expect(plan.seed_schedule[0]?.seed_id).toBe('central');
  });
});
