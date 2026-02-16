/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SENTENCE SURGEON
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: polish/sentence-surgeon.ts
 * Version: 1.0.0 (Sprint 10 Commit 10.1)
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Invariants: ART-POL-01, ART-POL-02, ART-POL-03
 *
 * Purpose: Micro-correction engine — phrase-by-phrase rewriting with traceability.
 *
 * Architecture:
 * - MicroPatch: full traceability (original, rewritten, reason, scores, delta)
 * - SurgeonConfig: max corrections, min improvement, dry_run mode
 * - SurgeonResult: complete pass result with all patches
 *
 * Invariants Covered:
 * - ART-POL-01: Correction accepted ONLY if score_after > score_before + threshold
 * - ART-POL-02: Max 15 corrections per pass, 1 pass max
 * - ART-POL-03: Every correction traceable (MicroPatch)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Raisons de micro-correction.
 *
 * - cliche: cliché détecté (ex: "cœur battait")
 * - rhythm: monotonie rythmique (3+ phrases même longueur)
 * - redundancy: répétition non intentionnelle
 * - vague: formulation vague ou abstraite
 * - signature: absence de signature words
 * - transition: transition manquante ou abrupte
 * - telling: "telling" au lieu de "showing"
 * - ia_smell: pattern IA détecté (symétrie, perfection)
 */
export type MicroPatchReason =
  | 'cliche'
  | 'rhythm'
  | 'redundancy'
  | 'vague'
  | 'signature'
  | 'transition'
  | 'telling'
  | 'ia_smell';

/**
 * Traçabilité d'une micro-correction.
 *
 * Chaque correction est ENTIÈREMENT traçable :
 * - sentence_index: position dans la prose (0-indexed)
 * - original: phrase originale
 * - rewritten: phrase réécrite par le LLM
 * - reason: raison de la correction (type MicroPatchReason)
 * - score_before: score de la phrase AVANT correction
 * - score_after: score de la phrase APRÈS correction
 * - delta: score_after - score_before
 * - accepted: true SEULEMENT si delta > min_improvement
 *
 * Invariant ART-POL-01: accepted = true IFF score_after > score_before + min_improvement
 * Invariant ART-POL-03: tous les champs obligatoires, traçabilité totale
 *
 * @param sentence_index Position de la phrase (0-indexed)
 * @param original Phrase originale
 * @param rewritten Phrase réécrite
 * @param reason Raison de la correction
 * @param score_before Score avant correction
 * @param score_after Score après correction
 * @param delta Différence de score (score_after - score_before)
 * @param accepted Correction acceptée (true si delta > min_improvement)
 */
export interface MicroPatch {
  readonly sentence_index: number;
  readonly original: string;
  readonly rewritten: string;
  readonly reason: MicroPatchReason;
  readonly score_before: number;
  readonly score_after: number;
  readonly delta: number;
  readonly accepted: boolean;
}

/**
 * Configuration du surgeon.
 *
 * Invariant ART-POL-02: max_corrections_per_pass ≤ 15, max_passes = 1
 *
 * @param max_corrections_per_pass Nombre max de corrections par passe (default: 15)
 * @param max_passes Nombre max de passes (default: 1, hard limit)
 * @param min_improvement Amélioration minimale requise pour accepter (default: 2.0)
 * @param dry_run Mode diagnostique sans modification (default: false)
 */
export interface SurgeonConfig {
  readonly max_corrections_per_pass: number;
  readonly max_passes: number;
  readonly min_improvement: number;
  readonly dry_run: boolean;
}

/**
 * Résultat complet d'une passe de surgeon.
 *
 * Contient :
 * - Statistiques : tentées, acceptées, revertées
 * - Score total delta : somme des deltas acceptés
 * - Patches : array complet de tous les MicroPatch (traçabilité)
 * - Prose avant/après : pour diff et vérification
 *
 * Invariant ART-POL-03: tous les patches traçables dans l'array
 *
 * @param patches_attempted Nombre de corrections tentées
 * @param patches_accepted Nombre de corrections acceptées
 * @param patches_reverted Nombre de corrections revertées
 * @param total_score_delta Somme des deltas acceptés
 * @param patches Array complet de tous les MicroPatch
 * @param prose_before Prose avant correction
 * @param prose_after Prose après correction
 */
export interface SurgeonResult {
  readonly patches_attempted: number;
  readonly patches_accepted: number;
  readonly patches_reverted: number;
  readonly total_score_delta: number;
  readonly patches: readonly MicroPatch[];
  readonly prose_before: string;
  readonly prose_after: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULTS (CONSTANTES NOMMÉES — NO MAGIC NUMBERS)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Nombre maximum de corrections par passe.
 *
 * Invariant ART-POL-02: HARD LIMIT = 15
 */
export const DEFAULT_MAX_CORRECTIONS = 15;

/**
 * Nombre maximum de passes.
 *
 * Invariant ART-POL-02: HARD LIMIT = 1
 */
export const DEFAULT_MAX_PASSES = 1;

/**
 * Amélioration minimale requise pour accepter une correction.
 *
 * Invariant ART-POL-01: correction acceptée SEULEMENT si delta ≥ min_improvement
 *
 * Unité: points de score (0-100)
 */
export const DEFAULT_MIN_IMPROVEMENT = 2.0;

/**
 * Mode dry-run par défaut.
 *
 * false = corrections appliquées
 * true = diagnostique seulement (accepted=false pour tous)
 */
export const DEFAULT_DRY_RUN = false;

/**
 * Configuration par défaut du surgeon.
 */
export const DEFAULT_SURGEON_CONFIG: SurgeonConfig = {
  max_corrections_per_pass: DEFAULT_MAX_CORRECTIONS,
  max_passes: DEFAULT_MAX_PASSES,
  min_improvement: DEFAULT_MIN_IMPROVEMENT,
  dry_run: DEFAULT_DRY_RUN,
};
