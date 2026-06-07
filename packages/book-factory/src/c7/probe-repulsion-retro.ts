/**
 * OMEGA — C18 RÉTRO-PREUVE : rejoue les 3 livres scellés dans le
 * MOTIF_REPULSION_FIELD, chapitre par chapitre (évaluer PUIS observer —
 * exactement la position runtime). Compte ce que la gate aurait bloqué.
 *
 * Note de mesure : le verdict EMP-16 compte les CHAPITRES appartenant aux
 * groupes clonés (tête ×k≥3 ⇒ k chapitres) ; la sonde compte les ÉVÉNEMENTS
 * 3ᵉ+ occurrence (⇒ k−2 par groupe). Les deux sont rapportés — pas de
 * confusion d'unités.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';
import { MotifRepulsionField, normalizedHead } from '../variation/motif-repulsion.js';

const BOOKS = [
  { id: '18k_silence', path: 'runs/c7_book/MANUSCRIT.md' },
  { id: '88k_c8', path: 'runs/c8_book60k/MANUSCRIT_V1_FINAL.md' },
  { id: 'emp16', path: 'runs/next_book_emp16/MANUSCRIT_CANONICAL.md' },
] as const;

interface Replay {
  readonly book: string;
  readonly chapters: number;
  readonly cloneEventsBlocked: number;
  readonly weatherEventsBlocked: number;
  readonly repeat2ndWarned: number;
  readonly cloneEventsBlockedLettersOnly: number;
}

function replay(path: string, id: string): Replay {
  const imp = importManuscript(readFileSync(path, 'utf8'));
  if (!imp.ok) throw new Error(`import ${id}`);
  const runOne = (lettersOnly: boolean): { clones: number; weather: number; repeats: number } => {
    const field = new MotifRepulsionField();
    let clones = 0; let weather = 0; let repeats = 0;
    for (const ch of imp.value.chapters) {
      const head = normalizedHead(ch.prose, lettersOnly);
      const v = field.evaluateIncipit(head, ch.chapter);
      if (v.verdict === 'CLONE_3RD_FORBIDDEN') clones += 1;
      else if (v.verdict === 'WEATHER_SATURATED') weather += 1;
      else if (v.verdict === 'REPEAT_2ND') repeats += 1;
      // Rétro-replay : le livre étant figé, on observe la tête RÉELLE admise.
      const o = field.observe({ kind: 'INCIPIT_HEAD', motif: head, chapter: ch.chapter });
      if (!o.ok) throw new Error(`observe ${id} ch${ch.chapter}`);
    }
    return { clones, weather, repeats };
  };
  const raw = runOne(false);
  const lo = runOne(true);
  return {
    book: id, chapters: imp.value.chapters.length,
    cloneEventsBlocked: raw.clones, weatherEventsBlocked: raw.weather,
    repeat2ndWarned: raw.repeats, cloneEventsBlockedLettersOnly: lo.clones,
  };
}

const results = BOOKS.map((b) => replay(b.path, b.id));
writeFileSync('runs/next_book_emp16/C18_RETRO_PROOF.json', JSON.stringify({ date: '2026-06-08', results }, null, 2), 'utf8');
console.log(JSON.stringify(results, null, 1));
