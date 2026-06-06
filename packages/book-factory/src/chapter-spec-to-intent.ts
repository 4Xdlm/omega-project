/**
 * OMEGA Book-Factory — P2.A — ChapterSpec → Intent bridge
 *
 * Maps a macro book-planner ChapterSpec into the genesis-planner `Intent` shape
 * (the chapter becomes a single "work" to plan/generate). Deterministic, hors-LLM.
 * Mirrors genesis-planner Intent: { title, premise, themes, core_emotion, target_audience,
 * message, target_word_count }.
 */

import type { ChapterSpec, BookIntent } from './book-planner.js';

export interface ChapterIntent {
  readonly title: string;
  readonly premise: string;
  readonly themes: readonly string[];
  readonly core_emotion: string;
  readonly target_audience: string;
  readonly message: string;
  readonly target_word_count: number;
}

/** Deterministic tension → core emotion mapping (genre-aware). */
export function tensionToEmotion(tension: number, genre: string): string {
  if (tension >= 0.85) return genre === 'sf' ? 'vertige' : 'peur';
  if (tension >= 0.6) return 'tension';
  if (tension >= 0.35) return 'suspicion';
  return 'inquiétude sourde';
}

export function chapterSpecToIntent(spec: ChapterSpec, book: BookIntent): ChapterIntent {
  return {
    title: `${book.title} — Chapitre ${spec.index}`,
    premise: spec.objective,
    themes: [book.genre, book.tone],
    core_emotion: tensionToEmotion(spec.tension_target, book.genre),
    target_audience: `lecteurs de ${book.genre}`,
    message: book.core_question,
    target_word_count: spec.target_word_count,
  };
}
