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
  const segments: string[] = [winnerProse];
  let total = countWords(winnerProse);

  while (total < targetWords && segments.length < MAX_SEGMENTS) {
    const tail = (segments[segments.length - 1] ?? '').split(/\s+/u).slice(-150).join(' ');
    const req: GenRequest = {
      ...baseRequest,
      digest: `${CONTINUATION_DIRECTIVE}\n${baseRequest.digest}`,
      previousTail: tail,
    };
    const gen = await generator.generate(req);
    if (!recallNet(gen.prose)) break; // BF-02 : segment non couvert ⇒ on s'arrête PROPREMENT
    segments.push(gen.prose);
    total += gen.words;
  }

  return { segments, totalWords: total, coachingAudit: audit };
}

/** Plan 60k : nombre de chapitres requis à mots/chapitre observés (information, pas promesse). */
export function chaptersFor(targetTotal: number, observedWordsPerChapter: number): number {
  return Math.ceil(targetTotal / Math.max(1, observedWordsPerChapter));
}
