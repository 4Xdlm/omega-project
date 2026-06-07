/**
 * OMEGA Book-Factory — SCAFFOLD GUARD (BF-08) — découverte NCR-SEAM-GLOBAL-002.
 *
 * Au cours du balayage des coutures, le contrôle a révélé 48 lignes de DIRECTIVE
 * DE GÉNÉRATION laissées dans la PROSE du manuscrit (une par ouverture de
 * chapitre) — « — Acte 2 : avancer l'enquête ; approfondir un personnage ;
 * relancer la tension. [synthese. », « — Présenter Léna Marchetti… [rythme-
 * compresse. », « — Incident déclencheur : poser la question centrale… [canon-
 * strict. ». Ce bruit avait été nettoyé du GÉNOME (NCR-MYC-001) mais JAMAIS de
 * la prose. Ordre Architecte : « rien ne doit être laissé au hasard ».
 *
 * INVARIANT STRUCTUREL (non myope, zéro liste de tokens à maintenir) : une
 * directive porte un TAG MARKUP — un crochet contenant UN SEUL token minuscule
 * (éventuellement composé : « [rythme-compresse] », « [canon-strict] »,
 * « [sensoriel] »). Preuve sur le corpus : les 50 crochets du V0 sont TOUS des
 * tags directive (canon-strict×9, voix-seche×9, rythme-compresse×8, synthese×8,
 * tension-interne×8, sensoriel×5, dialogue×3) — ZÉRO crochet de prose. Une
 * incise littéraire (« [signé Garcia] ») contient une MAJUSCULE et/ou une
 * espace ⇒ jamais confondue. Renfort : préfixe d'en-tête « — Acte N : ».
 *
 * RÉPARATION : suppression du BLOC entier (100 % directive, zéro prose), TRACÉE
 * ligne par ligne (jamais silencieuse — loi OMEGA). V0 intact = réversible.
 * Le critère PASS est un RE-SCAN à zéro résidu.
 */

import { err, ok } from '../identity/identity-types.js';
import type { Result } from '../identity/identity-types.js';
import type { SeamChapter } from './seam-sweep.js';

export interface ScaffoldRemoval {
  readonly chapter: number;
  readonly blockIndex: number;
  readonly reason: 'MARKUP_TAG' | 'ACT_BEAT_HEADER';
  readonly text: string;
}

export interface ScaffoldResult {
  readonly cleaned: readonly SeamChapter[];
  readonly removed: readonly ScaffoldRemoval[];
  /** RE-SCAN post-strip — DOIT être 0 pour le PASS. */
  readonly residual: number;
}

export type ScaffoldError = { readonly code: 'EMPTY_TEXT'; readonly detail: string };

/** Tag markup : crochet contenant UN SEUL token minuscule (composé autorisé)
 *  — « [rythme-compresse] », « [sensoriel] », « [canon-strict] ». L'exigence
 *  « minuscule + sans espace » exclut toute incise littéraire « [signé Garcia] »
 *  (majuscule + espace). Le « . » final optionnel couvre un éventuel reformatage. */
const MARKUP_TAG = /\[[a-zà-ÿ]{3,}(?:[‑-][a-zà-ÿ]+)*\]\.?/u;
/** En-tête de beat structurel laissé en tête de chapitre. */
const ACT_BEAT_HEADER = /^\s*—?\s*(?:Acte\s+\d|Incident\s+déclencheur|Dénouement|Climax)\b/u;

function scaffoldReason(block: string): ScaffoldRemoval['reason'] | null {
  const t = block.trim();
  if (t.length === 0) return null;
  if (MARKUP_TAG.test(t)) return 'MARKUP_TAG';
  if (ACT_BEAT_HEADER.test(t)) return 'ACT_BEAT_HEADER';
  return null;
}

/** Retire les blocs 100 % directive de génération. Pur, déterministe, tracé. */
export function stripScaffold(chapters: readonly SeamChapter[]): Result<ScaffoldResult, ScaffoldError> {
  if (chapters.length === 0) return err({ code: 'EMPTY_TEXT', detail: 'aucun chapitre' });

  const removed: ScaffoldRemoval[] = [];
  const cleaned: SeamChapter[] = chapters.map((ch) => {
    const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
    const kept: string[] = [];
    blocks.forEach((block, blockIndex) => {
      const reason = scaffoldReason(block);
      if (reason !== null) {
        removed.push({ chapter: ch.chapter, blockIndex, reason, text: block.trim().slice(0, 160).replace(/\s+/gu, ' ') });
      } else {
        kept.push(block.trimEnd());
      }
    });
    return { chapter: ch.chapter, prose: kept.join('\n\n') };
  });

  const residual = cleaned.reduce((acc, ch) => {
    const blocks = ch.prose.split(/\r?\n\s*\r?\n/u).filter((b) => b.trim().length > 0);
    return acc + blocks.filter((b) => scaffoldReason(b) !== null).length;
  }, 0);

  return ok({ cleaned, removed, residual });
}
