/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 COMPOSITE ADAPTER (V4.4 -> R6 BRIDGE, SHADOW)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/emotional/r6-composite-adapter.ts
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Spec:     outputs/V4_4_TO_R6_BRIDGE_SPEC.md ; V4_4_TO_R6_SHADOW_PLAN.md (etape 4)
 *
 * COUTURE entre les scoreurs EXISTANTS et le composite pur (`composite-selection.ts`).
 * Transforme les scores d'axes bruts d'un jet candidat en `CandidateScores` normalises,
 * puis produit les champs de LOG optionnels pour R6 (extension retro-compatible).
 *
 * == SHADOW / PUR ==
 *   - Aucune I/O, aucun LLM, aucun etat. Ne touche pas `r6-rejection-gate.ts`.
 *   - Cablage live (log-only, sous flag) = etape 5 gatee (Architecte).
 *   - Sources reelles a brancher a l'etape live :
 *       emotionScore  <- scoreTension14D(packet, prose).score      [0,100]
 *       coherenceScore<- axe coherence Oracle                       [0,100]
 *       calcScore     <- scoreForR6Gate(prose).baseline_tier_score  (~[1.5,6.5])
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import {
  normalizeCalcScore,
  selectWithDivergence,
  type CandidateScores,
  type CompositeWeights,
  type DivergenceReport,
  CONSTITUTION_WEIGHTS,
} from './composite-selection.js';

/** Scores d'axes BRUTS d'un jet (echelles natives des scoreurs existants). */
export interface RawAxisScores {
  /** Identifiant du jet (index de tentative R6). */
  readonly id: string;
  /** Emotion : scoreTension14D [0,100]. */
  readonly emotionScore: number;
  /** Coherence/logique : axe Oracle [0,100]. */
  readonly coherenceScore: number;
  /** Style : baseline_tier_score CALC V3.4 (echelle tier ~[1.5,6.5]). */
  readonly calcScore: number;
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Normalise les scores d'axes bruts d'un jet en `CandidateScores` [0,1]. */
export function toCandidateScores(raw: RawAxisScores): CandidateScores {
  return {
    id: raw.id,
    emotion01: clamp01(raw.emotionScore / 100),
    logic01: clamp01(raw.coherenceScore / 100),
    style01: normalizeCalcScore(raw.calcScore),
  };
}

/**
 * Champs de LOG shadow, destines a etendre `R6GateLog` en OPTIONNELS
 * (retro-compat : `composite_pick_id?`, `diverged?`, ...). Aucune mutation
 * de la selection : purement observationnel (ADR-003).
 */
export interface R6CompositeShadowLog {
  readonly composite_enabled: true;
  readonly composite_weights: CompositeWeights;
  readonly style_only_pick_id: string;
  readonly composite_pick_id: string;
  readonly diverged: boolean;
  readonly composite_ranking: readonly string[];
  readonly style_ranking: readonly string[];
}

/**
 * Calcule le rapport de divergence shadow a partir des scores d'axes bruts
 * de toutes les tentatives R6 d'un chapitre. NE CHANGE RIEN a la selection.
 *
 * @throws Error si `attempts` est vide (via selectWithDivergence).
 */
export function computeShadowDivergence(
  attempts: readonly RawAxisScores[],
  weights: CompositeWeights = CONSTITUTION_WEIGHTS,
): { report: DivergenceReport; log: R6CompositeShadowLog } {
  const candidates = attempts.map(toCandidateScores);
  const report = selectWithDivergence(candidates, weights);
  const log: R6CompositeShadowLog = {
    composite_enabled: true,
    composite_weights: report.weights,
    style_only_pick_id: report.styleOnlyPickId,
    composite_pick_id: report.compositePickId,
    diverged: report.diverged,
    composite_ranking: report.rankedByComposite.map((r) => r.id),
    style_ranking: report.rankingByStyle,
  };
  return { report, log };
}
