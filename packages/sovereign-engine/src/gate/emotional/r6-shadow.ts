/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN — R6 COMPOSITE SHADOW HOOK (V4.4 -> R6 BRIDGE)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module:   src/gate/emotional/r6-shadow.ts
 * Standard: NASA-Grade L4 / DO-178C Level A
 * Spec:     outputs/V4_4_TO_R6_SHADOW_PLAN.md (etape 5, cablage log-only sous flag)
 * GO:       tribunal 2026-07-21 (Gemini + ChatGPT) — SHADOW STRICT, jamais actif.
 *
 * Attache (optionnellement) le resultat composite SHADOW au R6GateResult, APRES
 * la selection de production (style-only). NE MODIFIE JAMAIS `selectedAttempt` :
 * la sortie livre et son hash sont mathematiquement inchanges (ADR-003, EMP-16).
 *
 * Activation : UNIQUEMENT si `OMEGA_R6_COMPOSITE=shadow` ET scoreurs injectes.
 * Sinon : no-op strict (resultat identique, aucun champ `compositeShadow`).
 *
 * Scoreurs injectes (DI, comme R6ProseGenerator) — a brancher au niveau appelant :
 *   scoreEmotion <- scoreTension14D(packet, prose).score   [0,100]  (Plutchik-14 forge)
 *   scoreLogic?  <- continuity-oracle / arc-coherence       [0,100]  (defaut 50 -> logic01=0.5)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { R6GateResult } from '../r6-types.js';
import { toCandidateScores } from './r6-composite-adapter.js';
import { buildCompositeShadow, type CandidateScores } from './composite-selection.js';

/** Nom du flag d'activation shadow. */
export const R6_COMPOSITE_FLAG = 'OMEGA_R6_COMPOSITE';

/**
 * Scoreurs emotion/logique injectes. Log-only : jamais utilises pour selectionner
 * en production, seulement pour mesurer la divergence composite en shadow.
 */
export interface EmotionalShadowScorers {
  /** Emotion [0,100] — brancher scoreTension14D(packet, prose).score. */
  readonly scoreEmotion: (prose: string, langRoute: string) => number | Promise<number>;
  /** Logique/coherence [0,100] — brancher continuity-oracle. Absent => 50 (logic01=0.5). */
  readonly scoreLogic?: (prose: string) => number | Promise<number>;
}

/** Le mode shadow composite est-il arme ? (flag exact `shadow`). */
export function isCompositeShadowEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env[R6_COMPOSITE_FLAG] === 'shadow';
}

/**
 * Attache le resultat composite SHADOW au R6GateResult si (et seulement si) le
 * flag est arme et des scoreurs sont fournis. Sinon retourne le resultat INCHANGE.
 *
 * GARANTIES :
 *   - `selectedAttempt` / `selectedAttemptIndex` JAMAIS modifies (prod = style-only) ;
 *   - no-op si flag off, scoreurs absents, ou aucune tentative ;
 *   - purement observationnel (aucun feedback au Scribe, ADR-003).
 */
export async function attachCompositeShadow(
  result: R6GateResult,
  scorers?: EmotionalShadowScorers,
  env: NodeJS.ProcessEnv = process.env,
): Promise<R6GateResult> {
  if (!isCompositeShadowEnabled(env) || !scorers || result.allAttempts.length === 0) {
    return result;
  }

  const candidates: CandidateScores[] = [];
  for (let i = 0; i < result.allAttempts.length; i++) {
    const a = result.allAttempts[i];
    const emotionScore = await scorers.scoreEmotion(a.prose, a.langRoute);
    const coherenceScore = scorers.scoreLogic ? await scorers.scoreLogic(a.prose) : 50;
    candidates.push(toCandidateScores({
      id: String(i),
      emotionScore,
      coherenceScore,
      calcScore: a.calcScore,
    }));
  }

  const compositeShadow = buildCompositeShadow(candidates, String(result.selectedAttemptIndex));
  // Copie non-destructive : selectedAttempt et tout le reste sont preserves tels quels.
  return { ...result, compositeShadow };
}
