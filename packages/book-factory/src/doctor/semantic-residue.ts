/**
 * OMEGA — NCR-SEMANTIC-RESIDUE-005 (BF-08). Détecteur de TROUS DE SENS d'ordre
 * supérieur : phrases grammaticalement fermées mais sémantiquement cassées
 * (« le silence retombant sur lui comme un lourd. ») et REDITES DE FONCTION
 * (la même information ré-installée avec le même rythme — « petite cuisine » ×2).
 *
 * DOCTRINE (mandat ChatGPT) : DÉTECTER et RAPPORTER — jamais corriger
 * automatiquement. Ambigu ⇒ AUTHOR_REVIEW (le Sceau d'Auteur existe pour ça).
 * Distinction voulue/accidentelle = décision d'AUTEUR, pas de machine.
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import type { SeamChapter } from './seam-sweep.js';

export interface ResidueFinding {
  readonly chapter: number;
  readonly kind: 'BROKEN_COMPARISON' | 'FUNCTIONAL_REDUNDANCY';
  readonly excerpt: string;
  readonly counterpart?: string;
  readonly disposition: 'AUTHOR_REVIEW_REQUIRED';
}

export interface ResidueReport {
  readonly findings: readonly ResidueFinding[];
  readonly brokenComparisons: number;
  readonly functionalRedundancies: number;
}

export type ResidueError = { readonly code: 'EMPTY_TEXT'; readonly detail: string };

/** Comparaison à TÊTE MANQUANTE : « comme un/une <adjectif seul> » en fin de
 *  phrase — un déterminant exige un NOM ; un adjectif nu = phrase amputée
 *  maquillée. Cas réel : « comme un lourd. » (lourd = adjectif, hapax nominal). */
const COMPARISON_TAIL_RE = /comme\s+(?:un|une)\s+([a-zàâçéèêëîïôûùüÿ]+)\s*[.!?…]/gu;
/** Adjectifs fréquents qui ne sont JAMAIS des noms en position « comme un X. ». */
const BARE_ADJECTIVES = new Set(['lourd', 'lourde', 'froid', 'froide', 'sourd', 'sourde', 'dur', 'dure', 'long', 'longue', 'lent', 'lente', 'vide', 'noir', 'noire', 'blanc', 'blanche', 'grand', 'grande', 'petit', 'petite']);

function wordsOf(s: string): readonly string[] {
  return s.toLowerCase().replace(/[«»".,;:!?…()—-]/gu, ' ').split(/\s+/u).filter((w) => w.length > 2);
}
function jaccard(a: readonly string[], b: readonly string[]): number {
  const A = new Set(a);
  const B = new Set(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  return inter / (A.size + B.size - inter);
}

export interface ResidueOptions {
  /** Similarité de FONCTION entre paragraphes éloignés (défaut 0.5). */
  readonly redundancyThreshold?: number;
  /** Distance minimale en paragraphes (adjacent = travail du seam-sweep). */
  readonly minDistance?: number;
}

/** Détecte les résidus sémantiques. PUR — rapporte, ne répare JAMAIS. */
export function scanSemanticResidue(chapters: readonly SeamChapter[], opts: ResidueOptions = {}): Result<ResidueReport, ResidueError> {
  if (chapters.length === 0) return err({ code: 'EMPTY_TEXT', detail: 'aucun chapitre' });
  const threshold = opts.redundancyThreshold ?? 0.5;
  const minDist = opts.minDistance ?? 2;
  const findings: ResidueFinding[] = [];

  for (const ch of chapters) {
    /* — comparaisons cassées — */
    for (const m of ch.prose.matchAll(COMPARISON_TAIL_RE)) {
      const head = (m[1] ?? '').toLowerCase();
      if (BARE_ADJECTIVES.has(head)) {
        findings.push({
          chapter: ch.chapter, kind: 'BROKEN_COMPARISON',
          excerpt: m[0].trim(), disposition: 'AUTHOR_REVIEW_REQUIRED',
        });
      }
    }

    /* — redites de FONCTION : paragraphes similaires À DISTANCE — */
    const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).map((b) => b.trim()).filter((b) => b.length > 80);
    const tokens = blocks.map((b) => wordsOf(b));
    for (let i = 0; i < blocks.length; i++) {
      for (let j = i + minDist; j < blocks.length; j++) {
        const ti = tokens[i] ?? [];
        const tj = tokens[j] ?? [];
        if (ti.length < 12 || tj.length < 12) continue;
        if (jaccard(ti, tj) >= threshold) {
          findings.push({
            chapter: ch.chapter, kind: 'FUNCTIONAL_REDUNDANCY',
            excerpt: (blocks[i] ?? '').slice(0, 90),
            counterpart: (blocks[j] ?? '').slice(0, 90),
            disposition: 'AUTHOR_REVIEW_REQUIRED',
          });
        }
      }
    }
  }

  return ok({
    findings,
    brokenComparisons: findings.filter((f) => f.kind === 'BROKEN_COMPARISON').length,
    functionalRedundancies: findings.filter((f) => f.kind === 'FUNCTIONAL_REDUNDANCY').length,
  });
}
