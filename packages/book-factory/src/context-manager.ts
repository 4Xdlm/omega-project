/**
 * OMEGA Book-Factory — P2 — context-manager
 *
 * Builds the BOUNDED context digest (≤ ~600 words) the generator receives for a chapter, so the
 * LLM never sees the whole book (resolves the VRAM wall). The digest is a projection of the
 * current StoryState + the ChapterSpec (relevant characters, open threads, recent events,
 * seeds to plant/bloom now). Deterministic, hors-LLM.
 */

import type { StoryState } from './story-state.js';
import type { ChapterSpec, BookIntent, BookPlan } from './book-planner.js';

const MAX_WORDS = 600;

export function buildContextDigest(state: StoryState, spec: ChapterSpec, plan: BookPlan, book: BookIntent): string {
  const descOf = (id: string): string => plan.seed_schedule.find((e) => e.seed_id === id)?.desc ?? id;

  const alive = state.characters.filter((c) => c.status !== 'dead').map((c) => (c.location !== undefined ? `${c.name} (à ${c.location})` : c.name));
  const dead = state.characters.filter((c) => c.status === 'dead').map((c) => c.name);
  const openThreads = state.threads.filter((t) => t.status === 'open').map((t) => t.question);
  const recent = state.timeline.slice(-5).map((e) => e.event);
  const plantNow = spec.seeds_to_plant.map(descOf);
  const bloomNow = spec.seeds_to_bloom.map(descOf);

  const parts: string[] = [
    `Roman : « ${book.title} » (${book.genre}, ton ${book.tone}). Question centrale : ${book.core_question}.`,
    `Chapitre ${spec.index}/${plan.chapters.length}, acte ${spec.act}. Objectif : ${spec.objective}`,
    alive.length > 0 ? `Personnages présents (vivants) : ${alive.join(', ')}.` : '',
    dead.length > 0 ? `Morts (NE PEUVENT PLUS AGIR) : ${dead.join(', ')}.` : '',
    openThreads.length > 0 ? `Fils d'intrigue ouverts : ${openThreads.join(' ; ')}.` : '',
    recent.length > 0 ? `Événements récents : ${recent.join(' ; ')}.` : '',
    plantNow.length > 0 ? `À INSTILLER discrètement ce chapitre (sans le souligner) : ${plantNow.join(' ; ')}.` : '',
    bloomNow.length > 0 ? `À FAIRE ÉCLATER ce chapitre (la révélation arrive maintenant) : ${bloomNow.join(' ; ')}.` : '',
  ];
  const digest = parts.filter((p) => p.length > 0).join('\n');

  const words = digest.split(/\s+/);
  return words.length > MAX_WORDS ? words.slice(0, MAX_WORDS).join(' ') : digest;
}
