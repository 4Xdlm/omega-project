/**
 * OMEGA Book-Factory — TIC_WEAVER (BF-08). Fusion AP-9 → tribunal du seam-surgeon.
 *
 * DOCTRINE (homogénéisation, mandat tribunal 2/2 + Architecte 2026-06-09) :
 *   - On NE réinvente RIEN. Le déclencheur d'AP-9 est une OCCURRENCE DE TIC
 *     (phrase gestuelle répétée : « esquissa un sourire »…), pas une couture.
 *     Mais le TRIBUNAL est celui, scellé, du seam-surgeon : `guardPatch`
 *     (INV-SS-002..008) + hash sha256 + re-scan. Le `proposedReplacement` vient
 *     du corpus AP-9 (le LLM a déjà proposé EN AMONT) ; le code tranche.
 *   - Le Scribe écrit. Le Weaver raccorde. Le Tic-Weaver dé-tique. Le code juge.
 *   - changedSpan = la PHRASE-TIC (≠ fenêtre gauche du seam). V0 jamais mutée :
 *     reçoit du texte, retourne du texte neuf (doctrine repair-executor).
 *
 * INVARIANTS (hérités du seam-surgeon + spécifiques tic) :
 *   - réutilise `guardPatch` : NEW_ENTITY, REPEAT_VS_LEFT/RIGHT (Jaccard≥0.6),
 *     POV, PLACE, TIME, bornes, physique — TOUTES les gardes scellées.
 *   - INV-TW-01 : ancre UNIQUE dans le texte (sinon ESCALATE_ANCHOR — on ne
 *     patche jamais une phrase ambiguë : leçon AP-9 « esquissa un sourire » ×9).
 *   - INV-TW-02 : la densité de tic LOCALE doit BAISSER après patch, jamais
 *     monter (re-scan ; sinon ESCALATE_RESCAN, REVERT implicite = pas d'écriture).
 *   - INV-TW-03 : patch hashé (sha256 du remplacement).
 */

import { sha256 } from '@omega/canon-kernel';

import type { SurgeonWorldState } from './seam-surgeon.js';
import { guardPatch } from './seam-surgeon.js';

/* ──────────────────────────── CONTRAT D'ENTRÉE ─────────────────────────── */

export interface TicOccurrence {
  readonly ticId: string;
  readonly chapter: number;
  /** Le cliché gestuel à supprimer (« esquissa un sourire »). */
  readonly tic: string;
  /** La phrase DISTINCTIVE complète portant le tic — doit être UNIQUE dans le texte. */
  readonly anchorSentence: string;
  /** La substitution proposée par AP-9 (corrélat objectif actif). */
  readonly proposedReplacement: string;
  /** Étiquettes de famille (gaze/jaw/immobile/carnet…) — traçabilité, pas de gate. */
  readonly familyTags: readonly string[];
}

/** Fournit l'état du monde par chapitre (lieu/objets/POV) pour le tribunal. */
export type WorldProvider = (chapter: number) => SurgeonWorldState;

/* ─────────────────────────── CONTRAT DE SORTIE ─────────────────────────── */

export type TicVerdict =
  | 'APPLIED'            // patch validé par le tribunal + re-scan : texte modifié.
  | 'ESCALATE_ANCHOR'    // ancre absente ou non unique : on ne touche pas.
  | 'ESCALATE_GUARD'     // une garde du seam-surgeon a rejeté la proposition.
  | 'ESCALATE_RESCAN';   // la densité de tic n'a pas baissé : REVERT.

export interface TicPatchResult {
  readonly ticId: string;
  readonly chapter: number;
  readonly verdict: TicVerdict;
  readonly reasons: readonly string[];
  readonly patchHash: string;
  readonly ticDensityBefore: number;
  readonly ticDensityAfter: number;
}

export interface TicRepairReport {
  readonly results: readonly TicPatchResult[];
  readonly applied: number;
  readonly escalated: number;
  readonly densityBefore: number;
  readonly densityAfter: number;
}

/* ───────────────────────────── INSTRUMENTS ─────────────────────────────── */

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function wordCount(text: string): number {
  return text.split(/\s+/u).filter((w) => w.length > 0).length;
}

/** Densité du tic le plus représenté, normalisée /1000 mots (miroir de
 *  build-canonical `maxTicPer1000w` : même mesure, même unité). */
export function maxTicDensityPer1000w(text: string, ticLexicon: readonly string[]): number {
  const words = Math.max(1, wordCount(text));
  let max = 0;
  for (const t of ticLexicon) {
    const re = new RegExp(escapeRe(t), 'giu');
    const n = (text.match(re) ?? []).length;
    const d = (n * 1000) / words;
    if (d > max) max = d;
  }
  return max;
}

/** Compte une occurrence exacte (sous-chaîne) — pour l'unicité d'ancre. */
function occurrences(text: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let i = text.indexOf(needle);
  while (i !== -1) {
    count += 1;
    i = text.indexOf(needle, i + needle.length);
  }
  return count;
}

/* ──────────────────────────── LE TIC-WEAVER ────────────────────────────── */

/** Opère UNE occurrence de tic sur le texte d'un chapitre. Pur (aucun I/O,
 *  aucun LLM : la proposition est déjà fournie). Réutilise le tribunal scellé. */
export function operateTic(
  chapterText: string,
  occ: TicOccurrence,
  world: SurgeonWorldState,
  ticLexicon: readonly string[],
): { readonly text: string; readonly result: TicPatchResult } {
  const before = maxTicDensityPer1000w(chapterText, ticLexicon);
  const mk = (verdict: TicVerdict, reasons: readonly string[], after: number): TicPatchResult => ({
    ticId: occ.ticId,
    chapter: occ.chapter,
    verdict,
    reasons,
    patchHash: String(sha256(occ.proposedReplacement.normalize('NFC'))),
    ticDensityBefore: before,
    ticDensityAfter: after,
  });

  // INV-TW-01 : ancre unique.
  const n = occurrences(chapterText, occ.anchorSentence);
  if (n !== 1) {
    return { text: chapterText, result: mk('ESCALATE_ANCHOR', [`ANCHOR_COUNT=${n} (attendu 1)`], before) };
  }

  // TRIBUNAL scellé (guardPatch du seam-surgeon) : la proposition est jugée
  // contre le gauche PRÉSERVÉ (avant l'ancre) + le droit (après l'ancre).
  const idx = chapterText.indexOf(occ.anchorSentence);
  const left = chapterText.slice(0, idx);
  const right = chapterText.slice(idx + occ.anchorSentence.length);
  const reasons = guardPatch(occ.proposedReplacement, {
    world,
    left,
    right,
    established: chapterText,
    chapterId: occ.chapter,
  });
  if (reasons.length > 0) {
    return { text: chapterText, result: mk('ESCALATE_GUARD', reasons, before) };
  }

  // Splice ciblé sur la PHRASE-TIC (≠ fenêtre gauche du seam).
  const patched = left + occ.proposedReplacement + right;

  // INV-TW-02 : re-scan — la densité de tic doit BAISSER (sinon REVERT).
  const after = maxTicDensityPer1000w(patched, ticLexicon);
  if (after >= before) {
    return { text: chapterText, result: mk('ESCALATE_RESCAN', [`TIC_NOT_REDUCED before=${before.toFixed(3)} after=${after.toFixed(3)}`], after) };
  }

  return { text: patched, result: mk('APPLIED', [`SEAM_GUARDS_PASSED:${occ.familyTags.join('+') || 'none'}`], after) };
}

/** Passe complète : applique une liste d'occurrences sur le texte entier, une
 *  par une, chaque patch jugé par le tribunal scellé. Opt-in par l'appelant
 *  (build-canonical défaut OFF). Retourne le texte neuf + le rapport tracé. */
export function applyTicRepairPass(
  fullText: string,
  occurrences: readonly TicOccurrence[],
  worldProvider: WorldProvider,
  ticLexicon: readonly string[],
): { readonly text: string; readonly report: TicRepairReport } {
  let text = fullText;
  const results: TicPatchResult[] = [];
  const densityBefore = maxTicDensityPer1000w(fullText, ticLexicon);

  for (const occ of occurrences) {
    const world = worldProvider(occ.chapter);
    const { text: next, result } = operateTic(text, occ, world, ticLexicon);
    if (result.verdict === 'APPLIED') text = next; // sinon REVERT implicite (texte inchangé).
    results.push(result);
  }

  const densityAfter = maxTicDensityPer1000w(text, ticLexicon);
  const applied = results.filter((r) => r.verdict === 'APPLIED').length;
  return {
    text,
    report: {
      results,
      applied,
      escalated: results.length - applied,
      densityBefore,
      densityAfter,
    },
  };
}
