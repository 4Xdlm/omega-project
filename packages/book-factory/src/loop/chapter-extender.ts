/**
 * OMEGA Book-Factory — C8.6 EXTENSION DE CHAPITRE (cap 60k) — BF-08.
 * BB-02 trans-modèle : ~600 mots/génération malgré toute cible. Le 60k ne se force
 * pas par le prompt (loi scellée) — il se CONSTRUIT : le chapitre devient une
 * SÉQUENCE de segments continués (gagnant → continuation(s) sur sa propre traîne),
 * même réalité, mêmes packs, zéro nouvelle information autorisée à la continuation
 * (la matière vient du plan ; la continuation déroule la MÊME scène).
 *
 * LOIS : la consigne de continuation est FIGÉE (forme, pas qualité — FORBID-006
 * audité) ; chaque segment re-passe le filet Recall (BF-02) ; nombre de segments
 * borné (≤ MAX_SEGMENTS) ; arrêt si un segment échoue (jamais de chapitre semi-validé).
 */

import type { ChapterGenerator, GenRequest } from '../chapter-generator.js';
import { auditNoCoaching } from './r6-core.js';

export const MAX_SEGMENTS = 3; // 1 gagnant + ≤2 continuations ≈ 1500-1800 mots/chap (EXPERIMENTAL)
/** Consigne FIGÉE de continuation — forme uniquement. */
export const CONTINUATION_DIRECTIVE =
  'Continue la même scène exactement où elle s’arrête, sans résumer, sans répéter, sans introduire de nouveau personnage ni de nouveau lieu.';

export interface ExtensionResult {
  readonly segments: readonly string[]; // [gagnant, continuation1, ...]
  readonly totalWords: number;
  readonly coachingAudit: readonly string[]; // non-vide ⇒ extension INVALIDE
}

function countWords(s: string): number {
  const t = s.trim();
  return t.length === 0 ? 0 : t.split(/\s+/u).length;
}

/* ── COUTURE (C9 fix — défaut D-AUD-3 prouvé sur le run 60k) ─────────────
 * Le run 60k contient 2 coutures cassées du type : segment N finit tronqué
 * (« Elle l ») et segment N+1 reprend en répétant (« Le métal est froid,
 * luisant. Elle l'ouvre… »). Deux opérations déterministes à la couture : */

/** Tronque à la dernière phrase TERMINÉE — élimine une fin de génération coupée. */
export function trimToCompleteSentence(prose: string): string {
  const t = prose.trim();
  const m = t.match(/^[\s\S]*[.!?…»]/u);
  return (m?.[0] ?? t).trim();
}

/**
 * Si `next` REPREND la fin de `prev` (le modèle répète avant de continuer),
 * retire le chevauchement de `next`. Comparaison en mots normalisés (casse +
 * ponctuation), chevauchement minimal significatif : 4 mots.
 */
export function dedupOverlap(prev: string, next: string, maxOverlapWords = 60): string {
  const norm = (w: string): string => w.toLowerCase().replace(/[«»"'.,;:!?…()—-]+/gu, '');
  const pw = prev.trim().split(/\s+/u);
  const nw = next.trim().split(/\s+/u);
  const max = Math.min(maxOverlapWords, pw.length, nw.length);
  for (let k = max; k >= 4; k--) {
    let match = true;
    for (let i = 0; i < k; i++) {
      if (norm(pw[pw.length - k + i] ?? '') !== norm(nw[i] ?? '')) { match = false; break; }
    }
    if (match) return nw.slice(k).join(' ').trim();
  }
  return next.trim();
}

/**
 * Étend une prose gagnante vers `targetWords` par continuations bornées.
 * `recallNet` = filet BF-02 injecté (retourne true si le segment passe).
 */
export async function extendChapter(
  winnerProse: string,
  baseRequest: GenRequest,
  generator: ChapterGenerator,
  targetWords: number,
  recallNet: (segment: string) => boolean,
): Promise<ExtensionResult> {
  const audit = auditNoCoaching(CONTINUATION_DIRECTIVE);
  // Couture C9 : chaque segment est tronqué à sa dernière phrase complète DÈS
  // réception — le tail envoyé au modèle est propre, la reprise est dédupliquée.
  const segments: string[] = [trimToCompleteSentence(winnerProse)];
  let total = countWords(segments[0] ?? '');

  while (total < targetWords && segments.length < MAX_SEGMENTS) {
    const prev = segments[segments.length - 1] ?? '';
    const tail = prev.split(/\s+/u).slice(-150).join(' ');
    const req: GenRequest = {
      ...baseRequest,
      digest: `${CONTINUATION_DIRECTIVE}\n${baseRequest.digest}`,
      previousTail: tail,
    };
    const gen = await generator.generate(req);
    if (!recallNet(gen.prose)) break; // BF-02 : segment non couvert ⇒ on s'arrête PROPREMENT
    const stitched = dedupOverlap(prev, trimToCompleteSentence(gen.prose));
    if (countWords(stitched) === 0) break; // continuation 100% répétée ⇒ stop propre
    segments.push(stitched);
    total += countWords(stitched);
  }

  return { segments, totalWords: total, coachingAudit: audit };
}

/** Plan 60k : nombre de chapitres requis à mots/chapitre observés (information, pas promesse). */
export function chaptersFor(targetTotal: number, observedWordsPerChapter: number): number {
  return Math.ceil(targetTotal / Math.max(1, observedWordsPerChapter));
}
