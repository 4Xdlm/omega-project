/**
 * OMEGA — FR_THRILLER_RHYTHM (correction genre, 2026-07-21). Le fonds "polar" etant
 * en realite mixte (Zola/Hugo/Steel/Rowling), on remesure COH7 contre un socle FR
 * PUR : Thilliez+Chattam+Bussi(FR)+Loubry (20 romans), meme sentenceLengths que PE-4.
 * MESURE SEULE. Verifie si le verdict OVERDRY tient contre de VRAIS pairs FR de genre.
 *   tsx src/polish/frthriller-rhythm.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { importManuscript } from '../doctor/manuscript-import.js';
import { CALIBRATED_RHYTHM_DECILES, sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const PROSE = 'runs/atlas/_frthriller_prose.txt';
const MIXED_DECILES = [3, 5, 7, 9, 11, 13, 16, 20, 27]; // baseline "218" precedente (fonds mixte)
function q(s: readonly number[], p: number): number { return s.length ? (s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))] ?? 0) : 0; }
function stats(l: readonly number[]): { n: number; median: number; mean: number; varco: number; p90: number; p95: number; deciles: number[] } {
  const s = [...l].sort((a, b) => a - b); const n = s.length;
  const mean = s.reduce((a, b) => a + b, 0) / Math.max(1, n);
  const std = Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(1, n));
  return { n, median: q(s, 0.5), mean: +mean.toFixed(2), varco: +(100 * std / Math.max(1e-9, mean)).toFixed(1), p90: q(s, 0.9), p95: q(s, 0.95), deciles: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9].map((p) => q(s, p)) };
}

const raw = readFileSync(PROSE, 'utf8');
const books = raw.split('===BOOK===').map((b) => b.trim()).filter((b) => b.length > 200);
const fr: number[] = []; for (const b of books) fr.push(...sentenceLengths(b));
const FR = stats(fr); const FR_DECILES = FR.deciles;

const coh7txt = readFileSync('runs/atlas/MANUSCRIT_V4_COH7.md', 'utf8');
const imp = importManuscript(coh7txt);
if (!imp.ok) { console.log('COH7 IMPORT_FAIL'); process.exit(1); }
const coh7all: number[] = [];
const perCh = imp.value.chapters.map((c, i) => {
  const lens = sentenceLengths(c.prose); coh7all.push(...lens);
  return { ch: i + 1, w1_fr: +wassersteinToProfile(lens, FR_DECILES).toFixed(2), meanLen: +(lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length)).toFixed(1) };
});
const COH7 = stats(coh7all);
const w1_fr = +(perCh.map((r) => r.w1_fr).reduce((a, b) => a + b, 0) / perCh.length).toFixed(2);
const w1_masters = +(imp.value.chapters.map((c) => wassersteinToProfile(sentenceLengths(c.prose), CALIBRATED_RHYTHM_DECILES)).reduce((a, b) => a + b, 0) / imp.value.chapters.length).toFixed(2);

const dMed = COH7.median - FR.median, dMean = +(COH7.mean - FR.mean).toFixed(2), dP90 = COH7.p90 - FR.p90, dVarco = +(COH7.varco - FR.varco).toFixed(1);
let verdict = 'RHYTHM_FR_PASS';
if (Math.abs(dMean) <= 1.5 && Math.abs(dP90) <= 4) verdict = 'RHYTHM_FR_PASS';
else if (dMean <= -1.5 && dP90 <= -4) verdict = 'RHYTHM_FR_OVERDRY';
else if (dVarco <= -8) verdict = 'RHYTHM_FR_UNDER_VARIANT';
else verdict = 'RHYTHM_FR_BORDERLINE';

writeFileSync('runs/atlas/FR_THRILLER_RHYTHM.json', JSON.stringify({
  phase: 'FR_THRILLER_RHYTHM (correction genre, mesure seule)', date: '2026-07-21',
  corpus: 'Thilliez(7)+Chattam(8)+Bussi FR(4)+Loubry(1) = 20 romans FR purs', books: books.length, sentences: FR.n,
  frThriller: FR, coh7: COH7,
  reference_masters: { median: 14, mean: 18.2, p90: 37, deciles: CALIBRATED_RHYTHM_DECILES },
  reference_mixedFonds: { median: 11, mean: 13.42, p90: 27, note: 'ancien "218 polar" = en realite fonds MIXTE (Zola/Hugo/Steel/Rowling), NON genre-pur' },
  coh7_w1: { vs_frThriller: w1_fr, vs_masters: w1_masters },
  deltas_vs_fr: { dMedian: dMed, dMean, dP90, dVarco }, verdict,
  perChapterFR: perCh,
}, null, 1), 'utf8');

console.log(`FR-THRILLER baseline: books=${books.length} sentences=${FR.n}`);
console.log(`FR-THRILLER  median=${FR.median} mean=${FR.mean} varco=${FR.varco} p90=${FR.p90} p95=${FR.p95} deciles=[${FR_DECILES.join(',')}]`);
console.log(`COH7         median=${COH7.median} mean=${COH7.mean} varco=${COH7.varco} p90=${COH7.p90}`);
console.log(`context: MIXED-fonds median=11 mean=13.42 p90=27 | MASTERS median=14 mean=18.2 p90=37`);
console.log(`COH7 W1: vs FR-thriller=${w1_fr} | vs masters=${w1_masters}`);
console.log(`deltas COH7 vs FR: dMedian=${dMed} dMean=${dMean} dP90=${dP90} dVarco=${dVarco}`);
console.log(`VERDICT: ${verdict}`);
