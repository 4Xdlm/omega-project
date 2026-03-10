/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — POLISH ENGINE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: validation/phase-u/polish-engine.ts
 * Version: 1.1.0 (U-ROSETTE-11)
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Chirurgie post-génération multi-axe : améliore l'axe le plus bloquant
 * (SII via metaphor_novelty, ou RCI via voix/rythme/hook) sans altérer
 * les axes protégés (ECC, IFI, AAI).
 *
 * Invariants :
 *   INV-PE-01 : Polish s'applique uniquement si composite ∈ [POLISH_MIN, SEAL_THRESHOLD)
 *   INV-PE-02 : Drift check obligatoire — paragraphes et entités nommées préservés
 *   INV-PE-03 : Max 2 polish passes par candidat (évite boucle infinie)
 *   INV-PE-04 : Si drift > DRIFT_MAX → rejeter la prose polie, retourner l'originale
 *   INV-PE-05 : FAIL-CLOSED — toute erreur LLM retourne prose originale
 *   INV-PE-06 : Gate ECC : si ECC < 88 → NO_OP (dégradation non récupérable)
 *   INV-PE-07 : Union type : POLISHED / NO_OP / FAIL_INFRA / REJECTED_DRIFT / REJECTED_REGRESSION
 *   INV-PE-08 : verifyAxesStability : ECC/RCI/IFI ne régressent pas > MAX_REGRESSION_DELTA
 *   INV-PE-09 : Ciblage dynamique — axe le plus sous son floor parmi {SII, RCI}
 *   INV-PE-10 : Si tous floors OK mais composite < 93 → cibler le plus faible de {SII, RCI}
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { SovereignProvider } from '../../types.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Seuil minimal composite pour déclencher le polish (en dessous = trop dégradé) */
export const POLISH_MIN_COMPOSITE = 89.0;

/** Seuil SEAL (composite ≥ 93 + tous floors ≥ 85) */
export const POLISH_SEAL_THRESHOLD = 93.0;

/** Score novelty cible après polish SII */
export const NOVELTY_TARGET = 82.0;

/** Floor SII (SEAL gate) */
export const SII_FLOOR = 85.0;

/** Floor RCI (SEAL gate) */
export const RCI_FLOOR = 85.0;

/** Dérive maximale tolérée sur le nombre de paragraphes (0 = strict) */
export const DRIFT_MAX_PARAGRAPHS = 0;

/** Dérive maximale tolérée sur le nombre de mots (±7%) */
export const DRIFT_MAX_WORDS_PCT = 0.07;

/** Nombre maximum de passes polish par candidat */
export const MAX_POLISH_PASSES = 2;

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Axe cible du polish.
 * INV-PE-09 : déterminé dynamiquement par shouldApplyPolish.
 */
export type PolishTargetAxis = 'sii' | 'rci';

/**
 * Statuts de sortie explicites du Polish Engine (union type).
 * INV-PE-07 : tout résultat est classé dans l'une de ces catégories.
 */
export type PolishStatus =
  | 'POLISHED'              // prose polie appliquée, axes stables, drift ok
  | 'NO_OP'                 // polish non déclenché (gate non satisfaite)
  | 'FAIL_INFRA'            // erreur LLM ou réponse vide
  | 'REJECTED_DRIFT'        // drift paragraphes/mots hors tolérance
  | 'REJECTED_REGRESSION';  // ECC ou RCI ou IFI ont régressé après polish

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
  readonly target_axis: PolishTargetAxis | null;  // INV-PE-09 : null si NO_OP
  readonly reason: string;
}

// ── Decision Gate ─────────────────────────────────────────────────────────────

/**
 * Détermine si le Polish Engine doit s'appliquer à ce candidat,
 * et identifie dynamiquement l'axe cible.
 *
 * INV-PE-01 : composite ∈ [POLISH_MIN, SEAL_THRESHOLD)
 * INV-PE-06 : ECC < 88 → NO_OP (dégradation irrecuperable)
 * INV-PE-09 : ciblage dynamique — axe le plus sous son floor
 * INV-PE-10 : si tous floors OK mais composite < 93 → cibler le plus faible
 */
export function shouldApplyPolish(axes: PolishAxesSnapshot): PolishEngineDecision {
  // INV-PE-01 : composite trop dégradé
  if (axes.composite < POLISH_MIN_COMPOSITE) {
    return {
      should_polish: false,
      target_axis: null,
      reason: `composite=${axes.composite.toFixed(1)} < POLISH_MIN=${POLISH_MIN_COMPOSITE} — trop dégradé`,
    };
  }

  // SEAL-compliant : composite >= 93 ET tous les floors atteints → inutile
  const isFullySealCompliant =
    axes.composite >= POLISH_SEAL_THRESHOLD &&
    axes.sii >= SII_FLOOR &&
    axes.ecc >= 88.0 &&
    axes.rci >= RCI_FLOOR;

  if (isFullySealCompliant) {
    return {
      should_polish: false,
      target_axis: null,
      reason: `composite=${axes.composite.toFixed(1)} et tous les floors atteints — déjà SEAL-compliant`,
    };
  }

  // INV-PE-06 : ECC < 88 → régression catastrophique déjà présente, polish inutile
  if (axes.ecc < 88.0) {
    return {
      should_polish: false,
      target_axis: null,
      reason: `ecc=${axes.ecc.toFixed(1)} < 88 — ECC trop dégradé, polish ne résoudra pas`,
    };
  }

  // INV-PE-09 : Ciblage dynamique — gaps par rapport aux floors SEAL
  const siiGap = Math.max(0, SII_FLOOR - axes.sii);   // > 0 si SII < 85
  const rciGap = Math.max(0, RCI_FLOOR - axes.rci);   // > 0 si RCI < 85

  // Cas spécial : SII sous floor mais metaphor_novelty déjà >= NOVELTY_TARGET
  // → polish métaphore ne peut pas combler le gap (anti_cliche/necessity bloquants)
  if (siiGap > 0 && axes.metaphor_novelty >= NOVELTY_TARGET && rciGap === 0) {
    return {
      should_polish: false,
      target_axis: null,
      reason: `metaphor_novelty=${axes.metaphor_novelty.toFixed(1)} >= cible=${NOVELTY_TARGET} mais SII=${axes.sii.toFixed(1)}<85 — gap anti_cliche/necessity non récupérable`,
    };
  }

  // INV-PE-10 : Si tous les floors sont OK mais composite < 93 → cibler le plus faible
  if (siiGap === 0 && rciGap === 0) {
    // composite < SEAL_THRESHOLD (vérifié implicitement — isFullySealCompliant=false)
    const target: PolishTargetAxis = axes.sii <= axes.rci ? 'sii' : 'rci';
    return {
      should_polish: true,
      target_axis: target,
      reason: `composite=${axes.composite.toFixed(1)}<93, floors OK — ciblage ${target} (sii=${axes.sii.toFixed(1)}, rci=${axes.rci.toFixed(1)})`,
    };
  }

  // INV-PE-09 : Au moins un axe sous floor — cibler celui avec le plus grand gap
  let target: PolishTargetAxis;
  let gapDesc: string;

  if (siiGap > 0 && rciGap > 0) {
    // Les deux sous floor → cibler le plus grand gap
    target = siiGap >= rciGap ? 'sii' : 'rci';
    gapDesc = `sii=${axes.sii.toFixed(1)} (gap=${siiGap.toFixed(1)}), rci=${axes.rci.toFixed(1)} (gap=${rciGap.toFixed(1)})`;
  } else if (siiGap > 0) {
    target = 'sii';
    gapDesc = `SII=${axes.sii.toFixed(1)}<85 (gap=${siiGap.toFixed(1)}), metaphor_novelty=${axes.metaphor_novelty.toFixed(1)}`;
  } else {
    target = 'rci';
    gapDesc = `RCI=${axes.rci.toFixed(1)}<85 (gap=${rciGap.toFixed(1)})`;
  }

  return {
    should_polish: true,
    target_axis: target,
    reason: `composite=${axes.composite.toFixed(1)}, ${gapDesc} — polish ${target} ciblé`,
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

// ── Polish Prompts ────────────────────────────────────────────────────────────

/**
 * Prompt chirurgical ciblant SII — améliore metaphor_novelty.
 * Principe : le LLM voit ses propres scores et a une seule intervention autorisée.
 */
function buildPolishPromptSII(prose: string, axes: PolishAxesSnapshot): string {
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

/**
 * Prompt chirurgical ciblant RCI — améliore voix/rythme/hook.
 * Cible : voice_conformity (attaques de phrases) + hook_presence (ouverture).
 * INV-PE-09 : activé uniquement quand RCI est l'axe le plus bloquant.
 */
function buildPolishPromptRCI(prose: string, axes: PolishAxesSnapshot): string {
  return `Tu as écrit ce texte littéraire. Je vais te montrer tes scores et t'autoriser une seule intervention chirurgicale.

# TES SCORES ACTUELS

| Axe | Score | Statut |
|-----|-------|--------|
| ECC (narration/histoire) | ${axes.ecc.toFixed(1)} | ✅ PROTÉGÉ — NE PAS MODIFIER |
| RCI (rythme/voix/signature) | ${axes.rci.toFixed(1)} | ❌ BLOQUANT (floor=85) |
| SII (originalité) | ${axes.sii.toFixed(1)} | ✅ protégé |

# POURQUOI RCI BLOQUE

RCI = moyenne de : rythme des phrases, signature de voix, hook d'ouverture, euphonie, conformité vocale.
Les sous-axes les plus sensibles : la conformité de voix (attaques de phrases) et le hook d'ouverture.

Cible : RCI ≥ 85.0 (actuellement ${axes.rci.toFixed(1)}).

# INTERVENTION AUTORISÉE (une seule)

Tu peux modifier **uniquement** les attaques de phrases (les 3-5 premiers mots de chaque phrase) pour :
1. Varier les structures d'ouverture (éviter les répétitions de "Il", "Elle", "Le", "La")
2. Renforcer le hook du premier paragraphe (rendre la première phrase plus magnétique)
3. Améliorer la fluidité phonétique (éviter les consonnes dures qui s'accumulent)

Exemples d'attaques vivantes :
- "Sans se retourner," / "D'un geste bref," / "Le regard fixé sur..." / "Quelque chose en elle..."
- Varier : déclaratif / participial / absolu / elliptique

# CONTRAINTES ABSOLUES (violation = rejet du texte poli)

❌ INTERDIT de modifier :
- Le contenu narratif (événements, actions, informations)
- Le nombre de paragraphes (EXACTEMENT ${Math.max(1, prose.split(/\n\s*\n/).filter(p => p.trim().length > 0).length)} paragraphes en sortie)
- Les entités nommées (personnages, lieux)
- Les métaphores et images déjà présentes (SII protégé)
- La longueur globale des phrases (± 2 mots maximum par phrase)

# TEXTE ORIGINAL

${prose}

# INSTRUCTION FINALE

Retourne UNIQUEMENT le texte complet modifié, sans commentaire, sans explication, sans balise.
Si les attaques de phrases sont déjà variées et que tu ne peux pas améliorer sans casser les contraintes, retourne le texte original inchangé.`;
}

/**
 * Dispatch vers le prompt adapté à l'axe cible.
 * INV-PE-09 : ciblage dynamique.
 */
function buildPolishPrompt(
  prose: string,
  axes: PolishAxesSnapshot,
  targetAxis: PolishTargetAxis,
): string {
  if (targetAxis === 'rci') {
    return buildPolishPromptRCI(prose, axes);
  }
  return buildPolishPromptSII(prose, axes);
}

// ── Axes Stability Check ──────────────────────────────────────────────────────

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
 * @param seed        - Seed déterministe
 * @param targetAxis  - Axe cible (INV-PE-09). Défaut: 'sii' (rétrocompatibilité)
 * @returns PolishPassResult
 */
export async function applyPolishPass(
  prose: string,
  axes: PolishAxesSnapshot,
  provider: SovereignProvider,
  passNumber: number = 1,
  seed: string = 'polish-pass',
  targetAxis: PolishTargetAxis = 'sii',
): Promise<PolishPassResult> {
  const makeResult = (polished: string, infraOk: boolean, infraReason: string): PolishPassResult => {
    const drift = checkDrift(prose, polished);
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
    const prompt = buildPolishPrompt(prose, axes, targetAxis);
    const polishedProse = await provider.generateDraft(prompt, 'polish', seed);

    if (!polishedProse || polishedProse.trim().length < 100) {
      return makeResult(prose, false, 'EMPTY_RESPONSE — original conservé');
    }

    const cleaned = polishedProse.trim();
    return makeResult(cleaned, true, `polish pass ${passNumber} [target=${targetAxis}] appliqué`);

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`[POLISH-ENGINE] FAIL-CLOSED pass ${passNumber} [${targetAxis}]: ${msg.slice(0, 120)}\n`);
    return makeResult(prose, false, `LLM_ERROR: ${msg.slice(0, 80)}`);
  }
}

// ── Full Polish Loop ──────────────────────────────────────────────────────────

/**
 * Boucle complète : applique jusqu'à MAX_POLISH_PASSES passes.
 * Arrête dès que l'axe cible dépasse son floor (via re-score externe).
 *
 * Usage :
 *   const decision = shouldApplyPolish(axes);
 *   if (decision.should_polish && decision.target_axis) {
 *     const result = await applyPolishPass(prose, axes, provider, 1, seed, decision.target_axis);
 *     // re-scorer result.polished_prose avec judgeAesthetic
 *     // si scores ok → SEAL
 *   }
 *
 * INV-PE-03: MAX_POLISH_PASSES = 2
 */
export { MAX_POLISH_PASSES as POLISH_MAX_PASSES };
