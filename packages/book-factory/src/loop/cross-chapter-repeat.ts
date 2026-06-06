/**
 * OMEGA Book-Factory — C8.5 REPEAT INTER-CHAPITRES (BF-08, SHADOW) — héritage direct
 * du forensic OMEGA_REPEAT (near-dup intra-chapitre, tics « comme si »). Mesure CALC :
 * (a) chevauchement d'incipit chapitre-vs-précédents (l'aimantation D2 à l'échelle du
 * livre), (b) top trigrammes répétés TRANS-chapitres (tics de moteur), (c) near-dup
 * de phrases entre chapitres (seuil Jaccard mots). SHADOW : rapport, jamais rejet
 * (seuils = mesure multi-livres d'abord, EMP-16).
 */

import { compareStrings } from '../identity/identity-types.js';
import { incipitDivergence } from './incipit.js';

export interface ChapterText { readonly chapter: number; readonly prose: string; }

export interface CrossRepeatReport {
  readonly incipitDivergenceAdjacent: readonly { readonly chapter: number; readonly divergenceVsPrev: number }[];
  readonly topCrossTrigrams: readonly { readonly gram: string; readonly chapters: number }[]; // présent dans ≥k chapitres
  readonly nearDupSentencePairs: readonly { readonly a: number; readonly b: number; readonly jaccard: number; readonly excerpt: string }[];
}

const STOP = new Set(['le', 'la', 'les', 'de', 'des', 'du', 'un', 'une', 'et', 'à', 'au', 'aux', 'en', 'dans', 'sur', 'que', 'qui', 'ne', 'pas', 'se', 'sa', 'son', 'ses', 'il', 'elle', 'était', 'avait']);

function contentTrigrams(prose: string): ReadonlySet<string> {
  const words = prose.normalize('NFC').toLowerCase().split(/\s+/u).filter((w) => w.length > 0);
  const grams = new Set<string>();
  for (let i = 0; i + 2 < words.length; i++) {
    const tri = [words[i], words[i + 1], words[i + 2]];
    if (tri.every((w) => w !== undefined && STOP.has(w))) continue; // trigrammes 100% fonctionnels ignorés
    grams.add(tri.join(' '));
  }
  return grams;
}

function sentences(prose: string): readonly string[] {
  return prose.split(/(?<=[.!?])\s+/u).map((s) => s.trim()).filter((s) => s.split(/\s+/u).length >= 8);
}

function jaccardWords(a: string, b: string): number {
  const A = new Set(a.toLowerCase().split(/\s+/u));
  const B = new Set(b.toLowerCase().split(/\s+/u));
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export function crossChapterRepeat(
  chapters: readonly ChapterText[],
  opts: { readonly minChaptersForTic?: number; readonly nearDupThreshold?: number; readonly topK?: number } = {},
): CrossRepeatReport {
  const minCh = opts.minChaptersForTic ?? 3;
  const dupThr = opts.nearDupThreshold ?? 0.7; // EXPERIMENTAL_DEFAULT
  const topK = opts.topK ?? 15;

  // (a) divergence d'incipit vs chapitre précédent
  const incipits: { chapter: number; divergenceVsPrev: number }[] = [];
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1];
    const cur = chapters[i];
    if (prev === undefined || cur === undefined) continue;
    incipits.push({ chapter: cur.chapter, divergenceVsPrev: incipitDivergence([prev.prose, cur.prose]) });
  }

  // (b) trigrammes de contenu présents dans ≥ minCh chapitres (tics trans-livre)
  const presence = new Map<string, number>();
  for (const c of chapters) {
    for (const g of contentTrigrams(c.prose)) presence.set(g, (presence.get(g) ?? 0) + 1);
  }
  const topCrossTrigrams = [...presence.entries()]
    .filter(([, n]) => n >= minCh)
    .sort((x, y) => y[1] - x[1] || compareStrings(x[0], y[0]))
    .slice(0, topK)
    .map(([gram, n]) => ({ gram, chapters: n }));

  // (c) near-dup de phrases entre chapitres ADJACENTS (coût borné O(adjacent))
  const nearDup: { a: number; b: number; jaccard: number; excerpt: string }[] = [];
  for (let i = 1; i < chapters.length; i++) {
    const prev = chapters[i - 1];
    const cur = chapters[i];
    if (prev === undefined || cur === undefined) continue;
    const sp = sentences(prev.prose);
    const sc = sentences(cur.prose);
    for (const s1 of sp) {
      for (const s2 of sc) {
        const j = jaccardWords(s1, s2);
        if (j >= dupThr) nearDup.push({ a: prev.chapter, b: cur.chapter, jaccard: Number(j.toFixed(3)), excerpt: s2.slice(0, 90) });
      }
    }
  }

  return { incipitDivergenceAdjacent: incipits, topCrossTrigrams, nearDupSentencePairs: nearDup };
}
