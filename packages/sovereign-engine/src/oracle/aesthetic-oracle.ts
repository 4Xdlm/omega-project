/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA SOVEREIGN STYLE ENGINE — AESTHETIC ORACLE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Module: oracle/aesthetic-oracle.ts
 * Version: 1.0.0
 * Standard: NASA-Grade L4 / DO-178C Level A
 *
 * Orchestrates all 9 axes + computes S-Score.
 * This is the ultimate judge of prose quality.
 *
 * EXECUTION ORDER:
 * 1. CALC axes (parallel, 0 token): tension_14d, anti_cliche, rhythm, signature, emotion_coherence
 * 2. LLM axes (sequential or parallel, depends on provider): interiority, sensory_density, necessity, impact
 * 3. Compute S-Score composite
 * 4. Emit verdict: SEAL (≥92) or REJECT (<92)
 *
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { ForgePacket, SScore, SovereignProvider, AxesScores } from '../types.js';
import type { SymbolMap } from '../symbol/symbol-map-types.js';

import { scoreTension14D } from './axes/tension-14d.js';
import { scoreAntiCliche } from './axes/anti-cliche.js';
import { scoreRhythm } from './axes/rhythm.js';
import { scoreSignature } from './axes/signature.js';
import { scoreEmotionCoherence } from './axes/emotion-coherence.js';
import { scoreInteriority } from './axes/interiority.js';
import { scoreSensoryDensity } from './axes/sensory-density.js';
import { scoreNecessity } from './axes/necessity.js';
import { scoreImpact } from './axes/impact.js';

import { computeSScore } from './s-score.js';
import type { MacroSScore } from './macro-score-types.js';
import { computeECC, computeRCI, computeSII, computeIFI, computeAAI, computeMacroSScore, type MacroAxesScores } from './macro-axes.js';
import { shadowLogIntrinsicQuality } from './intrinsic-quality/intrinsic-quality.js';
import { isDispatcherLangActive, runDispatcherLang } from '../scoring/dispatcher/dispatcher-lang.js';

export async function judgeAesthetic(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
): Promise<SScore> {
  const tension_14d = await scoreTension14D(packet, prose, provider);
  const anti_cliche = scoreAntiCliche(packet, prose);
  const rhythm = scoreRhythm(packet, prose);
  const signature = scoreSignature(packet, prose);
  const emotion_coherence = await scoreEmotionCoherence(packet, prose, provider);

  const interiority = await scoreInteriority(packet, prose, provider);
  const sensory_density = await scoreSensoryDensity(packet, prose, provider);
  const necessity = await scoreNecessity(packet, prose, provider);
  const impact = await scoreImpact(packet, prose, provider);

  const axes: AxesScores = {
    interiority,
    tension_14d,
    sensory_density,
    necessity,
    anti_cliche,
    rhythm,
    signature,
    impact,
    emotion_coherence,
  };

  const s_score = computeSScore(axes, packet.scene_id, packet.seeds.llm_seed);

  return s_score;
}

// ═══════════════════════════════════════════════════════════════════════════════
// AESTHETIC ORACLE v3 — avec 4 macro-axes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Juge esthétique v3 avec macro-axes
 * @param symbolMap - SymbolMap optionnel (peut être null si pas encore généré)
 * @param physicsAudit - PhysicsAuditResult optionnel (Sprint 3.4 — physics_compliance)
 */
export async function judgeAestheticV3(
  packet: ForgePacket,
  prose: string,
  provider: SovereignProvider,
  _symbolMap: SymbolMap | null, // symbolMap pour usage futur
  physicsAudit?: import('./physics-audit.js').PhysicsAuditResult,
): Promise<MacroSScore> {
  const ecc = await computeECC(packet, prose, provider, physicsAudit);
  const rci = await computeRCI(packet, prose, provider);
  const sii = await computeSII(packet, prose, provider);
  const ifi = await computeIFI(packet, prose, provider);
  const aai = await computeAAI(packet, prose, provider);

  const macroAxes: MacroAxesScores = { ecc, rci, sii, ifi, aai };

  const baseScore = computeMacroSScore(macroAxes, packet.scene_id, packet.seeds.llm_seed);

  // DEC-017 — télémétrie advisory IntrinsicQuality (SHADOW only, flag OMEGA_INTRINSIC_QUALITY).
  // No-op si flag != 'shadow' ; ne modifie JAMAIS baseScore (return inchangé). Ne lève jamais.
  await shadowLogIntrinsicQuality(prose, packet.language, packet.scene_id, provider);

  return maybeAttachDispatcher(baseScore, prose, packet);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DISPATCHER LANG V3.1 — ATTACHEMENT SHADOW MODE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Attache le résultat du M0b_slim V3.1 Language Dispatcher à un MacroSScore,
 * conditionnellement au feature flag `OMEGA_DISPATCHER_LANG_V33`.
 *
 * Contrat (shadow mode uniquement) :
 *   - Flag OFF → retourne baseScore **inchangé** (référence identique,
 *     aucun champ baseline_m0b présent). Garantit une parité bit-for-bit
 *     avec le comportement pré-dispatcher.
 *   - Flag ON  → retourne `{ ...baseScore, baseline_m0b: attachment }`
 *     où attachment est le résultat de runDispatcherLang.
 *
 * INV-NR-01, INV-NR-02, INV-NR-04 : ne touche jamais composite, verdict,
 * min_axis, macro_axes, ecc_score, emotion_weight_pct.
 *
 * Exporté pour permettre un test d'intégration du branchement sans devoir
 * invoquer toute la pipeline LLM de judgeAestheticV3.
 */
export function maybeAttachDispatcher(
  baseScore: MacroSScore,
  prose: string,
  packet: { readonly language?: unknown; readonly scene_id?: string },
): MacroSScore {
  if (!isDispatcherLangActive()) {
    return baseScore;
  }
  const attachment = runDispatcherLang(prose, packet);
  return { ...baseScore, baseline_m0b: attachment };
}
