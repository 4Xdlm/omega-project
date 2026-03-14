/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — SEUILS CENTRALISÉS (SSOT)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: core/thresholds.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Source unique de vérité pour tous les seuils de certification OMEGA.
 * Remplace les définitions dupliquées dans :
 *   - validation/phase-u/top-k-selection.ts (SAGA_READY_COMPOSITE_MIN, SAGA_READY_SSI_MIN)
 *   - cde/scene-chain.ts (SAGA_READY_COMPOSITE_MIN, SAGA_READY_MIN_AXIS)
 *
 * GRAVÉ — toute modification nécessite décision de l'Architecte Suprême.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ── SEAL_ATOMIC ───────────────────────────────────────────────────────────────
// Certification scène atomique — critère le plus strict
// INV-SEAL-01 : composite >= 93.0 ET tous floors >= 85.0

/** Composite minimum pour SEAL_ATOMIC */
export const SEAL_ATOMIC_COMPOSITE_MIN = 93.0;

/** Floor minimum pour tous les axes macro (SEAL_ATOMIC et SAGA_READY) */
export const SEAL_FLOOR_MIN = 85.0;

// ── SAGA_READY ────────────────────────────────────────────────────────────────
// Certification saga — critère production multi-scènes
// INV-SR-01 : composite >= 92.0 ET min_axis >= 85.0

/** Composite minimum pour SAGA_READY */
export const SAGA_READY_COMPOSITE_MIN = 92.0;

/** SSI (min_axis) minimum pour SAGA_READY — INV-SR-01 */
export const SAGA_READY_SSI_MIN = 85.0;

// ── NEAR_SEAL ─────────────────────────────────────────────────────────────────
// Seuil de protection Polish Engine — INV-PE-11
// Si composite >= NEAR_SEAL_THRESHOLD ET tous floors OK → NO_OP

/** Seuil near-seal : protection contre la dégradation par polish inutile */
export const NEAR_SEAL_THRESHOLD = 92.0;

// ── CANDIDACY ─────────────────────────────────────────────────────────────────
// Sas d'entrée Top-K — INV-TK-CANDIDATE-01

/** Floor minimum pour entrer dans le Top-K (candidacy gate) */
export const CANDIDATE_FLOOR_COMPOSITE = 85.0;
