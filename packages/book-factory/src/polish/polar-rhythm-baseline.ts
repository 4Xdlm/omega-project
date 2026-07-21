/**
 * OMEGA — POLAR_RHYTHM_BASELINE_P0 (ordre tribunal 2/2, 2026-07-21).
 * Profil rythme GENRE-FAIR : déciles de longueur de phrase du corpus 218-polar FR
 * (Thilliez, Chattam, Musso, Kenny, Bruce, S.A.S…), MÊME sentenceLengths que PE-4.
 * Puis W₁ de COH7/V2/V3 vs POLAR *et* vs MAÎTRES, par-chapitre pour les 8 chapitres
 * staccato, + verdict genre. MESURE SEULE — aucun patch (interdits tribunal).
 *   tsx src/polish/polar-rhythm-baseline.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { importManuscript } from '../doctor/manuscript-import.js';
import { CALIBRATED_RHYTHM_DECILES, sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const PROSE = 'runs/atlas/_polar_prose_218.txt';
const MASTERS_DECILES = CALIBRATED_RHYTHM_DECILES; // [5,7,9,11,14,17,21,27,37]
const MASTERS_STATS = { median: 14, mean: 18.2, p90: 37 };
const BOOKS = [
  { id: 'COH7_303fa775', path: 'runs/atlas/MANUSCRIT_V4_COH7.md' },
  { id: 'V2_b438250e', path: 'runs/next_book_v2/MANUSCRIT_CANONICAL.md' },
  { id: 'V3_gemma4', path: 'runs/duel_gemma/MANUSCRIT.md' },
  { id: 'V3_mistral', path: 'runs/duel_mistral/MANUSCRIT.md' },
];
const STACCATO = [5, 6, 13, 18, 20, 22, 23, 24];

function q(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? 0;
}
function stats(lengths: readonly number[]): { n: number; median: number; mean: number; std: number; varco: number; p90: number; p95: number; p99: number; deciles: number[] } {
  const s = [...lengths].sort((a, b) => a - b);
  const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const std = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n));
  const deciles = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((p) => q(s, p));
  return { n, median: q(s, 0.5), mean: Number(mean.toFixed(2)), std: Number(std.toFixed(2)), varco: Number((100 * std / Math.max(1e-9, mean)).toFixed(1)), p90: q(s, 0.9), p95: q(s, 0.95), p99: q(s, 0.99), deciles };
}

// ---- 1. Baseline polar ----
const raw = readFileSync(PROSE, 'utf8');
const booksProse = raw.split('===BOOK===').map((b) => b.trim()).filter((b) => b.length > 200);
const polarLengths: number[] = [];
for (const b of booksProse) polarLengths.push(...sentenceLengths(b));
const polar = stats(polarLengths);
const POLAR_DECILES = polar.deciles; // 9 points, format identique aux maîtres

writeFileSync('runs/atlas/POLAR_RHYTHM_DECILES.json', JSON.stringify({
  phase: 'POLAR_RHYTHM_BASELINE_P0', date: '2026-07-21',
  corpus: '218 polars FR (echantillon reproductible du fonds 1952 epubs Downloads/livre)',
  books_used: booksProse.length, sentences: polar.n,
  method: 'sentenceLengths (identique PE-4) ; deciles P10..P90 longueur de phrase (mots)',
  polar: { median: polar.median, mean: polar.mean, std: polar.std, varco: polar.varco, p90: polar.p90, p95: polar.p95, p99: polar.p99, deciles: POLAR_DECILES },
  masters: { ...MASTERS_STATS, deciles: MASTERS_DECILES },
}, null, 1), 'utf8');

// ---- 2. COH7/V2/V3 vs POLAR et vs MAÎTRES ----
function measureBook(text: string): { w1_polar: number; w1_masters: number; dist: ReturnType<typeof stats>; perChapter: Array<{ ch: number; w1_polar: number; w1_masters: number; meanLen: number; sentences: number }> } | null {
  const imp = importManuscript(text);
  if (!imp.ok) return null;
  const all: number[] = [];
  const perChapter = imp.value.chapters.map((c, i) => {
    const lens = sentenceLengths(c.prose); all.push(...lens);
    return {
      ch: i + 1,
      w1_polar: Number(wassersteinToProfile(lens, POLAR_DECILES).toFixed(2)),
      w1_masters: Number(wassersteinToProfile(lens, MASTERS_DECILES).toFixed(2)),
      meanLen: Number((lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length)).toFixed(1)),
      sentences: lens.length,
    };
  });
  const fin = (k: 'w1_polar' | 'w1_masters'): number => {
    const v = perChapter.map((r) => r[k]).filter((x) => Number.isFinite(x));
    return Number((v.reduce((a, b) => a + b, 0) / Math.max(1, v.length)).toFixed(2));
  };
  return { w1_polar: fin('w1_polar'), w1_masters: fin('w1_masters'), dist: stats(all), perChapter };
}

const bookResults = BOOKS.map((b) => {
  try { const m = measureBook(readFileSync(b.path, 'utf8')); return { book: b.id, ...(m ?? { error: 'IMPORT_FAIL' }) }; }
  catch { return { book: b.id, error: 'READ_FAIL' }; }
});
const coh7 = bookResults.find((r) => r.book === 'COH7_303fa775');

// ---- 3. Verdict genre (COH7 vs polar) ----
let genreClass = 'UNKNOWN';
const notes: string[] = [];
if (coh7 && 'dist' in coh7 && coh7.dist) {
  const dMed = coh7.dist.median - polar.median;
  const dMean = Number((coh7.dist.mean - polar.mean).toFixed(2));
  const dP90 = coh7.dist.p90 - polar.p90;
  const dVarco = Number((coh7.dist.varco - polar.varco).toFixed(1));
  notes.push(`dMedian=${dMed} dMean=${dMean} dP90=${dP90} dVarco=${dVarco} w1_polar=${coh7.w1_polar} w1_masters=${coh7.w1_masters}`);
  const closerToPolar = coh7.w1_polar < coh7.w1_masters;
  if (closerToPolar && Math.abs(dMean) <= 1.5 && Math.abs(dP90) <= 4) genreClass = 'RHYTHM_GENRE_PASS';
  else if (dMean <= -1.5 && dP90 <= -4) genreClass = 'RHYTHM_GENRE_OVERDRY';
  else if (dVarco <= -8) genreClass = 'RHYTHM_GENRE_UNDER_VARIANT';
  else if (dMean < 0 || dP90 < 0) genreClass = 'RHYTHM_GENRE_STACCATO';
  else genreClass = 'RHYTHM_GENRE_PASS';
}

const chapterRisk = coh7 && 'perChapter' in coh7 && coh7.perChapter
  ? coh7.perChapter.filter((r) => STACCATO.includes(r.ch)).map((r) => ({ ...r, insidePolar: r.w1_polar < r.w1_masters }))
  : [];

writeFileSync('runs/atlas/COH7_RHYTHM_CHAPTER_RISK.json', JSON.stringify({ staccatoChapters: STACCATO, coh7DistVsPolar: notes, chapterRisk }, null, 1), 'utf8');
writeFileSync('runs/atlas/RHYTHM_GENRE_DATA.json', JSON.stringify({
  genreClass, polar: { median: polar.median, mean: polar.mean, varco: polar.varco, p90: polar.p90, p95: polar.p95, deciles: POLAR_DECILES, sentences: polar.n, books: booksProse.length },
  masters: { ...MASTERS_STATS, deciles: MASTERS_DECILES },
  books: bookResults.map((r) => ({ book: r.book, w1_polar: 'w1_polar' in r ? r.w1_polar : r.error, w1_masters: 'w1_masters' in r ? r.w1_masters : undefined, dist: 'dist' in r ? r.dist : undefined })),
  notes,
}, null, 1), 'utf8');

// ---- Console ----
console.log(`POLAR baseline: books=${booksProse.length} sentences=${polar.n}`);
console.log(`POLAR   median=${polar.median} mean=${polar.mean} varco=${polar.varco} p90=${polar.p90} p95=${polar.p95} deciles=[${POLAR_DECILES.join(',')}]`);
console.log(`MASTERS median=${MASTERS_STATS.median} mean=${MASTERS_STATS.mean} p90=${MASTERS_STATS.p90} deciles=[${MASTERS_DECILES.join(',')}]`);
console.log('--- books: W1 vs POLAR | W1 vs MASTERS | median/mean/p90/varco ---');
bookResults.forEach((r) => {
  if ('dist' in r && r.dist) console.log(`${r.book.padEnd(14)} polar=${String(r.w1_polar).padStart(5)} masters=${String(r.w1_masters).padStart(5)} | med=${r.dist.median} mean=${r.dist.mean} p90=${r.dist.p90} varco=${r.dist.varco}`);
  else console.log(`${r.book.padEnd(14)} ${'error' in r ? r.error : '?'}`);
});
console.log(`VERDICT genre: ${genreClass}  [${notes.join(' | ')}]`);
console.log('--- COH7 staccato chapters vs polar ---');
chapterRisk.forEach((r) => console.log(`  ch${String(r.ch).padStart(2)} w1_polar=${String(r.w1_polar).padStart(5)} w1_masters=${String(r.w1_masters).padStart(5)} meanLen=${r.meanLen} insidePolar=${r.insidePolar}`));
