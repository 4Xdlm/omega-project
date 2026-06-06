/**
 * OMEGA Book-Factory — P2.D — REAL LLM generation (Ollama / gemma4:31b)
 * Full chain: plan → continuity gate → ChapterSpec→Intent → context digest → Ollama prose → Bible.
 * Writes the manuscript INCREMENTALLY (one chapter at a time) for live monitoring.
 *
 * Env: MAX_CH (default 2), OLLAMA_MODEL (default gemma4:31b), OUT_FILE (default sample path).
 * Run: tsc -p tsconfig.build.json && node dist/generate-real-demo.js
 */

import { writeFileSync, appendFileSync } from 'node:fs';
import { planBook, type BookIntent } from './book-planner.js';
import { generateBook } from './book-orchestrator.js';
import { OllamaChapterGenerator } from './chapter-generator.js';

const intent: BookIntent = {
  title: 'Le Silence du Phare',
  premise: 'Dans un village breton isolé, le gardien du phare est retrouvé mort au pied de sa tour.',
  genre: 'thriller',
  core_question: 'Qui a éteint le phare la nuit du naufrage ?',
  protagonist: { id: 'lena', name: 'Léna Marchetti', role: 'enquêtrice' },
  cast: [{ id: 'erwan', name: 'Erwan', role: 'témoin' }, { id: 'maire', name: 'le maire', role: 'suspect' }],
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

const MAX = Number(process.env.MAX_CH ?? '2');
const OUT = process.env.OUT_FILE ?? '../../docs/architecture/book-factory/SAMPLE_GENERATED_CHAPTERS.md';

async function main(): Promise<void> {
  const plan = planBook(intent);
  const gen = new OllamaChapterGenerator({ model: process.env.OLLAMA_MODEL ?? 'gemma4:31b', maxTokens: 900, timeoutMs: 280000 });

  writeFileSync(OUT, `# « ${intent.title} » — génération P2 (Ollama, ${gen ? 'gemma4:31b' : ''})\n\n- plan_hash: ${plan.plan_hash.slice(0, 16)}\n- cible: ${MAX} chapitre(s)\n- statut: EN COURS…\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`Generating ${MAX} chapter(s) of « ${intent.title} » via Ollama…`);

  const res = await generateBook(plan, intent, gen, {
    maxChapters: MAX,
    onChapter: (c) => {
      if (c.verdict.verdict === 'PASS') appendFileSync(OUT, `\n\n## Chapitre ${c.index}\n\n${c.prose}\n`, 'utf8');
      // eslint-disable-next-line no-console
      console.log(`  ch${c.index}: ${c.words} mots, ${(c.ms / 1000).toFixed(1)}s, gate=${c.verdict.verdict}`);
    },
  });

  appendFileSync(OUT, `\n\n---\n_TERMINÉ : ${res.chapters_generated}/${MAX} chapitres, tous gate PASS=${res.allPassed}, final state_hash=${res.finalState.state_hash.slice(0, 16)}_\n`, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`DONE: ${res.chapters_generated}/${MAX} chapters, allPassed=${res.allPassed}`);
}

main().catch((e) => { console.error('GEN_ERROR:', e instanceof Error ? e.message : String(e)); process.exit(1); });
