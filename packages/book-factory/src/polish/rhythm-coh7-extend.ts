/**
 * OMEGA — PE-4 ÉTENDU à COH7 (RHYTHM_NPVI_P0, ordre tribunal 2026-07-19).
 * MESURE SEULE — aucune réécriture. Réutilise l'outil PE-4 scellé
 * (wassersteinToProfile + CALIBRATED_RHYTHM_DECILES = 9 maîtres FR, 24 114 phrases).
 * Ajoute COH7 au tableau W₁, + distribution de longueurs de phrase (médiane/moyenne/P90)
 * comparée aux maîtres (14 / 18,2 / 37), + localisation des chapitres STACCATO
 * (W₁ le plus haut = les plus plats/éloignés du swing des maîtres).
 *   tsx src/polish/rhythm-coh7-extend.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { importManuscript } from '../doctor/manuscript-import.js';
import { CALIBRATED_RHYTHM_DECILES, PROVISIONAL_RHYTHM_DECILES, sentenceLengths, wassersteinToProfile } from '../v2/v2-conductor.js';

const BOOKS = [
  { id: 'COH7_303fa775 (courant)', path: 'runs/atlas/MANUSCRIT_V4_COH7.md' },
  { id: 'V2_b438250e (reference NARRATIVE_CLEAN)', path: 'runs/next_book_v2/MANUSCRIT_CANONICAL.md' },
  { id: 'V3_gemma4 (ancetre COH)', path: 'runs/duel_gemma/MANUSCRIT.md' },
  { id: 'V3_mistral', path: 'runs/duel_mistral/MANUSCRIT.md' },
];
const MASTERS = { median: 14, mean: 18.2, p90: 37, deciles: CALIBRATED_RHYTHM_DECILES };

function pct(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))))] ?? 0;
}
function dist(lengths: readonly number[]): { n: number; median: number; mean: number; p90: number; max: number } {
  const s = [...lengths].sort((a, b) => a - b);
  const mean = s.reduce((a, b) => a + b, 0) / Math.max(1, s.length);
  return { n: s.length, median: pct(s, 0.5), mean: Number(mean.toFixed(2)), p90: pct(s, 0.9), max: s[s.length - 1] ?? 0 };
}

function measure(text: string): {
  meanW1Calibrated: number; meanW1Provisional: number;
  global: ReturnType<typeof dist>;
  perChapter: Array<{ chapter: number; w1: number; meanLen: number; sentences: number }>;
} | null {
  const imp = importManuscript(text);
  if (!imp.ok) return null;
  const all: number[] = [];
  const perChapter = imp.value.chapters.map((c, i) => {
    const lens = sentenceLengths(c.prose);
    all.push(...lens);
    const w1 = wassersteinToProfile(lens, CALIBRATED_RHYTHM_DECILES);
    const meanLen = lens.reduce((a, b) => a + b, 0) / Math.max(1, lens.length);
    return { chapter: i + 1, w1: Number.isFinite(w1) ? Number(w1.toFixed(2)) : -1, meanLen: Number(meanLen.toFixed(1)), sentences: lens.length };
  });
  const finite = perChapter.filter((r) => r.w1 >= 0).map((r) => r.w1);
  const meanW1Calibrated = Number((finite.reduce((a, b) => a + b, 0) / Math.max(1, finite.length)).toFixed(2));
  const wsProv = imp.value.chapters.map((c) => wassersteinToProfile(sentenceLengths(c.prose), PROVISIONAL_RHYTHM_DECILES)).filter((x) => Number.isFinite(x));
  const meanW1Provisional = Number((wsProv.reduce((a, b) => a + b, 0) / Math.max(1, wsProv.length)).toFixed(2));
  return { meanW1Calibrated, meanW1Provisional, global: dist(all), perChapter };
}

function main(): void {
  const results = BOOKS.map((b) => {
    try { const m = measure(readFileSync(b.path, 'utf8')); return { book: b.id, ...(m ?? { error: 'IMPORT_FAIL' }) }; }
    catch { return { book: b.id, error: 'READ_FAIL' }; }
  });
  const coh7 = results.find((r) => r.book.startsWith('COH7'));
  // Staccato = chapitres COH7 au W₁ le plus élevé (les plus loin du swing maîtres).
  const staccato = coh7 && 'perChapter' in coh7 && coh7.perChapter
    ? [...coh7.perChapter].sort((a, b) => b.w1 - a.w1).slice(0, 8)
    : [];
  const out = {
    phase: 'PE-4 EXTENDED -> COH7 (RHYTHM_NPVI_P0, mesure seule)',
    date: '2026-07-21',
    method: 'W1 approx (deciles) longueurs de phrase par chapitre, moyenne. Reference = CALIBRATED_RHYTHM_DECILES (9 maitres FR, 24114 phrases). Plus BAS = plus proche du swing des maitres.',
    mastersReference: MASTERS,
    books: results.map((r) => ({
      book: r.book,
      w1_vs_masters: 'meanW1Calibrated' in r ? r.meanW1Calibrated : r.error,
      w1_vs_provisional: 'meanW1Provisional' in r ? r.meanW1Provisional : undefined,
      dist: 'global' in r ? r.global : undefined,
    })),
    coh7_staccato_top8: staccato,
    reading: 'w1_vs_masters bas = rythme proche des maitres. Comparer dist.median/mean/p90 de COH7 aux maitres (14/18.2/37): si COH7 plus court/plat -> staccato. nPVI syllabique (omega-p0) = descripteur NON calibre sur corpus maitre -> hors scope mesure-calibree.',
  };
  writeFileSync('runs/atlas/RHYTHM_COH7_PE4_EXTENDED.json', JSON.stringify(out, null, 1), 'utf8');
  const line = (r: typeof results[number]): string => 'meanW1Calibrated' in r && r.global
    ? `${r.book.padEnd(42)} W1_masters=${String(r.meanW1Calibrated).padStart(5)}  W1_prov=${String(r.meanW1Provisional).padStart(5)}  med=${r.global.median} mean=${r.global.mean} p90=${r.global.p90} max=${r.global.max}`
    : `${r.book.padEnd(42)} ${('error' in r ? r.error : '?')}`;
  console.log('MASTERS ref: median=14 mean=18.2 p90=37 | deciles=[5,7,9,11,14,17,21,27,37]');
  results.forEach((r) => console.log(line(r)));
  console.log('COH7 staccato (W1 le plus haut = plus plat):');
  staccato.forEach((s) => console.log(`  ch${String(s.chapter).padStart(2)}  W1=${String(s.w1).padStart(5)}  meanLen=${s.meanLen}  sentences=${s.sentences}`));
}
main();
