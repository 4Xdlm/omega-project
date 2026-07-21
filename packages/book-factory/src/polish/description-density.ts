/**
 * OMEGA — DESCRIPTION_DENSITY (capteur né de la lecture-oreille de Francky, 2026-07-21).
 * Observation auteur COH7 : "actions suivies d'une longue description avec adjectifs,
 * un peu redondantes". On la transforme en MESURE (méthode LECTORAT), zéro patch.
 * Réutilise `analyzeDensity` (omega-p0, autonome) : VAR = verbes/adjectifs (bas =
 * lourd en adjectifs), densité lexicale, + comptage de PILING adjectival (adj adjacents
 * ou adj-et/ou-adj = accumulation). COH7 vs socle FR-thriller (Thilliez/Chattam/Bussi/Loubry).
 *   tsx src/polish/description-density.ts   (cwd = book-factory)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { importManuscript } from '../doctor/manuscript-import.js';
import { analyzeDensity, type WordClass } from '../../../omega-p0/src/phonetic/semantic-density.js';

const FR_PROSE = 'runs/atlas/_frthriller_prose.txt';
const COH7 = 'runs/atlas/MANUSCRIT_V4_COH7.md';
const COORD = new Set(['et', 'ou', 'ni', 'mais']);

/** Événements de PILING adjectival : adj adjacents (virgule non tokenisée) OU adj-coord-adj. */
function adjPiling(cls: readonly WordClass[]): number {
  let n = 0;
  for (let i = 0; i < cls.length - 1; i++) {
    if (cls[i]?.subType !== 'adjective') continue;
    if (cls[i + 1]?.subType === 'adjective') { n++; continue; }
    if (i + 2 < cls.length && COORD.has(cls[i + 1]?.lower ?? '') && cls[i + 2]?.subType === 'adjective') n++;
  }
  return n;
}

interface M { totalWords: number; verb: number; adj: number; nounish: number; ld: number; piling: number }
function measure(text: string): M {
  const d = analyzeDensity(text);
  const nounish = d.classification.filter((c) => c.subType === 'noun_adverb').length;
  return { totalWords: d.totalWords, verb: d.verbCount, adj: d.adjectiveCount, nounish, ld: d.lexicalDensity, piling: adjPiling(d.classification) };
}
function derive(m: M): { VAR: number; adjPer100w: number; adjPerNounish: number; pilingPer1000w: number; ld: number } {
  return {
    VAR: +(m.verb / Math.max(1, m.adj)).toFixed(3),
    adjPer100w: +(100 * m.adj / Math.max(1, m.totalWords)).toFixed(2),
    adjPerNounish: +(m.adj / Math.max(1, m.nounish)).toFixed(3),
    pilingPer1000w: +(1000 * m.piling / Math.max(1, m.totalWords)).toFixed(2),
    ld: m.ld,
  };
}

// FR-thriller (agrégat sur 20 livres)
const fr = readFileSync(FR_PROSE, 'utf8').split('===BOOK===').map((b) => b.trim()).filter((b) => b.length > 200);
const frAgg: M = { totalWords: 0, verb: 0, adj: 0, nounish: 0, ld: 0, piling: 0 };
let ldSum = 0;
for (const b of fr) { const m = measure(b); frAgg.totalWords += m.totalWords; frAgg.verb += m.verb; frAgg.adj += m.adj; frAgg.nounish += m.nounish; frAgg.piling += m.piling; ldSum += m.ld * m.totalWords; }
frAgg.ld = +(ldSum / Math.max(1, frAgg.totalWords)).toFixed(2);
const FR = derive(frAgg);

// COH7 global + par chapitre
const imp = importManuscript(readFileSync(COH7, 'utf8'));
if (!imp.ok) { console.log('COH7 IMPORT_FAIL'); process.exit(1); }
const cohAgg: M = { totalWords: 0, verb: 0, adj: 0, nounish: 0, ld: 0, piling: 0 };
let cohLd = 0;
const perCh = imp.value.chapters.map((c, i) => {
  const m = measure(c.prose);
  cohAgg.totalWords += m.totalWords; cohAgg.verb += m.verb; cohAgg.adj += m.adj; cohAgg.nounish += m.nounish; cohAgg.piling += m.piling; cohLd += m.ld * m.totalWords;
  const d = derive(m);
  return { ch: i + 1, ...d, words: m.totalWords };
});
cohAgg.ld = +(cohLd / Math.max(1, cohAgg.totalWords)).toFixed(2);
const COH = derive(cohAgg);

// Chapitres les plus "lourds description" : VAR bas + piling haut (rang combiné)
const worstByPiling = [...perCh].sort((a, b) => b.pilingPer1000w - a.pilingPer1000w).slice(0, 8);
const worstByVAR = [...perCh].sort((a, b) => a.VAR - b.VAR).slice(0, 8);

const confirm = {
  VAR_lower: COH.VAR < FR.VAR, adjPer100w_higher: COH.adjPer100w > FR.adjPer100w,
  adjPerNounish_higher: COH.adjPerNounish > FR.adjPerNounish, piling_higher: COH.pilingPer1000w > FR.pilingPer1000w,
};
const nConfirm = Object.values(confirm).filter(Boolean).length;
const verdict = nConfirm >= 3 ? 'AUTHOR_CONFIRMED_OVER_DESCRIBED' : nConfirm >= 1 ? 'AUTHOR_PARTIAL' : 'AUTHOR_REFUTED';

writeFileSync('runs/atlas/DESCRIPTION_DENSITY.json', JSON.stringify({
  phase: 'DESCRIPTION_DENSITY (capteur oreille auteur, mesure seule)', date: '2026-07-21',
  method: 'analyzeDensity (omega-p0, heuristique deterministe, meme outil pour les 2 corpus -> comparaison relative juste). VAR=verbes/adjectifs (bas=lourd adjectifs). piling=accumulation adjectivale /1000 mots.',
  frThriller: { ...FR, books: fr.length, words: frAgg.totalWords },
  coh7: { ...COH, words: cohAgg.totalWords },
  confirm, nConfirm, verdict,
  coh7_worst_by_piling: worstByPiling, coh7_worst_by_VAR: worstByVAR,
}, null, 1), 'utf8');

console.log(`FR-THRILLER: VAR=${FR.VAR} adj/100w=${FR.adjPer100w} adj/nounish=${FR.adjPerNounish} piling/1000w=${FR.pilingPer1000w} LD=${FR.ld} (words=${frAgg.totalWords})`);
console.log(`COH7       : VAR=${COH.VAR} adj/100w=${COH.adjPer100w} adj/nounish=${COH.adjPerNounish} piling/1000w=${COH.pilingPer1000w} LD=${COH.ld} (words=${cohAgg.totalWords})`);
console.log(`confirm=${JSON.stringify(confirm)} nConfirm=${nConfirm}/4 -> ${verdict}`);
console.log('COH7 chapitres les + lourds (piling adjectival /1000w):');
worstByPiling.forEach((r) => console.log(`  ch${String(r.ch).padStart(2)} piling=${r.pilingPer1000w} VAR=${r.VAR} adj/100w=${r.adjPer100w}`));
console.log('COH7 chapitres au VAR le + bas (verbes/adjectifs):');
worstByVAR.forEach((r) => console.log(`  ch${String(r.ch).padStart(2)} VAR=${r.VAR} piling=${r.pilingPer1000w} adj/100w=${r.adjPer100w}`));
