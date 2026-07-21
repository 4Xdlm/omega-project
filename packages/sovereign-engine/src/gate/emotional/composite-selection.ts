/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 COMPOSITE SELECTION (V4.4 → R6 BRIDGE, SHADOW)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/emotional/composite-selection.ts
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Spec:     outputs/V4_4_TO_R6_BRIDGE_SPEC.md
 * NCR:      NCR_EMOTION_TAXONOMY_14_VS_16.md
 *
 * COEUR DU BRIDGE CONSTITUTIONNEL. Le R6 gate sélectionne aujourd'hui le meilleur
 * des N jets sur le SEUL score de STYLE (`scoreForR6Gate` = baseline_tier_score
 * CALC V3.4). La constitution OMEGA pondère 60% EMOTION / 25% LOGIQUE / 15% STYLE.
 * Ce module calcule le score COMPOSITE constitutionnel et mesure la DIVERGENCE
 * de sélection entre l'ancien (style-only) et le nouveau (composite).
 *
 * == PORTEE : SHADOW / PUR / DETERMINISTE ==
 *   - Fonctions PURES : aucune I/O, aucun LLM, aucun etat global.
 *   - N'est PAS cable dans `r6-rejection-gate.ts` : ne change AUCUNE selection
 *     de production (hash de sortie livre inchange). Cablage log-only = etape
 *     suivante gatee (cf V4_4_TO_R6_SHADOW_PLAN.md).
 *   - ADR-003 : CALC SELECTIONNE, ne coache pas. Aucun feedback au Scribe.
 *   - Activation (flip shadow->active) = modif MOTEUR => EMP-16 (3 preuves).
 *
 * Les scores d'entree sont normalises dans [0,1] :
 *   emotion01 = <scoreur emotion APPROUVE>/100  (voir AVERTISSEMENT ci-dessous)
 *   logic01   = axe coherence /100          (capteurs existants, ex: continuity-oracle)
 *   style01   = normalizeCalcScore(calcScore)  (echelle tier ~[1.5,6.5] -> [0,1])
 *
 * !! AVERTISSEMENT GOUVERNANCE (FORBID-CANON-GARAGE-001) !!
 *   Le canon `Emotion14 target_14d` (deriveEmotionContract.ts) + le runtime
 *   `emotion_14d`/`tension_14d` sont GARAGE/DORMANT — RESURRECTION INTERDITE
 *   (NCR_EMOTION14_CANON_DRIFT ; lecon NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE :
 *   ne JAMAIS forcer `target_14d` (qui reste {}) pour faire passer un Oracle).
 *   => Ce module est AGNOSTIQUE du moteur : `emotion01` est un score INJECTE.
 *      La SOURCE d'`emotion01` doit etre un signal emotion NON-GARAGE, approuve
 *      par Tribunal (voie WS-C : pouvoir discriminant MESURE). N'utilisez PAS
 *      scoreTension14D/target_14d comme source tant que le garage n'est pas leve.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/** Ponderation du composite. Defaut = constitution OMEGA (VISION FROZEN). */
export interface CompositeWeights {
  readonly emotion: number;
  readonly logic: number;
  readonly style: number;
}

/** Constitution OMEGA : 60% emotion / 25% logique / 15% style. Non negociable sans amendement. */
export const CONSTITUTION_WEIGHTS: CompositeWeights = { emotion: 0.6, logic: 0.25, style: 0.15 };

/** Bornes de l'echelle tier ordinal du CALC V3.4 (baseline_tier_score). Cf r6-types.ts threshold. */
export const CALC_TIER_MIN = 1.5;
export const CALC_TIER_MAX = 6.5;

/** Scores normalises [0,1] d'un jet candidat. */
export interface CandidateScores {
  /** Identifiant du jet (index de tentative R6, ou seed). */
  readonly id: string;
  /** Fidelite emotionnelle [0,1] — score INJECTE d'un moteur NON-GARAGE approuve
   *  (PAS scoreTension14D/target_14d : FORBID-CANON-GARAGE-001). */
  readonly emotion01: number;
  /** Coherence/logique [0,1] — axe(s) de coherence existant(s). */
  readonly logic01: number;
  /** Style [0,1] — calcScore CALC V3.4 normalise (le signal R6 actuel). */
  readonly style01: number;
}

/** Resultat composite d'un candidat. */
export interface CompositeScore {
  readonly id: string;
  readonly composite: number;
  readonly emotion01: number;
  readonly logic01: number;
  readonly style01: number;
}

/** Rapport de divergence : ce que l'ancien gate (style) choisit vs le composite. */
export interface DivergenceReport {
  /** Jet choisi par l'ANCIEN critere (style-only, argmax style01). */
  readonly styleOnlyPickId: string;
  /** Jet choisi par le composite constitutionnel (argmax composite). */
  readonly compositePickId: string;
  /** Les deux criteres choisissent-ils un jet DIFFERENT ? */
  readonly diverged: boolean;
  /** Candidats tries par composite decroissant (tie-break deterministe par id). */
  readonly rankedByComposite: readonly CompositeScore[];
  /** Ordre des ids par style decroissant (reference ancien gate). */
  readonly rankingByStyle: readonly string[];
  /** Ponderation utilisee. */
  readonly weights: CompositeWeights;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Normalise un baseline_tier_score CALC (~[1.5,6.5]) vers [0,1]. NaN -> 0. */
export function normalizeCalcScore(calcScore: number): number {
  if (!Number.isFinite(calcScore)) return 0;
  return clamp01((calcScore - CALC_TIER_MIN) / (CALC_TIER_MAX - CALC_TIER_MIN));
}

/**
 * Verifie qu'une ponderation somme a 1 (tolerance 1e-9) et est non-negative.
 * @throws Error si invalide — la config de selection ne doit jamais etre bancale.
 */
export function assertValidWeights(w: CompositeWeights): void {
  if (w.emotion < 0 || w.logic < 0 || w.style < 0) {
    throw new Error(`CompositeWeights: poids negatif interdit (${JSON.stringify(w)})`);
  }
  const sum = w.emotion + w.logic + w.style;
  if (Math.abs(sum - 1) > 1e-9) {
    throw new Error(`CompositeWeights: somme=${sum} (doit valoir 1)`);
  }
}

/** Score composite [0,1] = w.(emotion, logic, style). Entrees clampees [0,1]. */
export function computeComposite(s: CandidateScores, w: CompositeWeights = CONSTITUTION_WEIGHTS): number {
  assertValidWeights(w);
  return w.emotion * clamp01(s.emotion01) + w.logic * clamp01(s.logic01) + w.style * clamp01(s.style01);
}

/** Compare deux ids de facon deterministe (tie-break stable). */
function idLess(a: string, b: string): boolean {
  return a < b;
}

/**
 * Selection composite + rapport de divergence vs le critere style-only.
 * PUR, deterministe, log-only. Ne modifie AUCUNE selection de production.
 *
 * @param candidates - jets candidats (>=1) avec scores normalises.
 * @param w - ponderation (defaut = constitution 60/25/15).
 * @throws Error si `candidates` est vide ou si `w` est invalide.
 */
export function selectWithDivergence(
  candidates: readonly CandidateScores[],
  w: CompositeWeights = CONSTITUTION_WEIGHTS,
): DivergenceReport {
  assertValidWeights(w);
  if (candidates.length === 0) {
    throw new Error('selectWithDivergence: aucun candidat');
  }

  const scored: CompositeScore[] = candidates.map((c) => ({
    id: c.id,
    composite: computeComposite(c, w),
    emotion01: clamp01(c.emotion01),
    logic01: clamp01(c.logic01),
    style01: clamp01(c.style01),
  }));

  // argmax composite (tie-break deterministe : id le plus petit).
  const compositePick = scored.reduce((best, cur) =>
    cur.composite > best.composite || (cur.composite === best.composite && idLess(cur.id, best.id)) ? cur : best,
  );
  // argmax style-only (le critere R6 actuel).
  const stylePick = scored.reduce((best, cur) =>
    cur.style01 > best.style01 || (cur.style01 === best.style01 && idLess(cur.id, best.id)) ? cur : best,
  );

  const rankedByComposite = [...scored].sort((a, b) => (b.composite - a.composite) || (idLess(a.id, b.id) ? -1 : 1));
  const rankingByStyle = [...scored].sort((a, b) => (b.style01 - a.style01) || (idLess(a.id, b.id) ? -1 : 1)).map((s) => s.id);

  return {
    styleOnlyPickId: stylePick.id,
    compositePickId: compositePick.id,
    diverged: stylePick.id !== compositePick.id,
    rankedByComposite,
    rankingByStyle,
    weights: w,
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// SHADOW DUAL — full (60/25/15) vs emotion_style (60/40) — isole l'effet émotion
// du bruit logique (durcissement ChatGPT 2026-07-21). PUR, observationnel.
// ──────────────────────────────────────────────────────────────────────────────

/** Composite SANS logique : 60% émotion / 40% style. Isole l'effet émotion. */
export const EMOTION_STYLE_WEIGHTS: CompositeWeights = { emotion: 0.6, logic: 0, style: 0.4 };

/** Détail composite par jet (les deux pondérations). */
export interface PerAttemptShadow {
  readonly id: string;
  readonly emotion01: number;
  readonly logic01: number;
  readonly style01: number;
  readonly composite_full: number;
  readonly composite_emotion_style: number;
}

/** Résultat shadow complet attaché (optionnellement) au R6GateResult. Log-only. */
export interface R6CompositeShadowResult {
  readonly enabled: true;
  /** Divergence sous pondération constitutionnelle 60/25/15. */
  readonly full: DivergenceReport;
  /** Divergence sous pondération 60/40 (sans logique). */
  readonly emotionStyle: DivergenceReport;
  /** Id du jet réellement sélectionné en PRODUCTION (style-only) — INCHANGÉ. */
  readonly productionPickId: string;
  /** Gains (composite_full) si divergence, sinon 0. */
  readonly emotionGainIfDivergedFull: number;
  readonly styleDeltaIfDivergedFull: number;
  readonly logicDeltaIfDivergedFull: number;
  readonly perAttempt: readonly PerAttemptShadow[];
}

/**
 * Construit le résultat shadow dual à partir de candidats déjà normalisés.
 * PUR / déterministe / observationnel — ne sélectionne rien en production.
 *
 * @param candidates - scores normalisés des jets.
 * @param productionPickId - id du jet choisi par la PROD (style-only), pour audit.
 * @throws Error si `candidates` est vide.
 */
export function buildCompositeShadow(
  candidates: readonly CandidateScores[],
  productionPickId: string,
): R6CompositeShadowResult {
  if (candidates.length === 0) throw new Error('buildCompositeShadow: aucun candidat');
  const full = selectWithDivergence(candidates, CONSTITUTION_WEIGHTS);
  const emotionStyle = selectWithDivergence(candidates, EMOTION_STYLE_WEIGHTS);

  const byId = new Map(candidates.map((c) => [c.id, c]));
  const sp = byId.get(full.styleOnlyPickId);
  const cp = byId.get(full.compositePickId);
  const divergedFull = full.diverged && sp !== undefined && cp !== undefined;

  const perAttempt: PerAttemptShadow[] = candidates.map((c) => ({
    id: c.id,
    emotion01: clamp01(c.emotion01),
    logic01: clamp01(c.logic01),
    style01: clamp01(c.style01),
    composite_full: computeComposite(c, CONSTITUTION_WEIGHTS),
    composite_emotion_style: computeComposite(c, EMOTION_STYLE_WEIGHTS),
  }));

  return {
    enabled: true,
    full,
    emotionStyle,
    productionPickId,
    emotionGainIfDivergedFull: divergedFull ? +(clamp01(cp.emotion01) - clamp01(sp.emotion01)).toFixed(6) : 0,
    styleDeltaIfDivergedFull: divergedFull ? +(clamp01(cp.style01) - clamp01(sp.style01)).toFixed(6) : 0,
    logicDeltaIfDivergedFull: divergedFull ? +(clamp01(cp.logic01) - clamp01(sp.logic01)).toFixed(6) : 0,
    perAttempt,
  };
}
