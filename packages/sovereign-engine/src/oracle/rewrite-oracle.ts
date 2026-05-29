/**
 * OMEGA V2.3-A P4 — REWRITE_ORACLE (Option D, Tribunal arbitrage 2026-05-29).
 *
 * Métrique de qualité prose SCOPÉE V2.3 réécriture. NON le composite Oracle standard V3.
 * Agrège 7 axes valides pour la prose, en EXCLUANT le seul axe couplé au 14d dormant :
 *   - macro : RCI, SII, IFI, AAI (judgeAestheticV3 — fonctionnent, ne touchent pas le 14d)
 *   - sous-axes ECC valides : emotion_coherence, interiority, impact (ne touchent PAS target_14d)
 *   - EXCLU : tension_14d (ECC.sub_scores[0]) — dépend de curve_quartiles[].target_14d qui est
 *     GARAGE/DORMANT en V2.3 (vide {}) -> NaN. Cf NCR_V2_3_ORACLE_ECC_14D_INCOMPATIBLE.
 *
 * Ne touche PAS target_14d (FORBID-CANON-GARAGE-001 respecté : aucune résurrection 14d).
 * Ne modifie PAS judgeAestheticV3 (composite standard intact pour l'ex-nihilo).
 *
 * Pourquoi D (vs A/B') : garde interiority/impact/emotion_coherence (signaux qualité prose forts,
 * rejet A=UNIFORM_14D bidon, rejet B'=amputation totale ECC). On n'ampute que le sous-axe
 * mathématiquement incompatible.
 *
 * Standard: NASA-Grade L4 / DO-178C Level A — Sprint V2.3-A P4 2026-05-29
 */

import type { ForgePacket, SovereignProvider } from '../types.js';
import { computeRCI, computeSII, computeIFI, computeAAI } from './macro-axes.js';
import { scoreEmotionCoherence } from './axes/emotion-coherence.js';
import { scoreInteriority } from './axes/interiority.js';
import { scoreImpact } from './axes/impact.js';

/** Les 7 axes de REWRITE_ORACLE (tension_14d explicitement exclu). */
export const REWRITE_ORACLE_AXES = [
  'RCI', 'SII', 'IFI', 'AAI', 'emotion_coherence', 'interiority', 'impact',
] as const;

export interface RewriteOracleScore {
  readonly composite: number;
  readonly min_axis: number;
  readonly axes: Readonly<Record<string, number>>;
}

/** Math composite PURE (testable sans qwen) : moyenne + min des axes valides. */
export function computeRewriteComposite(axes: Readonly<Record<string, number>>): {
  composite: number;
  min_axis: number;
} {
  const vals = Object.values(axes);
  if (vals.length === 0) return { composite: 0, min_axis: 0 };
  for (const v of vals) {
    if (!Number.isFinite(v)) throw new Error(`computeRewriteComposite: axe non-fini (${v}) — métrique invalide`);
  }
  const composite = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min_axis = Math.min(...vals);
  return { composite, min_axis };
}

/**
 * Score REWRITE_ORACLE d'une prose (appels LLM séquentiels — qwen sérialise).
 * EXCLUT tension_14d (14d dormant). target_14d jamais lu ici.
 */
export async function scoreRewriteOracle(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider
): Promise<RewriteOracleScore> {
  const rci = await computeRCI(packet, prose, provider);
  const sii = await computeSII(packet, prose, provider);
  const ifi = await computeIFI(packet, prose, provider);
  const aai = await computeAAI(packet, prose, provider);
  const emotion_coherence = await scoreEmotionCoherence(packet, prose, provider);
  const interiority = await scoreInteriority(packet, prose, provider);
  const impact = await scoreImpact(packet, prose, provider);

  const axes: Record<string, number> = {
    RCI: rci.score,
    SII: sii.score,
    IFI: ifi.score,
    AAI: aai.score,
    emotion_coherence: emotion_coherence.score,
    interiority: interiority.score,
    impact: impact.score,
  };
  const { composite, min_axis } = computeRewriteComposite(axes);
  return { composite, min_axis, axes };
}
