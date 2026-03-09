/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — POLISH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/phase-u/polish-engine.ts
 * Version: 1.0.0 (U-W2)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Chirurgie post-génération mono-axe : améliore metaphor_novelty sans altérer
 * ECC / RCI / structure prose.
 *
 * Invariants :
 *   INV-PE-01 : Polish s'applique uniquement si composite ∈ [POLISH_MIN, SEAL_THRESHOLD)
 *   INV-PE-02 : Drift check obligatoire — paragraphes et entités nommées préservés
 *   INV-PE-03 : Max 2 polish passes par candidat (évite boucle infinie)
 *   INV-PE-04 : Si drift > DRIFT_MAX → rejeter la prose polie, retourner l'originale
 *   INV-PE-05 : FAIL-CLOSED — toute erreur LLM retourne prose originale
 *   INV-PE-06 : Polish uniquement si metaphor_novelty < NOVELTY_TARGET et SII < SII_FLOOR
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Seuil minimal composite pour déclencher le polish (en dessous = trop dégradé) */
export const POLISH_MIN_COMPOSITE = 89.0;

/** Seuil SEAL (composite ≥ 93 + tous floors ≥ 85) */
export const POLISH_SEAL_THRESHOLD = 93.0;

/** Score novelty cible après polish */
export const NOVELTY_TARGET = 82.0;

/** Floor SII en dessous duquel le polish est utile */
export const SII_FLOOR = 85.0;

/** Dérive maximale tolérée sur le nombre de paragraphes (0 = strict) */
export const DRIFT_MAX_PARAGRAPHS = 0;

/** Dérive maximale tolérée sur le nombre de mots (±5%) */
export const DRIFT_MAX_WORDS_PCT = 0.07;

/** Nombre maximum de passes polish par candidat */
export const MAX_POLISH_PASSES = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Statuts de sortie explicites du Polish Engine (union type).
 * INV-PE-07 : tout résultat est classé dans l'une de ces 4 catégories.
 */
export type PolishStatus =
  | 'POLISHED'         // prose polie appliquée, axes stables, drift ok
  | 'NO_OP'            // polish non déclenché (gate INV-PE-01/06 non satisfaite)
  | 'FAIL_INFRA'       // erreur LLM ou réponse vide
  | 'REJECTED_DRIFT'   // drift paragraphes/mots hors tolérance
  | 'REJECTED_REGRESSION'; // ECC ou RCI ou IFI ont régressé après polish

export interface PolishAxesSnapshot {
  readonly composite: number;
  readonly ecc: number;
  readonly rci: number;
  readonly sii: number;
  readonly ifi: number;
  readonly aai: number;
  readonly metaphor_novelty: number;
  readonly necessity: number;
  readonly anti_cliche: number;
}

export interface PolishDriftReport {
  readonly paragraphs_before: number;
  readonly paragraphs_after: number;
  readonly words_before: number;
  readonly words_after: number;
  readonly drift_paragraphs: number;
  readonly drift_words_pct: number;
  readonly drift_ok: boolean;
}

export interface PolishPassResult {
  readonly polished_prose: string;
  readonly original_prose: string;
  readonly drift: PolishDriftReport;
  readonly pass_number: number;
  readonly status: PolishStatus;
  /** @deprecated Utiliser status. Conservé pour compatibilité descendante. */
  readonly applied: boolean;
  readonly reason: string;
}

/**
 * Résultat de la validation de stabilité des axes protégés après polish.
 * INV-PE-08 : ECC/RCI/IFI ne doivent pas régresser au-delà des seuils de tolérance.
 */
export interface AxesStabilityReport {
  readonly ecc_before: number;
  readonly ecc_after: number;
  readonly rci_before: number;
  readonly rci_after: number;
  readonly ifi_before: number;
  readonly ifi_after: number;
  readonly ecc_regression: number;  // delta négatif = régression
  readonly rci_regression: number;
  readonly ifi_regression: number;
  readonly stability_ok: boolean;   // true si aucune régression > MAX_REGRESSION_DELTA
  readonly failed_axes: readonly string[];
}

/** Tolérance maximale de régression sur les axes protégés (ECC, RCI, IFI) */
export const MAX_REGRESSION_DELTA = 1.5;

export interface PolishEngineDecision {
  readonly should_polish: boolean;
  readonly reason: string;
}

// ── Decision Gate ─────────────────────────────────────────────────────────────

/**
 * Détermine si le Polish Engine doit s'appliquer à ce candidat.
 * INV-PE-01 + INV-PE-06
 */
export function shouldApplyPolish(axes: PolishAxesSnapshot): PolishEngineDecision {
  if (axes.composite < POLISH_MIN_COMPOSITE) {
    return {
      should_polish: false,
      reason: `composite=${axes.composite.toFixed(1)} < POLISH_MIN=${POLISH_MIN_COMPOSITE} — trop dégradé`,
    };
  }
  // SEAL requiert composite >= 93 ET tous les floors (SII >= 85, ECC >= 88, RCI >= 85)
  // Si l'un des floors échoue, le run N'EST PAS scellable — le polish peut aider
  const isFullySealCompliant =
    axes.composite >= POLISH_SEAL_THRESHOLD &&
    axes.sii >= SII_FLOOR &&
    axes.ecc >= 88.0 &&
    axes.rci >= 85.0;
  if (isFullySealCompliant) {
    return {
      should_polish: false,
      reason: `composite=${axes.composite.toFixed(1)} et tous les floors atteints — déjà SEAL-compliant`,
    };
  }
  if (axes.sii >= SII_FLOOR) {
    return {
      should_polish: false,
      reason: `SII=${axes.sii.toFixed(1)} >= floor=${SII_FLOOR} — SII déjà suffisant`,
    };
  }
  if (axes.metaphor_novelty >= NOVELTY_TARGET) {
    return {
      should_polish: false,
      reason: `metaphor_novelty=${axes.metaphor_novelty.toFixed(1)} >= cible=${NOVELTY_TARGET} — déjà atteint`,
    };
  }
  if (axes.ecc < 88.0) {
    return {
      should_polish: false,
      reason: `ecc=${axes.ecc.toFixed(1)} < 88 — ECC trop dégradé, polish ne résoudra pas`,
    };
  }

  return {
    should_polish: true,
    reason: `composite=${axes.composite.toFixed(1)}, SII=${axes.sii.toFixed(1)}, metaphor_novelty=${axes.metaphor_novelty.toFixed(1)} — polish ciblé`,
  };
}

// ── Drift Check ───────────────────────────────────────────────────────────────

/**
 * Vérifie que la prose polie ne dérive pas trop de l'originale.
 * INV-PE-02 + INV-PE-04
 */
export function checkDrift(original: string, polished: string): PolishDriftReport {
  const countParagraphs = (text: string): number =>
    text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;

  const countWords = (text: string): number =>
    text.trim().split(/\s+/).filter(w => w.length > 0).length;

  const paragraphs_before = countParagraphs(original);
  const paragraphs_after  = countParagraphs(polished);
  const words_before      = countWords(original);
  const words_after       = countWords(polished);

  const drift_paragraphs  = Math.abs(paragraphs_after - paragraphs_before);
  const drift_words_pct   = Math.abs(words_after - words_before) / Math.max(words_before, 1);

  const drift_ok = drift_paragraphs <= DRIFT_MAX_PARAGRAPHS && drift_words_pct <= DRIFT_MAX_WORDS_PCT;

  return {
    paragraphs_before,
    paragraphs_after,
    words_before,
    words_after,
    drift_paragraphs,
    drift_words_pct,
    drift_ok,
  };
}

// ── Polish Prompt ─────────────────────────────────────────────────────────────

/**
 * Construit le prompt chirurgical pour le polish pass.
 * Principe : le LLM voit ses propres scores et a une seule intervention autorisée.
 */
function buildPolishPrompt(prose: string, axes: PolishAxesSnapshot): string {
  return `Tu as écrit ce texte littéraire. Je vais te montrer tes scores et t'autoriser une seule intervention chirurgicale.

# TES SCORES ACTUELS

| Axe | Score | Statut |
|-----|-------|--------|
| ECC (narration/histoire) | ${axes.ecc.toFixed(1)} | ✅ PROTÉGÉ — NE PAS MODIFIER |
| RCI (rythme/voix) | ${axes.rci.toFixed(1)} | ✅ PROTÉGÉ — NE PAS MODIFIER |
| SII (originalité) | ${axes.sii.toFixed(1)} | ❌ BLOQUANT (floor=85) |
| └── anti_cliche | ${axes.anti_cliche.toFixed(0)} | ✅ bon |
| └── necessity | ${axes.necessity.toFixed(0)} | ✅ bon |
| └── metaphor_novelty | ${axes.metaphor_novelty.toFixed(1)} | ❌ trop faible (cible ≥ 82) |

# POURQUOI SII BLOQUE

Formule SII = (anti_cliche + necessity + metaphor_novelty) / 3
Actuel : (${axes.anti_cliche.toFixed(0)} + ${axes.necessity.toFixed(0)} + ${axes.metaphor_novelty.toFixed(1)}) / 3 = ${axes.sii.toFixed(1)} → sous le floor 85
Avec metaphor_novelty = 82 : (${axes.anti_cliche.toFixed(0)} + ${axes.necessity.toFixed(0)} + 82) / 3 = ${((axes.anti_cliche + axes.necessity + 82) / 3).toFixed(1)} → PASS ✅

# INTERVENTION AUTORISÉE (une seule)

Identifie 1 ou 2 métaphores, comparaisons ou analogies dans ce texte.
Remplace-les par des images originales avec novelty_score ≥ 82.

Critères d'une image originale (novelty ≥ 82) :
- Deux domaines inattendus l'un par rapport à l'autre (ex: texture artisanale ↔ émotion brute)
- Jamais vue dans un roman grand public
- Légèrement oblique, asymétrique, pas parfaitement construite — c'est ce qui la rend vivante
- Ex: "sa colère avait le grain du papier de verre sur bois encore vert"
- Ex: "le silence s'était déposé comme un limon après la crue"

# CONTRAINTES ABSOLUES (violation = rejet du texte poli)

❌ INTERDIT de modifier :
- La structure des phrases (longueur, syntaxe, ponctuation)
- L'ordre des événements et des beats narratifs
- Le nombre de paragraphes (EXACTEMENT ${Math.max(1, prose.split(/\n\s*\n/).filter(p => p.trim().length > 0).length)} paragraphes en sortie)
- Les entités nommées (personnages, lieux)
- Le rythme global (syncopes, alternances court/long)

# TEXTE ORIGINAL

${prose}

# INSTRUCTION FINALE

Retourne UNIQUEMENT le texte complet modifié, sans commentaire, sans explication, sans balise.
Si aucune métaphore ne peut être améliorée sans casser les contraintes, retourne le texte original inchangé.`;
}

// ── Axes Stability Check ─────────────────────────────────────────────────

/**
 * Vérifie que les axes protégés (ECC, RCI, IFI) n'ont pas régressé après polish.
 * INV-PE-08 : accepté uniquement si aucun axe ne perd > MAX_REGRESSION_DELTA points.
 *
 * @param axesBefore  - Scores avant polish (du générateur zero-shot)
 * @param axesAfter   - Scores après polish (du ré-scoring)
 */
export function verifyAxesStability(
  axesBefore: PolishAxesSnapshot,
  axesAfter: PolishAxesSnapshot,
): AxesStabilityReport {
  const ecc_regression = axesAfter.ecc - axesBefore.ecc;
  const rci_regression = axesAfter.rci - axesBefore.rci;
  const ifi_regression = axesAfter.ifi - axesBefore.ifi;

  const failedAxes: string[] = [];
  if (ecc_regression < -MAX_REGRESSION_DELTA) failedAxes.push(`ECC: ${axesBefore.ecc.toFixed(1)}→${axesAfter.ecc.toFixed(1)} (δ=${ecc_regression.toFixed(1)})`);
  if (rci_regression < -MAX_REGRESSION_DELTA) failedAxes.push(`RCI: ${axesBefore.rci.toFixed(1)}→${axesAfter.rci.toFixed(1)} (δ=${rci_regression.toFixed(1)})`);
  if (ifi_regression < -MAX_REGRESSION_DELTA) failedAxes.push(`IFI: ${axesBefore.ifi.toFixed(1)}→${axesAfter.ifi.toFixed(1)} (δ=${ifi_regression.toFixed(1)})`);

  return {
    ecc_before: axesBefore.ecc,
    ecc_after: axesAfter.ecc,
    rci_before: axesBefore.rci,
    rci_after: axesAfter.rci,
    ifi_before: axesBefore.ifi,
    ifi_after: axesAfter.ifi,
    ecc_regression,
    rci_regression,
    ifi_regression,
    stability_ok: failedAxes.length === 0,
    failed_axes: failedAxes,
  };
}

// ── Polish Engine Core ────────────────────────────────────────────────────────

/**
 * Applique une passe de polish chirurgical sur la prose.
 * INV-PE-03 + INV-PE-04 + INV-PE-05
 *
 * @param prose       - Texte original
 * @param axes        - Scores actuels du texte
 * @param provider    - SovereignProvider LLM
 * @param passNumber  - Numéro de passe (1 ou 2)
 * @returns PolishPassResult
 */
export async function applyPolishPass(
  prose: string,
  axes: PolishAxesSnapshot,
  provider: SovereignProvider,
  passNumber: number = 1,
  seed: string = 'polish-pass',
): Promise<PolishPassResult> {
  const makeResult = (polished: string, infraOk: boolean, infraReason: string): PolishPassResult => {
    const drift = checkDrift(prose, polished);
    // Le drift n'est pertinent que si le LLM a produit un texte valide
    // Si infraOk=false (erreur LLM, réponse vide), on retourne FAIL_INFRA
    if (!infraOk) {
      return {
        polished_prose: prose,
        original_prose: prose,
        drift,
        pass_number: passNumber,
        status: 'FAIL_INFRA',
        applied: false,
        reason: infraReason,
      };
    }
    if (!drift.drift_ok) {
      return {
        polished_prose: prose,
        original_prose: prose,
        drift,
        pass_number: passNumber,
        status: 'REJECTED_DRIFT',
        applied: false,
        reason: `DRIFT_REJECTED: paragraphs_drift=${drift.drift_paragraphs}, words_drift=${(drift.drift_words_pct * 100).toFixed(1)}% — original conservé`,
      };
    }
    return {
      polished_prose: polished,
      original_prose: prose,
      drift,
      pass_number: passNumber,
      status: 'POLISHED',
      applied: true,
      reason: infraReason,
    };
  };

  // INV-PE-05: FAIL-CLOSED
  try {
    const prompt = buildPolishPrompt(prose, axes);
    const polishedProse = await provider.generateDraft(prompt, 'polish', seed);

    if (!polishedProse || polishedProse.trim().length < 100) {
      return makeResult(prose, false, 'EMPTY_RESPONSE — original conservé');
    }

    const cleaned = polishedProse.trim();
    return makeResult(cleaned, true, `polish pass ${passNumber} appliqué`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[POLISH-ENGINE] FAIL-CLOSED pass ${passNumber}: ${msg.slice(0, 120)}\n`);
    return makeResult(prose, false, `LLM_ERROR: ${msg.slice(0, 80)}`);
  }
}

// ── Full Polish Loop ──────────────────────────────────────────────────────────

/**
 * Boucle complète : applique jusqu'à MAX_POLISH_PASSES passes.
 * Arrête dès que metaphor_novelty ≥ NOVELTY_TARGET (via re-score externe).
 *
 * Usage :
 *   const decision = shouldApplyPolish(axes);
 *   if (decision.should_polish) {
 *     const result = await applyPolishPass(prose, axes, provider);
 *     // re-scorer result.polished_prose avec judgeAesthetic
 *     // si scores ok → SEAL
 *   }
 *
 * INV-PE-03: MAX_POLISH_PASSES = 2
 */
export { MAX_POLISH_PASSES as POLISH_MAX_PASSES };
