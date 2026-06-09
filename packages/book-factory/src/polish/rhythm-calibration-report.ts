/**
 * OMEGA — PE-4 : rapport de calibration rythme. Mesure l'écart W₁ (par chapitre,
 * moyenné) des livres OMEGA au profil CALIBRÉ maîtres FR. Plus bas = plus proche
 * du swing des maîtres. Quantifie la marge de progression rythmique.
 */

import { readFileSync, writeFileSync } from 'node:fs';

import { importManuscript } from '../doctor/manuscript-import.js';
import { CALIBRATED_RHYTHM_DECILES, PROVISIONAL_RHYTHM_DECILES, sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const BOOKS = [
  { id: 'V3_gemma4', path: 'runs/duel_gemma/MANUSCRIT.md' },
  { id: 'V3_mistral', path: 'runs/duel_mistral/MANUSCRIT.md' },
  { id: 'V2_b438250e', path: 'runs/next_book_v2/MANUSCRIT_CANONICAL.md' },
  { id: '88k', path: 'runs/c8_book60k/MANUSCRIT_V1_FINAL.md' },
];

function meanW1(text: string, profile: readonly number[]): number {
  const imp = importManuscript(text);
  if (!imp.ok) return -1;
  const ws = imp.value.chapters.map((c) => wassersteinToProfile(sentenceLengths(c.prose), profile)).filter((x) => Number.isFinite(x));
  return Number((ws.reduce((a, b) => a + b, 0) / Math.max(1, ws.length)).toFixed(2));
}

function main(): void {
  const rows = BOOKS.map((b) => {
    try {
      const text = readFileSync(b.path, 'utf8');
      return { book: b.id, w1_vs_masters: meanW1(text, CALIBRATED_RHYTHM_DECILES), w1_vs_provisional: meanW1(text, PROVISIONAL_RHYTHM_DECILES) };
    } catch { return { book: b.id, w1_vs_masters: -1, w1_vs_provisional: -1 }; }
  });
  const out = {
    phase: 'PE-4 RHYTHM_CALIBRATION', date: '2026-06-08',
    masters: '9 maîtres FR (Camus, Yourcenar, Gracq, Giono, Maupassant, Balzac, Duras), 24114 phrases',
    calibratedDeciles: CALIBRATED_RHYTHM_DECILES, mastersStats: { median: 14, mean: 18.2, p90: 37 },
    booksW1: rows,
    reading: 'w1_vs_masters bas = rythme proche des maîtres. Les livres OMEGA, plus courts/plats, ont un w1 > 0 — la marge à combler. Profil CÂBLÉ en défaut (advisory→soft au prochain run).',
  };
  writeFileSync('runs/RHYTHM_CALIBRATION.json', JSON.stringify(out, null, 2), 'utf8');
  console.log(JSON.stringify({ calibrated: CALIBRATED_RHYTHM_DECILES, booksW1: rows }, null, 1));
}
main();
