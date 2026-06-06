/**
 * OMEGA Book-Factory — book-planner demo (P1.B)
 * Builds a sample 30-chapter thriller plan and prints its mathematical skeleton.
 * Run: tsc -p tsconfig.build.json && node dist/book-planner-demo.js
 */

import { planBook, renderSkeleton, type BookIntent } from './book-planner.js';

const intent: BookIntent = {
  title: 'Le Silence du Phare',
  premise: 'Dans un village breton isolé, le gardien du phare est retrouvé mort au pied de sa tour.',
  genre: 'thriller',
  core_question: 'Qui a éteint le phare la nuit du naufrage ?',
  protagonist: { id: 'lena', name: 'Léna Marchetti', role: 'enquêtrice' },
  cast: [
    { id: 'yann', name: 'Yann', role: 'victime' },
    { id: 'maire', name: 'le maire', role: 'suspect' },
    { id: 'erwan', name: 'Erwan', role: 'témoin' },
  ],
  setting: 'village côtier breton, hiver',
  tone: 'âpre, tendu',
  target_word_count: 60000,
  target_chapters: 30,
  pov: 'third_limited',
  tense: 'past',
  seeds: [
    { seed_id: 'lettre', desc: 'une lettre cachée dans le phare' },
    { seed_id: 'dette', desc: 'le maire avait une dette envers le gardien' },
    { seed_id: 'naufrage', desc: 'un naufrage ancien jamais élucidé' },
    { seed_id: 'identite', desc: "la veritable identite d'Erwan" },
  ],
};

const plan = planBook(intent);
// eslint-disable-next-line no-console
console.log(renderSkeleton(plan));
