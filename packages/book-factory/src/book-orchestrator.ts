/**
 * OMEGA Book-Factory — P2 — book-orchestrator
 *
 * The book loop: for each chapter, build the plan-driven structural delta → check continuity →
 * on PASS, build a bounded context digest, map ChapterSpec→Intent, call the generator for the
 * PROSE, append the (planned) structural events, and accumulate the manuscript.
 *
 * STRUCTURE is plan-driven (deterministic, reliable); PROSE comes from the generator (LLM or stub).
 * Crash-safe by construction (the StoryState is a replayable projection of the appended events).
 */

import { type BookPlan, type BookIntent } from './book-planner.js';
import { StoryStateLog, type NarrativeEvent, type StoryState } from './story-state.js';
import { checkContinuity, type ChapterDelta, type OracleVerdict } from './continuity-oracle.js';
import { chapterSpecToIntent } from './chapter-spec-to-intent.js';
import { buildContextDigest } from './context-manager.js';
import { type ChapterGenerator } from './chapter-generator.js';

export interface GeneratedChapter {
  readonly index: number;
  readonly verdict: OracleVerdict;
  readonly words: number;
  readonly model: string;
  readonly ms: number;
  readonly prose: string;
}

export interface BookResult {
  readonly chapters_generated: number;
  readonly allPassed: boolean;
  readonly chapters: readonly GeneratedChapter[];
  readonly finalState: StoryState;
  readonly manuscript: string;
}

export interface OrchestratorOptions {
  readonly maxChapters?: number;
  /** Called after each chapter (for incremental persistence / progress monitoring). */
  readonly onChapter?: (chapter: GeneratedChapter) => void;
}

function plannedDelta(plan: BookPlan, book: BookIntent, prota: string, c: number): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];
  if (c === 1) events.push({ kind: 'CHARACTER_INTRODUCE', chapter: 1, id: prota, name: book.protagonist.name });
  events.push({ kind: 'CHARACTER_MOVE', chapter: c, id: prota, location: `scène_${c}` });
  for (const e of plan.seed_schedule) {
    if (e.planted_chapter === c) events.push({ kind: 'SEED_PLANT', chapter: c, seed_id: e.seed_id, desc: e.desc, bloom_target_chapter: e.bloom_target_chapter });
    if (e.reinforced_chapter === c) events.push({ kind: 'SEED_REINFORCE', chapter: c, seed_id: e.seed_id });
    if (e.bloom_target_chapter === c) events.push({ kind: 'SEED_BLOOM', chapter: c, seed_id: e.seed_id });
  }
  return events;
}

export async function generateBook(
  plan: BookPlan,
  book: BookIntent,
  generator: ChapterGenerator,
  opts: OrchestratorOptions = {},
): Promise<BookResult> {
  const log = new StoryStateLog();
  const prota = plan.chapters[0]?.pov_character ?? 'protagoniste';
  const limit = opts.maxChapters ?? plan.chapters.length;
  const out: GeneratedChapter[] = [];
  let previousTail: string | undefined;

  for (const spec of plan.chapters) {
    if (spec.index > limit) break;
    const events = plannedDelta(plan, book, prota, spec.index);
    const current = log.project();
    const delta: ChapterDelta = { chapter: spec.index, events };
    const verdict = checkContinuity(current, delta, spec);

    let prose = '';
    let words = 0;
    let model = '';
    let ms = 0;
    if (verdict.verdict === 'PASS') {
      const digest = buildContextDigest(current, spec, plan, book);
      const intent = chapterSpecToIntent(spec, book);
      const gen = await generator.generate(previousTail !== undefined ? { intent, digest, spec, previousTail } : { intent, digest, spec });
      prose = gen.prose;
      words = gen.words;
      model = gen.model;
      ms = gen.ms;
      log.appendAll(events);
      previousTail = prose.slice(-180);
    }
    const chapter: GeneratedChapter = { index: spec.index, verdict, words, model, ms, prose };
    out.push(chapter);
    if (opts.onChapter !== undefined) opts.onChapter(chapter);
  }

  const passed = out.filter((c) => c.verdict.verdict === 'PASS');
  const manuscript = passed.map((c) => `\n\n## Chapitre ${c.index}\n\n${c.prose}`).join('').trim();
  return {
    chapters_generated: passed.length,
    allPassed: out.length > 0 && out.every((c) => c.verdict.verdict === 'PASS'),
    chapters: out,
    finalState: log.project(),
    manuscript,
  };
}
